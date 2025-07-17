import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

interface ForecastResult {
  partId: string;
  partCode: string;
  partName: string;
  currentMSL: number;
  projectedDemand: number;
  recommendedMSL: number;
  needsReorder: boolean;
  confidence: number;
}

// Mock AI forecasting algorithm
function calculateDemandForecast(historicalData: any[], currentMSL: number): {
  projectedDemand: number;
  recommendedMSL: number;
  confidence: number;
} {
  // Simple moving average with trend analysis
  const totalOrders = historicalData.reduce((sum, data) => sum + data.quantity, 0);
  const avgDemand = totalOrders / Math.max(historicalData.length, 1);
  
  // Calculate trend (simplified)
  const recentData = historicalData.slice(-5); // Last 5 data points
  const recentAvg = recentData.reduce((sum, data) => sum + data.quantity, 0) / Math.max(recentData.length, 1);
  
  // Project demand with trend factor
  const trendFactor = recentAvg > avgDemand ? 1.2 : 0.9;
  const projectedDemand = Math.round(avgDemand * trendFactor);
  
  // Recommend MSL with safety buffer
  const safetyBuffer = 1.5;
  const recommendedMSL = Math.max(Math.round(projectedDemand * safetyBuffer), currentMSL);
  
  // Calculate confidence based on data consistency
  const variance = historicalData.reduce((sum, data) => {
    return sum + Math.pow(data.quantity - avgDemand, 2);
  }, 0) / Math.max(historicalData.length, 1);
  
  const confidence = Math.max(0.3, Math.min(0.95, 1 - (variance / (avgDemand + 1))));
  
  return {
    projectedDemand,
    recommendedMSL,
    confidence
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { brandId, days = 30 } = req.body;

    if (!brandId) {
      return res.status(400).json({ error: 'Brand ID is required' });
    }

    // Get all parts for the brand
    const parts = await prisma.part.findMany({
      where: { brandId },
      select: {
        id: true,
        code: true,
        name: true,
        msl: true
      }
    });

    const forecasts: ForecastResult[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    for (const part of parts) {
      // Get historical customer orders
      const customerOrders = await prisma.customerOrder.findMany({
        where: {
          partId: part.id,
          createdAt: {
            gte: cutoffDate
          }
        },
        select: {
          quantity: true,
          createdAt: true
        }
      });

      // Get historical service center usage (from box_parts via shipments)
      const serviceCenterUsage = await prisma.boxPart.findMany({
        where: {
          partId: part.id,
          box: {
            shipment: {
              brandId,
              createdAt: {
                gte: cutoffDate
              }
            }
          }
        },
        select: {
          quantity: true,
          box: {
            select: {
              shipment: {
                select: {
                  createdAt: true
                }
              }
            }
          }
        }
      });

      // Combine historical data
      const historicalData = [
        ...customerOrders.map(order => ({
          quantity: order.quantity,
          date: order.createdAt,
          source: 'customer'
        })),
        ...serviceCenterUsage.map(usage => ({
          quantity: usage.quantity,
          date: usage.box.shipment.createdAt,
          source: 'service_center'
        }))
      ].sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate forecast
      const forecast = calculateDemandForecast(historicalData, part.msl);
      
      forecasts.push({
        partId: part.id,
        partCode: part.code,
        partName: part.name,
        currentMSL: part.msl,
        projectedDemand: forecast.projectedDemand,
        recommendedMSL: forecast.recommendedMSL,
        needsReorder: forecast.projectedDemand > part.msl,
        confidence: forecast.confidence
      });
    }

    // Sort by urgency (parts that need reorder first, then by projected demand)
    forecasts.sort((a, b) => {
      if (a.needsReorder && !b.needsReorder) return -1;
      if (!a.needsReorder && b.needsReorder) return 1;
      return b.projectedDemand - a.projectedDemand;
    });

    res.status(200).json({
      success: true,
      forecasts,
      analysisDate: new Date().toISOString(),
      periodDays: days,
      totalParts: parts.length,
      partsNeedingReorder: forecasts.filter(f => f.needsReorder).length
    });

  } catch (error) {
    console.error('Error in AI forecasting analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}