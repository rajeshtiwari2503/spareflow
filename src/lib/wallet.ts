// Wallet Management Service
// Handles wallet balance checks, deductions, and transaction logging for DTDC API calls

import { prisma } from './prisma';

export interface WalletBalance {
  brand_id: string;
  balance: number;
  last_recharge: Date | null;
  total_spent: number;
}

export interface WalletTransaction {
  id: string;
  brand_id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  reference_id?: string;
  ref_shipment_id?: string;
  timestamp: Date;
  balance_after: number;
}

export interface ShipmentCostEstimate {
  base_cost: number;
  weight_cost: number;
  total_cost: number;
  currency: 'INR';
}

// Default DTDC pricing matrix (can be overridden by SuperAdmin)
const DEFAULT_DTDC_PRICING = {
  base_rate: 50, // Base rate in INR
  per_kg_rate: 25, // Per kg rate in INR
  min_charge: 75, // Minimum charge in INR
  max_weight_free: 0.5, // Free weight in kg
};

// Get wallet balance for a brand
export async function getWalletBalance(brandId: string): Promise<WalletBalance | null> {
  try {
    // First check if user exists and is a brand
    const user = await prisma.user.findUnique({
      where: { id: brandId },
      select: { id: true, role: true }
    });

    if (!user) {
      console.error(`User with ID ${brandId} not found`);
      return null;
    }

    let wallet = await prisma.wallet.findUnique({
      where: { userId: brandId }
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      try {
        const newWallet = await prisma.wallet.create({
          data: {
            userId: brandId,
            balance: 0,
            lastRecharge: null,
            totalSpent: 0,
            totalEarned: 0
          }
        });
        wallet = newWallet;
      } catch (createError) {
        console.error('Error creating wallet:', createError);
        return null;
      }
    }

    return {
      brand_id: wallet.userId,
      balance: wallet.balance,
      last_recharge: wallet.lastRecharge,
      total_spent: wallet.totalSpent
    };
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return null;
  }
}

// Estimate DTDC shipment cost
export async function estimateShipmentCost(
  brandId: string,
  weight: number,
  pieces: number = 1
): Promise<ShipmentCostEstimate> {
  try {
    // Try to get brand-specific pricing from database
    const brandPricing = await prisma.courierPricing.findUnique({
      where: { brandId: brandId }
    });

    const pricing = brandPricing || DEFAULT_DTDC_PRICING;
    
    // Calculate cost based on weight and pieces
    let baseCost = (brandPricing?.perBoxRate || DEFAULT_DTDC_PRICING.base_rate) * pieces;
    let weightCost = 0;
    
    const totalWeight = weight * pieces;
    if (totalWeight > (DEFAULT_DTDC_PRICING.max_weight_free || 0.5)) {
      const chargeableWeight = totalWeight - (DEFAULT_DTDC_PRICING.max_weight_free || 0.5);
      weightCost = Math.ceil(chargeableWeight) * DEFAULT_DTDC_PRICING.per_kg_rate;
    }
    
    const totalCost = Math.max(baseCost + weightCost, DEFAULT_DTDC_PRICING.min_charge || 75);
    
    return {
      base_cost: baseCost,
      weight_cost: weightCost,
      total_cost: totalCost,
      currency: 'INR'
    };
  } catch (error) {
    console.error('Error estimating shipment cost:', error);
    // Return default estimate
    return {
      base_cost: DEFAULT_DTDC_PRICING.base_rate,
      weight_cost: Math.ceil(weight) * DEFAULT_DTDC_PRICING.per_kg_rate,
      total_cost: Math.max(
        DEFAULT_DTDC_PRICING.base_rate + (Math.ceil(weight) * DEFAULT_DTDC_PRICING.per_kg_rate),
        DEFAULT_DTDC_PRICING.min_charge
      ),
      currency: 'INR'
    };
  }
}

// Check if wallet has sufficient balance
export async function checkWalletBalance(
  brandId: string,
  requiredAmount: number
): Promise<{ sufficient: boolean; currentBalance: number; shortfall?: number }> {
  const wallet = await getWalletBalance(brandId);
  
  if (!wallet) {
    return { sufficient: false, currentBalance: 0, shortfall: requiredAmount };
  }
  
  const sufficient = wallet.balance >= requiredAmount;
  const shortfall = sufficient ? undefined : requiredAmount - wallet.balance;
  
  return {
    sufficient,
    currentBalance: wallet.balance,
    shortfall
  };
}

// Deduct amount from wallet (with transaction logging)
export async function deductFromWallet(
  brandId: string,
  amount: number,
  description: string,
  referenceId?: string,
  refShipmentId?: string
): Promise<{ success: boolean; newBalance?: number; transactionId?: string; error?: string; currentBalance?: number }> {
  try {
    // Check balance first
    const balanceCheck = await checkWalletBalance(brandId, amount);
    
    if (!balanceCheck.sufficient) {
      return {
        success: false,
        error: `Insufficient wallet balance. Required: ₹${amount}, Available: ₹${balanceCheck.currentBalance}`,
        currentBalance: balanceCheck.currentBalance
      };
    }
    
    // Perform deduction in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { userId: brandId },
        data: {
          balance: { decrement: amount },
          totalSpent: { increment: amount }
        }
      });
      
      // Log the transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          userId: brandId,
          type: 'DEBIT',
          amount: amount,
          description: description,
          reference: referenceId,
          balanceAfter: updatedWallet.balance
        }
      });
      
      return {
        newBalance: updatedWallet.balance,
        transactionId: transaction.id
      };
    });
    
    return {
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId
    };
    
  } catch (error) {
    console.error('Error deducting from wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Wallet deduction failed'
    };
  }
}

