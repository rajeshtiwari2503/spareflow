import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { trackShipment } from '@/lib/dtdc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerId, orderId, awbNumber } = req.query;

    let whereClause: any = {};

    if (orderId) {
      whereClause.id = orderId as string;
    } else if (awbNumber) {
      whereClause.awbNumber = awbNumber as string;
    } else if (customerId) {
      whereClause.customerId = customerId as string;
    }

    const customerOrders = await prisma.customerOrder.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, name: true, email: true }
        },
        part: {
          select: { 
            id: true, 
            code: true, 
            name: true, 
            description: true, 
            weight: true, 
            price: true,
            brand: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get tracking information for orders with AWB numbers
    const trackingData = await Promise.all(
      customerOrders.map(async (order) => {
        let trackingInfo = null;
        
        if (order.awbNumber && order.status === 'SHIPPED') {
          try {
            const tracking = await trackShipment(order.awbNumber);
            if (tracking.success) {
              trackingInfo = {
                currentStatus: tracking.current_status,
                location: tracking.location,
                timestamp: tracking.timestamp,
                description: tracking.description,
                trackingHistory: tracking.tracking_history
              };
            }
          } catch (error) {
            console.error(`Failed to track order ${order.id}:`, error);
          }
        }

        return {
          orderId: order.id,
          awbNumber: order.awbNumber,
          status: order.status,
          quantity: order.quantity,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          customer: order.customer,
          part: order.part,
          tracking: trackingInfo
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: trackingData
    });

  } catch (error) {
    console.error('Error fetching customer order tracking:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch customer order tracking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}