import { NextApiRequest, NextApiResponse } from 'next'
import { calculateAdvancedPricing } from '@/lib/advanced-pricing'
import { getUserFromRequest } from '@/lib/auth'

interface InsuranceCalculation {
  declaredValue: number
  premium: number
  gst: number
  totalInsurance: number
}

interface ShipmentCostEstimate {
  baseRate: number
  weightCharges: number
  remoteAreaSurcharge: number
  expressMultiplier: number
  platformMarkup: number
  recipientTypeMultiplier?: number
  subtotal: number
  insurance: InsuranceCalculation | null
  finalTotal: number
  breakdown: {
    appliedRules: string[]
    calculations: string[]
    recipientType?: string
    pricingNotes?: string
  }
}

interface EnhancedShipmentRequest {
  // New format (enhanced)
  recipientId?: string
  recipientType?: 'SERVICE_CENTER' | 'DISTRIBUTOR'
  recipientPincode?: string
  // Legacy format (backward compatibility)
  serviceCenterId?: string
  serviceCenterPincode?: string
  // Common fields
  numBoxes: number
  estimatedWeight: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  insurance: {
    type: 'NONE' | 'CARRIER_RISK' | 'OWNER_RISK'
    declaredValue?: number
  }
}

interface BulkCostEstimateRequest {
  brandId: string
  shipments: Array<EnhancedShipmentRequest>
}

