import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { generateAWB } from '@/lib/dtdc-production-ready';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid shipment ID' });
  }

  try {
    console.log('🔄 Starting AWB regeneration for shipment:', id);

    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = authResult;

    // Only allow SUPER_ADMIN or BRAND users
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get shipment with all required details
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        brand: true,
        serviceCenter: {
          include: {
            serviceCenterProfile: {
              include: {
                addresses: true
              }
            }
          }
        },
        distributor: {
          include: {
            distributorProfile: {
              include: {
                address: true
              }
            }
          }
        },
        boxes: {
          include: {
            boxParts: {
              include: {
                part: true
              }
            }
          }
        }
      }
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Check if user has permission to regenerate AWB for this shipment
    if (user.role === 'BRAND' && shipment.brandId !== user.id) {
      return res.status(403).json({ error: 'You can only regenerate AWB for your own shipments' });
    }

    // Check if shipment is in a state where AWB can be regenerated
    if (shipment.status === 'DELIVERED' || shipment.status === 'CANCELLED') {
      return res.status(400).json({ 
        error: 'Cannot regenerate AWB for delivered or cancelled shipments' 
      });
    }

    // Get recipient details
    const recipient = shipment.recipientType === 'SERVICE_CENTER' 
      ? shipment.serviceCenter 
      : shipment.distributor;

    const recipientAddress = shipment.recipientType === 'SERVICE_CENTER'
      ? shipment.serviceCenter?.serviceCenterProfile?.addresses?.[0]
      : shipment.distributor?.distributorProfile?.address;

    if (!recipient || !recipientAddress) {
      return res.status(400).json({ error: 'Recipient or address not found' });
    }

    console.log('📦 Regenerating AWB for shipment:', {
      shipmentId: id,
      recipient: recipient.name,
      weight: shipment.totalWeight,
      boxes: shipment.boxes.length
    });

    // Generate new AWB
    const awbResult = await generateAWB({
      shipmentId: shipment.id,
      recipientName: recipient.name,
      recipientPhone: recipient.phone || '9999999999',
      recipientAddress: {
        street: recipientAddress.street || '',
        area: recipientAddress.area || '',
        city: recipientAddress.city || '',
        state: recipientAddress.state || '',
        pincode: recipientAddress.pincode || '400001',
        country: recipientAddress.country || 'India'
      },
      weight: shipment.totalWeight || 0.5,
      declaredValue: shipment.totalValue || 1000,
      numBoxes: shipment.boxes.length,
      priority: shipment.priority || 'MEDIUM',
      // Required fields for DTDC API
      consignee_name: recipient.name,
      consignee_phone: recipient.phone || '9999999999',
      consignee_address: recipientAddress.street || '',
      consignee_city: recipientAddress.city || '',
      consignee_state: recipientAddress.state || '',
      consignee_pincode: recipientAddress.pincode || '400001',
      pieces: shipment.boxes.length
    });

    if (awbResult.success && awbResult.awb_number) {
      // Update shipment with new AWB
      const updatedShipment = await prisma.shipment.update({
        where: { id },
        data: {
          awbNumber: awbResult.awb_number,
          status: 'CONFIRMED',
          dtdcData: JSON.stringify({
            ...awbResult.dtdcResponse,
            regeneratedAt: new Date().toISOString(),
            regeneratedBy: user.id
          })
        }
      });

      // Create notification
      try {
        await prisma.notification.create({
          data: {
            title: 'AWB Regenerated',
            message: `AWB number ${awbResult.awb_number} has been generated for shipment ${id}`,
            type: 'SHIPMENT_UPDATED',
            recipients: [shipment.brandId],
            relatedEntityType: 'SHIPMENT',
            relatedEntityId: shipment.id,
            metadata: JSON.stringify({
              shipmentId: shipment.id,
              awbNumber: awbResult.awb_number,
              regeneratedBy: user.id
            })
          }
        });
      } catch (error) {
        console.error('Failed to create notification:', error);
      }

      console.log('✅ AWB regenerated successfully:', awbResult.awb_number);

      return res.status(200).json({
        success: true,
        message: 'AWB regenerated successfully',
        shipment: {
          id: updatedShipment.id,
          awbNumber: awbResult.awb_number,
          status: updatedShipment.status,
          trackingUrl: `https://www.dtdc.in/tracking/track.asp?strAWBNo=${awbResult.awb_number}`
        },
        dtdc: {
          success: awbResult.success,
          awbNumber: awbResult.awb_number,
          trackingUrl: awbResult.tracking_url,
          retryCount: awbResult.retryCount,
          processingTime: awbResult.processingTime
        }
      });
    } else {
      // Update shipment to indicate AWB generation failed
      await prisma.shipment.update({
        where: { id },
        data: {
          status: 'AWB_PENDING',
          dtdcData: JSON.stringify({
            error: awbResult.error || 'AWB regeneration failed',
            failedAt: new Date().toISOString(),
            attemptedBy: user.id
          })
        }
      });

      console.error('❌ AWB regeneration failed:', awbResult.error);

      return res.status(400).json({
        success: false,
        error: 'AWB regeneration failed',
        details: awbResult.error,
        retryCount: awbResult.retryCount,
        processingTime: awbResult.processingTime
      });
    }

  } catch (error) {
    console.error('❌ AWB regeneration error:', error);
    
    return res.status(500).json({
      error: 'AWB regeneration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}