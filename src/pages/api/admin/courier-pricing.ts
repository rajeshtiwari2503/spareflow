import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { logPricingChange } from './pricing-audit-trail';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user || authResult.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.method === 'GET') {
      // Fetch all courier pricing with brand information
      const courierPricing = await prisma.courierPricing.findMany({
        include: {
          brand: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }).catch(() => []);

      // Get brands without courier pricing
      const brandsWithoutPricing = await prisma.user.findMany({
        where: {
          role: 'BRAND',
          courierPricing: null
        },
        select: { id: true, name: true, email: true }
      }).catch(() => []);

      // Get default rate from system settings
      const defaultRateSetting = await prisma.systemSettings.findUnique({
        where: { key: 'default_courier_rate' }
      }).catch(() => null);

      const defaultRate = defaultRateSetting ? parseFloat(defaultRateSetting.value) : 50;

      res.status(200).json({
        courierPricing,
        brandsWithoutPricing,
        defaultRate
      });
    } else if (req.method === 'POST') {
      const { action, brandId, perBoxRate, isActive } = req.body;

      if (action === 'setPricing') {
        if (!brandId || !perBoxRate || perBoxRate <= 0) {
          return res.status(400).json({ error: 'Brand ID and valid per-box rate are required' });
        }

        // Get existing pricing for audit trail
        const existingPricing = await prisma.courierPricing.findUnique({
          where: { brandId }
        });

        // Upsert courier pricing
        const pricing = await prisma.courierPricing.upsert({
          where: { brandId },
          update: {
            perBoxRate: parseFloat(perBoxRate),
            isActive: isActive !== undefined ? isActive : true
          },
          create: {
            brandId,
            perBoxRate: parseFloat(perBoxRate),
            isActive: isActive !== undefined ? isActive : true
          },
          include: {
            brand: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        // Log the pricing change
        await logPricingChange({
          adminId: authResult.user.id,
          action: existingPricing ? 'PRICING_UPDATED' : 'PRICING_CREATED',
          brandId,
          oldValue: existingPricing ? {
            perBoxRate: existingPricing.perBoxRate,
            isActive: existingPricing.isActive
          } : null,
          newValue: {
            perBoxRate: parseFloat(perBoxRate),
            isActive: isActive !== undefined ? isActive : true
          },
          affectedField: 'perBoxRate',
          reason: `Admin ${existingPricing ? 'updated' : 'created'} pricing for brand ${pricing.brand.name}`,
          req
        });

        res.status(200).json({
          success: true,
          message: 'Courier pricing updated successfully',
          pricing
        });
      } else if (action === 'setDefaultRate') {
        if (!perBoxRate || perBoxRate <= 0) {
          return res.status(400).json({ error: 'Valid default rate is required' });
        }

        // Get existing default rate for audit trail
        const existingDefaultRate = await prisma.systemSettings.findUnique({
          where: { key: 'default_courier_rate' }
        }).catch(() => null);

        // Update or create default rate setting
        await prisma.systemSettings.upsert({
          where: { key: 'default_courier_rate' },
          update: {
            value: perBoxRate.toString(),
            description: 'Default courier rate per box for new brands'
          },
          create: {
            key: 'default_courier_rate',
            value: perBoxRate.toString(),
            description: 'Default courier rate per box for new brands'
          }
        }).catch(() => {
          // If systemSettings table doesn't exist, just continue
          console.log('SystemSettings table not available, using fallback');
        });

        // Log the default rate change
        await logPricingChange({
          adminId: authResult.user.id,
          action: 'DEFAULT_RATE_UPDATED',
          oldValue: existingDefaultRate ? parseFloat(existingDefaultRate.value) : null,
          newValue: parseFloat(perBoxRate),
          affectedField: 'default_courier_rate',
          reason: `Admin updated system default courier rate`,
          req
        });

        res.status(200).json({
          success: true,
          message: 'Default courier rate updated successfully',
          defaultRate: parseFloat(perBoxRate)
        });
      } else if (action === 'toggleActive') {
        if (!brandId) {
          return res.status(400).json({ error: 'Brand ID is required' });
        }

        const pricing = await prisma.courierPricing.findUnique({
          where: { brandId }
        });

        if (!pricing) {
          return res.status(404).json({ error: 'Courier pricing not found' });
        }

        const updatedPricing = await prisma.courierPricing.update({
          where: { brandId },
          data: { isActive: !pricing.isActive },
          include: {
            brand: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        // Log the activation/deactivation
        await logPricingChange({
          adminId: authResult.user.id,
          action: updatedPricing.isActive ? 'PRICING_ACTIVATED' : 'PRICING_DEACTIVATED',
          brandId,
          oldValue: pricing.isActive,
          newValue: updatedPricing.isActive,
          affectedField: 'isActive',
          reason: `Admin ${updatedPricing.isActive ? 'activated' : 'deactivated'} pricing for brand ${updatedPricing.brand.name}`,
          req
        });

        res.status(200).json({
          success: true,
          message: `Courier pricing ${updatedPricing.isActive ? 'activated' : 'deactivated'} successfully`,
          pricing: updatedPricing
        });
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in courier pricing API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}