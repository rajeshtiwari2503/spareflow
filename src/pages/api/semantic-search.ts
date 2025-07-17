import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

// Simple text similarity function using cosine similarity
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

// Enhanced keyword matching for common repair scenarios
function enhanceQuery(query: string): string[] {
  const keywords = query.toLowerCase();
  const enhancements: string[] = [keywords];
  
  // Common repair scenarios and their related terms
  const scenarios = {
    'blinking': ['flashing', 'flickering', 'intermittent', 'indicator', 'led', 'light'],
    'red': ['error', 'fault', 'warning', 'alarm', 'stop'],
    'not working': ['broken', 'failed', 'defective', 'malfunction', 'dead'],
    'overheating': ['hot', 'thermal', 'temperature', 'cooling', 'fan'],
    'noise': ['sound', 'vibration', 'rattling', 'grinding', 'squeaking'],
    'leak': ['leaking', 'dripping', 'fluid', 'oil', 'water'],
    'power': ['electrical', 'battery', 'voltage', 'current', 'supply'],
    'display': ['screen', 'monitor', 'lcd', 'led', 'panel'],
    'button': ['switch', 'control', 'interface', 'input'],
    'motor': ['drive', 'actuator', 'movement', 'rotation']
  };
  
  // Add related terms based on keywords found
  Object.entries(scenarios).forEach(([key, related]) => {
    if (keywords.includes(key)) {
      enhancements.push(...related.map(term => `${keywords} ${term}`));
    }
  });
  
  return enhancements;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { query, brandId, limit = 5 } = req.body

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' })
    }

    // Fetch all parts with their details
    const whereClause = brandId ? { brandId } : {};
    
    const parts = await prisma.part.findMany({
      where: whereClause,
      include: {
        brand: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (parts.length === 0) {
      return res.status(200).json({
        query,
        results: [],
        message: 'No parts found'
      })
    }

    // Enhance the query with related terms
    const enhancedQueries = enhanceQuery(query);
    
    // Calculate similarity scores for each part
    const scoredParts = parts.map(part => {
      // Combine part name and description for matching
      const partText = `${part.name} ${part.description || ''}`;
      
      // Calculate maximum similarity across all enhanced queries
      const maxSimilarity = Math.max(
        ...enhancedQueries.map(enhancedQuery => 
          calculateSimilarity(enhancedQuery, partText)
        )
      );
      
      // Boost score if part has a DIY video
      const videoBoost = part.diyVideoUrl ? 0.1 : 0;
      
      // Boost score for exact keyword matches
      const exactMatchBoost = enhancedQueries.some(eq => 
        partText.toLowerCase().includes(eq.toLowerCase())
      ) ? 0.2 : 0;
      
      const finalScore = maxSimilarity + videoBoost + exactMatchBoost;
      
      return {
        ...part,
        similarityScore: finalScore,
        hasVideo: !!part.diyVideoUrl
      }
    })

    // Sort by similarity score and filter out very low scores
    const rankedParts = scoredParts
      .filter(part => part.similarityScore > 0.1) // Minimum threshold
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, parseInt(limit.toString()))

    // Format the response
    const results = rankedParts.map(part => ({
      id: part.id,
      code: part.code,
      name: part.name,
      description: part.description,
      price: part.price,
      weight: part.weight,
      msl: part.msl,
      diyVideoUrl: part.diyVideoUrl,
      hasVideo: part.hasVideo,
      similarityScore: Math.round(part.similarityScore * 100) / 100,
      brand: part.brand,
      matchReason: part.similarityScore > 0.7 ? 'High similarity' :
                   part.similarityScore > 0.4 ? 'Good match' :
                   part.hasVideo ? 'Has instructional video' : 'Partial match'
    }))

    res.status(200).json({
      query,
      enhancedQueries: enhancedQueries.slice(1), // Don't include the original query
      results,
      totalParts: parts.length,
      matchedParts: results.length,
      message: results.length > 0 
        ? `Found ${results.length} matching part${results.length > 1 ? 's' : ''}`
        : 'No matching parts found. Try different keywords or check part descriptions.'
    })

  } catch (error) {
    console.error('Error in semantic search:', error)
    res.status(500).json({ 
      error: 'Failed to perform semantic search',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}