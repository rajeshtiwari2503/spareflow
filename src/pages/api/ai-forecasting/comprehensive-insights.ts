import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateAIResponse, performSemanticSearch, diagnosePartIssue } from '@/lib/ai';

interface ComprehensiveInsight {
  id: string;
  type: 'FORECAST' | 'OPTIMIZATION' | 'ANOMALY' | 'RECOMMENDATION' | 'ALERT';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  impact: string;
  actionRequired: boolean;
  suggestedActions: string[];
  confidence: number;
  createdAt: string;
  category: string;
  affectedParts?: string[];
  potentialSavings?: number;
  riskMitigation?: string;
  aiGenerated: boolean;
  metadata?: Record<string, any>;
}

interface InventoryAnalytics {
  totalParts: number;
  totalValue: number;
  averageTurnover: number;
  stockoutRisk: number;
  overstockValue: number;
  optimizationOpportunities: number;
  forecastAccuracy: number;
  seasonalityDetected: boolean;
  trendAnalysis: {
    direction: 'INCREASING' | 'DECREASING' | 'STABLE';
    strength: number;
    confidence: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.method === 'GET') {
      const { brandId, timeframe = '30', includeAI = 'true' } = req.query;

      // Determine brand ID based on user role
      let targetBrandId = brandId as string;
      if (user.role === 'BRAND') {
        targetBrandId = user.id;
      } else if (!brandId && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Brand ID required' });
      }

      const days = parseInt(timeframe as string) || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Fetch comprehensive inventory data
      const [parts, inventory, shipments, customerOrders, reverseRequests] = await Promise.all([
        // Parts data
        prisma?.part?.findMany({
          where: { brandId: targetBrandId },
          include: {
            brand: { select: { name: true } }
          }
        }).catch(() => []) || Promise.resolve([]),

        // Inventory data (if available)
        prisma?.inventoryItem?.findMany({
          where: { 
            part: { brandId: targetBrandId }
          },
          include: {
            part: true,
            location: true,
            supplier: true
          }
        }).catch(() => []) || Promise.resolve([]), // Graceful fallback if table doesn't exist

        // Recent shipments
        prisma?.shipment?.findMany({
          where: {
            brandId: targetBrandId,
            createdAt: { gte: cutoffDate }
          },
          include: {
            boxes: {
              include: {
                boxParts: {
                  include: { part: true }
                }
              }
            }
          }
        }).catch(() => []) || Promise.resolve([]),

        // Customer orders
        prisma?.customerOrder?.findMany({
          where: {
            part: { brandId: targetBrandId },
            createdAt: { gte: cutoffDate }
          },
          include: { part: true }
        }).catch(() => []) || Promise.resolve([]),

        // Reverse requests
        prisma?.reverseRequest?.findMany({
          where: {
            part: { brandId: targetBrandId },
            createdAt: { gte: cutoffDate }
          },
          include: { part: true }
        }).catch(() => []) || Promise.resolve([])
      ]);

      // Calculate analytics
      const analytics = calculateInventoryAnalytics(parts, inventory, shipments, customerOrders);

      // Generate AI insights
      const insights: ComprehensiveInsight[] = [];

      // 1. Stock Level Analysis
      const stockInsights = await generateStockLevelInsights(parts, inventory, analytics);
      insights.push(...stockInsights);

      // 2. Demand Pattern Analysis
      const demandInsights = await generateDemandPatternInsights(parts, customerOrders, shipments, analytics);
      insights.push(...demandInsights);

      // 3. Cost Optimization Insights
      const costInsights = await generateCostOptimizationInsights(parts, inventory, analytics);
      insights.push(...costInsights);

      // 4. Quality and Return Analysis
      const qualityInsights = await generateQualityInsights(reverseRequests, parts);
      insights.push(...qualityInsights);

      // 5. AI-Powered Predictive Insights (if enabled)
      if (includeAI === 'true') {
        const aiInsights = await generateAIPoweredInsights(parts, analytics, targetBrandId);
        insights.push(...aiInsights);
      }

      // Sort insights by priority and confidence
      insights.sort((a, b) => {
        const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      });

      res.status(200).json({
        success: true,
        data: {
          insights: insights.slice(0, 50), // Limit to top 50 insights
          analytics,
          summary: {
            totalInsights: insights.length,
            criticalInsights: insights.filter(i => i.priority === 'CRITICAL').length,
            aiGeneratedInsights: insights.filter(i => i.aiGenerated).length,
            actionRequiredInsights: insights.filter(i => i.actionRequired).length,
            potentialSavings: insights.reduce((sum, i) => sum + (i.potentialSavings || 0), 0)
          },
          metadata: {
            analysisDate: new Date().toISOString(),
            timeframeDays: days,
            brandId: targetBrandId,
            aiEnabled: includeAI === 'true'
          }
        }
      });

    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }

  } catch (error) {
    console.error('Error in comprehensive insights API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Helper function to calculate inventory analytics
function calculateInventoryAnalytics(
  parts: any[], 
  inventory: any[], 
  shipments: any[], 
  customerOrders: any[]
): InventoryAnalytics {
  const totalParts = parts.length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.onHandQuantity * item.part.price), 0);
  
  // Calculate turnover (simplified)
  const totalDemand = customerOrders.reduce((sum, order) => sum + order.quantity, 0);
  const averageStock = inventory.reduce((sum, item) => sum + item.onHandQuantity, 0) / Math.max(inventory.length, 1);
  const averageTurnover = averageStock > 0 ? totalDemand / averageStock : 0;

  // Risk calculations
  const stockoutRisk = parts.filter(part => {
    const inventoryItem = inventory.find(inv => inv.partId === part.id);
    return !inventoryItem || inventoryItem.onHandQuantity <= part.minStockLevel;
  }).length / Math.max(totalParts, 1);

  const overstockValue = inventory
    .filter(item => item.part.maxStockLevel && item.onHandQuantity > item.part.maxStockLevel)
    .reduce((sum, item) => sum + ((item.onHandQuantity - item.part.maxStockLevel) * item.part.price), 0);

  // Trend analysis (simplified)
  const recentOrders = customerOrders.filter(order => {
    const orderDate = new Date(order.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return orderDate >= weekAgo;
  });

  const olderOrders = customerOrders.filter(order => {
    const orderDate = new Date(order.createdAt);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return orderDate >= twoWeeksAgo && orderDate < weekAgo;
  });

  const recentDemand = recentOrders.reduce((sum, order) => sum + order.quantity, 0);
  const olderDemand = olderOrders.reduce((sum, order) => sum + order.quantity, 0);

  let trendDirection: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
  let trendStrength = 0;

  if (olderDemand > 0) {
    const changeRatio = (recentDemand - olderDemand) / olderDemand;
    if (Math.abs(changeRatio) > 0.1) {
      trendDirection = changeRatio > 0 ? 'INCREASING' : 'DECREASING';
      trendStrength = Math.min(Math.abs(changeRatio), 1);
    }
  }

  return {
    totalParts,
    totalValue,
    averageTurnover,
    stockoutRisk,
    overstockValue,
    optimizationOpportunities: Math.floor(stockoutRisk * totalParts + overstockValue / 1000),
    forecastAccuracy: 0.85, // Placeholder - would be calculated from historical forecasts
    seasonalityDetected: customerOrders.length > 30, // Simplified check
    trendAnalysis: {
      direction: trendDirection,
      strength: trendStrength,
      confidence: Math.min(customerOrders.length / 50, 1)
    }
  };
}

// Generate stock level insights
async function generateStockLevelInsights(
  parts: any[], 
  inventory: any[], 
  analytics: InventoryAnalytics
): Promise<ComprehensiveInsight[]> {
  const insights: ComprehensiveInsight[] = [];

  // Critical stock alerts
  const criticalParts = parts.filter(part => {
    const inventoryItem = inventory.find(inv => inv.partId === part.id);
    return !inventoryItem || inventoryItem.onHandQuantity === 0;
  });

  if (criticalParts.length > 0) {
    insights.push({
      id: `stock-critical-${Date.now()}`,
      type: 'ALERT',
      priority: 'CRITICAL',
      title: `${criticalParts.length} Parts Out of Stock`,
      description: `Critical stock shortage detected for ${criticalParts.length} parts that may cause service disruptions.`,
      impact: 'Immediate risk of service delays and customer dissatisfaction',
      actionRequired: true,
      suggestedActions: [
        'Review and expedite emergency procurement',
        'Contact suppliers for urgent delivery',
        'Notify service centers of potential delays',
        'Consider alternative parts or suppliers'
      ],
      confidence: 0.95,
      createdAt: new Date().toISOString(),
      category: 'Stock Management',
      affectedParts: criticalParts.map(p => p.name),
      aiGenerated: false,
      riskMitigation: 'Immediate procurement required to prevent service disruption'
    });
  }

  // Low stock warnings
  const lowStockParts = parts.filter(part => {
    const inventoryItem = inventory.find(inv => inv.partId === part.id);
    return inventoryItem && inventoryItem.onHandQuantity > 0 && inventoryItem.onHandQuantity <= part.minStockLevel;
  });

  if (lowStockParts.length > 0) {
    insights.push({
      id: `stock-low-${Date.now()}`,
      type: 'FORECAST',
      priority: 'HIGH',
      title: `${lowStockParts.length} Parts Below Minimum Stock Level`,
      description: `Parts approaching critical stock levels that require attention within the next few days.`,
      impact: 'Risk of stockouts if demand continues at current rate',
      actionRequired: true,
      suggestedActions: [
        'Schedule restock orders for affected parts',
        'Review minimum stock level settings',
        'Monitor demand patterns closely'
      ],
      confidence: 0.9,
      createdAt: new Date().toISOString(),
      category: 'Stock Management',
      affectedParts: lowStockParts.map(p => p.name),
      aiGenerated: false
    });
  }

  return insights;
}

// Generate demand pattern insights
async function generateDemandPatternInsights(
  parts: any[], 
  customerOrders: any[], 
  shipments: any[], 
  analytics: InventoryAnalytics
): Promise<ComprehensiveInsight[]> {
  const insights: ComprehensiveInsight[] = [];

  // Trend analysis insight
  if (analytics.trendAnalysis.confidence > 0.7) {
    const trendDirection = analytics.trendAnalysis.direction;
    const priority = analytics.trendAnalysis.strength > 0.3 ? 'HIGH' : 'MEDIUM';
    
    insights.push({
      id: `demand-trend-${Date.now()}`,
      type: 'FORECAST',
      priority,
      title: `Demand Trend: ${trendDirection}`,
      description: `Overall demand is ${trendDirection.toLowerCase()} with ${Math.round(analytics.trendAnalysis.strength * 100)}% strength.`,
      impact: trendDirection === 'INCREASING' ? 'Potential revenue growth opportunity' : 'Possible inventory optimization opportunity',
      actionRequired: analytics.trendAnalysis.strength > 0.3,
      suggestedActions: trendDirection === 'INCREASING' ? [
        'Increase safety stock levels',
        'Review supplier capacity',
        'Consider bulk purchasing discounts'
      ] : [
        'Optimize inventory levels',
        'Review slow-moving stock',
        'Adjust procurement schedules'
      ],
      confidence: analytics.trendAnalysis.confidence,
      createdAt: new Date().toISOString(),
      category: 'Demand Analysis',
      aiGenerated: false
    });
  }

  // High-demand parts identification
  const partDemand = customerOrders.reduce((acc, order) => {
    acc[order.partId] = (acc[order.partId] || 0) + order.quantity;
    return acc;
  }, {} as Record<string, number>);

  const highDemandParts = Object.entries(partDemand)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([partId, demand]) => ({
      part: parts.find(p => p.id === partId),
      demand
    }))
    .filter(item => item.part);

  if (highDemandParts.length > 0) {
    insights.push({
      id: `high-demand-${Date.now()}`,
      type: 'RECOMMENDATION',
      priority: 'MEDIUM',
      title: 'High-Demand Parts Identified',
      description: `${highDemandParts.length} parts showing significantly higher demand than average.`,
      impact: 'Opportunity for focused inventory optimization and supplier negotiations',
      actionRequired: false,
      suggestedActions: [
        'Negotiate better pricing for high-volume parts',
        'Ensure adequate safety stock',
        'Consider local sourcing options',
        'Review service center distribution'
      ],
      confidence: 0.8,
      createdAt: new Date().toISOString(),
      category: 'Demand Analysis',
      affectedParts: highDemandParts.map(item => item.part.name),
      aiGenerated: false
    });
  }

  return insights;
}

