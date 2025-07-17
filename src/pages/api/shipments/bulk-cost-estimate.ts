import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import {
  classifyShipmentType,
  assignCourierPayer,
  getCourierPricing,
  calculateShipmentCostBreakdown,
  calculateInsuranceRequirement,
  calculateBulkShipmentCosts,
  ShipmentClassification,
  CourierPayerAssignment,
  ShipmentCostBreakdown,
  InsuranceCalculation
} from '@/lib/shipment-flow-logic';

interface BulkCostEstimateRequest {
  shipments: Array<{
    id: string;
    recipientId: string;
    recipientName: string;
    recipientType: 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER';
    parts: Array<{
      partId: string;
      quantity: number;
    }>;
    boxes: Array<{
      parts: Array<{
        partId: string;
        quantity: number;
      }>;
      dimensions: {
        length: number;
        breadth: number;
        height: number;
      };
    }>;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    notes?: string;
    returnReason?: 'DEFECTIVE' | 'EXCESS' | 'WARRANTY_RETURN' | 'WRONG_PART';
    insuranceRequired?: boolean;
    declaredValue?: number;
  }>;
}

interface BulkCostEstimateResponse {
  success: boolean;
  costSummary: {
    shipments: Array<{
      shipment_id: string;
      recipient_name: string;
      base_cost: number;
      weight_cost: number;
      surcharge_cost: number;
      markup_cost: number;
      insurance_cost: number;
      total_cost: number;
      payer: string;
    }>;
    cost_by_payer: {
      BRAND: number;
      SERVICE_CENTER: number;
      DISTRIBUTOR: number;
      CUSTOMER: number;
    };
    grand_total: number;
    total_shipments: number;
  };
  shipmentsWithCosts?: Array<any>;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧮 Starting bulk cost estimation...');
    
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      console.log('❌ Authentication failed:', authResult.error);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = authResult;
    console.log('✅ User authenticated:', user.email, user.role);

