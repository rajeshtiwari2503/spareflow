import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user || authResult.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.method === 'GET') {
      const { brandId, page = '1', limit = '50' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause - WalletTransaction is directly linked to User, not through wallet
      const where: any = {};
      if (brandId) {
        where.userId = brandId as string;
      }

      // Fetch transactions with user information (since WalletTransaction -> User relationship exists)
      const [transactions, totalCount] = await Promise.all([
        prisma.walletTransaction.findMany({
          where,
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true }
            },
            purchaseOrder: {
              select: { id: true, orderNumber: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.walletTransaction.count({ where })
      ]);

      res.status(200).json({
        transactions,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          hasNext: pageNum * limitNum < totalCount,
          hasPrev: pageNum > 1
        }
      });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error fetching wallet logs:', error);
    res.status(500).json({ error: 'Failed to fetch wallet logs' });
  }
}