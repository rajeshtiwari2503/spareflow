import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

interface MSLAutomationResult {
  partId: string;
  partCode: string;
  partName: string;
  currentMSL: number;
  projectedDemand: number;
  recommendedQuantity: number;
  purchaseOrderId?: string;
  forecastingAlertId?: string;
  action: 'purchase_order_created' | 'no_action_needed' | 'already_pending' | 'forecasting_alert_created';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { brandId, autoApprove = false, distributorId = 'dist-1', district = 'default' } = req.body;

    if (!brandId) {
      return res.status(400).json({ error: 'Brand ID is required' });
    }

    // First, run the forecasting analysis to get current projections
    const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_CO_DEV_ENV || 'http://localhost:3000'}/api/ai-forecasting/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, days: 30 })
    });

    if (!analysisResponse.ok) {
      throw new Error('Failed to get forecasting analysis');
    }

    const analysisData = await analysisResponse.json();
    const forecasts = analysisData.forecasts;

    const results: MSLAutomationResult[] = [];
    let purchaseOrdersCreated = 0;
    let notificationsCreated = 0;
    let forecastingAlertsCreated = 0;

    for (const forecast of forecasts) {
      if (!forecast.needsReorder) {
        results.push({
          partId: forecast.partId,
          partCode: forecast.partCode,
          partName: forecast.partName,
          currentMSL: forecast.currentMSL,
          projectedDemand: forecast.projectedDemand,
          recommendedQuantity: 0,
          action: 'no_action_needed'
        });
        continue;
      }

      // Check if there's already a pending purchase order for this part
      const existingOrder = await prisma.purchaseOrder.findFirst({
        where: {
          partId: forecast.partId,
          status: 'DRAFT'
        }
      });

      if (existingOrder) {
        results.push({
          partId: forecast.partId,
          partCode: forecast.partCode,
          partName: forecast.partName,
          currentMSL: forecast.currentMSL,
          projectedDemand: forecast.projectedDemand,
          recommendedQuantity: existingOrder.quantity,
          purchaseOrderId: existingOrder.id,
          action: 'already_pending'
        });
        continue;
      }

      // Calculate recommended order quantity
      const shortfall = forecast.projectedDemand - forecast.currentMSL;
      const safetyBuffer = Math.ceil(shortfall * 0.2); // 20% safety buffer
      const recommendedQuantity = shortfall + safetyBuffer;

      // Create forecasting alert first
      const forecastingAlert = await prisma.forecastingAlert.create({
        data: {
          partId: forecast.partId,
          brandId,
          district,
          forecastedDemand: forecast.projectedDemand,
          availableStock: forecast.currentMSL,
          recommendedQuantity,
          status: 'PENDING'
        }
      });

      forecastingAlertsCreated++;

      // If auto-approve is enabled, create purchase order immediately
      let purchaseOrder = null;
      if (autoApprove) {
        purchaseOrder = await prisma.purchaseOrder.create({
          data: {
            distributorId,
            partId: forecast.partId,
            quantity: recommendedQuantity,
            status: 'APPROVED'
          }
        });

        purchaseOrdersCreated++;

        // Update forecasting alert status
        await prisma.forecastingAlert.update({
          where: { id: forecastingAlert.id },
          data: { status: 'APPROVED' }
        });
      }

      // Create notification for the brand
      await prisma.notification.create({
        data: {
          type: 'PURCHASE_ORDER_CREATED',
          title: autoApprove ? 'Auto Purchase Order Created' : 'Restock Alert - Approval Required',
          message: autoApprove 
            ? `Purchase order for ${recommendedQuantity} units of ${forecast.partCode} has been auto-approved due to projected demand exceeding MSL.`
            : `Part ${forecast.partCode} requires restocking. Projected demand (${forecast.projectedDemand}) exceeds available stock (${forecast.currentMSL}). Please review and approve purchase order.`,
          partId: forecast.partId,
          partCode: forecast.partCode,
          partName: forecast.partName,
          purchaseOrderId: purchaseOrder?.id,
          priority: forecast.projectedDemand > forecast.currentMSL * 2 ? 'CRITICAL' : 'HIGH',
          read: false,
          brandId
        }
      });

      notificationsCreated++;

      // Create MSL alert notification if demand is significantly higher
      if (forecast.projectedDemand > forecast.currentMSL * 1.5) {
        await prisma.notification.create({
          data: {
            type: 'MSL_ALERT',
            title: 'Critical MSL Alert',
            message: `Part ${forecast.partCode} projected demand (${forecast.projectedDemand}) significantly exceeds current MSL (${forecast.currentMSL}). Consider increasing MSL to ${forecast.recommendedMSL}.`,
            partId: forecast.partId,
            partCode: forecast.partCode,
            partName: forecast.partName,
            priority: 'CRITICAL',
            read: false,
            brandId
          }
        });

        notificationsCreated++;
      }

      results.push({
        partId: forecast.partId,
        partCode: forecast.partCode,
        partName: forecast.partName,
        currentMSL: forecast.currentMSL,
        projectedDemand: forecast.projectedDemand,
        recommendedQuantity,
        purchaseOrderId: purchaseOrder?.id,
        forecastingAlertId: forecastingAlert.id,
        action: autoApprove ? 'purchase_order_created' : 'forecasting_alert_created'
      });
    }

    res.status(200).json({
      success: true,
      message: `MSL automation completed. Created ${purchaseOrdersCreated} purchase orders, ${forecastingAlertsCreated} forecasting alerts, and ${notificationsCreated} notifications.`,
      results,
      summary: {
        totalPartsAnalyzed: forecasts.length,
        purchaseOrdersCreated,
        forecastingAlertsCreated,
        notificationsCreated,
        partsNeedingReorder: results.filter(r => r.action === 'purchase_order_created' || r.action === 'forecasting_alert_created').length,
        partsAlreadyPending: results.filter(r => r.action === 'already_pending').length,
        partsSufficient: results.filter(r => r.action === 'no_action_needed').length
      },
      automationDate: new Date().toISOString(),
      autoApprove
    });

  } catch (error) {
    console.error('Error in MSL automation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}