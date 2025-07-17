import { NextApiRequest, NextApiResponse } from 'next'
import { calculateAdvancedPricing } from '@/lib/advanced-pricing'
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

    const { brandId, shipments } = req.body

    if (!shipments || !Array.isArray(shipments) || shipments.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: 'shipments array is required and must not be empty'
      })
    }

    const finalBrandId = user.id
    const estimates = []

    for (const shipment of shipments) {
      const {
        recipientId,
        recipientType, // 'SERVICE_CENTER' or 'DISTRIBUTOR'
        recipientPincode,
        numBoxes,
        estimatedWeight,
        priority,
        insurance
      } = shipment

      // Validate required fields for each shipment
      if (!recipientId || !recipientType || !recipientPincode || !numBoxes) {
        estimates.push({
          error: 'Missing required fields',
          details: 'recipientId, recipientType, recipientPincode, and numBoxes are required',
          shipment
        })
        continue
      }

      // Validate recipient type
      if (!['SERVICE_CENTER', 'DISTRIBUTOR'].includes(recipientType)) {
        estimates.push({
          error: 'Invalid recipient type',
          details: 'recipientType must be either SERVICE_CENTER or DISTRIBUTOR',
          shipment
        })
        continue
      }

      try {
        // Calculate pricing with recipient type consideration
        const pricingInput = {
          brandId: finalBrandId,
          role: 'BRAND',
          weight: estimatedWeight || 1.0,
          pincode: recipientPincode,
          numBoxes: parseInt(numBoxes),
          serviceType: priority === 'HIGH' ? 'EXPRESS' : 'STANDARD',
          recipientType: recipientType // Pass recipient type for pricing differentiation
        }

        const pricingResult = await calculateAdvancedPricing(pricingInput)

        if (!pricingResult.success) {
          estimates.push({
            error: 'Pricing calculation failed',
            details: pricingResult.error,
            shipment
          })
          continue
        }

        let totalCost = pricingResult.price
        let insuranceCost = 0
        let insuranceDetails = null

        // Calculate insurance if provided
        if (insurance && insurance.type !== 'NONE' && insurance.declaredValue) {
          const premium = insurance.declaredValue * 0.02 // 2% premium
          const gst = premium * 0.18 // 18% GST
          insuranceCost = premium + gst
          totalCost += insuranceCost

          insuranceDetails = {
            type: insurance.type,
            declaredValue: insurance.declaredValue,
            premium: Math.round(premium * 100) / 100,
            gst: Math.round(gst * 100) / 100,
            total: Math.round(insuranceCost * 100) / 100
          }
        }

        // Build cost breakdown
        const breakdown = {
          baseRate: pricingResult.breakdown?.baseRate || 0,
          weightCharges: pricingResult.breakdown?.weightCharges || 0,
          remoteAreaSurcharge: pricingResult.breakdown?.remoteAreaSurcharge || 0,
          expressMultiplier: pricingResult.breakdown?.expressMultiplier || 0,
          platformMarkup: pricingResult.breakdown?.platformMarkup || 0,
          recipientTypeMultiplier: pricingResult.breakdown?.recipientTypeMultiplier || 0, // New field for recipient-based pricing
          subtotal: pricingResult.price,
          insurance: insuranceDetails,
          finalTotal: totalCost,
          breakdown: {
            appliedRules: pricingResult.breakdown?.appliedRules || [],
            calculations: pricingResult.breakdown?.calculations || [],
            recipientType: recipientType,
            pricingNotes: recipientType === 'DISTRIBUTOR' 
              ? 'Distributor shipments may have different pricing rules'
              : 'Service Center shipment pricing applied'
          }
        }

        estimates.push({
          success: true,
          recipientId,
          recipientType,
          recipientPincode,
          numBoxes: parseInt(numBoxes),
          estimatedWeight: estimatedWeight || 1.0,
          priority: priority || 'MEDIUM',
          shippingCost: pricingResult.price,
          insuranceCost,
          totalCost,
          ...breakdown
        })

      } catch (error) {
        console.error('Error calculating cost for shipment:', error)
        estimates.push({
          error: 'Cost calculation failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          shipment
        })
      }
    }

    res.status(200).json({
      success: true,
      brandId: finalBrandId,
      estimates,
      summary: {
        totalShipments: shipments.length,
        successfulEstimates: estimates.filter(e => e.success).length,
        failedEstimates: estimates.filter(e => e.error).length,
        totalEstimatedCost: estimates
          .filter(e => e.success)
          .reduce((sum, e) => sum + (e.totalCost || 0), 0)
      }
    })

  } catch (error) {
    console.error('Error in cost estimation:', error)
    res.status(500).json({ 
      error: 'Failed to calculate shipping costs',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}