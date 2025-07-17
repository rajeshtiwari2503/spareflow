import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { calculateAdvancedPricing } from '@/lib/advanced-pricing'
import { checkWalletBalance, deductFromWallet } from '@/lib/wallet'
import { generateAWB, DTDCShipmentRequest } from '@/lib/dtdc'
import { extractDTDCCostFromResponse, logBoxMargin } from '@/lib/margin-tracking'
import { notifyShipmentCreated, notifyShipmentStatusUpdate, notifyWalletTransaction } from '@/lib/websocket'
import { validateRequestBody, schemas } from '@/lib/validation'
import { checkMultipleServiceCenterAuthorizations } from '@/lib/authorization'

interface BulkShipmentItem {
  serviceCenterId: string
  serviceCenterName?: string
  serviceCenterPincode: string
  serviceCenterAddress: string
  serviceCenterPhone: string
  numBoxes: number
  estimatedWeight?: number
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  notes?: string
  parts?: Array<{
    partId: string
    quantity: number
    boxNumber?: number
  }>
}

interface BulkShipmentRequest {
  brandId: string
  shipments: BulkShipmentItem[]
  options?: {
    generateAWBImmediately?: boolean
    generateLabels?: boolean
    notifyServiceCenters?: boolean
    batchSize?: number
  }
}