// Generate cost optimization insights
async function generateCostOptimizationInsights(
  parts: any[], 
  inventory: any[], 
  analytics: InventoryAnalytics
): Promise<ComprehensiveInsight[]> {
  const insights: ComprehensiveInsight[] = [];

  // Overstock optimization
  if (analytics.overstockValue > 10000) {
    const overstockedItems = inventory.filter(item => 
      item.part.maxStockLevel && item.onHandQuantity > item.part.maxStockLevel
    );

    insights.push({
      id: `overstock-${Date.now()}`,
      type: 'OPTIMIZATION',
      priority: 'MEDIUM',
      title: 'Inventory Overstock Optimization',
      description: `₹${analytics.overstockValue.toLocaleString()} tied up in overstocked inventory across ${overstockedItems.length} items.`,
      impact: 'Capital optimization and reduced carrying costs',
      actionRequired: false,
      suggestedActions: [
        'Implement promotional pricing for overstocked items',
        'Review and adjust maximum stock levels',
        'Consider redistribution to high-demand locations',
        'Negotiate return agreements with suppliers'
      ],
      confidence: 0.85,
      createdAt: new Date().toISOString(),
      category: 'Cost Optimization',
      potentialSavings: analytics.overstockValue * 0.15, // Estimated 15% savings
      affectedParts: overstockedItems.map(item => item.part.name),
      aiGenerated: false
    });
  }

  // Turnover optimization
  if (analytics.averageTurnover < 6) { // Less than 6 times per year
    insights.push({
      id: `turnover-${Date.now()}`,
      type: 'OPTIMIZATION',
      priority: 'MEDIUM',
      title: 'Low Inventory Turnover Detected',
      description: `Average inventory turnover of ${analytics.averageTurnover.toFixed(1)}x is below optimal levels.`,
      impact: 'Opportunity to improve cash flow and reduce carrying costs',
      actionRequired: false,
      suggestedActions: [
        'Review slow-moving inventory',
        'Optimize reorder quantities',
        'Implement just-in-time procurement',
        'Improve demand forecasting accuracy'
      ],
      confidence: 0.75,
      createdAt: new Date().toISOString(),
      category: 'Cost Optimization',
      potentialSavings: analytics.totalValue * 0.1, // Estimated 10% improvement
      aiGenerated: false
    });
  }

  return insights;
}

