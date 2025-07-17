import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { checkEnhancedWalletBalance } from '@/lib/enhanced-wallet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handleCreateDistributorShipment(req, res);
  } else if (req.method === 'GET') {
    return handleGetDistributorShipments(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleCreateDistributorShipment(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = authResult;
    const { 
      recipientId, 
      recipientType, 
      parts, 
      boxes, 
      priority = 'MEDIUM', 
      notes 
    } = req.body;

    // Only brands can create distributor shipments
    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied. Only brands can create distributor shipments.' });
    }

    // Validate required fields
    if (!recipientId || !parts || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: recipientId, parts' 
      });
    }

    // Verify recipient is a distributor authorized for this brand
    const distributor = await prisma.user.findFirst({
      where: {
        id: recipientId,
        role: 'DISTRIBUTOR',
        brandId: user.id,
        status: 'ACTIVE'
      }
    });

    if (!distributor) {
      return res.status(404).json({ 
        error: 'Distributor not found or not authorized for your brand' 
      });
    }

    // Validate and fetch parts
    const partIds = parts.map((p: any) => p.partId);
    const dbParts = await prisma.part.findMany({
      where: {
        id: { in: partIds },
        brandId: user.id
      }
    });

    if (dbParts.length !== partIds.length) {
      return res.status(400).json({ 
        error: 'Some parts not found or not owned by your brand' 
      });
    }

    // Check stock availability
    const stockIssues = [];
    for (const partRequest of parts) {
      const dbPart = dbParts.find(p => p.id === partRequest.partId);
      if (dbPart && dbPart.stock < partRequest.quantity) {
        stockIssues.push({
          partCode: dbPart.code,
          requested: partRequest.quantity,
          available: dbPart.stock
        });
      }
    }

    if (stockIssues.length > 0) {
      return res.status(400).json({
        error: 'Insufficient stock for some parts',
        stockIssues
      });
    }

    // Calculate totals
    let totalWeight = 0;
    let totalValue = 0;
    const shipmentParts = [];

    for (const partRequest of parts) {
      const dbPart = dbParts.find(p => p.id === partRequest.partId);
      if (dbPart) {
        const partWeight = dbPart.weight * partRequest.quantity;
        const partValue = dbPart.price * partRequest.quantity;
        
        totalWeight += partWeight;
        totalValue += partValue;
        
        shipmentParts.push({
          partId: dbPart.id,
          quantity: partRequest.quantity,
          unitPrice: dbPart.price,
          totalPrice: partValue,
          weight: partWeight
        });
      }
    }

    // Estimate shipping cost (simplified)
    const estimatedShippingCost = Math.max(50, totalWeight * 0.01); // Minimum ₹50 or ₹0.01 per gram

    // Check wallet balance
    const walletCheck = await checkEnhancedWalletBalance(user.id, estimatedShippingCost);
    if (!walletCheck.sufficient) {
      return res.status(400).json({
        error: 'Insufficient wallet balance',
        required: estimatedShippingCost,
        available: walletCheck.balance,
        shortfall: estimatedShippingCost - walletCheck.balance
      });
    }

    // Create shipment in database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create shipment
      const shipment = await tx.shipment.create({
        data: {
          brandId: user.id,
          recipientId: distributor.id,
          recipientType: 'DISTRIBUTOR',
          status: 'PENDING',
          priority: priority as 'LOW' | 'MEDIUM' | 'HIGH',
          totalWeight,
          totalValue,
          estimatedCost: estimatedShippingCost,
          notes: notes || '',
          trackingNumber: `DIST-${Date.now()}`,
          metadata: {
            distributorName: distributor.name,
            distributorEmail: distributor.email,
            createdBy: user.name,
            partsCount: parts.length,
            boxesCount: boxes?.length || 1
          }
        }
      });

      // Create shipment parts
      for (const part of shipmentParts) {
        await tx.shipmentPart.create({
          data: {
            shipmentId: shipment.id,
            partId: part.partId,
            quantity: part.quantity,
            unitPrice: part.unitPrice,
            totalPrice: part.totalPrice
          }
        });
      }

      // Create boxes if provided
      if (boxes && Array.isArray(boxes)) {
        for (let i = 0; i < boxes.length; i++) {
          const box = boxes[i];
          await tx.box.create({
            data: {
              shipmentId: shipment.id,
              boxNumber: i + 1,
              length: box.dimensions?.length || 30,
              breadth: box.dimensions?.breadth || 20,
              height: box.dimensions?.height || 15,
              weight: box.parts?.reduce((sum: number, p: any) => {
                const dbPart = dbParts.find(dp => dp.id === p.partId);
                return sum + (dbPart ? dbPart.weight * p.quantity : 0);
              }, 0) || 0,
              value: box.parts?.reduce((sum: number, p: any) => {
                const dbPart = dbParts.find(dp => dp.id === p.partId);
                return sum + (dbPart ? dbPart.price * p.quantity : 0);
              }, 0) || 0
            }
          });
        }
      } else {
        // Create default box
        await tx.box.create({
          data: {
            shipmentId: shipment.id,
            boxNumber: 1,
            length: 30,
            breadth: 20,
            height: 15,
            weight: totalWeight,
            value: totalValue
          }
        });
      }

      // Update part stock
      for (const partRequest of parts) {
        await tx.part.update({
          where: { id: partRequest.partId },
          data: {
            stock: {
              decrement: partRequest.quantity
            }
          }
        });
      }

      // Deduct from wallet
      await tx.wallet.update({
        where: { userId: user.id },
        data: {
          balance: {
            decrement: estimatedShippingCost
          }
        }
      });

      // Create wallet transaction
      await tx.walletTransaction.create({
        data: {
          walletId: (await tx.wallet.findUnique({ where: { userId: user.id } }))!.id,
          type: 'DEBIT',
          amount: estimatedShippingCost,
          description: `Distributor shipment to ${distributor.name}`,
          reference: shipment.id,
          metadata: {
            shipmentId: shipment.id,
            recipientType: 'DISTRIBUTOR',
            recipientName: distributor.name
          }
        }
      });

      return shipment;
    });

    // Generate AWB number (simplified - in production, integrate with courier API)
    const awbNumber = `AWB${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Update shipment with AWB
    await prisma.shipment.update({
      where: { id: result.id },
      data: { 
        awbNumber,
        status: 'CONFIRMED'
      }
    });

    // Create notification for distributor
    await prisma.notification.create({
      data: {
        recipients: [distributor.id],
        type: 'SHIPMENT_CREATED',
        priority: 'MEDIUM',
        title: 'New Shipment Received',
        message: `You have received a new shipment from ${user.name}. AWB: ${awbNumber}`,
        data: {
          shipmentId: result.id,
          awbNumber,
          brandName: user.name,
          totalValue,
          partsCount: parts.length
        },
        actionRequired: false,
        actionUrl: `/dashboard/distributor?tab=shipments&shipment=${result.id}`
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Distributor shipment created successfully',
      shipmentId: result.id,
      awbNumber,
      trackingNumber: result.trackingNumber,
      estimatedCost: estimatedShippingCost,
      totalValue,
      totalWeight,
      distributorName: distributor.name,
      distributorEmail: distributor.email
    });

  } catch (error) {
    console.error('Error creating distributor shipment:', error);
    return res.status(500).json({
      error: 'Failed to create distributor shipment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGetDistributorShipments(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = authResult;
    const { limit = 20, offset = 0, status, search } = req.query;

    // Only brands can view distributor shipments
    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied. Only brands can view distributor shipments.' });
    }

    // Build where clause
    let whereClause: any = {
      brandId: user.id,
      recipientType: 'DISTRIBUTOR'
    };

    if (status && typeof status === 'string') {
      whereClause.status = status;
    }

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { awbNumber: { contains: search, mode: 'insensitive' } },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { recipient: { name: { contains: search, mode: 'insensitive' } } },
        { recipient: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Fetch shipments
    const shipments = await prisma.shipment.findMany({
      where: whereClause,
      include: {
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            pincode: true
          }
        },
        shipmentParts: {
          include: {
            part: {
              select: {
                id: true,
                name: true,
                code: true,
                weight: true
              }
            }
          }
        },
        boxes: true
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    // Get total count
    const totalCount = await prisma.shipment.count({
      where: whereClause
    });

    return res.status(200).json({
      success: true,
      shipments,
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + shipments.length < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching distributor shipments:', error);
    return res.status(500).json({
      error: 'Failed to fetch distributor shipments',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}