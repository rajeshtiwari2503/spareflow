import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateDTDCAWB } from '@/lib/dtdc-simple';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    if (!user || user.role !== 'DISTRIBUTOR') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId } = req.query;

    if (req.method === 'POST') {
      if (!orderId || typeof orderId !== 'string') {
        return res.status(400).json({ error: 'Invalid order ID' });
      }

      // Verify the order belongs to this distributor and is accepted
      const order = await prisma.purchaseOrder.findFirst({
        where: {
          id: orderId,
          distributorId: user.id,
          status: 'ACCEPTED',
        },
        include: {
          brand: true,
          serviceCenter: true,
          shippingAddress: true,
          items: {
            include: {
              part: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found or cannot generate AWB' });
      }

      // Get distributor details
      const distributor = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          distributorProfile: {
            include: {
              address: true,
            },
          },
        },
      });

      if (!distributor?.distributorProfile?.address) {
        return res.status(400).json({ error: 'Distributor address not found' });
      }

      // Calculate total weight and dimensions
      let totalWeight = 0;
      let totalValue = 0;
      const items = order.items.map(item => {
        totalWeight += (item.part.weight || 0.5) * item.quantity; // Default 0.5kg if weight not specified
        totalValue += item.unitPrice * item.quantity;
        return {
          name: item.part.name,
          quantity: item.quantity,
          value: item.unitPrice,
        };
      });

      // Prepare DTDC AWB request
      const awbRequest = {
        consignments: [{
          customer_code: process.env.DTDC_CUSTOMER_CODE,
          service_type_id: process.env.DTDC_SERVICE_TYPE || 'B2B',
          load_type: 'NON-DOCUMENT',
          description: `Spare parts for order ${order.orderNumber}`,
          dimension_unit: 'cm',
          length: 30, // Default dimensions
          width: 20,
          height: 15,
          weight_unit: 'kg',
          weight: Math.max(totalWeight, 0.5), // Minimum 0.5kg
          declared_value: totalValue,
          cod_amount: 0, // Assuming prepaid
          reference_number: order.orderNumber,
          consignee: {
            name: order.serviceCenter?.name || order.brand.companyName,
            address1: order.shippingAddress?.street || '',
            address2: '',
            address3: '',
            pincode: order.shippingAddress?.pincode || '',
            mobile: order.shippingAddress?.phone || '',
            telephone: '',
          },
          consigner: {
            name: distributor.distributorProfile.companyName,
            address1: distributor.distributorProfile.address.street,
            address2: distributor.distributorProfile.address.area || '',
            address3: '',
            pincode: distributor.distributorProfile.address.pincode,
            mobile: distributor.phone || '',
            telephone: '',
          },
          return_address: {
            name: distributor.distributorProfile.companyName,
            address1: distributor.distributorProfile.address.street,
            address2: distributor.distributorProfile.address.area || '',
            address3: '',
            pincode: distributor.distributorProfile.address.pincode,
            mobile: distributor.phone || '',
            telephone: '',
          },
        }],
      };

      // Generate AWB using DTDC API
      const awbResponse = await generateDTDCAWB(awbRequest);

      if (!awbResponse.success) {
        return res.status(400).json({ 
          error: 'Failed to generate AWB', 
          details: awbResponse.error 
        });
      }

      const awbNumber = awbResponse.data.awb_number;

      // Update order with AWB details
      await prisma.purchaseOrder.update({
        where: { id: orderId },
        data: {
          status: 'SHIPPED',
          awbNumber: awbNumber,
          shippedAt: new Date(),
        },
      });

      // Create shipment record
      await prisma.shipment.create({
        data: {
          awbNumber: awbNumber,
          orderId: orderId,
          distributorId: user.id,
          brandId: order.brandId,
          serviceCenterId: order.serviceCenterId,
          status: 'SHIPPED',
          courierPartner: 'DTDC',
          trackingUrl: `https://www.dtdc.in/tracking/tracking_results.asp?strCnno=${awbNumber}`,
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        },
      });

      // Create activity log
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'AWB_GENERATED',
          details: {
            orderId: orderId,
            orderNumber: order.orderNumber,
            awbNumber: awbNumber,
          },
        },
      });

      // Notify brand about shipment
      await prisma.notification.create({
        data: {
          userId: order.brandId,
          title: 'Order Shipped',
          message: `Your order ${order.orderNumber} has been shipped. AWB: ${awbNumber}`,
          type: 'ORDER_SHIPPED',
          relatedId: orderId,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'AWB generated successfully',
        awbNumber: awbNumber,
        trackingUrl: `https://www.dtdc.in/tracking/tracking_results.asp?strCnno=${awbNumber}`,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('AWB generation API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}