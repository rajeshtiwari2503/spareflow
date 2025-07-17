import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

interface ShipmentPart {
  partId: string;
  quantity: number;
  unitCost?: number;
}

interface CreateShipmentRequest {
  brandId: string;
  recipientType: 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER';
  recipientId: string;
  recipientAddress: any;
  recipientPincode: string;
  parts: ShipmentPart[];
  notes?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  insurance?: any;
  declaredValue?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get user session for authentication
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { method } = req;

    if (method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${method} not allowed` });
    }

    return await handleCreateShipmentWithInventory(req, res);

  } catch (error) {
    console.error('Create shipment with inventory API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleCreateShipmentWithInventory(req: NextApiRequest, res: NextApiResponse) {
  const shipmentData: CreateShipmentRequest = req.body;

  // Validate required fields
  if (!shipmentData.brandId || !shipmentData.recipientType || !shipmentData.recipientId || !shipmentData.parts || shipmentData.parts.length === 0) {
    return res.status(400).json({ 
      error: 'Missing required fields: brandId, recipientType, recipientId, parts' 
    });
  }

  // Validate parts data
  for (const part of shipmentData.parts) {
    if (!part.partId || !part.quantity || part.quantity <= 0) {
      return res.status(400).json({ 
        error: 'Each part must have partId and positive quantity' 
      });
    }
  }

  try {
    // Start transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate inventory availability for all parts
      const inventoryChecks = await Promise.all(
        shipmentData.parts.map(async (partData) => {
          const brandInventory = await tx.brandInventory.findUnique({
            where: {
              brandId_partId: {
                brandId: shipmentData.brandId,
                partId: partData.partId
              }
            },
            include: {
              part: {
                select: {
                  code: true,
                  name: true,
                  partNumber: true,
                  costPrice: true,
                  price: true,
                  weight: true
                }
              }
            }
          });

          if (!brandInventory) {
            throw new Error(`No inventory record found for part ${partData.partId}`);
          }

          if (brandInventory.availableQuantity < partData.quantity) {
            throw new Error(`Insufficient inventory for part ${brandInventory.part.name} (${brandInventory.part.code}). Available: ${brandInventory.availableQuantity}, Required: ${partData.quantity}`);
          }

          return {
            ...partData,
            part: brandInventory.part,
            availableQuantity: brandInventory.availableQuantity
          };
        })
      );

      // 2. Calculate shipment totals
      const totalWeight = inventoryChecks.reduce((sum, item) => {
        return sum + ((item.part.weight || 0) * item.quantity);
      }, 0);

      const totalValue = inventoryChecks.reduce((sum, item) => {
        const unitCost = item.unitCost || item.part.costPrice || item.part.price || 0;
        return sum + (unitCost * item.quantity);
      }, 0);

      const numBoxes = Math.ceil(shipmentData.parts.length / 5); // Simplified box calculation

      // 3. Create shipment record
      const shipment = await tx.shipment.create({
        data: {
          brandId: shipmentData.brandId,
          serviceCenterId: shipmentData.recipientType === 'SERVICE_CENTER' ? shipmentData.recipientId : null,
          distributorId: shipmentData.recipientType === 'DISTRIBUTOR' ? shipmentData.recipientId : null,
          recipientId: shipmentData.recipientId,
          recipientType: shipmentData.recipientType,
          recipientAddress: JSON.stringify(shipmentData.recipientAddress),
          recipientPincode: shipmentData.recipientPincode,
          numBoxes,
          totalWeight,
          totalValue: shipmentData.declaredValue || totalValue,
          declaredValue: shipmentData.declaredValue || totalValue,
          notes: shipmentData.notes,
          priority: shipmentData.priority || 'MEDIUM',
          insurance: shipmentData.insurance ? JSON.stringify(shipmentData.insurance) : null,
          status: 'INITIATED'
        }
      });

      // 4. Create boxes and box parts
      const boxes = [];
      const partsPerBox = Math.ceil(shipmentData.parts.length / numBoxes);
      
      for (let i = 0; i < numBoxes; i++) {
        const boxParts = inventoryChecks.slice(i * partsPerBox, (i + 1) * partsPerBox);
        const boxWeight = boxParts.reduce((sum, item) => {
          return sum + ((item.part.weight || 0) * item.quantity);
        }, 0);

        const box = await tx.box.create({
          data: {
            shipmentId: shipment.id,
            boxNumber: `BOX-${String(i + 1).padStart(3, '0')}`,
            weight: boxWeight,
            status: 'PENDING'
          }
        });

        // Create box parts
        for (const partData of boxParts) {
          await tx.boxPart.create({
            data: {
              boxId: box.id,
              partId: partData.partId,
              quantity: partData.quantity
            }
          });
        }

        boxes.push(box);
      }

      // 5. Reserve inventory for this shipment
      for (const partData of shipmentData.parts) {
        const brandInventory = await tx.brandInventory.findUnique({
          where: {
            brandId_partId: {
              brandId: shipmentData.brandId,
              partId: partData.partId
            }
          }
        });

        if (brandInventory) {
          await tx.brandInventory.update({
            where: {
              brandId_partId: {
                brandId: shipmentData.brandId,
                partId: partData.partId
              }
            },
            data: {
              reservedQuantity: brandInventory.reservedQuantity + partData.quantity,
              availableQuantity: brandInventory.availableQuantity - partData.quantity,
              lastUpdated: new Date()
            }
          });
        }
      }

      // 6. Create inventory ledger entries for reservation
      for (const partData of inventoryChecks) {
        await tx.inventoryLedger.create({
          data: {
            brandId: shipmentData.brandId,
            partId: partData.partId,
            partNumber: partData.part.partNumber || partData.part.code,
            actionType: 'TRANSFER_OUT',
            quantity: partData.quantity,
            source: 'BRAND',
            destination: shipmentData.recipientType,
            shipmentId: shipment.id,
            referenceNote: `Reserved for shipment to ${shipmentData.recipientType} (${shipmentData.recipientId})`,
            createdBy: 'SYSTEM',
            unitCost: partData.unitCost || partData.part.costPrice || partData.part.price || 0,
            totalValue: (partData.unitCost || partData.part.costPrice || partData.part.price || 0) * partData.quantity,
            balanceAfter: partData.availableQuantity // This will be updated when shipment is confirmed
          }
        });
      }

      return {
        shipment,
        boxes,
        inventoryChecks
      };
    });

    // Return success response with shipment details
    return res.status(201).json({
      success: true,
      data: {
        shipment: result.shipment,
        boxes: result.boxes,
        message: 'Shipment created successfully with inventory reservation',
        inventoryImpact: {
          partsReserved: result.inventoryChecks.length,
          totalQuantityReserved: result.inventoryChecks.reduce((sum, item) => sum + item.quantity, 0),
          totalValueReserved: result.inventoryChecks.reduce((sum, item) => {
            const unitCost = item.unitCost || item.part.costPrice || item.part.price || 0;
            return sum + (unitCost * item.quantity);
          }, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error creating shipment with inventory:', error);
    return res.status(500).json({ 
      error: 'Failed to create shipment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}