import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // This endpoint would typically be called by a cron job or scheduler
    const { authToken } = req.body;
    
    // Simple auth check (in production, use proper authentication)
    if (authToken !== process.env.SCHEDULED_JOB_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Starting scheduled MSL automation job...');

    // Get all brands
    const brands = await prisma.user.findMany({
      where: {
        role: 'BRAND',
      },
      select: {
        id: true,
        name: true,
      },
    });

    const results = [];

    // Run MSL automation for each brand
    for (const brand of brands) {
      try {
        console.log(`Running MSL automation for brand: ${brand.name} (${brand.id})`);

        const response = await fetch(`${process.env.NEXT_PUBLIC_CO_DEV_ENV || 'http://localhost:3000'}/api/ai-forecasting/msl-automation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brandId: brand.id,
            autoApprove: false, // Require manual approval
            distributorId: 'dist-1', // Default distributor
          }),
        });

        const data = await response.json();
        
        results.push({
          brandId: brand.id,
          brandName: brand.name,
          success: data.success,
          summary: data.summary,
          message: data.message,
        });

        console.log(`MSL automation completed for ${brand.name}: ${data.message}`);

      } catch (error) {
        console.error(`Error running MSL automation for brand ${brand.id}:`, error);
        results.push({
          brandId: brand.id,
          brandName: brand.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log job completion
    console.log('Scheduled MSL automation job completed');
    console.log('Results:', results);

    res.status(200).json({
      success: true,
      message: 'Scheduled MSL automation job completed',
      results,
      summary: {
        brandsProcessed: brands.length,
        successfulRuns: results.filter(r => r.success).length,
        failedRuns: results.filter(r => !r.success).length,
        totalPurchaseOrders: results.reduce((sum, r) => sum + (r.summary?.purchaseOrdersCreated || 0), 0),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Scheduled job error:', error);
    res.status(500).json({ 
      error: 'Failed to run scheduled MSL automation job',
      timestamp: new Date().toISOString(),
    });
  }
}