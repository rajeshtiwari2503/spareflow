import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { deductAmount, processReturnCourierCost, checkEnhancedWalletBalance } from '@/lib/enhanced-wallet'

// Function to determine cost responsibility based on return reason
function determineReturnCostResponsibility(returnReason: string): string {
  switch(returnReason) {
    case 'DEFECTIVE':
    case 'WRONG_PART':
    case 'QUALITY_ISSUE':
    case 'DAMAGED':
      return 'BRAND'; // Brand pays for defective/wrong parts
    
    case 'EXCESS_STOCK':
    case 'INVENTORY_CLEANUP':
      return 'SERVICE_CENTER'; // Service center pays for excess inventory
    
    case 'CUSTOMER_RETURN':
      return 'CUSTOMER'; // Customer pays for their returns
    
    default:
      return 'SERVICE_CENTER'; // Default fallback
  }
}

// Function to estimate return courier cost (simplified for now)
function estimateReturnCourierCost(weight: number = 1): number {
  // DTDC reverse logistics pricing: ₹100 docket + ₹65/kg
  const docketCharge = 100;
  const perKgCharge = 65;
  return docketCharge + (Math.ceil(weight) * perKgCharge);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { brandId, serviceCenterId } = req.query
      
      let whereClause: any = {}
      
      // Filter by brand if brandId is provided
      if (brandId) {
        whereClause.part = {
          brandId: brandId as string
        }
      }
      
      // Filter by service center if serviceCenterId is provided
      if (serviceCenterId) {
        whereClause.serviceCenterId = serviceCenterId as string
      }
      
      const reverseRequests = await prisma.reverseRequest.findMany({
        where: whereClause,
        include: {
          serviceCenter: true,
          part: {
            include: {
              brand: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      
      res.status(200).json(reverseRequests)
    } catch (error) {
      console.error('Error fetching reverse requests:', error)
      res.status(500).json({ error: 'Failed to fetch reverse requests' })
    }
  } else if (req.method === 'POST') {
    try {
      const { serviceCenterId, partId, reason, returnReason, status, quantity, weight, processPayment } = req.body
      
      // Validate required fields
      if (!serviceCenterId || !partId || !reason) {
        return res.status(400).json({ error: 'Missing required fields: serviceCenterId, partId, reason' })
      }

      // Determine cost responsibility based on return reason
      const costResponsibility = returnReason ? determineReturnCostResponsibility(returnReason) : 'SERVICE_CENTER'
      
      // Estimate courier cost
      const estimatedCourierCost = estimateReturnCourierCost(weight || 1);
      
      // If processPayment is true, check wallet balance and process payment
      let walletDeductionResult = null;
      if (processPayment) {
        // Determine who pays
        let payerId: string;
        if (costResponsibility === 'BRAND') {
          // Get brand ID from part
          const part = await prisma.part.findUnique({
            where: { id: partId },
            select: { brandId: true }
          });
          if (!part) {
            return res.status(400).json({ error: 'Part not found' });
          }
          payerId = part.brandId;
        } else if (costResponsibility === 'SERVICE_CENTER') {
          payerId = serviceCenterId;
        } else {
          return res.status(400).json({ error: 'Customer payment not supported in this version' });
        }

        // Check wallet balance
        const balanceCheck = await checkEnhancedWalletBalance(payerId, estimatedCourierCost);
        if (!balanceCheck || !balanceCheck.sufficient) {
          return res.status(400).json({ 
            error: 'Insufficient wallet balance',
            required: estimatedCourierCost,
            available: balanceCheck?.currentBalance || 0,
            shortfall: balanceCheck?.shortfall || estimatedCourierCost
          });
        }
      }

      const reverseRequest = await prisma.reverseRequest.create({
        data: {
          serviceCenterId,
          partId,
          reason,
          returnReason: returnReason || null,
          costResponsibility,
          courierCost: processPayment ? estimatedCourierCost : null,
          quantity: quantity || 1,
          status: status || 'REQUESTED',
        },
        include: {
          serviceCenter: true,
          part: {
            include: {
              brand: true,
            },
          },
        },
      })

      // Process wallet deduction if requested
      if (processPayment) {
        walletDeductionResult = await processReturnCourierCost(
          reverseRequest.id,
          estimatedCourierCost,
          false // not admin override
        );

        if (!walletDeductionResult.success) {
          // Rollback the reverse request creation
          await prisma.reverseRequest.delete({
            where: { id: reverseRequest.id }
          });
          return res.status(400).json({ 
            error: 'Wallet deduction failed',
            details: walletDeductionResult.error
          });
        }
      }
      
      res.status(201).json({
        success: true,
        reverseRequest,
        costInfo: {
          costResponsibility,
          estimatedCourierCost,
          message: `Courier cost will be borne by: ${costResponsibility.replace('_', ' ')}`,
          walletDeducted: processPayment,
          walletResult: walletDeductionResult
        }
      })
    } catch (error) {
      console.error('Error creating reverse request:', error)
      res.status(500).json({ error: 'Failed to create reverse request' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, status, awbNumber, courierCost, paidBy } = req.body
      
      if (!id) {
        return res.status(400).json({ error: 'Request ID is required' })
      }
      
      const updateData: any = {}
      if (status) updateData.status = status
      if (awbNumber) updateData.awbNumber = awbNumber
      if (courierCost !== undefined) updateData.courierCost = courierCost
      if (paidBy) updateData.paidBy = paidBy
      
      const reverseRequest = await prisma.reverseRequest.update({
        where: { id },
        data: updateData,
        include: {
          serviceCenter: true,
          part: {
            include: {
              brand: true,
            },
          },
        },
      })
      
      res.status(200).json(reverseRequest)
    } catch (error) {
      console.error('Error updating reverse request:', error)
      res.status(500).json({ error: 'Failed to update reverse request' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}