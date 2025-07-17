import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { diagnosePartIssue, sanitizeAIInput } from '@/lib/ai';

// Enhanced issue-to-part mapping with more comprehensive patterns
const issuePatterns = {
  // Power and electrical issues
  'not turning on': ['power supply', 'fuse', 'control board', 'power cord', 'switch'],
  'power cut': ['surge protector', 'fuse', 'power supply', 'control board'],
  'no power': ['power cord', 'fuse', 'power supply', 'control board'],
  'dead': ['power supply', 'fuse', 'control board', 'battery'],
  
  // Display and visual issues
  'display not working': ['display panel', 'control board', 'lcd', 'led panel'],
  'screen black': ['display panel', 'backlight', 'control board', 'power supply'],
  'flickering': ['backlight', 'display panel', 'control board', 'capacitor'],
  'blinking red': ['control board', 'sensor', 'display panel', 'error indicator'],
  'led blinking': ['control board', 'sensor', 'display panel', 'power supply'],
  
  // Cooling and heating issues
  'not cooling': ['compressor', 'thermostat', 'coolant', 'fan motor', 'capacitor'],
  'overheating': ['fan motor', 'thermostat', 'cooling fan', 'heat sink', 'thermal sensor'],
  'too hot': ['thermostat', 'cooling fan', 'temperature sensor', 'heat exchanger'],
  'not heating': ['heating element', 'thermostat', 'control board', 'temperature sensor'],
  
  // Mechanical and motor issues
  'not spinning': ['motor', 'belt', 'transmission', 'capacitor', 'control board'],
  'motor noise': ['motor', 'bearing', 'belt', 'motor mount', 'fan blade'],
  'vibration': ['motor mount', 'bearing', 'belt', 'shock absorber', 'motor'],
  'grinding noise': ['bearing', 'motor', 'belt', 'gear', 'fan blade'],
  'rattling': ['motor mount', 'fan blade', 'bearing', 'loose parts', 'belt'],
  
  // Leakage and fluid issues
  'water leaking': ['door seal', 'drain hose', 'water pump', 'gasket', 'valve'],
  'oil leak': ['seal', 'gasket', 'oil pump', 'filter', 'drain plug'],
  'dripping': ['seal', 'gasket', 'valve', 'hose', 'connection'],
  
  // Smell and burning issues
  'burnt smell': ['capacitor', 'motor', 'control board', 'heating element', 'wiring'],
  'burning odor': ['motor', 'capacitor', 'control board', 'heating element', 'belt'],
  'smoke': ['motor', 'control board', 'heating element', 'capacitor', 'wiring'],
  
  // Door and mechanical parts
  'door not closing': ['door hinge', 'door seal', 'latch', 'door spring', 'alignment'],
  'door stuck': ['door hinge', 'latch', 'door seal', 'mechanism', 'spring'],
  'handle broken': ['door handle', 'latch', 'spring', 'mechanism', 'mounting'],
  
  // Button and control issues
  'button not working': ['control panel', 'switch', 'control board', 'membrane', 'contact'],
  'controls unresponsive': ['control board', 'control panel', 'switch', 'membrane', 'wiring'],
  'touch not working': ['touch panel', 'control board', 'sensor', 'display panel'],
  
  // Ice and freezer specific
  'ice not forming': ['compressor', 'thermostat', 'ice maker', 'water valve', 'temperature sensor'],
  'ice maker broken': ['ice maker', 'water valve', 'motor', 'sensor', 'control board'],
  'freezer not cold': ['compressor', 'thermostat', 'coolant', 'evaporator', 'fan motor']
};

// Severity levels for different issues
const issueSeverity = {
  'burnt smell': 'CRITICAL',
  'smoke': 'CRITICAL',
  'burning odor': 'CRITICAL',
  'not turning on': 'HIGH',
  'power cut': 'HIGH',
  'no power': 'HIGH',
  'overheating': 'HIGH',
  'water leaking': 'MEDIUM',
  'not cooling': 'MEDIUM',
  'not heating': 'MEDIUM',
  'motor noise': 'LOW',
  'flickering': 'LOW',
  'door not closing': 'LOW'
};

