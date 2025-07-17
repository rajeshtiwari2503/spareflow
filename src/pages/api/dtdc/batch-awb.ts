import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServiceCenterAddress } from '@/lib/dtdc';
import { 
  generateMultipleAWBsWithWallet,
  WalletIntegratedShipmentRequest 
} from '@/lib/dtdc-with-wallet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { boxIds } = req.body;

      if (!boxIds || !Array.isArray(boxIds) || boxIds.length === 0) {
        return res.status(400).json({ 
          error: 'Box IDs array is required' 
        });
      }

      if (boxIds.length > 50) {
        return res.status(400).json({ 
          error: 'Maximum 50 boxes can be processed in a single batch' 
        });
      }

      // Fetch all boxes with their shipment details
      const boxes = await prisma.box.findMany({
        where: {
          id: {
            in: boxIds
          },
          awbNumber: null // Only process boxes without AWB
        },
        include: {
          shipment: {
            include: {
              serviceCenter: true,
              brand: true
            }
          },
          boxParts: {
            include: {
              part: true
            }
          }
        }
      });

      if (boxes.length === 0) {
        return res.status(404).json({ 
          error: 'No valid boxes found for AWB generation' 
        });
      }

      // Prepare batch requests
      const batchRequests: WalletIntegratedShipmentRequest[] = [];
      const boxMapping: Record<string, any> = {};

      for (const box of boxes) {
        const serviceCenter = getServiceCenterAddress(box.shipment.serviceCenterId);
        if (!serviceCenter) {
          console.warn(`Invalid service center for box ${box.id}`);
          continue;
        }

        const request: WalletIntegratedShipmentRequest = {
          brand_id: box.shipment.brandId,
          shipment_id: box.shipment.id,
          consignee_name: serviceCenter.name,
          consignee_address: serviceCenter.address,
          consignee_city: serviceCenter.city,
          consignee_state: serviceCenter.state,
          consignee_pincode: serviceCenter.pincode,
          consignee_phone: serviceCenter.phone,
          product_type: 'SPARE_PARTS',
          weight: box.weight || 1,
          pieces: 1,
          reference_number: `${box.shipment.id}-${box.boxNumber}`,
          box_id: box.id,
          pickup_pincode: '400069', // Default Mumbai pincode
          declared_value: 1000,
          cod_amount: 0
        };

        batchRequests.push(request);
        boxMapping[box.id] = box;
      }

      if (batchRequests.length === 0) {
        return res.status(400).json({ 
          error: 'No valid shipment requests could be prepared' 
        });
      }

      // Process batch AWB generation
      const batchResults = await generateMultipleAWBsWithWallet(batchRequests);

      // Process results and update database
      const results = [];
      const updatePromises = [];

      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const request = batchRequests[i];
        const box = boxMapping[request.box_id!];

        if (result.success) {
          // Update box with AWB number
          updatePromises.push(
            prisma.box.update({
              where: { id: box.id },
              data: { 
                awbNumber: result.awb_number,
                status: 'IN_TRANSIT'
              }
            })
          );

          results.push({
            boxId: box.id,
            boxNumber: box.boxNumber,
            shipmentId: box.shipment.id,
            success: true,
            awbNumber: result.awb_number,
            trackingUrl: result.tracking_url,
            labelGenerated: result.label_generated,
            labelUrl: result.label_url,
            walletDeducted: result.wallet_deducted,
            costEstimate: result.cost_estimate
          });
        } else {
          results.push({
            boxId: box.id,
            boxNumber: box.boxNumber,
            shipmentId: box.shipment.id,
            success: false,
            error: result.error,
            insufficientBalance: result.insufficient_balance,
            walletShortfall: result.wallet_shortfall,
            costEstimate: result.cost_estimate
          });
        }
      }

      // Wait for all database updates to complete
      await Promise.allSettled(updatePromises);

      // Calculate summary statistics
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const insufficientBalance = results.filter(r => r.insufficientBalance).length;

      // Group results by brand for wallet summary
      const walletSummary: Record<string, any> = {};
      results.forEach(result => {
        const box = boxMapping[result.boxId];
        const brandId = box.shipment.brandId;
        
        if (!walletSummary[brandId]) {
          walletSummary[brandId] = {
            brandId,
            totalCost: 0,
            successfulShipments: 0,
            failedShipments: 0
          };
        }
        
        if (result.success && result.costEstimate) {
          walletSummary[brandId].totalCost += result.costEstimate.total_cost;
          walletSummary[brandId].successfulShipments++;
        } else {
          walletSummary[brandId].failedShipments++;
        }
      });

      res.status(200).json({
        success: successful > 0,
        results,
        summary: {
          total: batchRequests.length,
          successful,
          failed,
          insufficientBalance,
          successRate: Math.round((successful / batchRequests.length) * 100)
        },
        walletSummary: Object.values(walletSummary),
        message: `Batch AWB generation completed. ${successful} successful, ${failed} failed.`
      });

    } catch (error) {
      console.error('Error in batch AWB generation:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}