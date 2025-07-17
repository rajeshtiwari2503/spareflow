// Enhanced Wallet Management Service
// Unified wallet system that handles balance checks, deductions, and transaction logging
// Fixes the wallet balance mismatch issue between display and shipment creation

import { prisma } from './prisma';

export interface EnhancedWalletBalance {
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastRecharge: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnhancedWalletTransaction {
  id: string;
  userId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  balanceAfter: number;
  status: string;
  createdAt: Date;
  purchaseOrderId?: string;
}

export interface WalletOperationResult {
  success: boolean;
  newBalance?: number;
  transactionId?: string;
  error?: string;
  details?: any;
}

export interface BalanceCheckResult {
  sufficient: boolean;
  currentBalance: number;
  shortfall?: number;
  walletExists: boolean;
}

// Get or create wallet for a user
export async function getOrCreateWallet(userId: string): Promise<EnhancedWalletBalance> {
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      console.log(`Creating new wallet for user: ${userId}`);
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          lastRecharge: null
        }
      });
    }

    return {
      userId: wallet.userId,
      balance: wallet.balance,
      totalEarned: wallet.totalEarned,
      totalSpent: wallet.totalSpent,
      lastRecharge: wallet.lastRecharge,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt
    };
  } catch (error) {
    console.error('Error getting or creating wallet:', error);
    throw new Error(`Failed to get or create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Check wallet balance with detailed information
export async function checkWalletBalance(
  userId: string,
  requiredAmount: number
): Promise<BalanceCheckResult> {
  try {
    console.log(`Checking wallet balance for user: ${userId}, required: ₹${requiredAmount}`);
    
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      console.log(`No wallet found for user: ${userId}`);
      return {
        sufficient: false,
        currentBalance: 0,
        shortfall: requiredAmount,
        walletExists: false
      };
    }

    const sufficient = wallet.balance >= requiredAmount;
    const shortfall = sufficient ? undefined : requiredAmount - wallet.balance;

    console.log(`Wallet check result - Balance: ₹${wallet.balance}, Required: ₹${requiredAmount}, Sufficient: ${sufficient}`);

    return {
      sufficient,
      currentBalance: wallet.balance,
      shortfall,
      walletExists: true
    };
  } catch (error) {
    console.error('Error checking wallet balance:', error);
    return {
      sufficient: false,
      currentBalance: 0,
      shortfall: requiredAmount,
      walletExists: false
    };
  }
}

// Deduct amount from wallet with comprehensive logging
export async function deductFromWallet(
  userId: string,
  amount: number,
  description: string,
  referenceId?: string
): Promise<WalletOperationResult> {
  try {
    console.log(`Attempting to deduct ₹${amount} from wallet for user: ${userId}`);
    console.log(`Description: ${description}`);
    console.log(`Reference ID: ${referenceId || 'None'}`);

    // Check balance first
    const balanceCheck = await checkWalletBalance(userId, amount);
    
    if (!balanceCheck.sufficient) {
      const error = `Insufficient wallet balance. Required: ₹${amount}, Available: ₹${balanceCheck.currentBalance}`;
      console.error(error);
      return {
        success: false,
        error,
        details: {
          requiredAmount: amount,
          availableBalance: balanceCheck.currentBalance,
          shortfall: balanceCheck.shortfall,
          walletExists: balanceCheck.walletExists
        }
      };
    }

    // Perform deduction in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
          totalSpent: { increment: amount }
        }
      });

      console.log(`Wallet updated - New balance: ₹${updatedWallet.balance}`);

      // Log the transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          type: 'DEBIT',
          amount,
          description,
          balanceAfter: updatedWallet.balance,
          status: 'COMPLETED',
          purchaseOrderId: referenceId
        }
      });

      console.log(`Transaction logged with ID: ${transaction.id}`);

      return {
        newBalance: updatedWallet.balance,
        transactionId: transaction.id
      };
    });

    return {
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
      details: {
        deductedAmount: amount,
        previousBalance: balanceCheck.currentBalance,
        newBalance: result.newBalance
      }
    };

  } catch (error) {
    console.error('Error deducting from wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Wallet deduction failed',
      details: { originalError: error }
    };
  }
}

// Credit amount to wallet (for recharges)
export async function creditToWallet(
  userId: string,
  amount: number,
  description: string = 'Wallet Recharge',
  referenceId?: string
): Promise<WalletOperationResult> {
  try {
    console.log(`Crediting ₹${amount} to wallet for user: ${userId}`);
    console.log(`Description: ${description}`);

    // Ensure wallet exists
    await getOrCreateWallet(userId);

    const result = await prisma.$transaction(async (tx) => {
      // Update wallet balance and last recharge date
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { increment: amount },
          totalEarned: { increment: amount },
          lastRecharge: new Date()
        }
      });

      // Log the credit transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          type: 'CREDIT',
          amount,
          description,
          balanceAfter: updatedWallet.balance,
          status: 'COMPLETED',
          purchaseOrderId: referenceId
        }
      });

      return {
        newBalance: updatedWallet.balance,
        transactionId: transaction.id
      };
    });

    console.log(`Credit successful - New balance: ₹${result.newBalance}`);

    return {
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
      details: {
        creditedAmount: amount,
        newBalance: result.newBalance
      }
    };

  } catch (error) {
    console.error('Error crediting to wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Wallet credit failed',
      details: { originalError: error }
    };
  }
}

// Refund amount to wallet (in case of API failure)
export async function refundToWallet(
  userId: string,
  amount: number,
  description: string,
  referenceId?: string
): Promise<WalletOperationResult> {
  try {
    console.log(`Refunding ₹${amount} to wallet for user: ${userId}`);
    console.log(`Description: ${description}`);

    const result = await prisma.$transaction(async (tx) => {
      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { increment: amount },
          totalSpent: { decrement: amount }
        }
      });

      // Log the refund transaction
      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          type: 'CREDIT',
          amount,
          description: `REFUND: ${description}`,
          balanceAfter: updatedWallet.balance,
          status: 'COMPLETED',
          purchaseOrderId: referenceId
        }
      });

      return {
        newBalance: updatedWallet.balance,
        transactionId: transaction.id
      };
    });

    console.log(`Refund successful - New balance: ₹${result.newBalance}`);

    return {
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
      details: {
        refundedAmount: amount,
        newBalance: result.newBalance
      }
    };

  } catch (error) {
    console.error('Error refunding to wallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Wallet refund failed',
      details: { originalError: error }
    };
  }
}

// Get wallet transaction history
export async function getWalletTransactions(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<EnhancedWalletTransaction[]> {
  try {
    const transactions = await prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return transactions.map(t => ({
      id: t.id,
      userId: t.userId,
      type: t.type,
      amount: t.amount,
      description: t.description,
      balanceAfter: t.balanceAfter,
      status: t.status,
      createdAt: t.createdAt,
      purchaseOrderId: t.purchaseOrderId || undefined
    }));
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return [];
  }
}

// Get wallet summary with detailed breakdown
export async function getWalletSummary(userId: string): Promise<{
  wallet: EnhancedWalletBalance;
  recentTransactions: EnhancedWalletTransaction[];
  summary: {
    totalCredits: number;
    totalDebits: number;
    transactionCount: number;
    lastTransactionDate: Date | null;
  };
}> {
  try {
    const wallet = await getOrCreateWallet(userId);
    const transactions = await getWalletTransactions(userId, 10);

    // Calculate summary from transactions
    const allTransactions = await prisma.walletTransaction.findMany({
      where: { userId },
      select: {
        type: true,
        amount: true,
        createdAt: true
      }
    });

    const totalCredits = allTransactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebits = allTransactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + t.amount, 0);

    const lastTransactionDate = allTransactions.length > 0 
      ? allTransactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
      : null;

    return {
      wallet,
      recentTransactions: transactions,
      summary: {
        totalCredits,
        totalDebits,
        transactionCount: allTransactions.length,
        lastTransactionDate
      }
    };
  } catch (error) {
    console.error('Error getting wallet summary:', error);
    throw new Error(`Failed to get wallet summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Debug function to check wallet consistency
export async function debugWalletConsistency(userId: string): Promise<{
  walletData: EnhancedWalletBalance | null;
  calculatedBalance: number;
  transactionCount: number;
  lastTransaction: EnhancedWalletTransaction | null;
  isConsistent: boolean;
  issues: string[];
}> {
  try {
    console.log(`=== WALLET DEBUG FOR USER: ${userId} ===`);

    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    const transactions = await prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    let calculatedBalance = 0;
    const issues: string[] = [];

    // Calculate balance from transactions
    for (const transaction of transactions) {
      if (transaction.type === 'CREDIT') {
        calculatedBalance += transaction.amount;
      } else {
        calculatedBalance -= transaction.amount;
      }
    }

    const lastTransaction = transactions.length > 0 
      ? transactions[transactions.length - 1] 
      : null;

    // Check consistency
    const isConsistent = wallet ? Math.abs(wallet.balance - calculatedBalance) < 0.01 : calculatedBalance === 0;

    if (!wallet) {
      issues.push('Wallet record does not exist');
    } else {
      if (!isConsistent) {
        issues.push(`Balance mismatch: Wallet shows ₹${wallet.balance}, calculated ₹${calculatedBalance}`);
      }
      if (lastTransaction && Math.abs(lastTransaction.balanceAfter - wallet.balance) > 0.01) {
        issues.push(`Last transaction balance mismatch: Transaction shows ₹${lastTransaction.balanceAfter}, wallet shows ₹${wallet.balance}`);
      }
    }

    console.log(`Wallet exists: ${!!wallet}`);
    console.log(`Stored balance: ₹${wallet?.balance || 0}`);
    console.log(`Calculated balance: ₹${calculatedBalance}`);
    console.log(`Transaction count: ${transactions.length}`);
    console.log(`Is consistent: ${isConsistent}`);
    console.log(`Issues: ${issues.length > 0 ? issues.join(', ') : 'None'}`);

    return {
      walletData: wallet ? {
        userId: wallet.userId,
        balance: wallet.balance,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        lastRecharge: wallet.lastRecharge,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt
      } : null,
      calculatedBalance,
      transactionCount: transactions.length,
      lastTransaction: lastTransaction ? {
        id: lastTransaction.id,
        userId: lastTransaction.userId,
        type: lastTransaction.type,
        amount: lastTransaction.amount,
        description: lastTransaction.description,
        balanceAfter: lastTransaction.balanceAfter,
        status: lastTransaction.status,
        createdAt: lastTransaction.createdAt,
        purchaseOrderId: lastTransaction.purchaseOrderId || undefined
      } : null,
      isConsistent,
      issues
    };
  } catch (error) {
    console.error('Error debugging wallet consistency:', error);
    throw error;
  }
}

// Check enhanced wallet balance (alias for checkWalletBalance)
export async function checkEnhancedWalletBalance(
  userId: string,
  requiredAmount: number
): Promise<BalanceCheckResult> {
  return checkWalletBalance(userId, requiredAmount);
}

// Process return courier cost
export async function processReturnCourierCost(
  userId: string,
  amount: number,
  returnReason: string,
  costResponsibility: 'BRAND' | 'SERVICE_CENTER' | 'CUSTOMER',
  referenceId?: string
): Promise<WalletOperationResult> {
  try {
    console.log(`Processing return courier cost for user: ${userId}`);
    console.log(`Amount: ₹${amount}, Reason: ${returnReason}, Responsibility: ${costResponsibility}`);

    // Determine who pays based on cost responsibility
    if (costResponsibility === 'BRAND') {
      // Brand pays - no deduction from user wallet
      return {
        success: true,
        details: {
          message: 'Return cost covered by brand',
          costResponsibility,
          amount
        }
      };
    } else if (costResponsibility === 'SERVICE_CENTER') {
      // Service center pays - deduct from their wallet
      return await deductFromWallet(
        userId,
        amount,
        `Return courier cost - ${returnReason}`,
        referenceId
      );
    } else {
      // Customer pays - handle separately or return error
      return {
        success: false,
        error: 'Customer payment not handled through wallet system',
        details: {
          costResponsibility,
          amount
        }
      };
    }
  } catch (error) {
    console.error('Error processing return courier cost:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process return courier cost',
      details: { originalError: error }
    };
  }
}

// Admin wallet adjustment function
export async function adminWalletAdjustment(
  userId: string,
  amount: number,
  type: 'CREDIT' | 'DEBIT',
  description: string,
  adminId: string
): Promise<WalletOperationResult> {
  try {
    console.log(`Admin wallet adjustment for user: ${userId}`);
    console.log(`Type: ${type}, Amount: ₹${amount}, Admin: ${adminId}`);

    const adjustmentDescription = `ADMIN ADJUSTMENT by ${adminId}: ${description}`;

    if (type === 'CREDIT') {
      return await creditToWallet(userId, amount, adjustmentDescription);
    } else {
      return await deductFromWallet(userId, amount, adjustmentDescription);
    }
  } catch (error) {
    console.error('Error in admin wallet adjustment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Admin wallet adjustment failed',
      details: { originalError: error }
    };
  }
}