// Calculate text similarity using enhanced algorithm
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  const words2 = text2.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Create word frequency maps
  const freq1: Record<string, number> = {};
  const freq2: Record<string, number> = {};
  
  words1.forEach(word => freq1[word] = (freq1[word] || 0) + 1);
  words2.forEach(word => freq2[word] = (freq2[word] || 0) + 1);
  
  // Get all unique words
  const allWords = new Set([...words1, ...words2]);
  
  // Calculate dot product and magnitudes
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  allWords.forEach(word => {
    const f1 = freq1[word] || 0;
    const f2 = freq2[word] || 0;
    
    dotProduct += f1 * f2;
    magnitude1 += f1 * f1;
    magnitude2 += f2 * f2;
  });
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}

// Enhanced query processing with pattern matching
function analyzeIssue(issue: string): {
  keywords: string[];
  severity: string;
  category: string;
  suggestedParts: string[];
} {
  const lowerIssue = issue.toLowerCase();
  const keywords: string[] = [];
  let severity = 'LOW';
  let category = 'GENERAL';
  const suggestedParts: string[] = [];
  
  // Pattern matching for issue types
  for (const [pattern, parts] of Object.entries(issuePatterns)) {
    if (lowerIssue.includes(pattern)) {
      keywords.push(pattern);
      suggestedParts.push(...parts);
      
      // Determine severity
      if (issueSeverity[pattern]) {
        severity = issueSeverity[pattern];
      }
      
      // Determine category
      if (pattern.includes('power') || pattern.includes('electrical')) {
        category = 'ELECTRICAL';
      } else if (pattern.includes('motor') || pattern.includes('mechanical')) {
        category = 'MECHANICAL';
      } else if (pattern.includes('display') || pattern.includes('screen')) {
        category = 'DISPLAY';
      } else if (pattern.includes('cooling') || pattern.includes('heating')) {
        category = 'THERMAL';
      }
    }
  }
  
  // Remove duplicates
  return {
    keywords: [...new Set(keywords)],
    severity,
    category,
    suggestedParts: [...new Set(suggestedParts)]
  };
}

