import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { refundToWallet } from '@/lib/wallet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { shipmentId, brandId, testAmount } = req.body;

    if (!shipmentId && !brandId) {
      return res.status(400).json({ error: 'Either shipmentId or brandId is required' });
    }

    let targetBrandId = brandId;
    let shipmentData = null;

    // If shipmentId is provided, get the shipment details
    if (shipmentId) {
      shipmentData = await prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          brand: true,
          boxes: true
        }
      });

      if (!shipmentData) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      targetBrandId = shipmentData.brandId;
    }

    // Debug: Find all wallet transactions for this brand
    const allTransactions = await prisma.walletTransaction.findMany({
      where: {
        userId: targetBrandId
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log(`\n=== REFUND DEBUG FOR BRAND ${targetBrandId} ===`);
    console.log(`Total transactions found: ${allTransactions.length}`);
    
    allTransactions.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.type} - ₹${txn.amount} - ${txn.description} - Ref: ${txn.reference} - ${txn.createdAt}`);
    });

    let refundAmount = 0;
    let originalTransactions = [];

    if (shipmentId) {
      // Try to find the original debit transaction for this shipment
      console.log(`\n=== SEARCHING FOR SHIPMENT ${shipmentId} TRANSACTIONS ===`);
      
      // Multiple search patterns
      const searchPatterns = [
        { reference: `SHIPMENT_${shipmentId}` },
        { reference: shipmentId },
        { purchaseOrderId: shipmentId },
        { description: { contains: shipmentId } },
        { description: { contains: `shipment ${shipmentId}` } },
        { description: { contains: `Shipment to` } }
      ];

      for (const pattern of searchPatterns) {
        const transactions = await prisma.walletTransaction.findMany({
          where: {
            ...pattern,
            type: 'DEBIT',
            userId: targetBrandId
          }
        });

        if (transactions.length > 0) {
          console.log(`Found ${transactions.length} transactions with pattern:`, pattern);
          transactions.forEach(txn => {
            console.log(`  - ${txn.id}: ₹${txn.amount} - ${txn.description} - Ref: ${txn.reference}`);
          });
          originalTransactions.push(...transactions);
        }
      }

      // If no specific transactions found, try time-based search
      if (originalTransactions.length === 0 && shipmentData) {
        console.log('\n=== TIME-BASED SEARCH ===');
        const timeBasedTransactions = await prisma.walletTransaction.findMany({
          where: {
            userId: targetBrandId,
            type: 'DEBIT',
            createdAt: {
              gte: new Date(shipmentData.createdAt.getTime() - 10 * 60 * 1000), // 10 minutes before
              lte: new Date(shipmentData.createdAt.getTime() + 10 * 60 * 1000)  // 10 minutes after
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${timeBasedTransactions.length} transactions around shipment creation time`);
        timeBasedTransactions.forEach(txn => {
          console.log(`  - ${txn.id}: ₹${txn.amount} - ${txn.description} - ${txn.createdAt}`);
        });

        if (timeBasedTransactions.length > 0) {
          originalTransactions.push(timeBasedTransactions[0]); // Take the most recent one
        }
      }

      // Remove duplicates
      originalTransactions = originalTransactions.filter((txn, index, self) => 
        index === self.findIndex(t => t.id === txn.id)
      );

      refundAmount = originalTransactions.reduce((total, txn) => total + txn.amount, 0);
    } else {
      // Test refund with provided amount
      refundAmount = testAmount || 100;
    }

    console.log(`\n=== REFUND CALCULATION ===`);
    console.log(`Original transactions found: ${originalTransactions.length}`);
    console.log(`Total refund amount: ₹${refundAmount}`);

    // Get current wallet balance
    const currentWallet = await prisma.wallet.findUnique({
      where: { userId: targetBrandId }
    });

    console.log(`Current wallet balance: ₹${currentWallet?.balance || 0}`);

    // Test the refund process
    let refundResult = null;
    if (refundAmount > 0) {
      console.log(`\n=== PROCESSING REFUND ===`);
      refundResult = await refundToWallet(
        targetBrandId,
        refundAmount,
        `Test refund for ${shipmentId ? `shipment ${shipmentId}` : 'debug test'}`,
        `TEST_REFUND_${Date.now()}`,
        shipmentId
      );

      console.log('Refund result:', refundResult);
    }

    // Get updated wallet balance
    const updatedWallet = await prisma.wallet.findUnique({
      where: { userId: targetBrandId }
    });

    return res.status(200).json({
      success: true,
      debug: {
        targetBrandId,
        shipmentData: shipmentData ? {
          id: shipmentData.id,
          status: shipmentData.status,
          createdAt: shipmentData.createdAt,
          brandName: shipmentData.brand.name
        } : null,
        allTransactions: allTransactions.map(txn => ({
          id: txn.id,
          type: txn.type,
          amount: txn.amount,
          description: txn.description,
          reference: txn.reference,
          createdAt: txn.createdAt
        })),
        originalTransactions: originalTransactions.map(txn => ({
          id: txn.id,
          type: txn.type,
          amount: txn.amount,
          description: txn.description,
          reference: txn.reference,
          createdAt: txn.createdAt
        })),
        refundAmount,
        walletBefore: currentWallet?.balance || 0,
        walletAfter: updatedWallet?.balance || 0,
        refundResult
      }
    });

  } catch (error) {
    console.error('Refund test error:', error);
    return res.status(500).json({ 
      error: 'Refund test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}