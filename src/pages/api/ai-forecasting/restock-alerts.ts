import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.method === 'GET') {
      const { brandId, status = 'PENDING', limit = '20' } = req.query;

      // Build where clause based on user role
      const where: any = { status: status as string };
      
      if (user.role === 'BRAND') {
        where.brandId = user.id;
      } else if (brandId && (user.role === 'SUPER_ADMIN' || user.role === 'DISTRIBUTOR')) {
        where.brandId = brandId as string;
      } else if (user.role === 'SUPER_ADMIN') {
        // Super admin can see all alerts
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);

      // Fetch forecasting alerts
      const alerts = await prisma.forecastingAlert.findMany({
        where,
        include: {
          part: {
            select: {
              id: true,
              code: true,
              name: true,
              price: true,
              stockQuantity: true,
              minStockLevel: true
            }
          },
          brand: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limitNum
      });

      // Calculate summary statistics
      const totalAlerts = await prisma.forecastingAlert.count({ where });
      const criticalAlerts = await prisma.forecastingAlert.count({
        where: { ...where, recommendedQuantity: { gte: 100 } }
      });

      res.status(200).json({
        success: true,
        data: {
          alerts,
          summary: {
            total: totalAlerts,
            critical: criticalAlerts,
            pending: alerts.filter(a => a.status === 'PENDING').length,
            approved: alerts.filter(a => a.status === 'APPROVED').length
          }
        }
      });

    } else if (req.method === 'POST') {
      // Create new restock alert
      if (user.role !== 'BRAND' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { partId, district, forecastedDemand, availableStock, recommendedQuantity } = req.body;

      if (!partId || !district || !forecastedDemand || !recommendedQuantity) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['partId', 'district', 'forecastedDemand', 'recommendedQuantity']
        });
      }

      // Verify part exists and belongs to brand (if user is brand)
      const part = await prisma.part.findUnique({
        where: { id: partId },
        select: { id: true, brandId: true, name: true, stockQuantity: true }
      });

      if (!part) {
        return res.status(404).json({ error: 'Part not found' });
      }

      if (user.role === 'BRAND' && part.brandId !== user.id) {
        return res.status(403).json({ error: 'Access denied - part does not belong to your brand' });
      }

      const alert = await prisma.forecastingAlert.create({
        data: {
          partId,
          brandId: part.brandId,
          district,
          forecastedDemand: parseInt(forecastedDemand),
          availableStock: availableStock || part.stockQuantity,
          recommendedQuantity: parseInt(recommendedQuantity),
          status: 'PENDING'
        },
        include: {
          part: {
            select: {
              id: true,
              code: true,
              name: true,
              price: true
            }
          },
          brand: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        data: alert,
        message: 'Restock alert created successfully'
      });

    } else if (req.method === 'PUT') {
      // Update alert status
      if (user.role !== 'BRAND' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { id, status, notes } = req.body;

      if (!id || !status) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['id', 'status']
        });
      }

      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ 
          error: 'Invalid status',
          validStatuses: ['PENDING', 'APPROVED', 'REJECTED']
        });
      }

      // Check if alert exists and user has permission
      const existingAlert = await prisma.forecastingAlert.findUnique({
        where: { id },
        select: { id: true, brandId: true }
      });

      if (!existingAlert) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      if (user.role === 'BRAND' && existingAlert.brandId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updatedAlert = await prisma.forecastingAlert.update({
        where: { id },
        data: { 
          status,
          updatedAt: new Date()
        },
        include: {
          part: {
            select: {
              id: true,
              code: true,
              name: true,
              price: true
            }
          },
          brand: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        data: updatedAlert,
        message: `Alert ${status.toLowerCase()} successfully`
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }

  } catch (error) {
    console.error('Error in restock alerts API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}