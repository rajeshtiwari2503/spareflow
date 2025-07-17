import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

// Enhanced semantic matching with comprehensive problem-to-part mapping
const issueToPartMapping: { [key: string]: string[] } = {
  // TV/Display Issues
  'no power': ['power supply', 'power board', 'fuse', 'power cord'],
  'not turning on': ['power supply', 'power board', 'main board', 'remote control'],
  'blank screen': ['backlight', 'inverter', 'lcd panel', 't-con board'],
  'no display': ['lcd panel', 'main board', 't-con board', 'backlight'],
  'flickering screen': ['backlight', 'inverter', 'power supply', 'lcd panel'],
  'lines on screen': ['t-con board', 'lcd panel', 'ribbon cable'],
  'no sound': ['speaker', 'audio board', 'main board'],
  'remote not working': ['remote control', 'ir sensor', 'main board'],
  
  // Appliance Common Issues
  'fan humming noise': ['fan motor', 'fan blade', 'bearing'],
  'not cooling': ['compressor', 'thermostat', 'coolant', 'condenser'],
  'water leaking': ['door seal', 'drain hose', 'water pump', 'gasket'],
  'not starting': ['power cord', 'control board', 'fuse', 'switch'],
  'making loud noise': ['motor', 'belt', 'bearing', 'pump'],
  'door not closing': ['door hinge', 'door seal', 'latch', 'spring'],
  'not heating': ['heating element', 'thermostat', 'control board'],
  'blinking red light': ['control board', 'sensor', 'display panel'],
  'not spinning': ['motor', 'belt', 'transmission', 'coupling'],
  'ice not forming': ['compressor', 'thermostat', 'ice maker', 'water valve'],
  
  // Power Related
  'power issues': ['power supply', 'power board', 'fuse', 'capacitor'],
  'electrical problem': ['wiring', 'control board', 'switch', 'relay'],
  'short circuit': ['fuse', 'circuit breaker', 'wiring', 'control board'],
  'overheating': ['fan', 'heat sink', 'thermal paste', 'ventilation'],
  
  // Mechanical Issues
  'vibration': ['motor mount', 'bearing', 'belt', 'shock absorber'],
  'stuck': ['motor', 'gear', 'belt', 'lubricant'],
  'loose': ['screw', 'bracket', 'mount', 'clamp'],
  'broken': ['housing', 'cover', 'handle', 'knob']
};

function findRelevantKeywords(userIssue: string): string[] {
  const issue = userIssue.toLowerCase();
  const keywords: string[] = [];
  
  // Direct mapping check
  for (const [key, parts] of Object.entries(issueToPartMapping)) {
    if (issue.includes(key) || key.includes(issue)) {
      keywords.push(...parts);
    }
  }
  
  // Individual word matching with better filtering
  const words = issue.split(/\s+/).filter(word => word.length > 2);
  words.forEach(word => {
    // Remove common stop words
    const stopWords = ['the', 'and', 'but', 'for', 'are', 'with', 'not', 'can', 'has', 'had', 'was', 'will'];
    if (!stopWords.includes(word)) {
      for (const [key, parts] of Object.entries(issueToPartMapping)) {
        if (key.includes(word) || parts.some(part => part.includes(word))) {
          keywords.push(...parts);
        }
      }
    }
  });
  
  return [...new Set(keywords)]; // Remove duplicates
}

