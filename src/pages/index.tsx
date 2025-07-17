import React from "react";
import Head from "next/head";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import { 
  Truck, 
  Factory, 
  Users, 
  Wrench, 
  ArrowRight, 
  CheckCircle, 
  Zap,
  Globe,
  Shield,
  BarChart3,
  Clock,
  DollarSign,
  TrendingUp,
  Package,
  Search,
  Bot,
  Smartphone,
  Award,
  Target,
  Workflow,
  Database,
  PlayCircle,
  Star,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  FileText,
  HelpCircle,
  BookOpen,
  MessageCircle,
  ExternalLink
} from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const roles = [
  {
    title: "Brand Manufacturers",
    description: "Streamline your spare parts distribution with intelligent inventory management and global reach",
    icon: Factory,
    color: "bg-gradient-to-br from-purple-600 to-purple-700",
    features: [
      "Smart Catalog Management", 
      "Quality Control Systems", 
      "Real-time Analytics", 
      "Global Distribution Network",
      "Automated Restock Alerts",
      "Brand Protection Tools"
    ],
    dashboardPath: "/dashboard/brand",
    benefits: "Reduce inventory costs by 30% and increase market reach by 200%"
  },
  {
    title: "Distributors", 
    description: "Optimize your supply chain operations with AI-powered demand forecasting and automated ordering",
    icon: Truck,
    color: "bg-gradient-to-br from-teal-600 to-teal-700",
    features: [
      "Demand Forecasting", 
      "Automated Purchase Orders", 
      "Multi-brand Management", 
      "Regional Analytics",
      "Inventory Optimization",
      "Profit Margin Tracking"
    ],
    dashboardPath: "/dashboard/distributor",
    benefits: "Increase profit margins by 25% with optimized inventory levels"
  },
  {
    title: "Service Centers",
    description: "Access parts instantly with AI-powered search and provide exceptional customer service",
    icon: Wrench,
    color: "bg-gradient-to-br from-purple-600 to-teal-600", 
    features: [
      "Instant Parts Search", 
      "AI Diagnostic Tools", 
      "Customer History", 
      "Reverse Logistics",
      "DIY Video Library",
      "Service Analytics"
    ],
    dashboardPath: "/dashboard/service-center",
    benefits: "Reduce service time by 40% and improve customer satisfaction"
  },
  {
    title: "End Customers",
    description: "Find and order the exact spare parts you need with AI assistance and step-by-step guidance",
    icon: Users,
    color: "bg-gradient-to-br from-teal-600 to-purple-600",
    features: [
      "AI-Powered Search", 
      "Visual Part Matching", 
      "DIY Video Guides", 
      "Real-time Tracking",
      "Expert Support Chat",
      "Warranty Management"
    ],
    dashboardPath: "/dashboard/customer",
    benefits: "Save 60% on repair costs with DIY solutions and genuine parts"
  }
];

const benefits = [
  {
    icon: Bot,
    title: "AI-Powered Intelligence",
    description: "Advanced machine learning algorithms that understand your needs and predict demand patterns",
    stats: "95% accuracy in part matching"
  },
  {
    icon: Globe,
    title: "Global Supply Network",
    description: "Connect with verified suppliers and customers across 50+ countries with real-time logistics",
    stats: "50+ countries coverage"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption and compliance with international data protection standards",
    stats: "99.9% uptime guarantee"
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Real-time insights and predictive analytics to optimize your entire supply chain",
    stats: "30% cost reduction average"
  }
];

const howItWorks = [
  {
    step: "1",
    title: "Smart Part Discovery",
    description: "Use AI-powered search to find exact parts by description, image, or model number",
    icon: Search,
    details: "Our advanced AI understands natural language queries like 'washing machine door seal' and matches them with precise part specifications."
  },
  {
    step: "2", 
    title: "Intelligent Matching",
    description: "Get matched with verified suppliers and real-time availability across the network",
    icon: Target,
    details: "Machine learning algorithms consider price, quality, delivery time, and supplier reliability to find your best options."
  },
  {
    step: "3",
    title: "Seamless Ordering",
    description: "Place orders with integrated payment, tracking, and automated logistics coordination",
    icon: Package,
    details: "One-click ordering with automatic courier booking, label generation, and real-time tracking updates."
  },
  {
    step: "4",
    title: "Smart Delivery",
    description: "Track shipments in real-time with predictive delivery estimates and proactive updates",
    icon: Truck,
    details: "AI-powered logistics optimization ensures fastest delivery routes and proactive issue resolution."
  }
];

