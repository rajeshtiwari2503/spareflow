// AI Integration Service
// Real AI API integration for production use

export interface AIRequest {
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface AIResponse {
  success: boolean;
  response?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

export interface SemanticSearchRequest {
  query: string;
  documents: Array<{
    id: string;
    content: string;
    metadata?: Record<string, any>;
  }>;
  topK?: number;
  threshold?: number;
}

export interface SemanticSearchResponse {
  success: boolean;
  results?: Array<{
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
  error?: string;
}

export interface PartDiagnosisRequest {
  issue: string;
  appliance?: string;
  parts: Array<{
    id: string;
    name: string;
    description: string;
    tags?: string[];
  }>;
  historicalData?: Array<{
    issue: string;
    partId: string;
    frequency: number;
  }>;
}

export interface PartDiagnosisResponse {
  success: boolean;
  diagnosis?: {
    confidence: number;
    explanation: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: string;
  };
  recommendedParts?: Array<{
    id: string;
    name: string;
    confidence: number;
    reason: string;
  }>;
  error?: string;
}

// AI service configuration
const AI_CONFIG = {
  OPENAI: {
    apiKey: process.env.OPENAI_API_KEY,
    apiUrl: 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
  },
  ANTHROPIC: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    apiUrl: 'https://api.anthropic.com/v1',
    model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'
  },
  COHERE: {
    apiKey: process.env.COHERE_API_KEY,
    apiUrl: 'https://api.cohere.ai/v1'
  }
};

// Primary AI service (OpenAI)
export async function generateAIResponse(request: AIRequest): Promise<AIResponse> {
  try {
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' || !AI_CONFIG.OPENAI.apiKey;
    
    if (isDevelopment) {
      // Use mock implementation for development
      return generateMockAIResponse(request);
    }

    // Real OpenAI integration
    const { apiKey, apiUrl, model } = AI_CONFIG.OPENAI;

    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const payload = {
      model: request.model || model,
      messages: [
        {
          role: 'system',
          content: request.context || 'You are a helpful AI assistant for spare parts diagnosis and support.'
        },
        {
          role: 'user',
          content: request.prompt
        }
      ],
      max_tokens: request.maxTokens || 500,
      temperature: request.temperature || 0.7
    };

    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      return {
        success: true,
        response: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        }
      };
    } else {
      throw new Error('No response from OpenAI API');
    }

  } catch (error) {
    console.error('AI response generation error:', error);
    
    // Fallback to mock for development or if API fails
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to mock AI response');
      return generateMockAIResponse(request);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate AI response'
    };
  }
}

// Mock implementation for development
async function generateMockAIResponse(request: AIRequest): Promise<AIResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('🤖 Mock AI Request:');
  console.log(`Prompt: ${request.prompt}`);
  console.log(`Context: ${request.context || 'None'}`);
  
  // Generate mock response based on prompt content
  let mockResponse = '';
  
  if (request.prompt.toLowerCase().includes('diagnose') || request.prompt.toLowerCase().includes('issue')) {
    mockResponse = `Based on the symptoms described, this appears to be a common issue. I recommend checking the following components in order of likelihood:

1. **Primary suspect**: The most likely cause based on the symptoms
2. **Secondary options**: Alternative components that could cause similar issues
3. **Preventive measures**: Steps to avoid future occurrences

The issue severity appears to be moderate and should be addressed promptly to prevent further complications.`;
  } else if (request.prompt.toLowerCase().includes('part') || request.prompt.toLowerCase().includes('component')) {
    mockResponse = `The requested part analysis indicates:

- **Compatibility**: This part is compatible with the specified appliance model
- **Installation**: Professional installation recommended
- **Warranty**: Standard manufacturer warranty applies
- **Availability**: Part is currently in stock

Please ensure proper safety precautions during installation.`;
  } else {
    mockResponse = `Thank you for your query. Based on the information provided, I can offer the following insights:

This appears to be a standard request that can be handled through our automated systems. For more specific assistance, please provide additional details about your particular situation.

Is there anything specific you'd like me to help you with regarding spare parts or technical support?`;
  }
  
  // Simulate 95% success rate
  if (Math.random() < 0.95) {
    return {
      success: true,
      response: mockResponse,
      usage: {
        promptTokens: Math.floor(request.prompt.length / 4),
        completionTokens: Math.floor(mockResponse.length / 4),
        totalTokens: Math.floor((request.prompt.length + mockResponse.length) / 4)
      }
    };
  } else {
    return {
      success: false,
      error: 'Mock AI API failure (5% chance)'
    };
  }
}

