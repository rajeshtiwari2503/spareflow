import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { generateAIResponse, diagnosePartIssue } from '@/lib/ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { issue, appliance, symptoms, urgency = 'MEDIUM' } = req.body;

    if (!issue) {
      return res.status(400).json({ error: 'Issue description is required' });
    }

    // Get all active parts with AI-optimized data
    const parts = await prisma.part.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE'
      },
      include: {
        brand: {
          select: { id: true, name: true }
        },
        brandInventory: {
          select: {
            onHandQuantity: true,
            availableQuantity: true
          }
        }
      },
      take: 50
    });

    // Prepare parts data for AI diagnosis
    const partsForAI = parts.map(part => ({
      id: part.id,
      name: part.name,
      description: part.specifications || `${part.name} - ${part.category || 'General'} part`,
      tags: part.tags?.split(',').map(t => t.trim()) || []
    }));

    // Use AI to diagnose the issue and recommend parts
    const aiDiagnosis = await diagnosePartIssue({
      issue: `${issue}${symptoms ? ` Symptoms: ${symptoms}` : ''}`,
      appliance,
      parts: partsForAI
    });

    if (!aiDiagnosis.success) {
      // Fallback to enhanced keyword matching
      const enhancedResults = await performEnhancedSearch(issue, appliance, parts);
      return res.status(200).json({
        success: true,
        diagnosis: {
          confidence: 70,
          explanation: `Based on keyword analysis of "${issue}", here are the most relevant parts.`,
          severity: urgency,
          category: 'GENERAL'
        },
        recommendedParts: enhancedResults.slice(0, 5),
        searchMethod: 'enhanced_keyword',
        totalFound: enhancedResults.length
      });
    }

    // Enhance AI recommendations with inventory and detailed info
    const enhancedRecommendations = aiDiagnosis.recommendedParts?.map(rec => {
      const part = parts.find(p => p.id === rec.id);
      if (!part) return null;

      const inventory = part.brandInventory?.[0];
      const specs = part.specifications || '';
      
      const getSpecValue = (key: string) => {
        const match = specs.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'));
        return match ? match[1].trim() : '';
      };

      return {
        id: part.id,
        name: part.name,
        confidence: rec.confidence,
        reason: rec.reason,
        price: part.price,
        inStock: (inventory?.availableQuantity || 0) > 0,
        inventory: inventory?.onHandQuantity || 0,
        availableQuantity: inventory?.availableQuantity || 0,
        category: part.category,
        subCategory: part.subCategory,
        brand: part.brand,
        installationDifficulty: getSpecValue('Installation') || 'MEDIUM',
        urgencyLevel: getSpecValue('Urgency') || urgency,
        customerDescription: getSpecValue('Customer Description'),
        troubleshootingSteps: getSpecValue('Troubleshooting'),
        safetyWarnings: getSpecValue('Safety'),
        estimatedRepairTime: getEstimatedRepairTime(getSpecValue('Installation') || 'MEDIUM'),
        compatibleAppliances: getSpecValue('Compatible Appliances')
          .split(',')
          .map(a => a.trim())
          .filter(Boolean),
        imageUrl: `https://images.unsplash.com/400x300/?${part.name.replace(/\s+/g, '+')}+spare+part`
      };
    }).filter(Boolean) || [];

    return res.status(200).json({
      success: true,
      diagnosis: aiDiagnosis.diagnosis,
      recommendedParts: enhancedRecommendations,
      searchMethod: 'ai_powered',
      totalFound: enhancedRecommendations.length,
      aiInsights: {
        confidence: aiDiagnosis.diagnosis?.confidence || 0,
        severity: aiDiagnosis.diagnosis?.severity || urgency,
        category: aiDiagnosis.diagnosis?.category || 'GENERAL',
        explanation: aiDiagnosis.diagnosis?.explanation || 'AI analysis completed'
      }
    });

  } catch (error) {
    console.error('AI diagnosis error:', error);
    return res.status(500).json({ 
      error: 'Failed to process AI diagnosis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Enhanced search fallback function
async function performEnhancedSearch(issue: string, appliance: string | undefined, parts: any[]) {
  const issueLower = issue.toLowerCase();
  
  return parts.map(part => {
    let score = 0;
    const partText = `${part.name} ${part.specifications || ''} ${part.tags || ''}`.toLowerCase();
    
    // Problem keywords matching
    if (part.specifications?.toLowerCase().includes('problem keywords:')) {
      const problemSection = part.specifications.toLowerCase();
      const keywords = problemSection.split('problem keywords:')[1]?.split('\n')[0] || '';
      if (keywords.includes(issueLower) || issueLower.split(' ').some(word => keywords.includes(word))) {
        score += 40;
      }
    }
    
    // Symptoms matching
    if (part.specifications?.toLowerCase().includes('symptoms:')) {
      const symptomsSection = part.specifications.toLowerCase();
      const symptoms = symptomsSection.split('symptoms:')[1]?.split('\n')[0] || '';
      if (symptoms.includes(issueLower) || issueLower.split(' ').some(word => symptoms.includes(word))) {
        score += 35;
      }
    }
    
    // Appliance compatibility
    if (appliance && part.specifications?.toLowerCase().includes('compatible appliances:')) {
      const applianceSection = part.specifications.toLowerCase();
      const appliances = applianceSection.split('compatible appliances:')[1]?.split('\n')[0] || '';
      if (appliances.includes(appliance.toLowerCase())) {
        score += 25;
      }
    }
    
    // Basic text matching
    if (partText.includes(issueLower)) {
      score += 20;
    }
    
    // Name matching (higher weight)
    if (part.name.toLowerCase().includes(issueLower)) {
      score += 30;
    }
    
    return {
      id: part.id,
      name: part.name,
      confidence: Math.min(95, score),
      reason: `Matches your issue description with ${score}% relevance`
    };
  })
  .filter(part => part.confidence > 10)
  .sort((a, b) => b.confidence - a.confidence);
}

// Helper function to estimate repair time
function getEstimatedRepairTime(difficulty: string): string {
  switch (difficulty.toUpperCase()) {
    case 'EASY':
      return '30-60 minutes';
    case 'MEDIUM':
      return '1-2 hours';
    case 'HARD':
      return '2-4 hours';
    case 'EXPERT':
      return '4+ hours (Professional recommended)';
    default:
      return '1-2 hours';
  }
}