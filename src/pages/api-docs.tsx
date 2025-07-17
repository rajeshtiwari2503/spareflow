import Head from 'next/head';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  Code, Book, Key, Shield, Zap, Copy, Check,
  ChevronRight, ChevronDown, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';

const apiEndpoints = [
  {
    category: "Authentication",
    endpoints: [
      {
        method: "POST",
        path: "/api/auth/login",
        description: "Authenticate user and get access token",
        parameters: ["email", "password"],
        response: "{ token, user, expires_in }"
      },
      {
        method: "POST",
        path: "/api/auth/register",
        description: "Register a new user account",
        parameters: ["name", "email", "password", "role"],
        response: "{ user, token }"
      },
      {
        method: "GET",
        path: "/api/auth/me",
        description: "Get current user information",
        parameters: [],
        response: "{ user }"
      }
    ]
  },
  {
    category: "Parts Management",
    endpoints: [
      {
        method: "GET",
        path: "/api/parts",
        description: "Get all parts with pagination",
        parameters: ["page", "limit", "search", "brand_id"],
        response: "{ parts[], total, page, limit }"
      },
      {
        method: "POST",
        path: "/api/parts",
        description: "Create a new part",
        parameters: ["code", "name", "description", "price", "weight", "msl"],
        response: "{ part }"
      },
      {
        method: "PUT",
        path: "/api/parts/:id",
        description: "Update an existing part",
        parameters: ["name", "description", "price", "weight", "msl"],
        response: "{ part }"
      },
      {
        method: "DELETE",
        path: "/api/parts/:id",
        description: "Delete a part",
        parameters: [],
        response: "{ success: true }"
      }
    ]
  },
  {
    category: "Shipments",
    endpoints: [
      {
        method: "GET",
        path: "/api/shipments",
        description: "Get all shipments",
        parameters: ["status", "brand_id", "service_center_id"],
        response: "{ shipments[] }"
      },
      {
        method: "POST",
        path: "/api/shipments",
        description: "Create a new shipment",
        parameters: ["brand_id", "service_center_id", "num_boxes", "parts[]"],
        response: "{ shipment, boxes[] }"
      },
      {
        method: "GET",
        path: "/api/shipments/:id/tracking",
        description: "Get shipment tracking information",
        parameters: [],
        response: "{ tracking_data[] }"
      }
    ]
  },
  {
    category: "AI & Analytics",
    endpoints: [
      {
        method: "POST",
        path: "/api/ai-support/diagnose",
        description: "AI-powered issue diagnosis",
        parameters: ["query", "context"],
        response: "{ diagnosis, suggested_parts[], confidence }"
      },
      {
        method: "GET",
        path: "/api/ai-forecasting/analyze",
        description: "Get demand forecasting analysis",
        parameters: ["part_id", "timeframe", "location"],
        response: "{ forecast[], confidence, recommendations[] }"
      },
      {
        method: "POST",
        path: "/api/semantic-search",
        description: "Semantic search for parts",
        parameters: ["query", "filters"],
        response: "{ results[], relevance_scores[] }"
      }
    ]
  }
];

const codeExamples = {
  javascript: `// Authentication
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { token, user } = await response.json();

// Use token for authenticated requests
const partsResponse = await fetch('/api/parts', {
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  }
});`,
  
  python: `import requests

# Authentication
auth_response = requests.post('https://api.spareflow.com/api/auth/login', {
    'email': 'user@example.com',
    'password': 'password123'
})

token = auth_response.json()['token']

# Use token for authenticated requests
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

parts_response = requests.get('https://api.spareflow.com/api/parts', headers=headers)
parts = parts_response.json()`,

  curl: `# Authentication
curl -X POST https://api.spareflow.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Use token for authenticated requests
curl -X GET https://api.spareflow.com/api/parts \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json"`
};

