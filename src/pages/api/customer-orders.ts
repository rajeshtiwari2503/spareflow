import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withAuth, AuthUser } from '@/lib/auth'

async function handler(req: NextApiRequest, res: NextApiResponse, user: AuthUser) {
  if (req.method === 'GET') {
    try {
      console.log('Fetching customer orders for user:', user.email, user.role);
      
      // Only allow CUSTOMER role to access this endpoint
      if (user.role !== 'CUSTOMER') {
        return res.status(403).json({ 
          success: false, 
          error: 'Access denied. Only customers can view customer orders.' 
        });
      }
      
      const customerOrders = await prisma.customerOrder.findMany({
        where: {
          customerId: user.id
        },
        include: {
          customer: true,
          part: {
            include: {
              brand: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      
      console.log('Found customer orders:', customerOrders.length);
      
      // Transform to match expected interface
      const transformedOrders = customerOrders.map(order => ({
        id: order.id,
        orderNumber: order.awbNumber || `ORD-${order.id.slice(-6)}`,
        status: order.status,
        totalAmount: (order.part.price * order.quantity),
        createdAt: order.createdAt.toISOString(),
        items: [{
          id: order.id,
          partId: order.partId,
          part: {
            ...order.part,
            partNumber: order.part.code,
            model: 'Universal',
            category: order.part.category || 'General',
            stock: 50,
            images: order.part.imageUrls ? JSON.parse(order.part.imageUrls) : [],
            specifications: order.part.specifications ? JSON.parse(order.part.specifications) : {},
            dimensions: {
              length: order.part.length || 10,
              breadth: order.part.breadth || 5,
              height: order.part.height || 3
            },
            estimatedDelivery: '2-3 business days',
            availability: 'IN_STOCK' as const
          },
          quantity: order.quantity,
          price: order.part.price
        }],
        shippingAddress: null,
        awbNumber: order.awbNumber,
        trackingUrl: order.awbNumber ? `https://www.dtdc.in/tracking/track_results.asp?strCnno=${order.awbNumber}` : undefined,
        paymentStatus: 'PAID',
        paymentMethod: 'UPI'
      }))
      
      res.status(200).json({
        success: true,
        orders: transformedOrders
      })
    } catch (error) {
      console.error('Error fetching customer orders:', error)
      res.status(500).json({ success: false, error: 'Failed to fetch customer orders' })
    }
  } else if (req.method === 'POST') {
    try {
      const { customerId, partId, quantity, awbNumber, status } = req.body
      
      const customerOrder = await prisma.customerOrder.create({
        data: {
          customerId,
          partId,
          quantity: parseInt(quantity),
          awbNumber,
          status: status || 'PENDING',
        },
        include: {
          customer: true,
          part: {
            include: {
              brand: true,
            },
          },
        },
      })
      
      res.status(201).json({
        success: true,
        order: customerOrder
      })
    } catch (error) {
      console.error('Error creating customer order:', error)
      res.status(500).json({ success: false, error: 'Failed to create customer order' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

export default withAuth(handler);