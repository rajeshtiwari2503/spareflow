import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { generateShippingLabel } from '@/lib/dtdc'
import { generateSimpleLabelHTML, generateSimplePDFLabel, SimpleLabelData } from '@/lib/simple-pdf-label'
import { generateEnhancedPDFLabel, EnhancedLabelData } from '@/lib/enhanced-pdf-label'
import { generateProfessionalPDFLabel, ProfessionalLabelData } from '@/lib/professional-pdf-label'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { boxId } = req.query

    if (!boxId || typeof boxId !== 'string') {
      return res.status(400).json({ error: 'Box ID is required' })
    }

    // Get box details with shipment and AWB information
    const box = await prisma.box.findUnique({
      where: { id: boxId },
      include: {
        shipment: {
          include: {
            brand: {
              select: { id: true, name: true, email: true, phone: true }
            },
            serviceCenter: {
              select: { 
                id: true, 
                name: true, 
                email: true, 
                phone: true,
                serviceCenterProfile: {
                  select: {
                    centerName: true,
                    addresses: {
                      select: {
                        street: true,
                        area: true,
                        city: true,
                        state: true,
                        pincode: true,
                        isDefault: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        boxParts: {
          include: {
            part: {
              select: {
                id: true,
                name: true,
                partNumber: true,
                weight: true
              }
            }
          }
        }
      }
    })

    if (!box) {
      return res.status(404).json({ error: 'Box not found' })
    }

    if (!box.awbNumber) {
      return res.status(400).json({ 
        error: 'AWB not generated', 
        details: 'Cannot generate label without AWB number' 
      })
    }

    // Check if this is a mock AWB (for development)
    const isMockAWB = box.awbNumber.startsWith('DTDC') || box.awbNumber.startsWith('TEST')

    let labelBuffer: Buffer

    if (isMockAWB || process.env.NODE_ENV === 'development') {
      // Generate mock PDF label for development
      labelBuffer = await generateMockPDFLabel(box)
    } else {
      // Try to get label from DTDC API first
      try {
        const dtdcLabel = await generateShippingLabel(box.awbNumber)
        
        if (dtdcLabel.success && dtdcLabel.label_url) {
          // If DTDC provides a label URL, redirect to it
          return res.redirect(dtdcLabel.label_url)
        } else {
          // Fallback to generating our own label
          labelBuffer = await generatePDFLabel(box)
        }
      } catch (error) {
        console.error('DTDC label generation failed:', error)
        // Fallback to generating our own label
        labelBuffer = await generatePDFLabel(box)
      }
    }

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="shipping-label-${box.awbNumber}.pdf"`)
    res.setHeader('Content-Length', labelBuffer.length)

    // Send the PDF buffer
    res.send(labelBuffer)

  } catch (error) {
    console.error('Error generating shipping label:', error)
    res.status(500).json({ 
      error: 'Failed to generate shipping label',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Generate professional PDF label for development and production
async function generateMockPDFLabel(box: any): Promise<Buffer> {
  const serviceCenter = box.shipment.serviceCenter
  const brand = box.shipment.brand
  const serviceCenterAddress = serviceCenter.serviceCenterProfile?.addresses?.find((addr: any) => addr.isDefault) || 
                               serviceCenter.serviceCenterProfile?.addresses?.[0]

  const labelData: ProfessionalLabelData = {
    awbNumber: box.awbNumber,
    shipmentId: box.shipment.id,
    boxNumber: box.boxNumber,
    brandName: brand.name,
    totalWeight: box.weight || 1.0,
    createdDate: new Date(box.shipment.createdAt).toLocaleDateString(),
    trackingUrl: `https://www.dtdc.in/tracking/track.asp?strAWBNo=${box.awbNumber}`,
    boxId: box.id,
    dimensions: '30×20×15cm',
    insurance: box.shipment.insurance || undefined,
    priority: box.shipment.priority || 'MEDIUM',
    courierPartner: box.shipment.courierPartner || 'DTDC',
    
    destinationAddress: {
      name: serviceCenter.serviceCenterProfile?.centerName || serviceCenter.name,
      address: serviceCenterAddress ? 
        `${serviceCenterAddress.street}, ${serviceCenterAddress.area || ''}`.replace(', ,', ',') :
        'Service Center Address',
      city: serviceCenterAddress?.city || 'Mumbai',
      state: serviceCenterAddress?.state || 'Maharashtra',
      pincode: serviceCenterAddress?.pincode || '400001',
      phone: serviceCenter.phone || '9999999999'
    },
    
    partsSummary: box.boxParts?.map((bp: any) => ({
      code: bp.part.partNumber || bp.part.id.slice(-6),
      name: bp.part.name,
      quantity: bp.quantity
    })) || []
  }

  try {
    // Try professional PDF generation first
    return await generateProfessionalPDFLabel(labelData)
  } catch (error) {
    console.error('Professional PDF generation failed, trying enhanced:', error)
    try {
      // Fallback to enhanced PDF generation
      return await generateEnhancedPDFLabel(labelData)
    } catch (enhancedError) {
      console.error('Enhanced PDF generation failed, using simple:', enhancedError)
      // Final fallback to simple PDF generation
      return await generateSimplePDFLabel(labelData)
    }
  }
}

// Generate PDF label using the proper interface
async function generatePDFLabel(box: any): Promise<Buffer> {
  return await generateMockPDFLabel(box)
}