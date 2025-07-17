import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getServiceCenterAddress } from '@/lib/dtdc';
import { 
  generateAWBWithLabelAndWallet, 
  getShipmentCostEstimate,
  canAffordShipment,
  WalletIntegratedShipmentRequest 
} from '@/lib/dtdc-with-wallet';
import { 
  extractDTDCCostFromResponse, 
  logBoxMargin 
} from '@/lib/margin-tracking';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { boxId, useTestAWB = false } = req.body;

      if (!boxId) {
        return res.status(400).json({ error: 'Box ID is required' });
      }

      // Fetch box details with shipment and service center info
      const box = await prisma.box.findUnique({
        where: { id: boxId },
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

      if (!box) {
        return res.status(404).json({ error: 'Box not found' });
      }

      if (box.awbNumber) {
        return res.status(400).json({ error: 'AWB already generated for this box' });
      }

      let awbNumber: string;
      let trackingUrl: string = '';
      let labelGenerated = false;
      let labelUrl = '';
      let walletInfo: any = undefined;

      if (useTestAWB) {
        // Generate test AWB number
        awbNumber = `TEST${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        trackingUrl = `https://test-tracking.dtdc.in/track/${awbNumber}`;
        
        // Update box with AWB number first
        await prisma.box.update({
          where: { id: boxId },
          data: { 
            awbNumber,
            status: 'IN_TRANSIT'
          }
        });

        // Try to generate label after AWB is saved
        try {
          const labelResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/labels/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              boxId,
              options: {
                format: 'pdf',
                size: 'label',
                includeQR: true
              }
            })
          });

          if (labelResponse.ok) {
            labelGenerated = true;
            labelUrl = `/api/labels/download/${boxId}`;
          }
        } catch (labelError) {
          console.error('Label generation failed for test AWB:', labelError);
        }
      } else {
        // Get service center address
        const serviceCenter = getServiceCenterAddress(box.shipment.serviceCenterId);
        if (!serviceCenter) {
          return res.status(400).json({ error: 'Invalid service center' });
        }

        // Get brand ID from shipment
        const brandId = box.shipment.brandId;
        if (!brandId) {
          return res.status(400).json({ error: 'Brand ID not found in shipment' });
        }

        // Check if brand can afford the shipment
        const affordabilityCheck = await canAffordShipment(brandId, box.weight || 1, 1);
        
        if (!affordabilityCheck.canAfford) {
          return res.status(400).json({ 
            error: 'Insufficient wallet balance',
            details: {
              currentBalance: affordabilityCheck.currentBalance,
              estimatedCost: affordabilityCheck.estimatedCost,
              shortfall: affordabilityCheck.shortfall
            }
          });
        }

        // Prepare wallet-integrated DTDC API request
        const walletRequest: WalletIntegratedShipmentRequest = {
          brand_id: brandId,
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
          box_id: boxId,
          pickup_pincode: '400069', // Default Mumbai pincode for SpareFlow warehouse
          declared_value: 1000,
          cod_amount: 0
        };

        // Call wallet-integrated DTDC API with label generation
        const dtdcResponse = await generateAWBWithLabelAndWallet(walletRequest);
        
        if (!dtdcResponse.success) {
          return res.status(500).json({ 
            error: dtdcResponse.error || 'Failed to generate AWB',
            walletInfo: dtdcResponse.insufficient_balance ? {
              insufficientBalance: true,
              currentBalance: dtdcResponse.cost_estimate ? dtdcResponse.cost_estimate.total_cost - (dtdcResponse.wallet_shortfall || 0) : 0,
              estimatedCost: dtdcResponse.cost_estimate?.total_cost,
              shortfall: dtdcResponse.wallet_shortfall
            } : undefined
          });
        }

        awbNumber = dtdcResponse.awb_number;
        trackingUrl = dtdcResponse.tracking_url;
        labelGenerated = dtdcResponse.label_generated || false;
        labelUrl = dtdcResponse.label_url || '';
        
        // Include wallet information in response
        walletInfo = {
          deducted: dtdcResponse.wallet_deducted,
          transactionId: dtdcResponse.wallet_transaction_id,
          balanceAfter: dtdcResponse.wallet_balance_after,
          costEstimate: dtdcResponse.cost_estimate
        };

        // Step 6: Extract DTDC cost and log margin (only for successful AWB generation)
        if (dtdcResponse.success && dtdcResponse.cost_estimate) {
          try {
            // Extract DTDC internal cost from the response
            const dtdcCostResponse = extractDTDCCostFromResponse({
              weight: box.weight || 1,
              serviceType: 'STANDARD',
              billing: dtdcResponse.billing || undefined // This would come from real DTDC API
            });

            if (dtdcCostResponse.success && dtdcCostResponse.cost) {
              // Log margin calculation
              const marginResult = await logBoxMargin(boxId, brandId, {
                customerPrice: dtdcResponse.cost_estimate.total_cost, // What customer paid (Y)
                dtdcCost: dtdcCostResponse.cost, // What DTDC charged (X)
                weight: box.weight || undefined,
                serviceType: 'STANDARD',
                origin: 'Mumbai',
                destination: serviceCenter.city,
                awbNumber: awbNumber,
                notes: 'Margin calculated during AWB generation'
              });

              if (marginResult.success) {
                console.log(`Margin logged for box ${boxId}: Customer paid ₹${dtdcResponse.cost_estimate.total_cost}, DTDC cost ₹${dtdcCostResponse.cost}, Margin ₹${dtdcResponse.cost_estimate.total_cost - dtdcCostResponse.cost}`);
                
                // Add margin info to wallet response
                walletInfo.margin = {
                  customerPrice: dtdcResponse.cost_estimate.total_cost,
                  dtdcCost: dtdcCostResponse.cost,
                  margin: dtdcResponse.cost_estimate.total_cost - dtdcCostResponse.cost,
                  marginPercent: ((dtdcResponse.cost_estimate.total_cost - dtdcCostResponse.cost) / dtdcResponse.cost_estimate.total_cost) * 100,
                  breakdown: dtdcCostResponse.breakdown
                };
              } else {
                console.error('Failed to log margin:', marginResult.error);
              }
            }
          } catch (marginError) {
            console.error('Error calculating margin:', marginError);
            // Don't fail the AWB generation if margin calculation fails
          }
        }
      }

      // Update box with AWB number and get final box data
      const updatedBox = await prisma.box.update({
        where: { id: boxId },
        data: { 
          awbNumber,
          status: 'IN_TRANSIT'
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

      // Generate box ID for response
      const boxDisplayId = `SHP-${updatedBox.shipment.id.slice(-6)}-BX${updatedBox.boxNumber}`;

      res.status(200).json({
        success: true,
        box: updatedBox,
        boxId: boxDisplayId,
        awbNumber,
        trackingUrl,
        label: {
          generated: labelGenerated,
          downloadUrl: labelUrl,
          previewUrl: `/api/labels/generate?boxId=${boxId}&format=html`
        },
        wallet: walletInfo,
        message: labelGenerated 
          ? 'AWB generated successfully with shipping label' 
          : 'AWB generated successfully. Label generation in progress.'
      });

    } catch (error) {
      console.error('Error generating AWB:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}