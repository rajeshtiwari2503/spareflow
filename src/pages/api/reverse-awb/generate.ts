import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { generateTestAWB, getServiceCenterAddress } from '@/lib/dtdc'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { reverseRequestId, useTestAWB = true } = req.body

    if (!reverseRequestId) {
      return res.status(400).json({ error: 'Reverse request ID is required' })
    }

    // Fetch reverse request details
    const reverseRequest = await prisma.reverseRequest.findUnique({
      where: { id: reverseRequestId },
      include: {
        serviceCenter: true,
        part: {
          include: {
            brand: true,
          },
        },
      },
    })

    if (!reverseRequest) {
      return res.status(404).json({ error: 'Reverse request not found' })
    }

    if (reverseRequest.awbNumber) {
      return res.status(400).json({ error: 'AWB already generated for this reverse request' })
    }

    // Generate AWB number
    let awbNumber: string
    if (useTestAWB) {
      awbNumber = generateTestAWB()
    } else {
      // In a real implementation, this would call the actual DTDC API
      // For now, we'll use the test AWB generator
      awbNumber = generateTestAWB()
    }

    // Update reverse request with AWB number and set status to PICKED
    const updatedReverseRequest = await prisma.reverseRequest.update({
      where: { id: reverseRequestId },
      data: {
        awbNumber,
        status: 'PICKED',
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

    res.status(200).json({
      success: true,
      awbNumber,
      reverseRequest: updatedReverseRequest,
      message: 'AWB generated successfully for reverse pickup',
    })
  } catch (error) {
    console.error('Error generating reverse pickup AWB:', error)
    res.status(500).json({ error: 'Failed to generate AWB for reverse pickup' })
  }
}