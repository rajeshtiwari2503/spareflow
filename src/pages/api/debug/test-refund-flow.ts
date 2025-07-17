import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { refundToWallet, deductFromWallet } from '@/lib/wallet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { action, brandId, amount = 100 } = req.body;

    if (!brandId) {
      return res.status(400).json({ error: 'Brand ID is required' });
    }

    // Verify brand exists
    const brand = await prisma.user.findUnique({
      where: { id: brandId, role: 'BRAND' }
    });

    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    let result = {};

    if (action === 'test_complete_flow') {
      console.log('\n=== TESTING COMPLETE REFUND FLOW ===');
      
      // Step 1: Get initial wallet balance
      const initialWallet = await prisma.wallet.findUnique({
        where: { userId: brandId }
      });
      
      console.log(`Initial wallet balance: ₹${initialWallet?.balance || 0}`);

      // Step 2: Create a mock shipment
      const mockShipment = await prisma.shipment.create({
        data: {
          brandId,
          recipientId: brandId, // Self for testing
          recipientType: 'SERVICE_CENTER',
          numBoxes: 1,
          status: 'PENDING',
          totalWeight: 1.0,
          totalValue: 500,
          estimatedCost: amount,
          actualCost: amount,
          courierPartner: 'DTDC',
          recipientAddress: JSON.stringify({
            street: 'Test Address',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            country: 'India'
          }),
          notes: 'Test shipment for refund flow testing'
        }
      });

      console.log(`Mock shipment created: ${mockShipment.id}`);

      // Step 3: Deduct from wallet (simulate shipment cost)
      const deductResult = await deductFromWallet(
        brandId,
        amount,
        `Test shipment ${mockShipment.id} for refund testing`,
        `SHIPMENT_${mockShipment.id}`,
        mockShipment.id
      );

      console.log('Deduction result:', deductResult);

      if (!deductResult.success) {
        return res.status(400).json({
          error: 'Failed to deduct from wallet',
          details: deductResult.error
        });
      }

      // Step 4: Get wallet balance after deduction
      const walletAfterDeduction = await prisma.wallet.findUnique({
        where: { userId: brandId }
      });

      console.log(`Wallet after deduction: ₹${walletAfterDeduction?.balance || 0}`);

      // Step 5: Now test the refund process (simulate shipment cancellation)
      
      // Find the debit transaction
      const debitTransactions = await prisma.walletTransaction.findMany({
        where: {
          OR: [
            { reference: `SHIPMENT_${mockShipment.id}` },
            { reference: mockShipment.id },
            { description: { contains: mockShipment.id } }
          ],
          type: 'DEBIT',
          userId: brandId
        }
      });

      console.log(`Found ${debitTransactions.length} debit transactions for refund`);

      const refundAmount = debitTransactions.reduce((total, txn) => total + txn.amount, 0);
      console.log(`Total refund amount: ₹${refundAmount}`);

      // Step 6: Process refund
      let refundResult = null;
      if (refundAmount > 0) {
        refundResult = await refundToWallet(
          brandId,
          refundAmount,
          `Refund for cancelled test shipment ${mockShipment.id}`,
          `REFUND_SHIPMENT_${mockShipment.id}`,
          mockShipment.id
        );

        console.log('Refund result:', refundResult);
      }

      // Step 7: Get final wallet balance
      const finalWallet = await prisma.wallet.findUnique({
        where: { userId: brandId }
      });

      console.log(`Final wallet balance: ₹${finalWallet?.balance || 0}`);

      // Step 8: Clean up - delete the test shipment
      await prisma.shipment.delete({
        where: { id: mockShipment.id }
      });

      console.log('Test shipment cleaned up');

      result = {
        testFlow: 'complete',
        initialBalance: initialWallet?.balance || 0,
        deductionAmount: amount,
        balanceAfterDeduction: walletAfterDeduction?.balance || 0,
        refundAmount,
        finalBalance: finalWallet?.balance || 0,
        deductResult,
        refundResult,
        debitTransactions: debitTransactions.map(txn => ({
          id: txn.id,
          amount: txn.amount,
          reference: txn.reference,
          description: txn.description,
          createdAt: txn.createdAt
        })),
        balanceRestored: (finalWallet?.balance || 0) === (initialWallet?.balance || 0),
        testPassed: (finalWallet?.balance || 0) === (initialWallet?.balance || 0)
      };

    } else if (action === 'test_refund_only') {
      // Test refund functionality with a specific amount
      const refundResult = await refundToWallet(
        brandId,
        amount,
        `Test refund of ₹${amount}`,
        `TEST_REFUND_${Date.now()}`,
        undefined
      );

      result = {
        testFlow: 'refund_only',
        refundAmount: amount,
        refundResult
      };

    } else {
      return res.status(400).json({ error: 'Invalid action. Use "test_complete_flow" or "test_refund_only"' });
    }

    return res.status(200).json({
      success: true,
      brandId,
      brandName: brand.name,
      testResult: result
    });

  } catch (error) {
    console.error('Refund flow test error:', error);
    return res.status(500).json({
      error: 'Refund flow test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}