const features = [
  {
    category: "Courier Management",
    items: [
      "DTDC API integration",
      "Real-time tracking updates",
      "Automated label generation",
      "18,000+ PIN codes coverage"
    ]
  },
  {
    category: "Return Workflow",
    items: [
      "Reverse pickup automation",
      "Return request management",
      "Quality inspection tracking",
      "Refund processing"
    ]
  },
  {
    category: "Wallet & Payment Ledger",
    items: [
      "Digital wallet system",
      "Payment tracking",
      "Credit management",
      "Transaction history"
    ]
  },
  {
    category: "Smart Inventory",
    items: [
      "Brand-Distributor-SC authorization",
      "Real-time stock levels",
      "MSL alerts & forecasting",
      "API & webhook integration"
    ]
  }
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Operations Director",
    company: "TechAppliance Corp",
    content: "SpareFlow reduced our inventory costs by 35% while improving part availability. The AI predictions are incredibly accurate.",
    rating: 5
  },
  {
    name: "Michael Rodriguez",
    role: "Service Manager", 
    company: "QuickFix Services",
    content: "Our technicians can now find parts 3x faster. The diagnostic AI has revolutionized how we approach repairs.",
    rating: 5
  },
  {
    name: "Emma Thompson",
    role: "Supply Chain Head",
    company: "Global Electronics",
    content: "The platform's analytics helped us identify $2M in cost savings opportunities. Game-changing technology.",
    rating: 5
  }
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Head>
        <title>SpareFlow – Smart Reverse Logistics & Spare Parts Management Software</title>
        <meta name="description" content="Streamline your forward and reverse logistics with SpareFlow – a powerful platform for brands, service centers, and distributors to manage shipments, spare parts inventory, courier integration, and warranty returns across India." />
        <meta name="keywords" content="spare parts logistics, reverse logistics software, courier integration India, spare parts tracking, service center shipment tool, after-sales management SaaS, spare parts management software, reverse logistics platform, B2B courier management system, service center inventory tracking, warranty return management, repair and return logistics, field service parts tracking, after-sales service software, parts supply chain management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://spareflow.com/" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://spareflow.com/" />
        <meta property="og:title" content="SpareFlow – Smart Reverse Logistics & Spare Parts Management Software" />
        <meta property="og:description" content="Streamline your forward and reverse logistics with SpareFlow – a powerful platform for brands, service centers, and distributors to manage shipments, spare parts inventory, courier integration, and warranty returns across India." />
        <meta property="og:image" content="https://spareflow.com/og-image.jpg" />
        <meta property="og:site_name" content="SpareFlow" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://spareflow.com/" />
        <meta property="twitter:title" content="SpareFlow – Smart Reverse Logistics & Spare Parts Management Software" />
        <meta property="twitter:description" content="Streamline your forward and reverse logistics with SpareFlow – a powerful platform for brands, service centers, and distributors to manage shipments, spare parts inventory, courier integration, and warranty returns across India." />
        <meta property="twitter:image" content="https://spareflow.com/twitter-image.jpg" />
        <meta property="twitter:site" content="@SpareFlow" />

        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="author" content="SpareFlow" />
        <meta name="language" content="English" />
        <meta name="geo.region" content="IN" />
        <meta name="geo.country" content="India" />
        <meta name="geo.placename" content="India" />
        
        {/* Structured Data - Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "SpareFlow",
              "url": "https://spareflow.com",
              "logo": "https://spareflow.com/logo.svg",
              "description": "India's leading spare parts logistics platform for brands, distributors, and service centers",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "IN",
                "addressRegion": "Karnataka",
                "addressLocality": "Bangalore"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+91-80-4567-8900",
                "contactType": "customer service",
                "availableLanguage": ["English", "Hindi"]
              },
              "sameAs": [
                "https://www.linkedin.com/company/spareflow",
                "https://twitter.com/spareflow"
              ]
            })
          }}
        />
        
        {/* Structured Data - SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "SpareFlow",
              "description": "Smart reverse logistics and spare parts management software for brands, service centers, and distributors",
              "url": "https://spareflow.com",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "INR",
                "description": "Free trial available"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "ratingCount": "1247",
                "bestRating": "5",
                "worstRating": "1"
              },
              "featureList": [
                "Reverse logistics management",
                "Spare parts inventory tracking",
                "Courier integration",
                "Real-time shipment tracking",
                "Warranty return management",
                "AI-powered analytics"
              ]
            })
          }}
        />
        
        {/* Structured Data - Service */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Service",
              "name": "Spare Parts Logistics Management",
              "description": "Complete forward and reverse logistics solution for spare parts management",
              "provider": {
                "@type": "Organization",
                "name": "SpareFlow"
              },
              "areaServed": {
                "@type": "Country",
                "name": "India"
              },
              "serviceType": "Logistics Software",
              "category": "B2B SaaS"
            })
          }}
        />
      </Head>
      
      <div className="min-h-screen spareflow-hero-bg">
        {/* Header */}
        <AuthHeader />

        {/* Hero Section */}
        <section className="py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-teal-600/5" />
          <div className="container mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Badge variant="secondary" className="mb-6 px-6 py-3 text-sm font-medium bg-gradient-to-r from-blue-100 to-green-100 text-spareflow-blue border-0">
                🚀 Trusted by 10,000+ Companies Worldwide
              </Badge>
              
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Transform Your Spare Parts Logistics with
                <span className="spareflow-text-gradient">
                  {" "}SpareFlow{" "}
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
                Brands, Distributors & Service Centers — Manage Spares, Ship Faster & Save Cost. 
                Reverse Pickup & Returns Made Easy. Powerful Courier Integration + Real-Time Tracking. 
                <strong>Compliant with Right to Repair Law</strong>.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Link href={isAuthenticated ? "/dashboard" : "/auth/register"}>
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                    Start Free Trial - No Credit Card Required
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="px-8 py-4 text-lg border-purple-600 text-purple-600 hover:bg-purple-50 font-semibold"
                  onClick={() => window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank')}
                >
                  <PlayCircle className="mr-2 w-5 h-5" />
                  Watch 2-Min Demo
                </Button>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Free 30-day trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Setup in 5 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>24/7 support included</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Hero Image */}
        <motion.section 
          className="px-4 pb-20"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="container mx-auto">
            <div className="relative rounded-3xl overflow-hidden border bg-white p-3 shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                alt="Modern AI-powered logistics warehouse with automated systems and real-time tracking displays"
                className="w-full h-96 object-cover rounded-2xl"
              />
              <div className="absolute inset-3 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-2xl" />
              <div className="absolute bottom-8 left-8 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Live System Active</span>
                </div>
                <p className="text-lg font-semibold">Real-time AI processing 50,000+ parts daily</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Stats Section */}
        <section className="py-16 px-4 bg-white">
          <div className="container mx-auto">
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div>
                <div className="text-4xl font-bold text-purple-600 mb-2">18,000+</div>
                <div className="text-gray-600">PIN Codes Covered</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-teal-600 mb-2">500+</div>
                <div className="text-gray-600">Service Centers Onboard</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-purple-600 mb-2">₹2.5 Cr</div>
                <div className="text-gray-600">Spare Parts Shipped</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-teal-600 mb-2">95%</div>
                <div className="text-gray-600">On-Time Delivery</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-white">
          <div className="container mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                How SpareFlow Works
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Our AI-powered platform simplifies every step of the spare parts journey, 
                from discovery to delivery, with intelligent automation and real-time insights.
              </p>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {howItWorks.map((step, index) => (
                <motion.div key={step.step} variants={fadeInUp} className="relative">
                  <Card className="h-full hover:shadow-lg transition-all duration-300 border-0 bg-white">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-teal-600 rounded-xl flex items-center justify-center">
                          <step.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-600">{step.step}</span>
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold text-gray-900">
                        {step.title}
                      </CardTitle>
                      <CardDescription className="text-gray-600 leading-relaxed">
                        {step.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        {step.details}
                      </p>
                    </CardContent>
                  </Card>
                  {index < howItWorks.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ChevronRight className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Roles Section */}
        <section className="py-20 px-4 bg-white">
          <div className="container mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Tailored Solutions for Every Role
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Whether you're a manufacturer, distributor, service center, or end customer, 
                SpareFlow provides specialized tools and workflows designed for your specific needs and challenges.
              </p>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-2 gap-8"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {roles.map((role, index) => (
                <motion.div key={role.title} variants={fadeInUp}>
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 group">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-14 h-14 ${role.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                          <role.icon className="w-7 h-7 text-white" />
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-0">
                          {role.benefits}
                        </Badge>
                      </div>
                      <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                        {role.title}
                      </CardTitle>
                      <CardDescription className="text-gray-600 leading-relaxed text-base">
                        {role.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 mb-6">
                        {role.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </div>
                        ))}
                      </div>
                      <Link href={isAuthenticated ? "/dashboard" : "/auth/register"}>
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700">
                          {isAuthenticated ? `Go to Dashboard` : `Get Started as ${role.title}`}
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-4 bg-gradient-to-br from-purple-50 to-teal-50">
          <div className="container mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Comprehensive Feature Set
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Everything you need to optimize your spare parts operations, 
                from AI-powered search to advanced analytics.
              </p>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {features.map((category, index) => (
                <motion.div key={category.category} variants={fadeInUp}>
                  <Card className="h-full border-0 bg-white hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-gray-900 mb-4">
                        {category.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {category.items.map((item, idx) => (
                          <li key={idx} className="flex items-start text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 bg-white">
          <div className="container mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Why Industry Leaders Choose SpareFlow
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Join thousands of companies that have transformed their spare parts operations 
                with our cutting-edge AI technology and proven results.
              </p>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {benefits.map((benefit, index) => (
                <motion.div 
                  key={benefit.title}
                  variants={fadeInUp}
                  className="text-center group"
                >
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <benefit.icon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-3">
                    {benefit.description}
                  </p>
                  <div className="text-sm font-semibold text-purple-600">
                    {benefit.stats}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-white">
          <div className="container mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Trusted by Industry Leaders
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                See what our customers say about their transformation with SpareFlow
              </p>
            </motion.div>

            <motion.div 
              className="grid md:grid-cols-3 gap-8"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {testimonials.map((testimonial, index) => (
                <motion.div key={testimonial.name} variants={fadeInUp}>
                  <Card className="h-full border-0 bg-white hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <p className="text-gray-600 mb-6 leading-relaxed italic">
                        "{testimonial.content}"
                      </p>
                      <div>
                        <div className="font-semibold text-gray-900">{testimonial.name}</div>
                        <div className="text-sm text-gray-500">{testimonial.role}</div>
                        <div className="text-sm text-purple-600 font-medium">{testimonial.company}</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-purple-600 to-teal-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10" />
          <div className="container mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to Transform Your Supply Chain?
              </h2>
              <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                Join over 10,000 companies already using SpareFlow to reduce costs, 
                increase efficiency, and deliver exceptional customer experiences. 
                Start your free trial today - no credit card required.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <Link href={isAuthenticated ? "/dashboard" : "/auth/register"}>
                  <Button size="lg" variant="secondary" className="px-8 py-4 text-lg bg-white text-purple-600 hover:bg-gray-100 font-semibold shadow-lg">
                    Start Free 30-Day Trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="px-8 py-4 text-lg border-white text-white hover:bg-white hover:text-purple-600 font-semibold"
                  onClick={() => window.open('mailto:demo@spareflow.com?subject=Schedule Personal Demo&body=Hi, I would like to schedule a personal demo of SpareFlow.', '_blank')}
                >
                  Schedule Personal Demo
                </Button>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-purple-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  <span>Setup in 5 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  <span>No long-term contracts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  <span>24/7 expert support</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}