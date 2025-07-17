import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Mock wallet transactions for distributor
    const mockTransactions = [
      {
        id: 'txn-001',
        type: 'CREDIT',
        amount: 50000,
        description: 'Monthly revenue settlement',
        orderId: 'order-001',
        status: 'COMPLETED',
        timestamp: '2024-01-15T10:30:00Z',
        reference: 'REV_SETTLE_001',
        category: 'ORDER_PAYMENT'
      },
      {
        id: 'txn-002',
        type: 'DEBIT',
        amount: 2500,
        description: 'Shipping cost - Order PO-2024-001',
        orderId: 'order-002',
        status: 'COMPLETED',
        timestamp: '2024-01-15T09:15:00Z',
        reference: 'SHIP_COST_001',
        category: 'ORDER_PAYMENT'
      },
      {
        id: 'txn-003',
        type: 'CREDIT',
        amount: 25000,
        description: 'Commission payment - Q4 2023',
        status: 'COMPLETED',
        timestamp: '2024-01-14T16:45:00Z',
        reference: 'COMM_Q4_2023',
        category: 'COMMISSION'
      },
      {
        id: 'txn-004',
        type: 'DEBIT',
        amount: 1800,
        description: 'Shipping cost - Order PO-2024-002',
        orderId: 'order-003',
        status: 'COMPLETED',
        timestamp: '2024-01-14T11:20:00Z',
        reference: 'SHIP_COST_002',
        category: 'ORDER_PAYMENT'
      },
      {
        id: 'txn-005',
        type: 'CREDIT',
        amount: 75000,
        description: 'Bulk order payment settlement',
        orderId: 'order-004',
        status: 'COMPLETED',
        timestamp: '2024-01-13T14:30:00Z',
        reference: 'BULK_SETTLE_001',
        category: 'ORDER_PAYMENT'
      },
      {
        id: 'txn-006',
        type: 'DEBIT',
        amount: 500,
        description: 'Platform fee - January 2024',
        status: 'COMPLETED',
        timestamp: '2024-01-12T08:00:00Z',
        reference: 'PLATFORM_FEE_JAN24',
        category: 'PENALTY'
      },
      {
        id: 'txn-007',
        type: 'CREDIT',
        amount: 15000,
        description: 'Performance bonus - December 2023',
        status: 'COMPLETED',
        timestamp: '2024-01-10T12:00:00Z',
        reference: 'PERF_BONUS_DEC23',
        category: 'BONUS'
      },
      {
        id: 'txn-008',
        type: 'DEBIT',
        amount: 3200,
        description: 'Express shipping - Urgent order',
        orderId: 'order-005',
        status: 'COMPLETED',
        timestamp: '2024-01-09T15:45:00Z',
        reference: 'EXPRESS_SHIP_001',
        category: 'ORDER_PAYMENT'
      },
      {
        id: 'txn-009',
        type: 'CREDIT',
        amount: 35000,
        description: 'Weekly settlement - Week 2',
        status: 'COMPLETED',
        timestamp: '2024-01-08T17:30:00Z',
        reference: 'WEEKLY_SETTLE_W2',
        category: 'ORDER_PAYMENT'
      },
      {
        id: 'txn-010',
        type: 'DEBIT',
        amount: 1200,
        description: 'Return processing fee',
        status: 'COMPLETED',
        timestamp: '2024-01-07T10:15:00Z',
        reference: 'RETURN_FEE_001',
        category: 'PENALTY'
      }
    ];

    return res.status(200).json({
      success: true,
      transactions: mockTransactions,
      summary: {
        totalCredits: mockTransactions
          .filter(t => t.type === 'CREDIT')
          .reduce((sum, t) => sum + t.amount, 0),
        totalDebits: mockTransactions
          .filter(t => t.type === 'DEBIT')
          .reduce((sum, t) => sum + t.amount, 0),
        currentBalance: 125000,
        pendingTransactions: 0
      }
    });

  } catch (error) {
    console.error('Error fetching distributor wallet data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}