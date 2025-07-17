import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { deductFromWallet } from '@/lib/wallet';
import { generateAWBWithLabelEnhanced } from '@/lib/dtdc-enhanced';
import { DTDCShipmentRequest } from '@/lib/dtdc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, packageWeight, numberOfBoxes, pincode, courierCost } = req.body;

    if (!orderId || !packageWeight || !numberOfBoxes || !pincode || !courierCost) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'orderId, packageWeight, numberOfBoxes, pincode, and courierCost are required'
      });
    }

    // In a real system, we would fetch the actual order from database
    // For now, we'll use mock data based on the orderId
    const mockOrder = {
      id: orderId,
      orderNumber: `PO-${orderId.slice(-3)}`,
      serviceCenterId: 'sc-001',
      serviceCenterName: 'Central Service Hub',
      serviceCenterEmail: 'orders@centralservice.com',
      serviceCenterPhone: '+91 98765 43210',
      shippingAddress: {
        street: '123 Service Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: pincode,
        phone: '+91 98765 43210'
      }
    };

    // Get service center details
    const serviceCenter = await prisma.user.findUnique({
      where: { id: mockOrder.serviceCenterId },
      include: {
        wallet: true,
        serviceCenterProfile: {
          include: {
            addresses: true
          }
        }
      }
    });

    if (!serviceCenter) {
      return res.status(404).json({
        error: 'Service center not found'
      });
    }

    // Check wallet balance
    const walletBalance = serviceCenter.wallet?.balance || 0;
    if (walletBalance < courierCost) {
      return res.status(400).json({
        error: 'Insufficient wallet balance',
        details: {
          currentBalance: walletBalance,
          requiredAmount: courierCost,
          shortfall: courierCost - walletBalance
        }
      });
    }

    // Create shipment record
    const shipment = await prisma.shipment.create({
      data: {
        brandId: 'distributor-shipping', // Special identifier
        serviceCenterId: mockOrder.serviceCenterId,
        numBoxes: parseInt(numberOfBoxes),
        status: 'INITIATED'
      }
    });

    // Deduct courier cost from service center wallet
    const walletDeduction = await deductFromWallet(
      mockOrder.serviceCenterId,
      courierCost,
      `Distributor shipping - Order ${mockOrder.orderNumber}`,
      `DIST_SHIP_${shipment.id}`,
      shipment.id
    );

    if (!walletDeduction.success) {
      // Rollback shipment creation
      await prisma.shipment.delete({
        where: { id: shipment.id }
      });
      
      return res.status(400).json({
        error: 'Failed to deduct from wallet',
        details: walletDeduction.error
      });
    }

    // Create boxes and generate AWB numbers
    const boxes = [];
    const weightPerBox = parseFloat(packageWeight) / parseInt(numberOfBoxes);

    for (let i = 1; i <= parseInt(numberOfBoxes); i++) {
      // Create box record
      const box = await prisma.box.create({
        data: {
          shipmentId: shipment.id,
          boxNumber: i.toString(),
          weight: weightPerBox,
          status: 'PENDING'
        }
      });

      // Prepare DTDC shipment request
      const dtdcRequest: DTDCShipmentRequest = {
        consignee_name: mockOrder.serviceCenterName,
        consignee_address: `${mockOrder.shippingAddress.street}, ${mockOrder.shippingAddress.city}`,
        consignee_city: mockOrder.shippingAddress.city,
        consignee_state: mockOrder.shippingAddress.state,
        consignee_pincode: mockOrder.shippingAddress.pincode,
        consignee_phone: mockOrder.shippingAddress.phone,
        weight: weightPerBox,
        pieces: 1,
        reference_number: `DIST-${shipment.id}-BOX-${i}`,
        box_id: box.id,
        pickup_pincode: '400069', // Distributor's pickup location
        declared_value: 1000 // Default declared value
      };

      try {
        // Generate AWB using enhanced DTDC API
        const dtdcResponse = await generateAWBWithLabelEnhanced(dtdcRequest);

        if (dtdcResponse.success) {
          // Update box with AWB details
          await prisma.box.update({
            where: { id: box.id },
            data: {
              awbNumber: dtdcResponse.awb_number,
              status: 'IN_TRANSIT'
            }
          });

          boxes.push({
            boxId: box.id,
            boxNumber: i,
            awbNumber: dtdcResponse.awb_number,
            trackingUrl: dtdcResponse.tracking_url,
            labelGenerated: dtdcResponse.label_generated || false,
            labelUrl: dtdcResponse.label_url
          });
        } else {
          // Update box status to failed
          await prisma.box.update({
            where: { id: box.id },
            data: {
              status: 'FAILED'
            }
          });

          boxes.push({
            boxId: box.id,
            boxNumber: i,
            error: dtdcResponse.error
          });
        }
      } catch (error) {
        console.error('Error generating AWB for box:', { boxNumber: i, error: error instanceof Error ? error.message : 'Unknown error' });
        
        await prisma.box.update({
          where: { id: box.id },
          data: {
            status: 'FAILED'
          }
        });

        boxes.push({
          boxId: box.id,
          boxNumber: i,
          error: error instanceof Error ? error.message : 'AWB generation failed'
        });
      }
    }

    // Update shipment status based on box results
    const successfulBoxes = boxes.filter(box => box.awbNumber);
    const shipmentStatus = successfulBoxes.length > 0 ? 'DISPATCHED' : 'FAILED';

    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: shipmentStatus
      }
    });

    // Return the main AWB number (from first successful box)
    const mainAWB = successfulBoxes.length > 0 ? successfulBoxes[0].awbNumber : null;

    return res.status(200).json({
      success: true,
      shipmentId: shipment.id,
      awbNumber: mainAWB,
      boxes: boxes,
      walletDeducted: courierCost,
      newWalletBalance: walletDeduction.newBalance,
      message: successfulBoxes.length > 0 
        ? `Shipment created successfully with ${successfulBoxes.length}/${boxes.length} boxes shipped`
        : 'Shipment created but AWB generation failed for all boxes'
    });

  } catch (error) {
    console.error('Error creating distributor shipment:', error);
    return res.status(500).json({
      error: 'Failed to create shipment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}