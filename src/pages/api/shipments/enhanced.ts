import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { calculateAdvancedPricing } from '@/lib/advanced-pricing'
import { checkWalletBalance, deductFromWallet } from '@/lib/enhanced-wallet'
import { generateAWB, DTDCShipmentRequest } from '@/lib/dtdc'
import { extractDTDCCostFromResponse, logBoxMargin } from '@/lib/margin-tracking'
import { notifyShipmentCreated, notifyShipmentStatusUpdate, notifyWalletTransaction } from '@/lib/websocket'
import { checkServiceCenterAuthorization, checkDistributorAuthorization } from '@/lib/authorization'
import { getUserFromRequest } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get authenticated user
    const user = await getUserFromRequest(req)
    if (!user || user.role !== 'BRAND') {
      return res.status(401).json({ error: 'Unauthorized - Brand access required' })
    }

    const { 
      brandId, 
      recipientId,
      recipientType, // 'SERVICE_CENTER' or 'DISTRIBUTOR'
      parts, 
      numBoxes, 
      priority, 
      notes,
      generateAWB,
      autoDeductWallet,
      estimatedWeight, 
      insurance,
      boxes
    } = req.body
    
    // Validate required fields
    if (!recipientId || !recipientType || !numBoxes) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'recipientId, recipientType, and numBoxes are required',
        received: { recipientId, recipientType, numBoxes, parts: parts?.length || 0 }
      })
    }

    // Validate recipient type
    if (!['SERVICE_CENTER', 'DISTRIBUTOR'].includes(recipientType)) {
      return res.status(400).json({
        error: 'Invalid recipient type',
        details: 'recipientType must be either SERVICE_CENTER or DISTRIBUTOR'
      })
    }

    const finalBrandId = user.id

    // Validate parts if provided
    if (parts && (!Array.isArray(parts) || parts.length === 0)) {
      return res.status(400).json({ 
        error: 'Invalid parts data',
        details: 'Parts must be a non-empty array when provided'
      })
    }

    // Get recipient details based on type
    let recipient: any = null
    let recipientAddress = ''
    let recipientPincode = ''
    let recipientPhone = ''
    let recipientName = ''

    if (recipientType === 'SERVICE_CENTER') {
      // Check authorization for service center
      const authCheck = await checkServiceCenterAuthorization(finalBrandId, recipientId)
      
      if (!authCheck.authorized) {
        return res.status(403).json({
          error: 'Service Center shipment not allowed',
          details: authCheck.error,
          status: authCheck.status
        })
      }

      // Get service center details
      recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { 
          id: true, 
          name: true, 
          role: true,
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
      })

      if (!recipient || recipient.role !== 'SERVICE_CENTER') {
        return res.status(400).json({ error: 'Invalid service center ID' })
      }

      const address = recipient.serviceCenterProfile?.addresses?.find(addr => addr.isDefault) || 
                     recipient.serviceCenterProfile?.addresses?.[0]
      
      recipientName = recipient.serviceCenterProfile?.centerName || recipient.name
      recipientAddress = address ? 
        `${address.street}, ${address.area || ''}, ${address.city}, ${address.state}`.replace(', ,', ',') :
        'Service Center Address'
      recipientPincode = address?.pincode || '400001'
      recipientPhone = recipient.phone || '9999999999'

    } else if (recipientType === 'DISTRIBUTOR') {
      // Check authorization for distributor
      const authCheck = await checkDistributorAuthorization(finalBrandId, recipientId)
      
      if (!authCheck.authorized) {
        return res.status(403).json({
          error: 'Distributor shipment not allowed',
          details: authCheck.error,
          status: authCheck.status
        })
      }

      // Get distributor details
      recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { 
          id: true, 
          name: true, 
          role: true,
          phone: true,
          distributorProfile: {
            select: {
              companyName: true,
              address: {
                select: {
                  street: true,
                  area: true,
                  city: true,
                  state: true,
                  pincode: true
                }
              }
            }
          }
        }
      })

      if (!recipient || recipient.role !== 'DISTRIBUTOR') {
        return res.status(400).json({ error: 'Invalid distributor ID' })
      }

      const address = recipient.distributorProfile?.address
      
      recipientName = recipient.distributorProfile?.companyName || recipient.name
      recipientAddress = address ? 
        `${address.street}, ${address.area || ''}, ${address.city}, ${address.state}`.replace(', ,', ',') :
        'Distributor Address'
      recipientPincode = address?.pincode || '400001'
      recipientPhone = recipient.phone || '9999999999'
    }

    // Calculate total weight from parts if provided
    let calculatedWeight = estimatedWeight || 1.0
    if (parts && Array.isArray(parts) && parts.length > 0) {
      try {
        const partIds = parts.map(p => p.partId).filter(Boolean)
        if (partIds.length > 0) {
          const partsData = await prisma.part.findMany({
            where: { id: { in: partIds } },
            select: { id: true, weight: true }
          })
          
          calculatedWeight = parts.reduce((total, part) => {
            const partData = partsData.find(p => p.id === part.partId)
            const partWeight = partData?.weight || 0.5
            return total + (partWeight * (part.quantity || 1))
          }, 0)
        }
      } catch (error) {
        console.error('Error calculating weight from parts:', error)
      }
    }

    // Calculate estimated shipment cost using advanced pricing
    const pricingInput = {
      brandId: finalBrandId,
      role: 'BRAND',
      weight: calculatedWeight,
      pincode: recipientPincode,
      numBoxes: parseInt(numBoxes),
      serviceType: priority === 'HIGH' ? 'EXPRESS' : 'STANDARD',
      recipientType: recipientType // Pass recipient type for pricing differentiation
    }

    const pricingResult = await calculateAdvancedPricing(pricingInput)
    
    if (!pricingResult.success) {
      return res.status(500).json({ 
        error: 'Failed to calculate shipment cost',
        details: pricingResult.error
      })
    }

    let totalEstimatedCost = pricingResult.price
    let insuranceCost = 0
    let insuranceDetails = null

    // Calculate insurance cost if provided
    if (insurance && insurance.type !== 'NONE' && insurance.declaredValue) {
      const premium = insurance.declaredValue * 0.02
      const gst = premium * 0.18
      insuranceCost = premium + gst
      
      insuranceDetails = {
        type: insurance.type,
        declaredValue: insurance.declaredValue,
        premium: Math.round(premium * 100) / 100,
        gst: Math.round(gst * 100) / 100,
        total: Math.round(insuranceCost * 100) / 100
      }
      
      totalEstimatedCost += insuranceCost
    }

    // Validate insurance requirements
    if (insurance && insurance.declaredValue > 10000 && insurance.type === 'NONE') {
      return res.status(400).json({
        error: 'Insurance required for high-value shipments',
        details: 'Shipments with declared value over ₹10,000 require insurance coverage'
      })
    }

    // Check wallet balance including insurance
    const balanceCheck = await checkWalletBalance(finalBrandId, totalEstimatedCost)
    
    if (!balanceCheck.sufficient) {
      return res.status(400).json({
        error: 'Insufficient wallet balance',
        details: {
          currentBalance: balanceCheck.currentBalance,
          requiredAmount: totalEstimatedCost,
          shortfall: balanceCheck.shortfall,
          pricingBreakdown: pricingResult.breakdown
        }
      })
    }

    // Start transaction to create shipment and deduct wallet balance
    const result = await prisma.$transaction(async (tx) => {
      // Create the shipment with enhanced fields
      const shipment = await tx.shipment.create({
        data: {
          brandId: finalBrandId,
          serviceCenterId: recipientType === 'SERVICE_CENTER' ? recipientId : null,
          // Add distributorId field if needed in schema
          numBoxes: parseInt(numBoxes),
          status: 'INITIATED',
          // Store additional metadata
          notes: notes || null,
          priority: priority || 'MEDIUM',
          recipientType: recipientType,
          recipientAddress: recipientAddress,
          recipientPincode: recipientPincode,
          estimatedCost: totalEstimatedCost,
          insuranceDetails: insuranceDetails ? JSON.stringify(insuranceDetails) : null
        } as any,
        include: {
          brand: true,
          serviceCenter: true,
        },
      })

      // Deduct from wallet and record transaction
      const walletDeduction = await deductFromWallet(
        finalBrandId,
        totalEstimatedCost,
        `Shipment to ${recipientType.toLowerCase().replace('_', ' ')} - ${numBoxes} boxes to ${recipientName}`,
        `SHIPMENT_${shipment.id}`
      )

      if (!walletDeduction.success) {
        throw new Error(walletDeduction.error || 'Failed to deduct from wallet')
      }

      return {
        shipment,
        walletTransaction: {
          transactionId: walletDeduction.transactionId,
          newBalance: walletDeduction.newBalance,
          deductedAmount: totalEstimatedCost
        }
      }
    })

    // Send real-time notifications
    notifyShipmentCreated(result.shipment)
    notifyWalletTransaction(finalBrandId, {
      id: result.walletTransaction.transactionId,
      type: 'DEBIT',
      amount: totalEstimatedCost,
      balanceAfter: result.walletTransaction.newBalance,
      reference: `Shipment to ${recipientType.toLowerCase().replace('_', ' ')}`
    })

    // Generate AWB and create boxes
    let dtdcResults = []
    let totalDtdcCost = 0
    let dtdcSuccess = true
    let dtdcError = null

    try {
      for (let boxNumber = 1; boxNumber <= parseInt(numBoxes); boxNumber++) {
        // Create box record
        const box = await prisma.box.create({
          data: {
            shipmentId: result.shipment.id,
            boxNumber: boxNumber.toString(),
            weight: calculatedWeight / parseInt(numBoxes),
            status: 'PENDING'
          }
        })

        // Create BoxPart records if parts are provided
        if (parts && Array.isArray(parts) && parts.length > 0) {
          for (const part of parts) {
            if (part.partId && part.quantity > 0) {
              const quantityPerBox = Math.ceil(part.quantity / parseInt(numBoxes))
              const actualQuantity = boxNumber === parseInt(numBoxes) 
                ? part.quantity - (quantityPerBox * (parseInt(numBoxes) - 1))
                : quantityPerBox

              if (actualQuantity > 0) {
                await prisma.boxPart.create({
                  data: {
                    boxId: box.id,
                    partId: part.partId,
                    quantity: actualQuantity
                  }
                })
              }
            }
          }
        }

        // Prepare DTDC shipment request
        const dtdcRequest: DTDCShipmentRequest = {
          consignee_name: recipientName,
          consignee_address: recipientAddress, 
          consignee_city: recipientAddress.split(',')[2]?.trim() || 'Mumbai',
          consignee_state: recipientAddress.split(',')[3]?.trim() || 'Maharashtra',
          consignee_pincode: recipientPincode,
          consignee_phone: recipientPhone,
          weight: calculatedWeight / parseInt(numBoxes),
          pieces: 1,
          reference_number: `SF-${result.shipment.id}-${recipientType}-BOX-${boxNumber}`,
          box_id: box.id,
          pickup_pincode: '400069',
          declared_value: insurance?.declaredValue || 1000
        }

        // Generate AWB using DTDC API
        const dtdcResponse = await generateAWB(dtdcRequest)

        if (dtdcResponse.success) {
          await prisma.box.update({
            where: { id: box.id },
            data: {
              awbNumber: dtdcResponse.awb_number,
              status: 'SHIPPED'
            }
          })

          const dtdcCostData = extractDTDCCostFromResponse(dtdcResponse)
          const boxDtdcCost = dtdcCostData.cost || 50

          totalDtdcCost += boxDtdcCost

          // Log margin for this box
          await logBoxMargin(box.id, finalBrandId, {
            customerPrice: totalEstimatedCost / parseInt(numBoxes),
            dtdcCost: boxDtdcCost,
            weight: calculatedWeight / parseInt(numBoxes),
            serviceType: priority === 'HIGH' ? 'EXPRESS' : 'STANDARD',
            origin: '400069',
            destination: recipientPincode,
            awbNumber: dtdcResponse.awb_number,
            notes: `Box ${boxNumber} to ${recipientType} ${recipientName}`
          })

          dtdcResults.push({
            boxNumber,
            boxId: box.id,
            awbNumber: dtdcResponse.awb_number,
            trackingUrl: dtdcResponse.tracking_url,
            dtdcCost: boxDtdcCost,
            labelGenerated: dtdcResponse.label_generated || false,
            labelUrl: dtdcResponse.label_url
          })
        } else {
          dtdcSuccess = false
          dtdcError = dtdcResponse.error

          await prisma.box.update({
            where: { id: box.id },
            data: {
              status: 'AWB_FAILED'
            }
          })

          dtdcResults.push({
            boxNumber,
            boxId: box.id,
            error: dtdcResponse.error,
            dtdcCost: 0
          })
        }
      }

      // Update shipment status
      await prisma.shipment.update({
        where: { id: result.shipment.id },
        data: {
          status: dtdcSuccess ? 'SHIPPED' : 'PARTIALLY_SHIPPED'
        }
      })

    } catch (error) {
      console.error('DTDC API Error:', error)
      dtdcSuccess = false
      dtdcError = error instanceof Error ? error.message : 'Unknown DTDC error'

      await prisma.shipment.update({
        where: { id: result.shipment.id },
        data: {
          status: 'DTDC_FAILED'
        }
      })
    }

    // Calculate profit margin
    const profitMargin = totalEstimatedCost - totalDtdcCost
    const marginPercentage = totalEstimatedCost > 0 ? (profitMargin / totalEstimatedCost) * 100 : 0

    res.status(201).json({
      success: true,
      shipment: {
        ...result.shipment,
        recipientType,
        recipientName,
        recipientAddress
      },
      costEstimate: {
        shippingCost: pricingResult.price,
        insuranceCost: insuranceCost,
        totalCost: totalEstimatedCost,
        breakdown: pricingResult.breakdown,
        appliedRules: pricingResult.breakdown.appliedRules
      },
      insurance: insuranceDetails,
      wallet: {
        deducted: result.walletTransaction.deductedAmount,
        transactionId: result.walletTransaction.transactionId,
        balanceAfter: result.walletTransaction.newBalance
      },
      dtdc: {
        success: dtdcSuccess,
        totalInternalCost: totalDtdcCost,
        boxes: dtdcResults,
        error: dtdcError
      },
      margin: {
        customerCharged: totalEstimatedCost,
        dtdcCost: totalDtdcCost,
        profit: profitMargin,
        marginPercentage: Math.round(marginPercentage * 100) / 100
      },
      message: dtdcSuccess 
        ? `Shipment to ${recipientType.toLowerCase().replace('_', ' ')} created successfully. ₹${totalEstimatedCost} deducted from wallet. Profit margin: ₹${profitMargin.toFixed(2)}`
        : `Shipment created but DTDC placement failed. ₹${totalEstimatedCost} deducted from wallet. Error: ${dtdcError}`
    })

  } catch (error) {
    console.error('Error creating enhanced shipment:', error)
    
    if (error instanceof Error && error.message.includes('wallet')) {
      res.status(400).json({ 
        error: 'Wallet operation failed',
        details: error.message
      })
    } else {
      res.status(500).json({ 
        error: 'Failed to create shipment',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}