// Semantic search using AI embeddings
export async function performSemanticSearch(request: SemanticSearchRequest): Promise<SemanticSearchResponse> {
  try {
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' || !AI_CONFIG.OPENAI.apiKey;
    
    if (isDevelopment) {
      // Use mock implementation for development
      return performMockSemanticSearch(request);
    }

    // Real semantic search using OpenAI embeddings
    const { apiKey, apiUrl } = AI_CONFIG.OPENAI;

    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get embedding for the query
    const queryEmbedding = await getEmbedding(request.query, apiKey, apiUrl);
    
    // Get embeddings for all documents
    const documentEmbeddings = await Promise.all(
      request.documents.map(async (doc) => ({
        ...doc,
        embedding: await getEmbedding(doc.content, apiKey, apiUrl)
      }))
    );

    // Calculate cosine similarity scores
    const results = documentEmbeddings
      .map(doc => ({
        id: doc.id,
        content: doc.content,
        score: cosineSimilarity(queryEmbedding, doc.embedding),
        metadata: doc.metadata
      }))
      .filter(result => result.score >= (request.threshold || 0.7))
      .sort((a, b) => b.score - a.score)
      .slice(0, request.topK || 5);

    return {
      success: true,
      results
    };

  } catch (error) {
    console.error('Semantic search error:', error);
    
    // Fallback to mock for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to mock semantic search');
      return performMockSemanticSearch(request);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform semantic search'
    };
  }
}

// Mock semantic search for development
async function performMockSemanticSearch(request: SemanticSearchRequest): Promise<SemanticSearchResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  console.log('🔍 Mock Semantic Search:');
  console.log(`Query: ${request.query}`);
  console.log(`Documents: ${request.documents.length}`);
  
  // Simple keyword-based matching for mock
  const queryWords = request.query.toLowerCase().split(/\s+/);
  
  const results = request.documents
    .map(doc => {
      const contentWords = doc.content.toLowerCase().split(/\s+/);
      const matchCount = queryWords.filter(word => 
        contentWords.some(contentWord => contentWord.includes(word))
      ).length;
      
      return {
        id: doc.id,
        content: doc.content,
        score: Math.min(0.95, (matchCount / queryWords.length) * 0.8 + Math.random() * 0.2),
        metadata: doc.metadata
      };
    })
    .filter(result => result.score >= (request.threshold || 0.3))
    .sort((a, b) => b.score - a.score)
    .slice(0, request.topK || 5);

  return {
    success: true,
    results
  };
}

// AI-powered part diagnosis
export async function diagnosePartIssue(request: PartDiagnosisRequest): Promise<PartDiagnosisResponse> {
  try {
    const prompt = `
You are an expert technician specializing in appliance repair and spare parts diagnosis. 

ISSUE DESCRIPTION: "${request.issue}"
${request.appliance ? `APPLIANCE TYPE: ${request.appliance}` : ''}

AVAILABLE PARTS:
${request.parts.map(part => `- ${part.name}: ${part.description}`).join('\n')}

${request.historicalData ? `
HISTORICAL REPAIR DATA:
${request.historicalData.map(data => `- Issue: "${data.issue}" → Part: ${data.partId} (${data.frequency} times)`).join('\n')}
` : ''}

Please provide:
1. Confidence level (0-100)
2. Detailed explanation of the likely cause
3. Severity assessment (LOW/MEDIUM/HIGH/CRITICAL)
4. Issue category
5. Top 3 recommended parts with reasoning

Format your response as JSON with the following structure:
{
  "confidence": number,
  "explanation": "detailed explanation",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "category": "category name",
  "recommendedParts": [
    {"id": "part_id", "name": "part_name", "confidence": number, "reason": "explanation"}
  ]
}
`;

    const aiResponse = await generateAIResponse({
      prompt,
      context: 'You are a technical expert providing spare parts diagnosis. Always respond with valid JSON.',
      maxTokens: 800,
      temperature: 0.3
    });

    if (!aiResponse.success || !aiResponse.response) {
      throw new Error(aiResponse.error || 'Failed to get AI diagnosis');
    }

    // Parse AI response
    try {
      const parsedResponse = JSON.parse(aiResponse.response);
      
      return {
        success: true,
        diagnosis: {
          confidence: parsedResponse.confidence || 50,
          explanation: parsedResponse.explanation || 'Unable to determine specific cause',
          severity: parsedResponse.severity || 'MEDIUM',
          category: parsedResponse.category || 'GENERAL'
        },
        recommendedParts: parsedResponse.recommendedParts || []
      };
    } catch (parseError) {
      // If JSON parsing fails, extract information manually
      const response = aiResponse.response;
      
      return {
        success: true,
        diagnosis: {
          confidence: 70,
          explanation: response,
          severity: 'MEDIUM',
          category: 'GENERAL'
        },
        recommendedParts: []
      };
    }

  } catch (error) {
    console.error('AI part diagnosis error:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to diagnose part issue'
    };
  }
}

// Helper function to get embeddings from OpenAI
async function getEmbedding(text: string, apiKey: string, apiUrl: string): Promise<number[]> {
  const response = await fetch(`${apiUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text
    })
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper function to validate AI response format
export function validateAIResponse(response: string): boolean {
  try {
    JSON.parse(response);
    return true;
  } catch {
    return false;
  }
}

// Helper function to sanitize AI input
export function sanitizeAIInput(input: string): string {
  // Remove potentially harmful content
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/data:/gi, '') // Remove data: URLs
    .trim()
    .substring(0, 2000); // Limit length
}

// Helper function to estimate token count
export function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}