// Enhanced search function that uses AI-optimized fields
function searchPartsWithAI(parts: any[], userIssue: string, appliance?: string) {
  const issue = userIssue.toLowerCase();
  const applianceFilter = appliance?.toLowerCase();
  
  return parts.map(part => {
    let score = 0;
    const partText = `${part.name} ${part.specifications || ''} ${part.tags || ''}`.toLowerCase();
    
    // Check problem keywords (highest weight)
    if (part.specifications && part.specifications.toLowerCase().includes('problem keywords:')) {
      const problemKeywordsSection = part.specifications.toLowerCase();
      const keywords = problemKeywordsSection.split('problem keywords:')[1]?.split('\n')[0] || '';
      if (keywords.includes(issue) || issue.split(' ').some(word => keywords.includes(word))) {
        score += 50;
      }
    }
    
    // Check symptoms (high weight)
    if (part.specifications && part.specifications.toLowerCase().includes('symptoms:')) {
      const symptomsSection = part.specifications.toLowerCase();
      const symptoms = symptomsSection.split('symptoms:')[1]?.split('\n')[0] || '';
      if (symptoms.includes(issue) || issue.split(' ').some(word => symptoms.includes(word))) {
        score += 40;
      }
    }
    
    // Check compatible appliances
    if (applianceFilter && part.specifications && part.specifications.toLowerCase().includes('compatible appliances:')) {
      const appliancesSection = part.specifications.toLowerCase();
      const appliances = appliancesSection.split('compatible appliances:')[1]?.split('\n')[0] || '';
      if (appliances.includes(applianceFilter)) {
        score += 30;
      }
    }
    
    // Check customer description
    if (part.specifications && part.specifications.toLowerCase().includes('customer description:')) {
      const descSection = part.specifications.toLowerCase();
      const description = descSection.split('customer description:')[1]?.split('\n')[0] || '';
      if (description.includes(issue) || issue.split(' ').some(word => description.includes(word))) {
        score += 25;
      }
    }
    
    // Check failure reasons
    if (part.specifications && part.specifications.toLowerCase().includes('failure reasons:')) {
      const failureSection = part.specifications.toLowerCase();
      const reasons = failureSection.split('failure reasons:')[1]?.split('\n')[0] || '';
      if (reasons.includes(issue) || issue.split(' ').some(word => reasons.includes(word))) {
        score += 20;
      }
    }
    
    // Traditional text matching (lower weight)
    if (partText.includes(issue)) {
      score += 15;
    }
    
    // Keyword matching
    const keywords = findRelevantKeywords(issue);
    keywords.forEach(keyword => {
      if (partText.includes(keyword.toLowerCase())) {
        score += 10;
      }
    });
    
    // Category/subcategory matching
    if (part.category && issue.includes(part.category.toLowerCase())) {
      score += 8;
    }
    if (part.subCategory && issue.includes(part.subCategory.toLowerCase())) {
      score += 8;
    }
    
    return { ...part, relevanceScore: score };
  }).filter(part => part.relevanceScore > 0);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { issue, appliance } = req.body;

      if (!issue) {
        return res.status(400).json({ error: 'Issue description is required' });
      }

      // Get all active parts for AI-powered search
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
        take: 100 // Get more parts for better AI matching
      });

      // Use AI-enhanced search
      const scoredParts = searchPartsWithAI(parts, issue, appliance)
        .map(part => {
          // Extract AI-optimized data from specifications
          const specs = part.specifications || '';
          const getSpecValue = (key: string) => {
            const match = specs.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'));
            return match ? match[1].trim() : '';
          };

          // Get inventory data
          const inventory = part.brandInventory?.[0];
          const stockQuantity = inventory?.onHandQuantity || 0;
          const availableQuantity = inventory?.availableQuantity || 0;

          // Extract compatible appliances
          const compatibleAppliances = getSpecValue('Compatible Appliances')
            .split(',')
            .map(a => a.trim())
            .filter(Boolean)
            .slice(0, 4);

          // Get installation difficulty and urgency
          const installationDifficulty = getSpecValue('Installation') || 'MEDIUM';
          const urgencyLevel = getSpecValue('Urgency') || 'MEDIUM';
          const customerDescription = getSpecValue('Customer Description');
          const troubleshooting = getSpecValue('Troubleshooting');
          const failureReasons = getSpecValue('Failure Reasons');

          return {
            ...part,
            imageUrl: `https://images.unsplash.com/400x300/?${part.name.replace(/\s+/g, '+')}+spare+part`,
            inventory: stockQuantity,
            availableQuantity,
            inStock: availableQuantity > 0,
            compatibleAppliances: compatibleAppliances.length > 0 ? compatibleAppliances : [
              'Universal',
              appliance || 'Various Appliances'
            ],
            installationDifficulty,
            urgencyLevel,
            customerDescription,
            troubleshootingSteps: troubleshooting,
            commonFailureReasons: failureReasons,
            // Enhanced metadata for better user experience
            estimatedRepairTime: installationDifficulty === 'EASY' ? '30-60 minutes' : 
                               installationDifficulty === 'MEDIUM' ? '1-2 hours' : 
                               installationDifficulty === 'HARD' ? '2-4 hours' : '4+ hours',
            professionalRequired: ['HARD', 'EXPERT'].includes(installationDifficulty),
            urgencyColor: urgencyLevel === 'CRITICAL' ? 'red' : 
                         urgencyLevel === 'HIGH' ? 'orange' : 
                         urgencyLevel === 'MEDIUM' ? 'yellow' : 'green'
          };
        })
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10); // Return top 10 results

      // Generate enhanced AI explanation
      const topPart = scoredParts[0];
      const explanation = scoredParts.length > 0 
        ? `Based on your issue "${issue}"${appliance ? ` with your ${appliance}` : ''}, I found ${scoredParts.length} relevant spare parts. The top recommendation is "${topPart?.name}" with a ${topPart?.relevanceScore}% match confidence. ${topPart?.customerDescription ? topPart.customerDescription : 'This part commonly resolves similar issues.'}`
        : `I couldn't find specific parts for "${issue}"${appliance ? ` in ${appliance}` : ''}. Try describing the symptoms differently or contact our support team for personalized assistance.`;

      res.status(200).json({
        success: true,
        explanation,
        parts: scoredParts,
        searchKeywords: keywords,
        totalFound: scoredParts.length
      });

    } catch (error) {
      console.error('Semantic search error:', error);
      res.status(500).json({ error: 'Failed to perform semantic search' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}