import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthUser } from '@/lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse, user: AuthUser) {
  try {
    console.log('Service Tickets API - User:', user.email, user.role);
    
    if (user.role !== 'CUSTOMER') {
      return res.status(403).json({ success: false, message: 'Access denied. Only customers can access service tickets.' });
    }

    if (req.method === 'GET') {
      // Get service tickets for the customer
      const serviceTickets = await prisma.serviceTicket.findMany({
        where: {
          warranty: {
            customerId: user.id
          }
        },
        include: {
          warranty: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({
        success: true,
        serviceTickets
      });
    }

    if (req.method === 'POST') {
      const { warrantyId, issue, description } = req.body;

      if (!warrantyId || !issue) {
        return res.status(400).json({
          success: false,
          message: 'Warranty ID and issue type are required'
        });
      }

      // Verify warranty belongs to the customer
      const warranty = await prisma.warranty.findFirst({
        where: {
          id: warrantyId,
          customerId: user.id
        }
      });

      if (!warranty) {
        return res.status(404).json({
          success: false,
          message: 'Warranty not found'
        });
      }

      // Check if warranty is still active
      const expiryDate = new Date(warranty.purchaseDate);
      expiryDate.setMonth(expiryDate.getMonth() + warranty.warrantyPeriod);
      
      if (new Date() > expiryDate) {
        return res.status(400).json({
          success: false,
          message: 'Warranty has expired'
        });
      }

      // Generate ticket number
      const ticketCount = await prisma.serviceTicket.count();
      const ticketNumber = `ST${String(ticketCount + 1).padStart(6, '0')}`;

      const serviceTicket = await prisma.serviceTicket.create({
        data: {
          ticketNumber,
          warrantyId,
          issue,
          description: description || '',
          status: 'OPEN'
        },
        include: {
          warranty: true
        }
      });

      // Create notification for admin
      try {
        await prisma.notification.create({
          data: {
            type: 'SERVICE_TICKET',
            title: 'New Service Ticket Created',
            message: `Service ticket ${ticketNumber} created for ${warranty.partName}`,
            data: {
              ticketId: serviceTicket.id,
              ticketNumber,
              customerId: user.id,
              customerName: user.name
            }
          }
        });
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't fail the main request if notification fails
      }

      return res.status(201).json({
        success: true,
        serviceTicket
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Service tickets API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export default withAuth(handler);