// Analyze historical reverse requests for patterns
async function analyzeReverseRequestPatterns(issue: string): Promise<{
  commonParts: Array<{ partId: string; partName: string; frequency: number; reasons: string[] }>;
  totalRequests: number;
}> {
  try {
    // Get reverse requests with similar reasons
    const reverseRequests = await prisma.reverseRequest.findMany({
      include: {
        part: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1000 // Analyze last 1000 requests
    });
    
    // Filter requests with similar issues
    const similarRequests = reverseRequests.filter(request => {
      const similarity = calculateSimilarity(issue, request.reason);
      return similarity > 0.3; // 30% similarity threshold
    });
    
    // Group by part and count frequency
    const partFrequency: Record<string, {
      partId: string;
      partName: string;
      frequency: number;
      reasons: string[];
    }> = {};
    
    similarRequests.forEach(request => {
      const key = request.part.id;
      if (!partFrequency[key]) {
        partFrequency[key] = {
          partId: request.part.id,
          partName: request.part.name,
          frequency: 0,
          reasons: []
        };
      }
      partFrequency[key].frequency++;
      if (!partFrequency[key].reasons.includes(request.reason)) {
        partFrequency[key].reasons.push(request.reason);
      }
    });
    
    // Sort by frequency
    const commonParts = Object.values(partFrequency)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5); // Top 5 most common parts
    
    return {
      commonParts,
      totalRequests: similarRequests.length
    };
  } catch (error) {
    console.error('Error analyzing reverse request patterns:', error);
    return { commonParts: [], totalRequests: 0 };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { issue, appliance, userId, userRole } = req.body;

    if (!issue || typeof issue !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Issue description is required' 
      });
    }

    // Analyze the issue
    const analysis = analyzeIssue(issue);
    
    // Get historical patterns from reverse requests
    const patterns = await analyzeReverseRequestPatterns(issue);
    
    // Build search conditions for parts
    const searchTerms = [...analysis.suggestedParts, ...analysis.keywords];
    const searchConditions = searchTerms.map(term => ({
      OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } }
      ]
    }));

    // Add appliance filter if provided
    let whereClause: any = {
      OR: searchConditions.length > 0 ? searchConditions : [
        { name: { contains: issue, mode: 'insensitive' } },
        { description: { contains: issue, mode: 'insensitive' } }
      ]
    };

    if (appliance) {
      whereClause = {
        AND: [
          whereClause,
          { description: { contains: appliance, mode: 'insensitive' } }
        ]
      };
    }

    // Fetch matching parts
    const parts = await prisma.part.findMany({
      where: whereClause,
      include: {
        brand: {
          select: { id: true, name: true }
        }
      },
      take: 10,
      orderBy: { name: 'asc' }
    });

    // Calculate relevance scores
    const scoredParts = parts.map(part => {
      let score = 0;
      const partText = `${part.name} ${part.description || ''}`.toLowerCase();
      
      // Score based on suggested parts
      analysis.suggestedParts.forEach(suggestedPart => {
        if (partText.includes(suggestedPart.toLowerCase())) {
          score += 15;
        }
      });
      
      // Score based on keywords
      analysis.keywords.forEach(keyword => {
        if (partText.includes(keyword.toLowerCase())) {
          score += 10;
        }
      });
      
      // Score based on text similarity
      const similarity = calculateSimilarity(issue, partText);
      score += similarity * 20;
      
      // Boost for video availability
      if (part.diyVideoUrl) {
        score += 5;
      }
      
      // Boost if part appears in historical patterns
      const historicalMatch = patterns.commonParts.find(p => p.partId === part.id);
      if (historicalMatch) {
        score += historicalMatch.frequency * 2;
      }

      return {
        ...part,
        relevanceScore: Math.round(score * 10) / 10,
        hasVideo: !!part.diyVideoUrl,
        historicalFrequency: historicalMatch?.frequency || 0,
        historicalReasons: historicalMatch?.reasons || []
      };
    });

    // Sort by relevance score
    const rankedParts = scoredParts
      .filter(part => part.relevanceScore > 5) // Minimum threshold
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    // Use AI for enhanced diagnosis if available
    let aiDiagnosis = null;
    try {
      const sanitizedIssue = sanitizeAIInput(issue);
      const aiRequest = {
        issue: sanitizedIssue,
        appliance: appliance || undefined,
        parts: rankedParts.map(part => ({
          id: part.id,
          name: part.name,
          description: part.description || '',
          tags: []
        })),
        historicalData: patterns.commonParts.map(p => ({
          issue: p.reasons[0] || '',
          partId: p.partId,
          frequency: p.frequency
        }))
      };

      const aiResult = await diagnosePartIssue(aiRequest);
      if (aiResult.success && aiResult.diagnosis) {
        aiDiagnosis = aiResult.diagnosis;
      }
    } catch (error) {
      console.error('AI diagnosis failed, using fallback:', error);
    }

    // Generate diagnosis (use AI if available, otherwise fallback)
    const diagnosis = aiDiagnosis || {
      issue: issue,
      severity: analysis.severity,
      category: analysis.category,
      confidence: rankedParts.length > 0 ? 
        Math.min(95, Math.max(60, rankedParts[0]?.relevanceScore * 2)) : 30,
      explanation: generateExplanation(issue, analysis, rankedParts.length),
      recommendations: generateRecommendations(analysis.severity, rankedParts.length > 0)
    };

    // Format probable parts
    const probableParts = rankedParts.map(part => ({
      id: part.id,
      code: part.code,
      name: part.name,
      description: part.description,
      price: part.price,
      weight: part.weight,
      msl: part.msl,
      diyVideoUrl: part.diyVideoUrl,
      hasVideo: part.hasVideo,
      relevanceScore: part.relevanceScore,
      brand: part.brand,
      historicalFrequency: part.historicalFrequency,
      historicalReasons: part.historicalReasons,
      matchReason: generateMatchReason(part.relevanceScore, part.hasVideo, part.historicalFrequency),
      imageUrl: `https://images.unsplash.com/400x300/?${part.name.replace(/\s+/g, '+')}+spare+part`
    }));

    res.status(200).json({
      success: true,
      diagnosis,
      probableParts,
      historicalPatterns: {
        totalSimilarRequests: patterns.totalRequests,
        commonFailures: patterns.commonParts.slice(0, 3)
      },
      searchAnalysis: {
        keywords: analysis.keywords,
        suggestedParts: analysis.suggestedParts,
        searchTermsUsed: searchTerms.slice(0, 10)
      },
      actions: {
        canOrderParts: userRole === 'CUSTOMER' || userRole === 'SERVICE_CENTER',
        canRequestTechnician: userRole === 'CUSTOMER',
        canCreateReverseRequest: userRole === 'SERVICE_CENTER'
      }
    });

  } catch (error) {
    console.error('Error in AI diagnosis:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to perform AI diagnosis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function generateExplanation(issue: string, analysis: any, partsFound: number): string {
  const severityText = {
    'CRITICAL': 'This appears to be a critical issue that requires immediate attention.',
    'HIGH': 'This is a high-priority issue that should be addressed soon.',
    'MEDIUM': 'This is a moderate issue that should be resolved when convenient.',
    'LOW': 'This appears to be a minor issue.'
  };

  let explanation = severityText[analysis.severity as keyof typeof severityText] || 'Issue analyzed.';
  
  if (partsFound > 0) {
    explanation += ` Based on your description "${issue}", I found ${partsFound} potentially relevant spare part${partsFound > 1 ? 's' : ''}.`;
    explanation += ' The parts are ranked by relevance based on your problem description and historical repair patterns.';
  } else {
    explanation += ` I couldn't find specific parts matching "${issue}". This might be a complex issue requiring professional diagnosis.`;
  }

  return explanation;
}

function generateRecommendations(severity: string, hasMatchingParts: boolean): string[] {
  const recommendations: string[] = [];
  
  if (severity === 'CRITICAL') {
    recommendations.push('⚠️ Stop using the device immediately for safety');
    recommendations.push('🔌 Disconnect power if safe to do so');
    recommendations.push('👨‍🔧 Contact a professional technician urgently');
  } else if (severity === 'HIGH') {
    recommendations.push('⏰ Address this issue as soon as possible');
    recommendations.push('📋 Document any additional symptoms');
    if (hasMatchingParts) {
      recommendations.push('🔧 Consider ordering the suggested parts');
    }
  } else {
    if (hasMatchingParts) {
      recommendations.push('📺 Watch the DIY video if available');
      recommendations.push('🛒 Order the recommended parts');
      recommendations.push('🔧 Attempt repair if you have technical skills');
    }
    recommendations.push('📞 Contact support if issue persists');
  }

  return recommendations;
}

function generateMatchReason(score: number, hasVideo: boolean, historicalFrequency: number): string {
  if (historicalFrequency > 5) {
    return `Commonly replaced part (${historicalFrequency} similar cases)`;
  } else if (score > 25) {
    return 'High similarity to your issue description';
  } else if (score > 15) {
    return 'Good match based on symptoms';
  } else if (hasVideo) {
    return 'Has instructional repair video';
  } else {
    return 'Potential match based on keywords';
  }
}