import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getSpareRequests(req, res);
      case 'POST':
        return await createSpareRequest(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Service Center Spare Requests API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getSpareRequests(req: NextApiRequest, res: NextApiResponse) {
  const { serviceCenterProfileId, status, page = 1, limit = 10 } = req.query;

  const where: any = {};
  
  if (serviceCenterProfileId) {
    where.serviceCenterProfileId = serviceCenterProfileId as string;
  }
  
  if (status) {
    where.status = status as string;
  }

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [spareRequests, total] = await Promise.all([
    prisma.spareRequest.findMany({
      where,
      include: {
        part: {
          include: {
            brand: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        serviceCenterProfile: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit as string)
    }),
    prisma.spareRequest.count({ where })
  ]);

  return res.status(200).json({
    spareRequests,
    pagination: {
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    }
  });
}

async function createSpareRequest(req: NextApiRequest, res: NextApiResponse) {
  const {
    serviceCenterProfileId,
    partId,
    quantity,
    urgency = 'MEDIUM',
    reason,
    notes,
    requiredBy,
    requestToType = 'BRAND' // BRAND or DISTRIBUTOR
  } = req.body;

  if (!serviceCenterProfileId || !partId || !quantity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Generate unique request number
  const requestNumber = `SR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Get part details to determine brand
  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: { brand: true }
  });

  if (!part) {
    return res.status(404).json({ error: 'Part not found' });
  }

  const spareRequest = await prisma.spareRequest.create({
    data: {
      requestNumber,
      serviceCenterProfileId,
      partId,
      quantity: parseInt(quantity),
      urgency,
      reason,
      notes,
      requiredBy: requiredBy ? new Date(requiredBy) : null,
      brandId: requestToType === 'BRAND' ? part.brandId : null,
      // distributorId: requestToType === 'DISTRIBUTOR' ? distributorId : null, // TODO: Add distributor selection logic
    },
    include: {
      part: {
        include: {
          brand: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      serviceCenterProfile: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  });

  // Create notification for brand/distributor
  if (part.brandId) {
    await prisma.notification.create({
      data: {
        userId: part.brandId,
        title: 'New Spare Request',
        message: `Service center ${spareRequest.serviceCenterProfile.user.name} has requested ${quantity} units of ${part.name}`,
        type: 'SPARE_REQUEST',
        relatedId: spareRequest.id
      }
    });
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: spareRequest.serviceCenterProfile.userId,
      action: 'SPARE_REQUEST_CREATED',
      details: JSON.stringify({
        requestNumber,
        partId,
        partName: part.name,
        quantity,
        urgency
      })
    }
  });

  return res.status(201).json(spareRequest);
}