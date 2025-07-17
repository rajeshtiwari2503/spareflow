import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { generateLabelHTML, generateQRCodeData } from '@/lib/pdf-label'
import { getServiceCenterAddress } from '@/lib/dtdc'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { reverseRequestId } = req.body

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

    if (!reverseRequest.awbNumber) {
      return res.status(400).json({ error: 'AWB number not generated yet. Generate AWB first.' })
    }

    // Get addresses
    const serviceAddress = getServiceCenterAddress(reverseRequest.serviceCenterId)
    const brandAddress = getServiceCenterAddress(reverseRequest.part.brandId) // Mock brand address

    // Prepare label data for reverse pickup
    const labelData = {
      awbNumber: reverseRequest.awbNumber,
      boxNumber: `RR-${reverseRequest.id.slice(0, 8)}`, // Reverse Request identifier
      fromAddress: {
        name: reverseRequest.serviceCenter.name,
        address: serviceAddress.address,
        city: serviceAddress.city,
        state: serviceAddress.state,
        pincode: serviceAddress.pincode,
        phone: serviceAddress.phone,
      },
      toAddress: {
        name: reverseRequest.part.brand.name,
        address: brandAddress.address,
        city: brandAddress.city,
        state: brandAddress.state,
        pincode: brandAddress.pincode,
        phone: brandAddress.phone,
      },
      parts: [
        {
          code: reverseRequest.part.code,
          name: reverseRequest.part.name,
          quantity: reverseRequest.quantity,
          weight: reverseRequest.part.weight || 0,
        },
      ],
      totalWeight: (reverseRequest.part.weight || 0) * reverseRequest.quantity,
      qrCodeData: generateQRCodeData({
        type: 'REVERSE_PICKUP',
        reverseRequestId: reverseRequest.id,
        awbNumber: reverseRequest.awbNumber,
        partCode: reverseRequest.part.code,
        quantity: reverseRequest.quantity,
        reason: reverseRequest.reason,
      }),
      specialInstructions: `REVERSE PICKUP - Reason: ${reverseRequest.reason}`,
    }

    // Generate HTML label
    const labelHTML = generateLabelHTML(labelData)

    res.status(200).json({
      success: true,
      labelHTML,
      reverseRequest,
      message: 'Return label generated successfully',
    })
  } catch (error) {
    console.error('Error generating reverse pickup label:', error)
    res.status(500).json({ error: 'Failed to generate return label' })
  }
}