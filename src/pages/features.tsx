import Head from 'next/head';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Globe, 
  Shield, 
  BarChart3, 
  Truck, 
  Package, 
  Search, 
  Zap,
  Clock,
  DollarSign,
  Users,
  Smartphone,
  Database,
  Workflow,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AuthHeader from '@/components/AuthHeader';
import Footer from '@/components/Footer';
import Link from 'next/link';

const features = [
  {
    icon: <Bot className="h-8 w-8" />,
    title: "AI-Powered Intelligence",
    description: "Advanced machine learning algorithms for demand forecasting and intelligent part matching",
    benefits: [
      "95% accuracy in part identification",
      "Predictive demand forecasting",
      "Automated inventory optimization",
      "Smart reorder point calculation"
    ],
    category: "AI & Automation"
  },
  {
    icon: <Globe className="h-8 w-8" />,
    title: "Global Supply Network",
    description: "Connect with verified suppliers and customers across 50+ countries",
    benefits: [
      "18,000+ PIN codes coverage",
      "Multi-currency support",
      "Real-time logistics tracking",
      "International shipping integration"
    ],
    category: "Network"
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: "Enterprise Security",
    description: "Bank-grade encryption and compliance with international standards",
    benefits: [
      "ISO 27001 certified",
      "SOC 2 compliant",
      "End-to-end encryption",
      "99.9% uptime guarantee"
    ],
    category: "Security"
  },
  {
    icon: <BarChart3 className="h-8 w-8" />,
    title: "Advanced Analytics",
    description: "Real-time insights and predictive analytics for supply chain optimization",
    benefits: [
      "Real-time dashboards",
      "Custom reporting",
      "Performance metrics",
      "Cost analysis tools"
    ],
    category: "Analytics"
  },
  {
    icon: <Truck className="h-8 w-8" />,
    title: "Smart Logistics",
    description: "Automated courier integration with real-time tracking and optimization",
    benefits: [
      "DTDC API integration",
      "Automated label generation",
      "Route optimization",
      "Delivery predictions"
    ],
    category: "Logistics"
  },
  {
    icon: <Package className="h-8 w-8" />,
    title: "Inventory Management",
    description: "Intelligent inventory control with automated restock alerts",
    benefits: [
      "Real-time stock levels",
      "MSL alerts",
      "Automated reordering",
      "Multi-location support"
    ],
    category: "Inventory"
  },
  {
    icon: <Search className="h-8 w-8" />,
    title: "Semantic Search",
    description: "Natural language search for finding parts by description or symptoms",
    benefits: [
      "Natural language queries",
      "Visual part matching",
      "Symptom-based search",
      "AI-powered suggestions"
    ],
    category: "Search"
  },
  {
    icon: <Smartphone className="h-8 w-8" />,
    title: "Mobile Optimized",
    description: "Full-featured mobile experience for on-the-go operations",
    benefits: [
      "Responsive design",
      "Mobile apps",
      "Offline capabilities",
      "Push notifications"
    ],
    category: "Mobile"
  }
];

const integrations = [
  {
    name: "DTDC Courier",
    description: "Seamless shipping and tracking integration",
    logo: "🚚"
  },
  {
    name: "Razorpay",
    description: "Secure payment processing",
    logo: "💳"
  },
  {
    name: "WhatsApp Business",
    description: "Automated customer notifications",
    logo: "📱"
  },
  {
    name: "PostgreSQL",
    description: "Robust database management",
    logo: "🗄️"
  },
  {
    name: "AWS/GCP",
    description: "Cloud infrastructure",
    logo: "☁️"
  },
  {
    name: "OpenAI",
    description: "AI-powered features",
    logo: "🤖"
  }
];

const useCases = [
  {
    title: "Brand Manufacturers",
    description: "Streamline distribution and manage global supply chains",
    features: ["Catalog Management", "Quality Control", "Analytics", "Partner Network"]
  },
  {
    title: "Distributors",
    description: "Optimize inventory and automate ordering processes",
    features: ["Demand Forecasting", "Auto Purchase Orders", "Margin Tracking", "Multi-brand Support"]
  },
  {
    title: "Service Centers",
    description: "Access parts instantly and provide better customer service",
    features: ["Instant Search", "DIY Videos", "Customer History", "Reverse Logistics"]
  },
  {
    title: "End Customers",
    description: "Find and order parts with AI assistance and guidance",
    features: ["AI Search", "Visual Matching", "DIY Guides", "Expert Support"]
  }
];

