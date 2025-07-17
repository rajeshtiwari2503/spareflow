import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { generateSimplePDFLabel, SimpleLabelData } from '@/lib/simple-pdf-label'
import { generateEnhancedPDFLabel, generateEnhancedLabelHTML, EnhancedLabelData } from '@/lib/enhanced-pdf-label'
import { generateProfessionalPDFLabel, generateProfessionalLabelHTML, ProfessionalLabelData } from '@/lib/professional-pdf-label'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { boxId, shipmentId, labels, options = {} } = req.body

    console.log('Label generation request:', { boxId, shipmentId, labels: labels?.length, options })

    // Handle manual box labels (from ManualBoxAllocationManager)
    if (labels && Array.isArray(labels)) {
      return await handleManualLabels(labels, res, options)
    }

    if (!boxId && !shipmentId) {
      return res.status(400).json({ 
        error: 'Either boxId, shipmentId, or labels array is required' 
      })
    }

    // Handle preview request
    if (options.format === 'html' || options.preview) {
      return await handlePreviewRequest(boxId, shipmentId, options, res)
    }

    let boxes = []

    if (boxId) {
      // Generate label for single box
      const box = await prisma.box.findUnique({
        where: { id: boxId },
        include: {
          shipment: {
            include: {
              brand: { select: { id: true, name: true } },
              serviceCenter: {
                select: { 
                  id: true, 
                  name: true, 
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
          error: 'AWB not generated for this box',
          details: 'Please regenerate AWB first before generating labels'
        })
      }

      boxes = [box]
    } else if (shipmentId) {
      // Generate labels for all boxes in shipment
      const shipmentBoxes = await prisma.box.findMany({
        where: { 
          shipmentId,
          awbNumber: { not: null }
        },
        include: {
          shipment: {
            include: {
              brand: { select: { id: true, name: true } },
              serviceCenter: {
                select: { 
                  id: true, 
                  name: true, 
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

      if (shipmentBoxes.length === 0) {
        return res.status(404).json({ 
          error: 'No boxes with AWB found for this shipment',
          details: 'Please regenerate AWB for boxes first before generating labels'
        })
      }

      boxes = shipmentBoxes
    }

    console.log(`Processing ${boxes.length} boxes for label generation`)

    // Generate labels for all boxes
    const labelResults = []

    for (const box of boxes) {
      try {
        const serviceCenter = box.shipment.serviceCenter
        const brand = box.shipment.brand
        const serviceCenterAddress = serviceCenter.serviceCenterProfile?.addresses?.find((addr: any) => addr.isDefault) || 
                                     serviceCenter.serviceCenterProfile?.addresses?.[0]

        const labelData: SimpleLabelData = {
          awbNumber: box.awbNumber!,
          shipmentId: box.shipment.id,
          boxNumber: box.boxNumber,
          brandName: brand.name,
          totalWeight: box.weight || 1.0,
          createdDate: new Date(box.shipment.createdAt).toLocaleDateString(),
          trackingUrl: `https://www.dtdc.in/tracking/track.asp?strAWBNo=${box.awbNumber}`,
          
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

        console.log(`Generating label for box ${box.id} with AWB ${box.awbNumber}`)
        const pdfBuffer = await generateSimplePDFLabel(labelData)

        labelResults.push({
          boxId: box.id,
          boxNumber: box.boxNumber,
          awbNumber: box.awbNumber,
          success: true,
          downloadUrl: `/api/labels/download/${box.id}`,
          labelSize: pdfBuffer.length
        })

      } catch (error) {
        console.error(`Error generating label for box ${box.id}:`, error)
        labelResults.push({
          boxId: box.id,
          boxNumber: box.boxNumber,
          awbNumber: box.awbNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = labelResults.filter(r => r.success).length
    const totalCount = labelResults.length

    console.log(`Label generation completed: ${successCount}/${totalCount} successful`)

    res.status(200).json({
      success: successCount > 0,
      message: `Generated ${successCount}/${totalCount} labels successfully`,
      labels: labelResults,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount
      }
    })

  } catch (error) {
    console.error('Error in label generation API:', error)
    res.status(500).json({ 
      error: 'Failed to generate labels',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Handle preview request for HTML labels
async function handlePreviewRequest(boxId: string | undefined, shipmentId: string | undefined, options: any, res: NextApiResponse) {
  try {
    let box;
    
    if (boxId) {
      box = await prisma.box.findUnique({
        where: { id: boxId },
        include: {
          shipment: {
            include: {
              brand: { select: { id: true, name: true } },
              serviceCenter: {
                select: { 
                  id: true, 
                  name: true, 
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
      });
    } else if (shipmentId) {
      const boxes = await prisma.box.findMany({
        where: { 
          shipmentId,
          awbNumber: { not: null }
        },
        include: {
          shipment: {
            include: {
              brand: { select: { id: true, name: true } },
              serviceCenter: {
                select: { 
                  id: true, 
                  name: true, 
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
      });
      
      box = boxes[0]; // Use first box for preview
    }

    if (!box) {
      return res.status(404).json({ error: 'Box not found' });
    }

    if (!box.awbNumber) {
      return res.status(400).json({ 
        error: 'AWB not generated for this box',
        details: 'Please regenerate AWB first before generating preview'
      });
    }

    const serviceCenter = box.shipment.serviceCenter;
    const brand = box.shipment.brand;
    const serviceCenterAddress = serviceCenter.serviceCenterProfile?.addresses?.find((addr: any) => addr.isDefault) || 
                                 serviceCenter.serviceCenterProfile?.addresses?.[0];

    const labelData: ProfessionalLabelData = {
      awbNumber: box.awbNumber,
      shipmentId: box.shipment.id,
      boxNumber: box.boxNumber,
      brandName: brand.name,
      totalWeight: box.weight || 1.0,
      createdDate: new Date(box.shipment.createdAt).toLocaleDateString(),
      trackingUrl: `https://www.dtdc.in/tracking/track.asp?strAWBNo=${box.awbNumber}`,
      boxId: box.id,
      dimensions: options.dimensions || '30×20×15cm',
      customNotes: options.customNotes,
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
    };

    const htmlContent = generateProfessionalLabelHTML(labelData);

    res.status(200).json({
      success: true,
      labelHTML: htmlContent,
      labelData: labelData,
      boxId: box.id,
      message: 'Label preview generated successfully'
    });

  } catch (error) {
    console.error('Error generating label preview:', error);
    res.status(500).json({ 
      error: 'Failed to generate label preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handle manual box labels generation
async function handleManualLabels(labels: any[], res: NextApiResponse, options: any = {}) {
  try {
    console.log(`Processing ${labels.length} manual box labels`)

    // Use professional PDF generation for manual box labels
    const pdfBuffer = await generateProfessionalManualBoxLabelsPDF(labels)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="box-labels-${Date.now()}.pdf"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)

  } catch (error) {
    console.error('Error generating manual labels:', error)
    res.status(500).json({
      error: 'Failed to generate manual labels',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Generate professional PDF for manual box labels using PDFKit
async function generateProfessionalManualBoxLabelsPDF(labels: any[]): Promise<Buffer> {
  try {
    const PDFDocument = require('pdfkit')
    
    const doc = new PDFDocument({ 
      size: [288, 432], // 4x6 inches in points
      margin: 0,
      info: {
        Title: `SpareFlow Box Labels - ${labels.length} labels`,
        Author: 'SpareFlow AI Logistics',
        Subject: 'Professional Box Labels',
        Keywords: 'box, label, logistics, spareflow, manual'
      }
    })
    
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    
    let isFirstPage = true
    
    for (const label of labels) {
      if (!isFirstPage) {
        doc.addPage()
      }
      isFirstPage = false
      
      // Generate professional label content
      await generateProfessionalManualBoxLabelPage(doc, label)
    }
    
    doc.end()
    
    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)
    })
    
  } catch (error) {
    console.error('Error generating professional manual box labels PDF:', error)
    throw new Error(`Professional manual box labels PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Generate a clean professional manual box label page using PDFKit
async function generateProfessionalManualBoxLabelPage(doc: any, label: any) {
  const { boxNumber, boxLabel, contents, totalWeight, dimensions, recipientName, recipientAddress, customNotes, qrCode, barcode } = label
  
  try {
    // Define clean color palette
    const colors = {
      primary: [37, 99, 235],      // Blue #2563eb
      dark: [31, 41, 55],          // Gray-800 #1f2937
      gray: [107, 114, 128],       // Gray-500 #6b7280
      lightGray: [249, 250, 251],  // Gray-50 #f9fafb
      white: [255, 255, 255],      // White #ffffff
      border: [229, 231, 235]      // Gray-200 #e5e7eb
    }

    // Clean border around entire label
    doc.rect(0, 0, 288, 432)
       .lineWidth(2)
       .strokeColor(colors.border)
       .stroke()

    // Simple header section
    doc.rect(0, 0, 288, 50)
       .fillColor(colors.primary)
       .fill()

    // Company name
    doc.fontSize(22)
       .fillColor(colors.white)
       .font('Helvetica-Bold')
       .text('SpareFlow', 15, 12, { align: 'center', width: 258 })

    doc.fontSize(9)
       .fillColor(colors.white)
       .font('Helvetica')
       .text('AI Logistics Platform', 15, 32, { align: 'center', width: 258 })

    let currentY = 65

    // Box Label Section - Clean and prominent
    doc.rect(15, currentY, 258, 40)
       .fillColor(colors.lightGray)
       .fill()
    
    doc.rect(15, currentY, 258, 40)
       .lineWidth(1)
       .strokeColor(colors.border)
       .stroke()

    doc.fontSize(8)
       .fillColor(colors.gray)
       .font('Helvetica-Bold')
       .text('BOX LABEL', 15, currentY + 6, { align: 'center', width: 258 })

    doc.fontSize(18)
       .fillColor(colors.dark)
       .font('Helvetica-Bold')
       .text(boxLabel, 15, currentY + 18, { align: 'center', width: 258 })

    currentY += 55

    // Box info row - Simple layout
    doc.fontSize(11)
       .fillColor(colors.dark)
       .font('Helvetica-Bold')
       .text(`Box #${boxNumber}`, 20, currentY)

    doc.fontSize(11)
       .fillColor(colors.primary)
       .font('Helvetica-Bold')
       .text(`${totalWeight.toFixed(2)} kg`, 200, currentY)

    currentY += 20

    // Dimensions and date info
    doc.fontSize(9)
       .fillColor(colors.gray)
       .font('Helvetica')
       .text(`Size: ${dimensions}`, 20, currentY)

    doc.text(`Date: ${new Date().toLocaleDateString()}`, 200, currentY)

    currentY += 25

    // Recipient section - Clean design
    doc.rect(15, currentY, 258, 60)
       .fillColor(colors.white)
       .fill()
    
    doc.rect(15, currentY, 258, 60)
       .lineWidth(1)
       .strokeColor(colors.primary)
       .stroke()

    // Recipient header
    doc.fontSize(10)
       .fillColor(colors.primary)
       .font('Helvetica-Bold')
       .text('SHIP TO', 20, currentY + 8)

    currentY += 22

    // Recipient details
    doc.fontSize(12)
       .fillColor(colors.dark)
       .font('Helvetica-Bold')
       .text(recipientName, 20, currentY, { width: 248 })

    currentY += 14

    doc.fontSize(9)
       .fillColor(colors.dark)
       .font('Helvetica')
       .text(recipientAddress, 20, currentY, { width: 248 })

    currentY += 25

    // Contents section - Simple table
    doc.fontSize(10)
       .fillColor(colors.dark)
       .font('Helvetica-Bold')
       .text(`Contents (${contents.length} items)`, 20, currentY)

    currentY += 15

    // Simple contents table
    const maxVisibleItems = Math.min(8, contents.length)
    const rowHeight = 12

    // Table header
    doc.rect(20, currentY, 248, 15)
       .fillColor(colors.lightGray)
       .fill()
    
    doc.rect(20, currentY, 248, 15)
       .lineWidth(1)
       .strokeColor(colors.border)
       .stroke()

    doc.fontSize(8)
       .fillColor(colors.dark)
       .font('Helvetica-Bold')
       .text('Part Code', 25, currentY + 4)
       .text('Name', 85, currentY + 4)
       .text('Qty', 240, currentY + 4)

    currentY += 15

    // Table rows
    for (let i = 0; i < maxVisibleItems; i++) {
      const item = contents[i]
      
      doc.rect(20, currentY, 248, rowHeight)
         .fillColor(colors.white)
         .fill()
      
      doc.rect(20, currentY, 248, rowHeight)
         .lineWidth(0.5)
         .strokeColor(colors.border)
         .stroke()

      doc.fontSize(7)
         .fillColor(colors.dark)
         .font('Helvetica')
         .text(item.partCode.substring(0, 12), 25, currentY + 3)
      
      const partName = item.partName.length > 25 ? item.partName.substring(0, 25) + '...' : item.partName
      doc.text(partName, 85, currentY + 3)
      
      doc.fontSize(8)
         .fillColor(colors.primary)
         .font('Helvetica-Bold')
         .text(item.quantity.toString(), 240, currentY + 3)

      currentY += rowHeight
    }

    // Show remaining items count
    if (contents.length > maxVisibleItems) {
      doc.fontSize(7)
         .fillColor(colors.gray)
         .font('Helvetica')
         .text(`... and ${contents.length - maxVisibleItems} more items`, 25, currentY + 2)
      currentY += 12
    }

    currentY += 10

    // QR Code section - Simple placeholder
    const qrSize = 50
    doc.rect(20, currentY, qrSize, qrSize)
       .lineWidth(1)
       .strokeColor(colors.border)
       .stroke()

    // Simple QR pattern
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        if ((i + j) % 2 === 0) {
          doc.rect(20 + (i * 8) + 1, currentY + (j * 8) + 1, 6, 6)
             .fillColor(colors.dark)
             .fill()
        }
      }
    }

    doc.fontSize(7)
       .fillColor(colors.gray)
       .font('Helvetica')
       .text('Scan Code', 20, currentY + qrSize + 3)

    // Box info next to QR code
    doc.fontSize(8)
       .fillColor(colors.primary)
       .font('Helvetica')
       .text(`Box: ${boxLabel}`, 85, currentY + 10)
    
    doc.fontSize(7)
       .fillColor(colors.gray)
       .font('Helvetica')
       .text(`Items: ${contents.length}`, 85, currentY + 22)

    // Custom notes (if any)
    if (customNotes) {
      currentY += 65
      doc.fontSize(8)
         .fillColor(colors.gray)
         .font('Helvetica-Bold')
         .text('Notes:', 20, currentY)
      
      doc.fontSize(7)
         .fillColor(colors.gray)
         .font('Helvetica')
         .text(customNotes, 20, currentY + 10, { width: 248 })
    }

    // Simple footer
    const footerY = 410
    
    doc.fontSize(6)
       .fillColor(colors.gray)
       .font('Helvetica')
       .text(`Generated: ${new Date().toLocaleString()} | SpareFlow AI Logistics`, 15, footerY, { align: 'center', width: 258 })

    doc.fontSize(6)
       .fillColor(colors.gray)
       .text(`Box ${boxLabel} | Weight: ${totalWeight.toFixed(2)}kg | Items: ${contents.length}`, 15, footerY + 10, { align: 'center', width: 258 })

  } catch (error) {
    console.error('Error generating clean manual box label page:', error)
    // Fallback to simple text
    doc.fontSize(12)
       .fillColor(0, 0, 0)
       .text(`Box Label: ${boxLabel}`, 20, 50)
       .text(`Recipient: ${recipientName}`, 20, 70)
       .text(`Weight: ${totalWeight.toFixed(2)} kg`, 20, 90)
       .text(`Contents: ${contents.length} items`, 20, 110)
  }
}