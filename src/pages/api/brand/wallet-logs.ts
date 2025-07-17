import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const user = await verifyToken(req);
    if (!user || user.role !== 'BRAND') {
      return res.status(401).json({ error: 'Access denied. Brand access required.' });
    }

    if (req.method === 'GET') {
      const brandId = user.id;
      const { days = '30' } = req.query;

      // Calculate date range
      const daysAgo = parseInt(days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch wallet logs for the brand
      const logs = await prisma.walletTransaction.findMany({
        where: {
          userId: brandId,
          createdAt: {
            gte: startDate
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      // Format logs for response
      const formattedLogs = logs.map(log => ({
        id: log.id,
        walletId: `wallet-${brandId}`, // Mock wallet ID
        type: log.type,
        amount: log.amount,
        description: log.description,
        refShipmentId: log.refShipmentId,
        refOrderId: log.refOrderId,
        balanceAfter: log.balanceAfter,
        createdAt: log.createdAt
      }));

      res.status(200).json({
        logs: formattedLogs,
        totalCount: logs.length,
        dateRange: {
          from: startDate.toISOString(),
          to: new Date().toISOString(),
          days: daysAgo
        }
      });

    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in brand wallet logs API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}