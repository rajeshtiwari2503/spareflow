import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { cancelShipment } from '@/lib/dtdc-with-wallet';
import { refundToWallet } from '@/lib/wallet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { awbNumbers, reason } = req.body;

      if (!awbNumbers || !Array.isArray(awbNumbers) || awbNumbers.length === 0) {
        return res.status(400).json({ 
          error: 'AWB numbers array is required' 
        });
      }

      // Validate AWB numbers and get associated boxes
      const boxes = await prisma.box.findMany({
        where: {
          awbNumber: {
            in: awbNumbers
          }
        },
        include: {
          shipment: {
            include: {
              brand: true
            }
          }
        }
      });

      if (boxes.length === 0) {
        return res.status(404).json({ 
          error: 'No boxes found with the provided AWB numbers' 
        });
      }

      // Check if any boxes are already delivered or cancelled
      const invalidBoxes = boxes.filter(box => 
        box.status === 'DELIVERED' || box.status === 'CANCELLED'
      );

      if (invalidBoxes.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot cancel shipments that are already delivered or cancelled',
          invalidAWBs: invalidBoxes.map(box => box.awbNumber)
        });
      }

      // Call DTDC cancellation API
      const cancellationResult = await cancelShipment({
        awb_numbers: awbNumbers
      });

      // Process cancellation results
      const results = [];
      const refundPromises = [];

      for (const box of boxes) {
        const awbNumber = box.awbNumber!;
        const wasCancelled = cancellationResult.cancelled_awbs.includes(awbNumber);
        const failed = cancellationResult.failed_awbs.includes(awbNumber);

        if (wasCancelled) {
          // Update box status to cancelled
          await prisma.box.update({
            where: { id: box.id },
            data: { 
              status: 'CANCELLED'
            }
          });

          // Prepare refund for wallet (estimate cost based on box weight)
          const brandId = box.shipment.brandId;
          if (brandId) {
            // Calculate estimated refund amount (you might want to store the actual charged amount)
            const estimatedCost = Math.max(75, 50 + (box.weight || 1) * 25); // Using default pricing
            
            refundPromises.push(
              refundToWallet(
                brandId,
                estimatedCost,
                `Shipment Cancellation - ${awbNumber}`,
                awbNumber,
                box.shipment.id
              )
            );
          }

          results.push({
            awbNumber,
            status: 'cancelled',
            boxId: box.id,
            refundProcessed: !!brandId
          });
        } else if (failed) {
          results.push({
            awbNumber,
            status: 'failed',
            boxId: box.id,
            error: 'DTDC cancellation failed'
          });
        } else {
          results.push({
            awbNumber,
            status: 'unknown',
            boxId: box.id,
            error: 'Unexpected cancellation result'
          });
        }
      }

      // Process all refunds
      const refundResults = await Promise.allSettled(refundPromises);
      
      // Log refund results
      refundResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Refund failed for cancellation ${index}:`, result.reason);
        }
      });

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'SHIPMENT_CANCELLED',
          userId: 'system', // You might want to get this from auth context
          details: {
            awbNumbers,
            reason,
            results,
            cancellationResponse: cancellationResult
          }
        }
      }).catch(error => {
        console.error('Failed to create audit log:', error);
      });

      res.status(200).json({
        success: cancellationResult.success,
        results,
        summary: {
          total: awbNumbers.length,
          cancelled: cancellationResult.cancelled_awbs.length,
          failed: cancellationResult.failed_awbs.length
        },
        message: `${cancellationResult.cancelled_awbs.length} shipments cancelled successfully`
      });

    } catch (error) {
      console.error('Error cancelling shipments:', error);
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