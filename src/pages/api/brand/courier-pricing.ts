import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Use getUserFromRequest for proper authentication
    const user = await getUserFromRequest(req)
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied. Brand role required.' })
    }

    if (req.method === 'GET') {
      try {
        // PRIORITY 1: Get admin-configured brand-specific pricing
        const adminBrandPricing = await prisma.courierPricing.findUnique({
          where: {
            brandId: user.id
          }
        });

        // PRIORITY 2: Get system default rate if no brand-specific pricing
        let systemDefaultRate = 50; // fallback
        const defaultRateSetting = await prisma.systemSettings.findUnique({
          where: { key: 'default_courier_rate' }
        });
        if (defaultRateSetting) {
          systemDefaultRate = parseFloat(defaultRateSetting.value);
        }

        // Determine which pricing to use and build response
        let finalPricing;
        let meta;

        if (adminBrandPricing) {
          // Use admin-configured brand-specific pricing
          finalPricing = {
            id: adminBrandPricing.id,
            baseRate: adminBrandPricing.perBoxRate,
            weightMultiplier: 1.0,
            platformMarkupPercentage: 10,
            expressMultiplier: 1.5,
            remoteAreaSurcharge: 50,
            distanceMultiplier: 1.0,
            isActive: adminBrandPricing.isActive,
            createdAt: adminBrandPricing.createdAt,
            updatedAt: adminBrandPricing.updatedAt,
            brandId: adminBrandPricing.brandId
          };

          meta = {
            hasBrandSpecificPricing: true,
            usingDefaultPricing: false,
            source: 'admin_configured',
            pricingNote: 'Using admin-configured brand-specific rates',
            lastUpdated: adminBrandPricing.updatedAt,
            configuredByAdmin: true
          };
        } else {
          // Use system default rate
          finalPricing = {
            baseRate: systemDefaultRate,
            weightMultiplier: 1.0,
            platformMarkupPercentage: 10,
            expressMultiplier: 1.5,
            remoteAreaSurcharge: 50,
            distanceMultiplier: 1.0,
            isActive: true,
            updatedAt: new Date().toISOString()
          };

          meta = {
            hasBrandSpecificPricing: false,
            usingDefaultPricing: true,
            source: 'system_default',
            pricingNote: 'Using system default rates - contact admin for custom pricing',
            configuredByAdmin: false
          };
        }

        // Get pricing history for this brand
        const pricingHistory = await prisma.courierPricing.findMany({
          where: {
            brandId: user.id
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            perBoxRate: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            brandId: true
          }
        });

        // Get advanced pricing rules that might affect this brand
        const advancedRules = await prisma.advancedCourierPricing.findMany({
          where: {
            brandId: user.id,
            isActive: true
          },
          select: {
            id: true,
            ruleName: true,
            baseRate: true,
            isActive: true,
            createdAt: true
          }
        });

        return res.status(200).json({
          success: true,
          pricing: finalPricing,
          meta,
          rules: advancedRules,
          history: pricingHistory.map(p => ({
            id: p.id,
            baseRate: p.perBoxRate,
            weightMultiplier: 1.0,
            distanceMultiplier: 1.0,
            isActive: p.isActive,
            createdAt: p.createdAt,
            isBrandSpecific: true,
            source: 'Admin Configured'
          }))
        });

      } catch (dbError) {
        console.error('Database error in courier pricing:', dbError)
        
        // Return fallback pricing if database query fails
        return res.status(200).json({
          success: true,
          pricing: {
            baseRate: 120,
            weightMultiplier: 15,
            platformMarkupPercentage: 10,
            expressMultiplier: 1.5,
            remoteAreaSurcharge: 50,
            distanceMultiplier: 1.0,
            isActive: true,
            updatedAt: new Date().toISOString()
          },
          meta: {
            hasBrandSpecificPricing: false,
            usingDefaultPricing: true,
            source: 'fallback_default',
            error: 'Database query failed, using fallback pricing'
          },
          rules: [],
          history: []
        })
      }

    } else {
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Brand courier pricing API error:', error)
    
    // Return fallback response even on error
    return res.status(200).json({
      success: true,
      pricing: {
        baseRate: 120,
        weightMultiplier: 15,
        platformMarkupPercentage: 10,
        expressMultiplier: 1.5,
        remoteAreaSurcharge: 50,
        distanceMultiplier: 1.0,
        isActive: true,
        updatedAt: new Date().toISOString()
      },
      meta: {
        hasBrandSpecificPricing: false,
        usingDefaultPricing: true,
        source: 'error_fallback',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      rules: [],
      history: []
    })
  }
}