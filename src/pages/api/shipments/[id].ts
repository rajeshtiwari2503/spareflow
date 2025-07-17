import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { cancelShipment } from '@/lib/dtdc'
import { refundToWallet } from '@/lib/wallet'
import { notifyShipmentStatusUpdate, notifyWalletTransaction } from '@/lib/websocket'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid shipment ID' })
  }

  if (req.method === 'GET') {
    try {
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
          boxes: {
            include: {
              boxParts: {
                include: {
                  part: true,
                },
              },
            },
          },
        },
      })

      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' })
      }

      res.status(200).json(shipment)
    } catch (error) {
      console.error('Error fetching shipment:', error)
      res.status(500).json({ error: 'Failed to fetch shipment' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { status, notes } = req.body

      // Get current shipment
      const currentShipment = await prisma.shipment.findUnique({
        where: { id },
        include: {
          brand: true,
          serviceCenter: true,
          boxes: true
        }
      })

      if (!currentShipment) {
        return res.status(404).json({ error: 'Shipment not found' })
      }

      // Check if shipment can be edited
      if (currentShipment.status === 'DELIVERED' || currentShipment.status === 'CANCELLED') {
        return res.status(400).json({ 
          error: 'Cannot edit shipment',
          details: `Shipment with status ${currentShipment.status} cannot be modified`
        })
      }

      // Update shipment
      const updatedShipment = await prisma.shipment.update({
        where: { id },
        data: {
          status: status || currentShipment.status,
          // Add notes field to shipment model if needed
        },
        include: {
          brand: true,
          serviceCenter: true,
          boxes: {
            include: {
              boxParts: {
                include: {
                  part: true,
                },
              },
            },
          },
        }
      })

      // Send notification if status changed
      if (status && status !== currentShipment.status) {
        notifyShipmentStatusUpdate(updatedShipment, currentShipment.status)
      }

      res.status(200).json({
        success: true,
        shipment: updatedShipment,
        message: 'Shipment updated successfully'
      })

    } catch (error) {
      console.error('Error updating shipment:', error)
      res.status(500).json({ error: 'Failed to update shipment' })
    }
  } else if (req.method === 'DELETE') {
    try {
      // Get current shipment with all details
      const currentShipment = await prisma.shipment.findUnique({
        where: { id },
        include: {
          brand: true,
          serviceCenter: true,
          boxes: true
        }
      })

      if (!currentShipment) {
        return res.status(404).json({ error: 'Shipment not found' })
      }

      // Check if shipment can be deleted
      if (currentShipment.status === 'DELIVERED') {
        return res.status(400).json({ 
          error: 'Cannot delete delivered shipment',
          details: 'Delivered shipments cannot be deleted for audit purposes'
        })
      }

      // Get AWB numbers for cancellation
      const awbNumbers = currentShipment.boxes
        .filter(box => box.awbNumber)
        .map(box => box.awbNumber!)

      let cancellationResult = null
      let refundAmount = 0

      // Cancel AWBs if they exist
      if (awbNumbers.length > 0) {
        try {
          cancellationResult = await cancelShipment({ awb_numbers: awbNumbers })
          console.log('DTDC Cancellation result:', cancellationResult)
        } catch (error) {
          console.error('DTDC cancellation failed:', error)
          // Continue with deletion even if DTDC cancellation fails
        }
      }

      // Calculate refund amount - use stored metadata first, then fallback to transaction search
      try {
        // First, try to get the exact deducted amount from shipment metadata (V276 and later)
        if (currentShipment.metadata && typeof currentShipment.metadata === 'object') {
          const metadata = currentShipment.metadata as any;
          if (metadata.walletDeducted && typeof metadata.walletDeducted === 'number') {
            refundAmount = metadata.walletDeducted;
            console.log(`✅ Using stored wallet deduction amount from metadata: ₹${refundAmount}`);
          } else if (metadata.costBreakdown && metadata.costBreakdown.finalTotal) {
            refundAmount = metadata.costBreakdown.finalTotal;
            console.log(`✅ Using cost breakdown final total from metadata: ₹${refundAmount}`);
          }
        }

        // If no metadata found, use the actualCost or estimatedCost from shipment
        if (refundAmount === 0) {
          refundAmount = currentShipment.actualCost || currentShipment.estimatedCost || 0;
          console.log(`✅ Using shipment actualCost/estimatedCost: ₹${refundAmount}`);
        }

        // Fallback: Try to find the original debit transaction (legacy shipments)
        if (refundAmount === 0) {
          console.log('⚠️ No stored amount found, searching wallet transactions...');
          const walletTransactions = await prisma.walletTransaction.findMany({
            where: {
              OR: [
                { reference: `SHIPMENT_${id}` },
                { reference: id },
                { purchaseOrderId: id },
                { reference: { startsWith: `SHIPMENT_` }, description: { contains: id } },
                { description: { contains: `shipment ${id}` } },
                { description: { contains: `Shipment to` } }
              ],
              type: 'DEBIT',
              userId: currentShipment.brandId
            }
          });

          // If no transactions found with specific references, try broader search
          if (walletTransactions.length === 0) {
            const broadSearchTransactions = await prisma.walletTransaction.findMany({
              where: {
                userId: currentShipment.brandId,
                type: 'DEBIT',
                createdAt: {
                  gte: new Date(currentShipment.createdAt.getTime() - 5 * 60 * 1000), // 5 minutes before shipment creation
                  lte: new Date(currentShipment.createdAt.getTime() + 5 * 60 * 1000)  // 5 minutes after shipment creation
                }
              },
              orderBy: { createdAt: 'desc' }
            });

            // Take the most recent transaction around shipment creation time
            if (broadSearchTransactions.length > 0) {
              walletTransactions.push(broadSearchTransactions[0]);
              console.log(`Found transaction by time proximity: ${broadSearchTransactions[0].id} - ₹${broadSearchTransactions[0].amount}`);
            }
          }

          refundAmount = walletTransactions.reduce((total, transaction) => total + transaction.amount, 0);
          console.log(`Found ${walletTransactions.length} debit transactions totaling ₹${refundAmount} for shipment ${id}`);
          
          // Log transaction details for debugging
          walletTransactions.forEach(txn => {
            console.log(`Transaction: ${txn.id}, Amount: ₹${txn.amount}, Reference: ${txn.reference}, Description: ${txn.description}`);
          });
        }
      } catch (error) {
        console.error('Error calculating refund amount:', error);
      }

      // Start transaction to delete shipment and process refund
      const result = await prisma.$transaction(async (tx) => {
        // Delete box parts first
        await tx.boxPart.deleteMany({
          where: {
            box: {
              shipmentId: id
            }
          }
        })

        // Delete boxes
        await tx.box.deleteMany({
          where: { shipmentId: id }
        })

        // Delete shipment
        await tx.shipment.delete({
          where: { id }
        })

        // Process refund if there was a charge
        let refundTransaction = null
        if (refundAmount > 0) {
          try {
            const refundResult = await refundToWallet(
              currentShipment.brandId,
              refundAmount,
              `Refund for cancelled shipment ${id}`,
              `REFUND_SHIPMENT_${id}`,
              id
            )

            if (refundResult.success) {
              refundTransaction = {
                transactionId: refundResult.transactionId,
                amount: refundAmount,
                newBalance: refundResult.newBalance
              }
            }
          } catch (error) {
            console.error('Refund processing failed:', error)
            // Don't fail the entire operation if refund fails
          }
        }

        return { refundTransaction }
      })

      // Send notifications
      if (result.refundTransaction) {
        notifyWalletTransaction(currentShipment.brandId, {
          id: result.refundTransaction.transactionId,
          type: 'CREDIT',
          amount: result.refundTransaction.amount,
          balanceAfter: result.refundTransaction.newBalance,
          reference: `Refund for cancelled shipment`
        })
      }

      res.status(200).json({
        success: true,
        message: 'Shipment deleted successfully',
        cancellation: cancellationResult,
        refund: result.refundTransaction ? {
          amount: result.refundTransaction.amount,
          transactionId: result.refundTransaction.transactionId,
          newBalance: result.refundTransaction.newBalance
        } : null,
        details: {
          cancelledAWBs: cancellationResult?.cancelled_awbs || [],
          failedAWBs: cancellationResult?.failed_awbs || [],
          refundProcessed: !!result.refundTransaction
        }
      })

    } catch (error) {
      console.error('Error deleting shipment:', error)
      res.status(500).json({ error: 'Failed to delete shipment' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}