// Refund amount to wallet (in case of API failure)
export async function refundToWallet(
  brandId: string,
  amount: number,
  description: string,
  referenceId?: string,
  refShipmentId?: string
): Promise<{ success: boolean; newBalance?: number; transactionId?: string; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { userId: brandId },
        data: {
          balance: { increment: amount },
          totalSpent: { decrement: amount }
        }
      });
      
      // Log the refund transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          userId: brandId,
          type: 'CREDIT',
          amount: amount,
          description: `REFUND: ${description}`,
          reference: referenceId,
          balanceAfter: updatedWallet.balance
        }
      });
      
      return {
        newBalance: updatedWallet.balance,
        transactionId: transaction.id
      };
    });
    
    return {
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId
    };
    
  } catch (error) {
    console.error('Error refunding to wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Wallet refund failed'
    };
  }
}

// Credit amount to wallet (for recharges)
export async function creditToWallet(
  brandId: string,
  amount: number,
  description: string = 'Wallet Recharge',
  referenceId?: string
): Promise<{ success: boolean; newBalance?: number; transactionId?: string; error?: string }> {
  try {
    // Ensure wallet exists first
    const walletBalance = await getWalletBalance(brandId);
    if (!walletBalance) {
      return {
        success: false,
        error: 'Failed to access or create wallet'
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update wallet balance and last recharge date
      const updatedWallet = await tx.wallet.upsert({
        where: { userId: brandId },
        update: {
          balance: { increment: amount },
          lastRecharge: new Date(),
          totalEarned: { increment: amount }
        },
        create: {
          userId: brandId,
          balance: amount,
          lastRecharge: new Date(),
          totalEarned: amount,
          totalSpent: 0
        }
      });
      
      // Log the credit transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          userId: brandId,
          type: 'CREDIT',
          amount: amount,
          description: description,
          reference: referenceId,
          balanceAfter: updatedWallet.balance
        }
      });
      
      return {
        newBalance: updatedWallet.balance,
        transactionId: transaction.id
      };
    });
    
    return {
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId
    };
    
  } catch (error) {
    console.error('Error crediting to wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Wallet credit failed'
    };
  }
}

// Get wallet transaction history
export async function getWalletTransactions(
  brandId: string,
  limit: number = 50,
  offset: number = 0
): Promise<WalletTransaction[]> {
  try {
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: brandId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
    
    return transactions.map(t => ({
      id: t.id,
      brand_id: brandId,
      type: t.type,
      amount: t.amount,
      description: t.description,
      reference_id: t.reference || t.purchaseOrderId,
      ref_shipment_id: t.reference || t.purchaseOrderId,
      timestamp: t.createdAt,
      balance_after: t.balanceAfter
    }));
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return [];
  }
}

// Get all wallet balances (for SuperAdmin)
export async function getAllWalletBalances(): Promise<WalletBalance[]> {
  try {
    const wallets = await prisma.wallet.findMany({
      orderBy: { balance: 'desc' }
    });
    
    return wallets.map(w => ({
      brand_id: w.userId,
      balance: w.balance,
      last_recharge: w.lastRecharge,
      total_spent: w.totalSpent
    }));
  } catch (error) {
    console.error('Error fetching all wallet balances:', error);
    return [];
  }
}

// Set custom pricing for a brand (SuperAdmin function)
export async function setBrandPricing(
  brandId: string,
  pricing: {
    base_rate: number;
    per_kg_rate: number;
    min_charge: number;
    max_weight_free: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.courierPricing.upsert({
      where: { brandId: brandId },
      update: { perBoxRate: pricing.base_rate },
      create: {
        brandId: brandId,
        perBoxRate: pricing.base_rate
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error setting brand pricing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set pricing'
    };
  }
}

// Get brand pricing
export async function getBrandPricing(brandId: string) {
  try {
    const pricing = await prisma.courierPricing.findUnique({
      where: { brandId: brandId }
    });
    
    if (pricing) {
      return {
        base_rate: pricing.perBoxRate,
        per_kg_rate: DEFAULT_DTDC_PRICING.per_kg_rate,
        min_charge: DEFAULT_DTDC_PRICING.min_charge,
        max_weight_free: DEFAULT_DTDC_PRICING.max_weight_free
      };
    }
    
    return DEFAULT_DTDC_PRICING;
  } catch (error) {
    console.error('Error fetching brand pricing:', error);
    return DEFAULT_DTDC_PRICING;
  }
}