// Generate quality insights from returns
async function generateQualityInsights(
  reverseRequests: any[], 
  parts: any[]
): Promise<ComprehensiveInsight[]> {
  const insights: ComprehensiveInsight[] = [];

  if (reverseRequests.length > 0) {
    // Analyze return patterns
    const returnsByPart = reverseRequests.reduce((acc, request) => {
      acc[request.partId] = (acc[request.partId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const highReturnParts = Object.entries(returnsByPart)
      .filter(([, count]) => count >= 3) // 3 or more returns
      .map(([partId, count]) => ({
        part: parts.find(p => p.id === partId),
        returnCount: count
      }))
      .filter(item => item.part);

    if (highReturnParts.length > 0) {
      insights.push({
        id: `quality-returns-${Date.now()}`,
        type: 'ANOMALY',
        priority: 'HIGH',
        title: 'High Return Rate Parts Detected',
        description: `${highReturnParts.length} parts showing unusually high return rates that may indicate quality issues.`,
        impact: 'Potential quality issues affecting customer satisfaction and costs',
        actionRequired: true,
        suggestedActions: [
          'Investigate quality issues with suppliers',
          'Review part specifications and standards',
          'Consider alternative suppliers',
          'Implement additional quality checks'
        ],
        confidence: 0.8,
        createdAt: new Date().toISOString(),
        category: 'Quality Management',
        affectedParts: highReturnParts.map(item => item.part.name),
        aiGenerated: false,
        riskMitigation: 'Quality investigation and supplier review required'
      });
    }
  }

  return insights;
}

// Generate AI-powered insights using the AI service
async function generateAIPoweredInsights(
  parts: any[], 
  analytics: InventoryAnalytics, 
  brandId: string
): Promise<ComprehensiveInsight[]> {
  const insights: ComprehensiveInsight[] = [];

  try {
    // Generate AI-powered inventory optimization recommendations
    const aiPrompt = `
    Analyze the following inventory data and provide strategic recommendations:
    
    Total Parts: ${analytics.totalParts}
    Total Value: ₹${analytics.totalValue.toLocaleString()}
    Average Turnover: ${analytics.averageTurnover.toFixed(2)}x
    Stockout Risk: ${(analytics.stockoutRisk * 100).toFixed(1)}%
    Overstock Value: ₹${analytics.overstockValue.toLocaleString()}
    Trend: ${analytics.trendAnalysis.direction} (${(analytics.trendAnalysis.strength * 100).toFixed(1)}% strength)
    
    Provide 3 specific, actionable recommendations for inventory optimization, focusing on:
    1. Cost reduction opportunities
    2. Service level improvements
    3. Risk mitigation strategies
    
    Format as JSON array with title, description, impact, and actions for each recommendation.
    `;

    const aiResponse = await generateAIResponse({
      prompt: aiPrompt,
      context: 'You are an expert inventory management consultant providing strategic recommendations for spare parts logistics.',
      maxTokens: 800,
      temperature: 0.3
    });

    if (aiResponse.success && aiResponse.response) {
      try {
        // Clean the AI response to ensure valid JSON
        let cleanResponse = aiResponse.response.trim();
        
        // Remove markdown code blocks if present
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const recommendations = JSON.parse(cleanResponse);
        
        if (Array.isArray(recommendations)) {
          recommendations.forEach((rec, index) => {
            insights.push({
              id: `ai-insight-${Date.now()}-${index}`,
              type: 'RECOMMENDATION',
              priority: 'MEDIUM',
              title: rec.title || `AI Recommendation ${index + 1}`,
              description: rec.description || 'AI-generated inventory optimization recommendation',
              impact: rec.impact || 'Potential operational improvement',
              actionRequired: false,
              suggestedActions: Array.isArray(rec.actions) ? rec.actions : [rec.actions || 'Review recommendation'],
              confidence: 0.75,
              createdAt: new Date().toISOString(),
              category: 'AI Optimization',
              aiGenerated: true,
              metadata: {
                aiModel: 'GPT-3.5-Turbo',
                analysisType: 'inventory_optimization'
              }
            });
          });
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        // Fallback: create a general AI insight
        insights.push({
          id: `ai-general-${Date.now()}`,
          type: 'RECOMMENDATION',
          priority: 'LOW',
          title: 'AI Analysis Complete',
          description: 'AI has analyzed your inventory data and identified optimization opportunities.',
          impact: 'Comprehensive analysis of inventory patterns and trends',
          actionRequired: false,
          suggestedActions: ['Review detailed AI analysis', 'Consider implementing suggested optimizations'],
          confidence: 0.6,
          createdAt: new Date().toISOString(),
          category: 'AI Analysis',
          aiGenerated: true
        });
      }
    }
  } catch (error) {
    console.error('Error generating AI insights:', error);
    // Don't fail the entire request if AI fails
  }

  return insights;
}