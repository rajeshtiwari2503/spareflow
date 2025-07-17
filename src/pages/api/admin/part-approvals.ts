import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get all parts with their brand information
      // In a real system, you'd have an 'approved' field in the parts table
      // For now, we'll simulate pending approvals by showing recently created parts
      const parts = await prisma.part.findMany({
        include: {
          brand: { select: { id: true, name: true, email: true } },
          boxParts: true,
          reverseRequests: true,
          purchaseOrderItems: true,
          customerOrders: true
        },
        orderBy: { createdAt: 'desc' }
      })

      // Simulate approval status - in real app, this would be a database field
      const partsWithApprovalStatus = parts.map(part => ({
        ...part,
        approvalStatus: getSimulatedApprovalStatus(part),
        usageCount: part.boxParts.length + part.customerOrders.length,
        pendingOrders: part.purchaseOrderItems.length
      }))

      res.status(200).json(partsWithApprovalStatus)
    } catch (error) {
      console.error('Error fetching parts for approval:', error)
      res.status(500).json({ error: 'Failed to fetch parts for approval' })
    }
  } else if (req.method === 'PUT') {
    try {
      const { partId, action, reason } = req.body
      
      if (!partId || !action) {
        return res.status(400).json({ error: 'Part ID and action are required' })
      }

      const part = await prisma.part.findUnique({
        where: { id: partId },
        include: { brand: true }
      })

      if (!part) {
        return res.status(404).json({ error: 'Part not found' })
      }

      if (action === 'approve') {
        // In a real system, you'd update an 'approved' field
        // For now, we'll update the description to indicate approval
        const updatedPart = await prisma.part.update({
          where: { id: partId },
          data: {
            description: part.description ? 
              `${part.description} [APPROVED]` : 
              '[APPROVED]',
            updatedAt: new Date()
          }
        })
        
        res.status(200).json({ 
          message: 'Part approved successfully', 
          part: updatedPart 
        })
      } else if (action === 'reject') {
        // In a real system, you might soft delete or mark as rejected
        // For now, we'll update the description
        const updatedPart = await prisma.part.update({
          where: { id: partId },
          data: {
            description: part.description ? 
              `${part.description} [REJECTED: ${reason || 'No reason provided'}]` : 
              `[REJECTED: ${reason || 'No reason provided'}]`,
            updatedAt: new Date()
          }
        })
        
        res.status(200).json({ 
          message: 'Part rejected successfully', 
          part: updatedPart 
        })
      } else {
        return res.status(400).json({ error: 'Invalid action' })
      }
    } catch (error) {
      console.error('Error processing part approval:', error)
      res.status(500).json({ error: 'Failed to process part approval' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

// Helper function to simulate approval status
function getSimulatedApprovalStatus(part: any) {
  const daysSinceCreation = Math.floor(
    (new Date().getTime() - new Date(part.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (part.description?.includes('[APPROVED]')) return 'APPROVED'
  if (part.description?.includes('[REJECTED]')) return 'REJECTED'
  if (daysSinceCreation < 1) return 'PENDING'
  if (daysSinceCreation < 7) return 'UNDER_REVIEW'
  return 'APPROVED' // Auto-approve after 7 days for simulation
}