function calculateInsurance(declaredValue: number): InsuranceCalculation {
  const premium = declaredValue * 0.02 // 2% of declared value
  const gst = premium * 0.18 // 18% GST on premium
  const totalInsurance = premium + gst

  return {
    declaredValue,
    premium: Math.round(premium * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    totalInsurance: Math.round(totalInsurance * 100) / 100
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    // Get authenticated user
    const user = await getUserFromRequest(req)
    if (!user || user.role !== 'BRAND') {
      return res.status(401).json({ error: 'Unauthorized - Brand access required' })
    }

    const { brandId, shipments }: BulkCostEstimateRequest = req.body

    if (!shipments || !Array.isArray(shipments)) {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'shipments array is required'
      })
    }

    const finalBrandId = user.id
    const estimates: Array<ShipmentCostEstimate & { 
      shipmentIndex: number
      recipientId: string
      recipientType: string
      recipientPincode: string
    }> = []
    let totalCost = 0

    for (let i = 0; i < shipments.length; i++) {
      const shipment = shipments[i]
      
      // Support both new format (recipientId + recipientType) and legacy format (serviceCenterId)
      const recipientId = shipment.recipientId || shipment.serviceCenterId
      const recipientType = shipment.recipientType || 'SERVICE_CENTER'
      const recipientPincode = shipment.recipientPincode || shipment.serviceCenterPincode

      // Validate required fields
      if (!recipientId || !recipientPincode || !shipment.numBoxes) {
        return res.status(400).json({
          error: `Invalid shipment data at index ${i}`,
          details: 'recipientId/serviceCenterId, recipientPincode/serviceCenterPincode, and numBoxes are required'
        })
      }

      // Validate recipient type
      if (!['SERVICE_CENTER', 'DISTRIBUTOR'].includes(recipientType)) {
        return res.status(400).json({
          error: `Invalid recipient type at index ${i}`,
          details: 'recipientType must be either SERVICE_CENTER or DISTRIBUTOR'
        })
      }

      // Calculate base shipping cost with recipient type consideration
      const pricingInput = {
        brandId: finalBrandId,
        role: 'BRAND',
        weight: shipment.estimatedWeight || 1.0,
        pincode: recipientPincode,
        numBoxes: shipment.numBoxes,
        serviceType: shipment.priority === 'HIGH' ? 'EXPRESS' : 'STANDARD',
        recipientType: recipientType // Pass recipient type for pricing differentiation
      }

      const pricingResult = await calculateAdvancedPricing(pricingInput)

      if (!pricingResult.success) {
        return res.status(500).json({
          error: `Failed to calculate cost for shipment ${i + 1}`,
          details: pricingResult.error
        })
      }

      // Extract detailed breakdown
      const breakdown = pricingResult.breakdown
      const baseRate = breakdown.baseRate * breakdown.roleMultiplier
      const weightCharges = breakdown.weightSurcharge
      const remoteAreaSurcharge = breakdown.pincodeSurcharge
      const expressMultiplier = breakdown.serviceTypeSurcharge
      const recipientTypeMultiplier = breakdown.recipientTypeMultiplier || 0
      const platformMarkup = baseRate * 0.1 // 10% platform markup
      const subtotal = breakdown.totalPrice

      // Calculate insurance if required
      let insurance: InsuranceCalculation | null = null
      if (shipment.insurance.type !== 'NONE' && shipment.insurance.declaredValue) {
        insurance = calculateInsurance(shipment.insurance.declaredValue)
      }

      const finalTotal = subtotal + (insurance?.totalInsurance || 0)

      const estimate: ShipmentCostEstimate & { 
        shipmentIndex: number
        recipientId: string
        recipientType: string
        recipientPincode: string
      } = {
        shipmentIndex: i,
        recipientId,
        recipientType,
        recipientPincode,
        baseRate: Math.round(baseRate * 100) / 100,
        weightCharges: Math.round(weightCharges * 100) / 100,
        remoteAreaSurcharge: Math.round(remoteAreaSurcharge * 100) / 100,
        expressMultiplier: Math.round(expressMultiplier * 100) / 100,
        recipientTypeMultiplier: Math.round(recipientTypeMultiplier * 100) / 100,
        platformMarkup: Math.round(platformMarkup * 100) / 100,
        subtotal: Math.round(subtotal * 100) / 100,
        insurance,
        finalTotal: Math.round(finalTotal * 100) / 100,
        breakdown: {
          appliedRules: breakdown.appliedRules,
          recipientType,
          pricingNotes: recipientType === 'DISTRIBUTOR' 
            ? 'Distributor shipments may have different pricing rules'
            : 'Service Center shipment pricing applied',
          calculations: [
            `Base Rate: ₹${baseRate.toFixed(2)} (${breakdown.numBoxes} boxes)`,
            `Weight Charges: ₹${weightCharges.toFixed(2)} (${shipment.estimatedWeight}kg)`,
            remoteAreaSurcharge > 0 ? `Remote Area Surcharge: ₹${remoteAreaSurcharge.toFixed(2)}` : null,
            expressMultiplier > 0 ? `Express Service: ₹${expressMultiplier.toFixed(2)}` : null,
            recipientTypeMultiplier > 0 ? `${recipientType} Multiplier: ₹${recipientTypeMultiplier.toFixed(2)}` : null,
            `Platform Markup (10%): ₹${platformMarkup.toFixed(2)}`,
            insurance ? `Insurance: ₹${insurance.totalInsurance} (${insurance.declaredValue} @ 2% + 18% GST)` : null
          ].filter(Boolean) as string[]
        }
      }

      estimates.push(estimate)
      totalCost += finalTotal
    }

    // Check wallet balance
    let walletStatus = {
      sufficient: false,
      currentBalance: 0,
      shortfall: 0
    }

    try {
      const { checkWalletBalance } = await import('@/lib/wallet')
      const balanceCheck = await checkWalletBalance(finalBrandId, totalCost)
      walletStatus = {
        sufficient: balanceCheck.sufficient,
        currentBalance: balanceCheck.currentBalance,
        shortfall: balanceCheck.shortfall || 0
      }
    } catch (error) {
      console.error('Error checking wallet balance:', error)
    }

    res.status(200).json({
      success: true,
      brandId: finalBrandId,
      estimates,
      summary: {
        totalShipments: shipments.length,
        totalCost: Math.round(totalCost * 100) / 100,
        totalInsurance: estimates.reduce((sum, est) => sum + (est.insurance?.totalInsurance || 0), 0),
        totalShipping: estimates.reduce((sum, est) => sum + est.subtotal, 0),
        serviceCenterShipments: estimates.filter(e => e.recipientType === 'SERVICE_CENTER').length,
        distributorShipments: estimates.filter(e => e.recipientType === 'DISTRIBUTOR').length
      },
      wallet: walletStatus,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error calculating cost estimates:', error)
    res.status(500).json({
      error: 'Failed to calculate cost estimates',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}