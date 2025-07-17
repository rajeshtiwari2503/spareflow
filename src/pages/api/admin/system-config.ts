import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const user = await verifyToken(req)
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(401).json({ error: 'Access denied' })
    }

    if (req.method === 'GET') {
      // Return system configuration in the expected nested structure
      const systemConfig = {
        pricing: {
          defaultMarkupPercentage: 15,
          shippingRatePerKg: 5.0,
          minimumOrderValue: 100,
          bulkDiscountThreshold: 1000,
          bulkDiscountPercentage: 10
        },
        msl: {
          defaultThreshold: 10,
          autoAlertsEnabled: true,
          criticalThreshold: 5,
          alertFrequencyHours: 24,
          autoReorderEnabled: false
        },
        general: {
          platformName: 'SpareFlow',
          supportEmail: 'support@spareflow.com',
          maxFileUploadSize: 10485760,
          sessionTimeoutMinutes: 60,
          maintenanceMode: false
        }
      }

      res.status(200).json(systemConfig)
    } else if (req.method === 'PUT') {
      const { section, config } = req.body

      if (!section || !config) {
        return res.status(400).json({ error: 'Section and config are required' })
      }

      // Mock updating system configuration
      // In a real implementation, this would update the database
      console.log(`Updating ${section} configuration:`, config)

      res.status(200).json({ 
        success: true, 
        message: `${section} configuration updated successfully`,
        updatedConfig: config
      })
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Error in system config API:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}