export default function FeaturesPage() {
  return (
    <>
      <Head>
        <title>Features | SpareFlow – Reverse Courier, Inventory, Shipment & Service Center Tools</title>
        <meta name="description" content="Explore SpareFlow's full suite: reverse courier management, auto AWB generation, spare inventory tracking, brand-to-service center logistics, and analytics dashboard." />
        <meta name="keywords" content="shipment tracking system, parts inventory software, reverse shipment automation, logistics SaaS India, service center tools, courier API integration, spare parts management features, reverse logistics platform, B2B courier management system, service center inventory tracking, warranty return management, repair and return logistics, field service parts tracking, after-sales service software, parts supply chain management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://spareflow.com/features" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://spareflow.com/features" />
        <meta property="og:title" content="Features | SpareFlow – Reverse Courier, Inventory, Shipment & Service Center Tools" />
        <meta property="og:description" content="Explore SpareFlow's full suite: reverse courier management, auto AWB generation, spare inventory tracking, brand-to-service center logistics, and analytics dashboard." />
        <meta property="og:image" content="https://spareflow.com/features-og-image.jpg" />
        <meta property="og:site_name" content="SpareFlow" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://spareflow.com/features" />
        <meta property="twitter:title" content="Features | SpareFlow – Reverse Courier, Inventory, Shipment & Service Center Tools" />
        <meta property="twitter:description" content="Explore SpareFlow's full suite: reverse courier management, auto AWB generation, spare inventory tracking, brand-to-service center logistics, and analytics dashboard." />
        <meta property="twitter:image" content="https://spareflow.com/features-twitter-image.jpg" />
        <meta property="twitter:site" content="@SpareFlow" />

        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="author" content="SpareFlow" />
        
        {/* Structured Data - WebPage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              "name": "SpareFlow Features",
              "description": "Complete feature set for reverse courier management, inventory tracking, and service center logistics",
              "url": "https://spareflow.com/features",
              "mainEntity": {
                "@type": "SoftwareApplication",
                "name": "SpareFlow",
                "featureList": [
                  "End-to-End Logistics Workflow",
                  "Inventory, Returns & Shipping Under One Dashboard",
                  "AI-Powered Intelligence",
                  "Global Supply Network",
                  "Enterprise Security",
                  "Advanced Analytics"
                ]
              }
            })
          }}
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <AuthHeader />
        
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Badge variant="secondary" className="mb-6 px-6 py-3 text-sm font-medium bg-gradient-to-r from-purple-100 to-teal-100 text-purple-800 border-0">
                🚀 Comprehensive Platform Features
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Everything You Need for{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Smart Logistics
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
                Discover how SpareFlow's AI-powered features transform spare parts logistics, 
                from intelligent search to automated inventory management and global distribution.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90" asChild>
                  <Link href="/auth/register">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/contact">Schedule Demo</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Core Features */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Core Features</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Powerful capabilities designed to optimize every aspect of your spare parts operations
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full border-primary/10 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          {feature.icon}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {feature.category}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{feature.description}</p>
                      <ul className="space-y-2">
                        {feature.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Built for Every Role</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Tailored solutions for manufacturers, distributors, service centers, and customers
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {useCases.map((useCase, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full border-primary/10 hover:border-primary/30 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-2xl">{useCase.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-6">{useCase.description}</p>
                      <div className="grid grid-cols-2 gap-3">
                        {useCase.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Seamless Integrations</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Connect with your existing tools and services for a unified workflow
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {integrations.map((integration, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="text-center border-primary/10 hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="text-4xl mb-4">{integration.logo}</div>
                      <h3 className="text-lg font-semibold mb-2">{integration.name}</h3>
                      <p className="text-muted-foreground text-sm">{integration.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Performance Stats */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Proven Results</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Real performance improvements achieved by our customers
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { metric: "30%", label: "Cost Reduction", icon: <DollarSign className="h-8 w-8" /> },
                { metric: "40%", label: "Faster Operations", icon: <Clock className="h-8 w-8" /> },
                { metric: "95%", label: "Accuracy Rate", icon: <BarChart3 className="h-8 w-8" /> },
                { metric: "99.9%", label: "Uptime", icon: <Shield className="h-8 w-8" /> }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="text-center border-primary/10">
                    <CardContent className="p-6">
                      <div className="text-primary mb-4 flex justify-center">
                        {stat.icon}
                      </div>
                      <div className="text-4xl font-bold text-primary mb-2">{stat.metric}</div>
                      <div className="text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Experience These Features?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Start your free trial today and see how SpareFlow can transform your spare parts operations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90" asChild>
                  <Link href="/auth/register">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/contact">Contact Sales</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}