export default function ApiDocsPage() {
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Authentication");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (code: string, language: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(language);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied!",
      description: "Code example copied to clipboard",
    });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Head>
        <title>API Documentation - SpareFlow | Developer Resources</title>
        <meta name="description" content="Complete API documentation for SpareFlow. Learn how to integrate with our AI-powered spare parts logistics platform." />
        <meta name="keywords" content="spareflow api, api documentation, developer resources, integration guide, REST API" />
        <meta property="og:title" content="API Documentation - SpareFlow" />
        <meta property="og:description" content="Complete API documentation for SpareFlow platform integration." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl text-primary">
                  <Code className="h-12 w-12" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                API{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Documentation
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
                Integrate SpareFlow's AI-powered logistics platform into your applications with our comprehensive REST API
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  Get API Key
                  <Key className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline">
                  View Examples
                  <ExternalLink className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Quick Start Guide</h2>
              <p className="text-muted-foreground">Get up and running with the SpareFlow API in minutes</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Get Your API Key",
                  description: "Sign up for a SpareFlow account and generate your API key from the dashboard",
                  icon: <Key className="h-8 w-8" />
                },
                {
                  step: "2",
                  title: "Make Your First Request",
                  description: "Use your API key to authenticate and make your first API call",
                  icon: <Zap className="h-8 w-8" />
                },
                {
                  step: "3",
                  title: "Build Your Integration",
                  description: "Use our comprehensive documentation to build your custom integration",
                  icon: <Code className="h-8 w-8" />
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="text-center border-primary/10 hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                        {item.step}
                      </div>
                      <div className="text-primary mb-4 flex justify-center">
                        {item.icon}
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* API Reference */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold mb-6">API Reference</h2>
              <p className="text-xl text-muted-foreground">
                Complete reference for all available endpoints
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Endpoints List */}
              <div>
                <div className="space-y-6">
                  {apiEndpoints.map((category, categoryIndex) => (
                    <motion.div
                      key={categoryIndex}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: categoryIndex * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Card className="border-primary/10">
                        <CardHeader 
                          className="cursor-pointer"
                          onClick={() => setExpandedCategory(
                            expandedCategory === category.category ? null : category.category
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xl">{category.category}</CardTitle>
                            {expandedCategory === category.category ? 
                              <ChevronDown className="h-5 w-5" /> : 
                              <ChevronRight className="h-5 w-5" />
                            }
                          </div>
                        </CardHeader>
                        {expandedCategory === category.category && (
                          <CardContent>
                            <div className="space-y-4">
                              {category.endpoints.map((endpoint, endpointIndex) => (
                                <div key={endpointIndex} className="border rounded-lg p-4">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Badge className={getMethodColor(endpoint.method)}>
                                      {endpoint.method}
                                    </Badge>
                                    <code className="text-sm bg-muted px-2 py-1 rounded">
                                      {endpoint.path}
                                    </code>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {endpoint.description}
                                  </p>
                                  <div className="grid md:grid-cols-2 gap-4 text-xs">
                                    <div>
                                      <strong>Parameters:</strong>
                                      <ul className="mt-1 space-y-1">
                                        {endpoint.parameters.map((param, paramIndex) => (
                                          <li key={paramIndex} className="text-muted-foreground">
                                            • {param}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <strong>Response:</strong>
                                      <code className="block mt-1 text-muted-foreground">
                                        {endpoint.response}
                                      </code>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Code Examples */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-primary/10 sticky top-8">
                    <CardHeader>
                      <CardTitle className="text-xl">Code Examples</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="javascript" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                          <TabsTrigger value="python">Python</TabsTrigger>
                          <TabsTrigger value="curl">cURL</TabsTrigger>
                        </TabsList>
                        
                        {Object.entries(codeExamples).map(([language, code]) => (
                          <TabsContent key={language} value={language}>
                            <div className="relative">
                              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                                <code>{code}</code>
                              </pre>
                              <Button
                                size="sm"
                                variant="outline"
                                className="absolute top-2 right-2"
                                onClick={() => copyToClipboard(code, language)}
                              >
                                {copiedCode === language ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-primary" />
                    <CardTitle className="text-2xl">Authentication</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    The SpareFlow API uses Bearer token authentication. Include your API token in the Authorization header:
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <code>Authorization: Bearer YOUR_API_TOKEN</code>
                  </div>
                  <div className="mt-6 grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Rate Limits</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 1000 requests per hour</li>
                        <li>• 10,000 requests per day</li>
                        <li>• Burst limit: 100 requests per minute</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Response Format</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• All responses are in JSON format</li>
                        <li>• HTTP status codes indicate success/failure</li>
                        <li>• Error responses include detailed messages</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Support */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6">Need Help?</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Our developer support team is here to help you integrate successfully
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  Contact Support
                </Button>
                <Button size="lg" variant="outline">
                  Join Developer Community
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}