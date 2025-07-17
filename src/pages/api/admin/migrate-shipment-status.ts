import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('🔄 Starting shipment status migration...');

    // Update all DISPATCHED shipments to IN_TRANSIT
    const updateResult = await prisma.shipment.updateMany({
      where: {
        status: 'DISPATCHED'
      },
      data: {
        status: 'IN_TRANSIT',
        inTransitAt: new Date()
      }
    });

    console.log(`✅ Updated ${updateResult.count} shipments from DISPATCHED to IN_TRANSIT`);

    // Get current status distribution
    const statusCounts = await prisma.shipment.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    return res.status(200).json({
      success: true,
      message: `Successfully migrated ${updateResult.count} shipments`,
      updatedCount: updateResult.count,
      currentStatusDistribution: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>)
    });

  } catch (error) {
    console.error('❌ Shipment status migration failed:', error);
    return res.status(500).json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}