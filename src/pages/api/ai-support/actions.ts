import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { action, userId, userRole, ...actionData } = req.body;

    if (!action || !userId || !userRole) {
      return res.status(400).json({ 
        error: 'Action, userId, and userRole are required' 
      });
    }

    switch (action) {
      case 'ORDER_PART':
        return await handleOrderPart(req, res, userId, userRole, actionData);
      
      case 'REQUEST_TECHNICIAN':
        return await handleRequestTechnician(req, res, userId, userRole, actionData);
      
      case 'CREATE_REVERSE_REQUEST':
        return await handleCreateReverseRequest(req, res, userId, userRole, actionData);
      
      default:
        return res.status(400).json({ error: 'Invalid action type' });
    }

  } catch (error) {
    console.error('Error in AI support actions:', error);
    res.status(500).json({ 
      error: 'Failed to process action',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleOrderPart(
  req: NextApiRequest, 
  res: NextApiResponse, 
  userId: string, 
  userRole: string, 
  actionData: any
) {
  const { partId, quantity = 1, customerInfo } = actionData;

  if (!partId) {
    return res.status(400).json({ error: 'Part ID is required' });
  }

  // Verify the part exists
  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: { brand: true }
  });

  if (!part) {
    return res.status(404).json({ error: 'Part not found' });
  }

  if (userRole === 'CUSTOMER') {
    // Create customer order
    const customerOrder = await prisma.customerOrder.create({
      data: {
        customerId: userId,
        partId: partId,
        quantity: quantity,
        status: 'PENDING'
      },
      include: {
        part: {
          include: { brand: true }
        },
        customer: true
      }
    });

    // Create notification for brand
    await prisma.notification.create({
      data: {
        type: 'PURCHASE_ORDER_CREATED',
        title: 'New Customer Order via AI Support',
        message: `Customer ${customerOrder.customer.name} ordered ${quantity}x ${part.name} (${part.code}) through AI diagnosis`,
        partId: part.id,
        partCode: part.code,
        partName: part.name,
        brandId: part.brandId,
        priority: 'MEDIUM'
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Order placed successfully',
      order: {
        id: customerOrder.id,
        partName: part.name,
        partCode: part.code,
        quantity: quantity,
        totalPrice: part.price * quantity,
        status: customerOrder.status,
        estimatedDelivery: '3-5 business days'
      }
    });

  } else if (userRole === 'SERVICE_CENTER') {
    // For service centers, we might want to create a different type of request
    // or add to their inventory request system
    return res.status(200).json({
      success: true,
      message: 'Part request noted. Please contact your brand representative for procurement.',
      recommendation: {
        partName: part.name,
        partCode: part.code,
        brandContact: part.brand.name,
        suggestedAction: 'Contact brand for part availability and ordering process'
      }
    });
  }

  return res.status(400).json({ error: 'Invalid user role for ordering parts' });
}

async function handleRequestTechnician(
  req: NextApiRequest, 
  res: NextApiResponse, 
  userId: string, 
  userRole: string, 
  actionData: any
) {
  const { issue, severity, contactInfo, preferredTime, location } = actionData;

  if (!issue) {
    return res.status(400).json({ error: 'Issue description is required' });
  }

  if (userRole !== 'CUSTOMER') {
    return res.status(400).json({ error: 'Only customers can request technician visits' });
  }

  // Get customer details
  const customer = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Create a technician request (we'll store this as a special type of customer order)
  const technicianRequest = await prisma.customerOrder.create({
    data: {
      customerId: userId,
      partId: null, // No specific part for technician visit
      quantity: 1,
      status: 'PENDING',
      // We could extend the schema to include technician request details
      // For now, we'll use the existing structure
    }
  });

  // Create notification for admin/service management
  await prisma.notification.create({
    data: {
      type: 'MSL_ALERT', // Reusing existing type, could add TECHNICIAN_REQUEST
      title: 'Technician Visit Requested via AI Support',
      message: `Customer ${customer.name} (${customer.email}) requested technician visit for: ${issue}. Severity: ${severity}`,
      brandId: userId, // This might need adjustment based on your notification system
      priority: severity === 'CRITICAL' ? 'CRITICAL' : 
                severity === 'HIGH' ? 'HIGH' : 'MEDIUM'
    }
  });

  return res.status(200).json({
    success: true,
    message: 'Technician visit requested successfully',
    request: {
      id: technicianRequest.id,
      issue: issue,
      severity: severity,
      status: 'PENDING',
      estimatedResponse: severity === 'CRITICAL' ? 'Within 4 hours' :
                        severity === 'HIGH' ? 'Within 24 hours' : 
                        'Within 2-3 business days',
      nextSteps: [
        'Our support team will contact you within 2 hours',
        'A qualified technician will be assigned to your case',
        'You will receive a confirmation call before the visit',
        'Please keep the device accessible for inspection'
      ]
    }
  });
}

async function handleCreateReverseRequest(
  req: NextApiRequest, 
  res: NextApiResponse, 
  userId: string, 
  userRole: string, 
  actionData: any
) {
  const { partId, reason, quantity = 1 } = actionData;

  if (!partId || !reason) {
    return res.status(400).json({ 
      success: false,
      error: 'Part ID and reason are required' 
    });
  }

  if (userRole !== 'SERVICE_CENTER') {
    return res.status(400).json({ 
      success: false,
      error: 'Only service centers can create reverse requests' 
    });
  }

  try {
    // Verify the part exists
    const part = await prisma.part.findUnique({
      where: { id: partId },
      include: { brand: true }
    });

    if (!part) {
      return res.status(404).json({ 
        success: false,
        error: 'Part not found' 
      });
    }

    // Get service center details
    const serviceCenter = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!serviceCenter) {
      return res.status(404).json({ 
        success: false,
        error: 'Service center not found' 
      });
    }

    // Create reverse request
    const reverseRequest = await prisma.reverseRequest.create({
      data: {
        serviceCenterId: userId,
        partId: partId,
        reason: `AI Diagnosis: ${reason}`,
        status: 'REQUESTED'
      },
      include: {
        part: {
          include: { brand: true }
        },
        serviceCenter: true
      }
    });

    // Create notification for brand (with error handling)
    try {
      await prisma.notification.create({
        data: {
          userId: part.brandId || userId, // Fallback to userId if brandId is null
          title: 'Reverse Request via AI Support',
          message: `Service Center ${serviceCenter.name} requested return of ${quantity}x ${part.name} (${part.code}). Reason: AI Diagnosis - ${reason}`,
          type: 'REVERSE_REQUEST',
          relatedId: reverseRequest.id
        }
      });
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Continue execution even if notification fails
    }

    return res.status(200).json({
      success: true,
      message: 'Reverse request created successfully',
      request: {
        id: reverseRequest.id,
        partName: part.name,
        partCode: part.code,
        quantity: quantity,
        reason: reason,
        status: reverseRequest.status,
        nextSteps: [
          'Brand will review your reverse request',
          'You will receive approval/rejection notification',
          'If approved, return shipping label will be provided',
          'Track the return status in your dashboard'
        ]
      }
    });
  } catch (error) {
    console.error('Error creating reverse request:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create reverse request. Please try again.'
    });
  }
}