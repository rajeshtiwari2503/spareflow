import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status } = req.query;

    // Build where clause based on status filter
    let whereClause: any = {};
    
    if (status && status !== 'all') {
      if (status === 'APPROVED') {
        // For distributor shipping, we want orders that are approved and ready to ship
        whereClause.status = 'APPROVED';
      } else {
        whereClause.status = status as string;
      }
    }

    // Mock data for now - in a real system, this would come from a purchase orders table
    const mockOrders = [
      {
        id: 'po-001',
        orderNumber: 'PO-2024-001',
        serviceCenterId: 'sc-001',
        serviceCenterName: 'Central Service Hub',
        serviceCenterEmail: 'orders@centralservice.com',
        serviceCenterPhone: '+91 98765 43210',
        brandId: 'brand-001',
        brandName: 'TechCorp',
        totalAmount: 25000,
        status: 'APPROVED',
        items: [
          {
            id: 'item-001',
            partId: 'part-001',
            partNumber: 'TC-001',
            partName: 'Circuit Board',
            quantity: 2,
            unitPrice: 5000,
            totalPrice: 10000,
            weight: 0.5
          },
          {
            id: 'item-002',
            partId: 'part-002',
            partNumber: 'TC-002',
            partName: 'Power Supply',
            quantity: 1,
            unitPrice: 15000,
            totalPrice: 15000,
            weight: 2.0
          }
        ],
        shippingAddress: {
          street: '123 Service Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          phone: '+91 98765 43210'
        },
        createdAt: '2024-01-15T10:00:00Z',
        requiredBy: '2024-01-20T00:00:00Z'
      },
      {
        id: 'po-002',
        orderNumber: 'PO-2024-002',
        serviceCenterId: 'sc-002',
        serviceCenterName: 'North Service Center',
        serviceCenterEmail: 'orders@northservice.com',
        serviceCenterPhone: '+91 98765 43211',
        brandId: 'brand-002',
        brandName: 'ElectroMax',
        totalAmount: 18000,
        status: 'APPROVED',
        items: [
          {
            id: 'item-003',
            partId: 'part-003',
            partNumber: 'EM-001',
            partName: 'Motor Assembly',
            quantity: 1,
            unitPrice: 18000,
            totalPrice: 18000,
            weight: 3.5
          }
        ],
        shippingAddress: {
          street: '456 Industrial Area',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          phone: '+91 98765 43211'
        },
        createdAt: '2024-01-16T09:00:00Z',
        requiredBy: '2024-01-22T00:00:00Z'
      }
    ];

    // Filter orders based on status
    let filteredOrders = mockOrders;
    if (status && status !== 'all') {
      filteredOrders = mockOrders.filter(order => order.status === status);
    }

    return res.status(200).json({
      success: true,
      orders: filteredOrders
    });

  } catch (error) {
    console.error('Error fetching distributor orders:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}