interface BulkOperationResult {
  success: boolean
  totalShipments: number
  successfulShipments: number
  failedShipments: number
  results: Array<{
    index: number
    success: boolean
    shipmentId?: string
    error?: string
    details?: any
  }>
  summary: {
    totalCost: number
    totalDtdcCost: number
    totalMargin: number
    walletBalance: number
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      // Validate request body
      const validation = validateRequestBody(req.body, {
        brandId: { required: true },
        shipments: { required: true, type: 'array', minLength: 1, maxLength: 100 }
      })

      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: validation.errors
        })
      }

      const { brandId, shipments, options = {} } = req.body as BulkShipmentRequest
      const {
        generateAWBImmediately = true,
        generateLabels = false,
        notifyServiceCenters = false,
        batchSize = 10
      } = options

      // Validate brand
      const brand = await prisma.user.findUnique({
        where: { id: brandId },
        select: { id: true, name: true, role: true }
      })

      if (!brand || brand.role !== 'BRAND') {
        return res.status(400).json({ error: 'Invalid brand ID' })
      }

      // Validate all service centers exist
      const serviceCenterIds = [...new Set(shipments.map(s => s.serviceCenterId))]
      const serviceCenters = await prisma.user.findMany({
        where: {
          id: { in: serviceCenterIds },
          role: 'SERVICE_CENTER'
        },
        select: { id: true, name: true, role: true }
      })

      if (serviceCenters.length !== serviceCenterIds.length) {
        const foundIds = serviceCenters.map(sc => sc.id)
        const missingIds = serviceCenterIds.filter(id => !foundIds.includes(id))
        return res.status(400).json({
          error: 'Invalid service center IDs',
          missingIds
        })
      }

      // Check authorization for all service centers
      const authCheck = await checkMultipleServiceCenterAuthorizations(brandId, serviceCenterIds)
      
      if (authCheck.unauthorized.length > 0) {
        return res.status(403).json({
          error: 'Some service centers are not authorized for shipments',
          unauthorizedServiceCenters: authCheck.unauthorized,
          authorizedServiceCenters: authCheck.authorized
        })
      }

      // Calculate total estimated cost for all shipments
      let totalEstimatedCost = 0
      const costBreakdowns: Array<{
        index: number
        cost: number
        breakdown: any
      }> = []

      for (let i = 0; i < shipments.length; i++) {
        const shipment = shipments[i]
        
        const pricingInput = {
          brandId: brandId,
          role: brand.role,
          weight: shipment.estimatedWeight || 1.0,
          pincode: shipment.serviceCenterPincode,
          numBoxes: shipment.numBoxes,
          serviceType: 'STANDARD'
        }

        const pricingResult = await calculateAdvancedPricing(pricingInput)
        
        if (!pricingResult.success) {
          return res.status(500).json({
            error: `Failed to calculate cost for shipment ${i + 1}`,
            details: pricingResult.error
          })
        }

        totalEstimatedCost += pricingResult.price
        costBreakdowns.push({
          index: i,
          cost: pricingResult.price,
          breakdown: pricingResult.breakdown
        })
      }

      // Check wallet balance for total cost
      const balanceCheck = await checkWalletBalance(brandId, totalEstimatedCost)
      
      if (!balanceCheck.sufficient) {
        return res.status(400).json({
          error: 'Insufficient wallet balance for bulk operation',
          details: {
            currentBalance: balanceCheck.currentBalance,
            requiredAmount: totalEstimatedCost,
            shortfall: balanceCheck.shortfall,
            totalShipments: shipments.length
          }
        })
      }

      // Process shipments in batches
      const results: BulkOperationResult['results'] = []
      let successfulShipments = 0
      let totalDtdcCost = 0
      let walletDeducted = false
      let walletTransactionId: string | undefined

      try {
        // Deduct total amount from wallet first
        const walletDeduction = await deductFromWallet(
          brandId,
          totalEstimatedCost,
          `Bulk shipment creation - ${shipments.length} shipments`,
          `BULK_SHIPMENT_${Date.now()}`,
          undefined
        )

        if (!walletDeduction.success) {
          throw new Error(walletDeduction.error || 'Failed to deduct from wallet')
        }

        walletDeducted = true
        walletTransactionId = walletDeduction.transactionId

        // Send wallet transaction notification
        notifyWalletTransaction(brandId, {
          id: walletDeduction.transactionId,
          type: 'DEBIT',
          amount: totalEstimatedCost,
          balanceAfter: walletDeduction.newBalance,
          reference: `Bulk shipment creation - ${shipments.length} shipments`
        })

        // Process shipments in batches
        for (let batchStart = 0; batchStart < shipments.length; batchStart += batchSize) {
          const batchEnd = Math.min(batchStart + batchSize, shipments.length)
          const batch = shipments.slice(batchStart, batchEnd)

          // Process batch in parallel
          const batchPromises = batch.map(async (shipmentData, batchIndex) => {
            const globalIndex = batchStart + batchIndex
            
            try {
              // Create shipment
              const shipment = await prisma.shipment.create({
                data: {
                  brandId,
                  serviceCenterId: shipmentData.serviceCenterId,
                  numBoxes: shipmentData.numBoxes,
                  status: 'INITIATED',
                },
                include: {
                  brand: true,
                  serviceCenter: true,
                },
              })

              // Send real-time notification for shipment creation
              notifyShipmentCreated(shipment)

              let shipmentDtdcCost = 0
              let awbResults: any[] = []
              let shipmentSuccess = true
              let shipmentError: string | null = null

              if (generateAWBImmediately) {
                // Create boxes and generate AWB for each
                for (let boxNumber = 1; boxNumber <= shipmentData.numBoxes; boxNumber++) {
                  try {
                    // Create box record
                    const box = await prisma.box.create({
                      data: {
                        shipmentId: shipment.id,
                        boxNumber: boxNumber.toString(),
                        weight: (shipmentData.estimatedWeight || 1.0) / shipmentData.numBoxes,
                        status: 'PENDING'
                      }
                    })

                    // Add parts to box if specified
                    if (shipmentData.parts) {
                      const boxParts = shipmentData.parts.filter(
                        part => !part.boxNumber || part.boxNumber === boxNumber
                      )

                      if (boxParts.length > 0) {
                        await prisma.boxPart.createMany({
                          data: boxParts.map(part => ({
                            boxId: box.id,
                            partId: part.partId,
                            quantity: part.quantity
                          }))
                        })
                      }
                    }

                    // Generate AWB
                    const dtdcRequest: DTDCShipmentRequest = {
                      consignee_name: shipmentData.serviceCenterName || serviceCenters.find(sc => sc.id === shipmentData.serviceCenterId)?.name || 'Service Center',
                      consignee_address: shipmentData.serviceCenterAddress,
                      consignee_city: 'Mumbai', // Should be extracted from address
                      consignee_state: 'Maharashtra', // Should be extracted from address
                      consignee_pincode: shipmentData.serviceCenterPincode,
                      consignee_phone: shipmentData.serviceCenterPhone,
                      weight: (shipmentData.estimatedWeight || 1.0) / shipmentData.numBoxes,
                      pieces: 1,
                      reference_number: `SF-${shipment.id}-BOX-${boxNumber}`,
                      box_id: box.id,
                      pickup_pincode: '400069', // Should be configurable
                      declared_value: 1000
                    }

                    const dtdcResponse = await generateAWB(dtdcRequest)

                    if (dtdcResponse.success) {
                      // Update box with AWB
                      await prisma.box.update({
                        where: { id: box.id },
                        data: {
                          awbNumber: dtdcResponse.awb_number,
                          status: 'IN_TRANSIT'
                        }
                      })

                      // Track DTDC cost and margin
                      const dtdcCostData = extractDTDCCostFromResponse(dtdcResponse)
                      const boxDtdcCost = dtdcCostData.cost || 50

                      shipmentDtdcCost += boxDtdcCost

                      // Log margin
                      await logBoxMargin(box.id, brandId, {
                        customerPrice: costBreakdowns[globalIndex].cost / shipmentData.numBoxes,
                        dtdcCost: boxDtdcCost,
                        weight: (shipmentData.estimatedWeight || 1.0) / shipmentData.numBoxes,
                        serviceType: 'STANDARD',
                        origin: '400069',
                        destination: shipmentData.serviceCenterPincode,
                        awbNumber: dtdcResponse.awb_number,
                        notes: `Bulk operation - Box ${boxNumber} of shipment ${shipment.id}`
                      })

                      awbResults.push({
                        boxNumber,
                        boxId: box.id,
                        awbNumber: dtdcResponse.awb_number,
                        trackingUrl: dtdcResponse.tracking_url,
                        dtdcCost: boxDtdcCost
                      })
                    } else {
                      shipmentSuccess = false
                      shipmentError = dtdcResponse.error
                      
                      await prisma.box.update({
                        where: { id: box.id },
                        data: { status: 'PENDING' }
                      })

                      awbResults.push({
                        boxNumber,
                        boxId: box.id,
                        error: dtdcResponse.error
                      })
                    }
                  } catch (boxError) {
                    console.error(`Error processing box ${boxNumber} for shipment ${shipment.id}:`, boxError)
                    shipmentSuccess = false
                    shipmentError = boxError instanceof Error ? boxError.message : 'Unknown box processing error'
                  }
                }

                // Update shipment status
                await prisma.shipment.update({
                  where: { id: shipment.id },
                  data: {
                    status: shipmentSuccess ? 'DISPATCHED' : 'INITIATED',
                    dtdcCost: shipmentDtdcCost
                  }
                })

                // Send status update notification
                notifyShipmentStatusUpdate({
                  ...shipment,
                  status: shipmentSuccess ? 'DISPATCHED' : 'INITIATED'
                }, 'INITIATED')
              }

              totalDtdcCost += shipmentDtdcCost

              return {
                index: globalIndex,
                success: shipmentSuccess,
                shipmentId: shipment.id,
                details: {
                  shipment: {
                    id: shipment.id,
                    serviceCenterId: shipment.serviceCenterId,
                    numBoxes: shipment.numBoxes,
                    status: shipment.status
                  },
                  cost: costBreakdowns[globalIndex].cost,
                  dtdcCost: shipmentDtdcCost,
                  margin: costBreakdowns[globalIndex].cost - shipmentDtdcCost,
                  awbResults: generateAWBImmediately ? awbResults : undefined
                },
                error: shipmentError || undefined
              }

            } catch (error) {
              console.error(`Error creating shipment ${globalIndex}:`, error)
              return {
                index: globalIndex,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          })

          // Wait for batch to complete
          const batchResults = await Promise.all(batchPromises)
          results.push(...batchResults)
          
          // Count successful shipments
          successfulShipments += batchResults.filter(r => r.success).length

          // Small delay between batches to avoid overwhelming the system
          if (batchEnd < shipments.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        // Get final wallet balance
        const finalWallet = await prisma.brandWallet.findUnique({
          where: { brandId },
          select: { balance: true }
        })

        const response: BulkOperationResult = {
          success: successfulShipments > 0,
          totalShipments: shipments.length,
          successfulShipments,
          failedShipments: shipments.length - successfulShipments,
          results,
          summary: {
            totalCost: totalEstimatedCost,
            totalDtdcCost,
            totalMargin: totalEstimatedCost - totalDtdcCost,
            walletBalance: finalWallet?.balance || 0
          }
        }

        res.status(201).json(response)

      } catch (error) {
        console.error('Bulk shipment creation error:', error)
        
        // If wallet was deducted but operation failed, consider refunding
        // This is a business decision - for now, we'll keep the deduction as shipments may have been partially created
        
        res.status(500).json({
          error: 'Bulk operation failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          partialResults: results.length > 0 ? results : undefined,
          walletDeducted: walletDeducted,
          walletTransactionId: walletTransactionId
        })
      }

    } catch (error) {
      console.error('Bulk shipments API error:', error)
      res.status(500).json({
        error: 'Failed to process bulk shipments',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  } else if (req.method === 'PUT') {
    // Bulk operations on existing shipments
    try {
      const { operation, shipmentIds, data } = req.body

      if (!operation || !shipmentIds || !Array.isArray(shipmentIds)) {
        return res.status(400).json({
          error: 'Missing required fields: operation, shipmentIds'
        })
      }

      const results = []

      switch (operation) {
        case 'updateStatus':
          if (!data.status) {
            return res.status(400).json({ error: 'Status is required for updateStatus operation' })
          }

          for (const shipmentId of shipmentIds) {
            try {
              const shipment = await prisma.shipment.update({
                where: { id: shipmentId },
                data: { status: data.status },
                include: {
                  brand: true,
                  serviceCenter: true
                }
              })

              notifyShipmentStatusUpdate(shipment, shipment.status)

              results.push({
                shipmentId,
                success: true,
                newStatus: data.status
              })
            } catch (error) {
              results.push({
                shipmentId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            }
          }
          break

        case 'generateAWB':
          // Bulk AWB generation for shipments that don't have AWB yet
          for (const shipmentId of shipmentIds) {
            try {
              const shipment = await prisma.shipment.findUnique({
                where: { id: shipmentId },
                include: {
                  boxes: true,
                  serviceCenter: true
                }
              })

              if (!shipment) {
                results.push({
                  shipmentId,
                  success: false,
                  error: 'Shipment not found'
                })
                continue
              }

              const awbResults = []
              for (const box of shipment.boxes) {
                if (!box.awbNumber) {
                  // Generate AWB for this box
                  const dtdcRequest: DTDCShipmentRequest = {
                    consignee_name: shipment.serviceCenter.name,
                    consignee_address: 'Service Center Address', // Should be from serviceCenter data
                    consignee_city: 'Mumbai',
                    consignee_state: 'Maharashtra',
                    consignee_pincode: '400001', // Should be from serviceCenter data
                    consignee_phone: '9999999999',
                    weight: box.weight || 1.0,
                    pieces: 1,
                    reference_number: `SF-${shipment.id}-BOX-${box.boxNumber}`,
                    box_id: box.id,
                    pickup_pincode: '400069',
                    declared_value: 1000
                  }

                  const dtdcResponse = await generateAWB(dtdcRequest)

                  if (dtdcResponse.success) {
                    await prisma.box.update({
                      where: { id: box.id },
                      data: {
                        awbNumber: dtdcResponse.awb_number,
                        status: 'IN_TRANSIT'
                      }
                    })

                    awbResults.push({
                      boxId: box.id,
                      boxNumber: box.boxNumber,
                      awbNumber: dtdcResponse.awb_number,
                      success: true
                    })
                  } else {
                    awbResults.push({
                      boxId: box.id,
                      boxNumber: box.boxNumber,
                      success: false,
                      error: dtdcResponse.error
                    })
                  }
                }
              }

              results.push({
                shipmentId,
                success: awbResults.some(r => r.success),
                awbResults
              })

            } catch (error) {
              results.push({
                shipmentId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            }
          }
          break

        default:
          return res.status(400).json({
            error: 'Invalid operation',
            supportedOperations: ['updateStatus', 'generateAWB']
          })
      }

      res.status(200).json({
        success: results.some(r => r.success),
        results,
        summary: {
          total: shipmentIds.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      })

    } catch (error) {
      console.error('Bulk operations error:', error)
      res.status(500).json({
        error: 'Failed to perform bulk operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  } else {
    res.setHeader('Allow', ['POST', 'PUT'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}