    // Only brands can estimate bulk costs
    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Only brands can estimate bulk shipment costs' });
    }

    const { shipments }: BulkCostEstimateRequest = req.body;
    console.log('📦 Bulk cost estimation for', shipments.length, 'shipments');

    if (!shipments || shipments.length === 0) {
      return res.status(400).json({ error: 'No shipments provided for cost estimation' });
    }

    const processedShipments = [];
    const costBreakdowns = [];

    // Process each shipment
    for (const shipment of shipments) {
      try {
        console.log(`🔍 Processing shipment ${shipment.id} for ${shipment.recipientName}`);

        // Step 1: Get recipient details and role
        let recipientRole = '';
        let recipientAddress: any = null;

        if (shipment.recipientType === 'SERVICE_CENTER') {
          const authorization = await prisma.brandAuthorizedServiceCenter.findFirst({
            where: {
              brandId: user.id,
              serviceCenterUserId: shipment.recipientId,
              status: 'Active'
            },
            include: {
              serviceCenter: {
                include: {
                  serviceCenterProfile: {
                    include: {
                      addresses: true
                    }
                  }
                }
              }
            }
          });

          if (!authorization) {
            console.warn(`⚠️ Service center ${shipment.recipientId} not authorized for brand ${user.id}`);
            continue;
          }

          recipientRole = 'SERVICE_CENTER';
          recipientAddress = authorization.serviceCenter.serviceCenterProfile?.addresses?.[0];
        } else if (shipment.recipientType === 'DISTRIBUTOR') {
          const authorization = await prisma.brandAuthorizedDistributor.findFirst({
            where: {
              brandId: user.id,
              distributorUserId: shipment.recipientId,
              status: 'Active'
            },
            include: {
              distributor: {
                include: {
                  distributorProfile: {
                    include: {
                      address: true
                    }
                  }
                }
              }
            }
          });

          if (!authorization) {
            console.warn(`⚠️ Distributor ${shipment.recipientId} not authorized for brand ${user.id}`);
            continue;
          }

          recipientRole = 'DISTRIBUTOR';
          recipientAddress = authorization.distributor.distributorProfile?.address;
        } else if (shipment.recipientType === 'CUSTOMER') {
          const customer = await prisma.user.findUnique({
            where: { id: shipment.recipientId },
            include: {
              customerProfile: {
                include: {
                  addresses: true
                }
              }
            }
          });

          if (!customer || customer.role !== 'CUSTOMER') {
            console.warn(`⚠️ Customer ${shipment.recipientId} not found`);
            continue;
          }

          recipientRole = 'CUSTOMER';
          recipientAddress = customer.customerProfile?.addresses?.[0];
        }

        // Step 2: Classify shipment type
        const classification = classifyShipmentType(
          user.role,
          recipientRole as any,
          shipment.returnReason
        );

        // Step 3: Assign courier payer
        const payerAssignment = assignCourierPayer(
          classification.shipment_type,
          classification.shipment_direction,
          classification.return_reason
        );

        // Step 4: Get parts and calculate totals
        const partIds = shipment.parts.map(p => p.partId);
        const parts = await prisma.part.findMany({
          where: {
            id: { in: partIds },
            brandId: user.id
          }
        });

        if (parts.length !== partIds.length) {
          console.warn(`⚠️ Some parts not found for shipment ${shipment.id}`);
          continue;
        }

        let totalWeight = 0;
        let totalValue = 0;

        for (const selectedPart of shipment.parts) {
          const part = parts.find(p => p.id === selectedPart.partId);
          if (part) {
            const partWeight = part.weight || 0.5; // Default 500g if weight not specified
            totalWeight += partWeight * selectedPart.quantity;
            totalValue += part.price * selectedPart.quantity;
          }
        }

        // Use declared value if provided, otherwise use calculated total value
        const finalDeclaredValue = shipment.declaredValue || totalValue;

        // Step 5: Get courier pricing configuration
        const pricing = await getCourierPricing(
          classification.shipment_type,
          payerAssignment.courier_payer,
          user.id
        );

        // Step 6: Calculate cost breakdown
        const isExpress = shipment.priority === 'HIGH' || shipment.priority === 'CRITICAL';
        const isRemoteArea = recipientAddress?.pincode?.startsWith('79') || 
                            recipientAddress?.pincode?.startsWith('18') || false; // Simplified remote area check

        const costBreakdown = calculateShipmentCostBreakdown(
          pricing,
          shipment.boxes.length,
          totalWeight,
          isExpress,
          isRemoteArea,
          finalDeclaredValue,
          shipment.insuranceRequired
        );

        // Step 7: Calculate insurance if required
        let insuranceCalculation: InsuranceCalculation | undefined;
        if (shipment.insuranceRequired && finalDeclaredValue >= 5000) {
          insuranceCalculation = calculateInsuranceRequirement(finalDeclaredValue);
        }

        // Add to processed shipments
        const processedShipment = {
          ...shipment,
          classification,
          payerAssignment,
          costBreakdown,
          insuranceCalculation,
          totalWeight,
          totalValue,
          finalDeclaredValue
        };

        processedShipments.push(processedShipment);

        // Prepare for bulk cost calculation
        costBreakdowns.push({
          shipment_id: shipment.id,
          recipient_name: shipment.recipientName,
          cost_breakdown: {
            ...costBreakdown,
            insurance_cost: insuranceCalculation?.total_insurance_charge || 0,
            total_cost: costBreakdown.total_cost + (insuranceCalculation?.total_insurance_charge || 0)
          },
          courier_payer: payerAssignment.courier_payer
        });

        console.log(`✅ Processed shipment ${shipment.id}: ₹${costBreakdown.total_cost + (insuranceCalculation?.total_insurance_charge || 0)}`);

      } catch (error) {
        console.error(`❌ Error processing shipment ${shipment.id}:`, error);
        continue;
      }
    }

    if (costBreakdowns.length === 0) {
      return res.status(400).json({ 
        error: 'No valid shipments could be processed for cost estimation' 
      });
    }

    // Step 8: Calculate bulk summary
    const bulkSummary = calculateBulkShipmentCosts(costBreakdowns);

    console.log('✅ Bulk cost estimation completed:', {
      totalShipments: bulkSummary.total_shipments,
      grandTotal: bulkSummary.grand_total,
      costByPayer: bulkSummary.cost_by_payer
    });

    const response: BulkCostEstimateResponse = {
      success: true,
      costSummary: bulkSummary,
      shipmentsWithCosts: processedShipments
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Bulk cost estimation failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Bulk cost estimation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}