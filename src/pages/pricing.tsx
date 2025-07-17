import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  ArrowRight, Check, X, Star, Zap, Building, Crown, 
  Users, Package, BarChart3, Headphones, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const plans = [
  {
    name: "Starter",
    description: "Perfect for small businesses getting started",
    icon: <Zap className="h-8 w-8" />,
    monthlyPrice: 2999,
    yearlyPrice: 29990,
    features: [
      "Up to 1,000 parts",
      "5 users included",
      "Basic AI forecasting",
      "Standard support",
      "Mobile app access",
      "Basic analytics",
      "Email notifications"
    ],
    limitations: [
      "Advanced AI features",
      "Custom integrations",
      "Priority support",
      "Advanced analytics"
    ],
    popular: false,
    cta: "Start Free Trial"
  },
  {
    name: "Professional",
    description: "Ideal for growing businesses with advanced needs",
    icon: <Building className="h-8 w-8" />,
    monthlyPrice: 7999,
    yearlyPrice: 79990,
    features: [
      "Up to 10,000 parts",
      "25 users included",
      "Advanced AI forecasting",
      "Priority support",
      "Mobile app access",
      "Advanced analytics",
      "WhatsApp integration",
      "Custom workflows",
      "API access",
      "Bulk operations"
    ],
    limitations: [
      "White-label options",
      "Dedicated support"
    ],
    popular: true,
    cta: "Start Free Trial"
  },
  {
    name: "Enterprise",
    description: "For large organizations with complex requirements",
    icon: <Crown className="h-8 w-8" />,
    monthlyPrice: null,
    yearlyPrice: null,
    features: [
      "Unlimited parts",
      "Unlimited users",
      "Full AI suite",
      "Dedicated support",
      "Mobile app access",
      "Custom analytics",
      "All integrations",
      "Custom workflows",
      "Full API access",
      "Bulk operations",
      "White-label options",
      "SLA guarantees",
      "Custom training",
      "On-premise deployment"
    ],
    limitations: [],
    popular: false,
    cta: "Contact Sales"
  }
];

const addOns = [
  {
    name: "Additional Users",
    description: "Extra user seats beyond plan limits",
    price: "₹299/user/month"
  },
  {
    name: "Premium Support",
    description: "24/7 phone support with 1-hour response time",
    price: "₹4,999/month"
  },
  {
    name: "Custom Integration",
    description: "Connect with your existing ERP or CRM systems",
    price: "₹19,999 one-time"
  },
  {
    name: "Advanced Training",
    description: "On-site training and implementation support",
    price: "₹49,999 one-time"
  }
];

const faqs = [
  {
    question: "Is there a free trial?",
    answer: "Yes! We offer a 14-day free trial for all plans. No credit card required to get started."
  },
  {
    question: "Can I change plans anytime?",
    answer: "Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, bank transfers, and UPI payments. Enterprise customers can also pay via invoice."
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we use enterprise-grade security with 256-bit encryption, SOC 2 compliance, and regular security audits."
  },
  {
    question: "Do you offer custom pricing?",
    answer: "Yes, we offer custom pricing for large enterprises with specific requirements. Contact our sales team for a quote."
  },
  {
    question: "What's included in support?",
    answer: "All plans include email support. Professional plans get priority support, and Enterprise plans get dedicated support with SLA guarantees."
  }
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  const formatPrice = (price: number | null) => {
    if (!price) return "Custom";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <>
      <Head>
        <title>Pricing | SpareFlow Courier & Logistics Software for Brands & Service Centers</title>
        <meta name="description" content="Choose a pricing plan that fits your logistics needs. Whether you're a brand, service center, or distributor – SpareFlow offers scalable pricing with complete courier, inventory, and shipping tools." />
        <meta name="keywords" content="logistics software pricing India, courier SaaS plans, spare parts software cost, service center shipping pricing, reverse logistics pricing, B2B courier management pricing, spare parts management software cost, logistics platform pricing, courier integration pricing, inventory management software pricing" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://spareflow.com/pricing" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://spareflow.com/pricing" />
        <meta property="og:title" content="Pricing | SpareFlow Courier & Logistics Software for Brands & Service Centers" />
        <meta property="og:description" content="Choose a pricing plan that fits your logistics needs. Whether you're a brand, service center, or distributor – SpareFlow offers scalable pricing with complete courier, inventory, and shipping tools." />
        <meta property="og:image" content="https://spareflow.com/pricing-og-image.jpg" />
        <meta property="og:site_name" content="SpareFlow" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://spareflow.com/pricing" />
        <meta property="twitter:title" content="Pricing | SpareFlow Courier & Logistics Software for Brands & Service Centers" />
        <meta property="twitter:description" content="Choose a pricing plan that fits your logistics needs. Whether you're a brand, service center, or distributor – SpareFlow offers scalable pricing with complete courier, inventory, and shipping tools." />
        <meta property="twitter:image" content="https://spareflow.com/pricing-twitter-image.jpg" />
        <meta property="twitter:site" content="@SpareFlow" />

        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="author" content="SpareFlow" />
        
        {/* Structured Data - Product */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "SpareFlow Logistics Software",
              "description": "Complete spare parts logistics and courier management software",
              "brand": {
                "@type": "Brand",
                "name": "SpareFlow"
              },
              "offers": [
                {
                  "@type": "Offer",
                  "name": "Starter Plan",
                  "price": "2999",
                  "priceCurrency": "INR",
                  "priceSpecification": {
                    "@type": "UnitPriceSpecification",
                    "price": "2999",
                    "priceCurrency": "INR",
                    "unitText": "MONTH"
                  }
                },
                {
                  "@type": "Offer",
                  "name": "Professional Plan",
                  "price": "7999",
                  "priceCurrency": "INR",
                  "priceSpecification": {
                    "@type": "UnitPriceSpecification",
                    "price": "7999",
                    "priceCurrency": "INR",
                    "unitText": "MONTH"
                  }
                }
              ]
            })
          }}
        />
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
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                Simple{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Pricing
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8">
                Choose the perfect plan for your business. No hidden fees, no surprises. 
                Start with a free trial and scale as you grow.
              </p>
              
              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-4 mb-12">
                <span className={`text-lg ${!isYearly ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  Monthly
                </span>
                <Switch
                  checked={isYearly}
                  onCheckedChange={setIsYearly}
                  className="data-[state=checked]:bg-primary"
                />
                <span className={`text-lg ${isYearly ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  Yearly
                </span>
                <Badge variant="secondary" className="ml-2">Save 17%</Badge>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing Plans */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8">
              {plans.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-primary to-secondary text-white px-4 py-1">
                        <Star className="h-4 w-4 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <Card className={`h-full ${plan.popular ? 'border-primary/50 shadow-lg scale-105' : 'border-primary/10'} hover:border-primary/30 transition-all`}>
                    <CardHeader className="text-center pb-8">
                      <div className="flex justify-center mb-4">
                        <div className={`p-3 rounded-2xl ${plan.popular ? 'bg-gradient-to-br from-primary to-secondary text-white' : 'bg-primary/10 text-primary'}`}>
                          {plan.icon}
                        </div>
                      </div>
                      <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                      <p className="text-muted-foreground mb-6">{plan.description}</p>
                      
                      <div className="mb-6">
                        {plan.monthlyPrice ? (
                          <>
                            <div className="text-4xl font-bold">
                              {formatPrice(isYearly ? Math.floor(plan.yearlyPrice! / 12) : plan.monthlyPrice)}
                            </div>
                            <div className="text-muted-foreground">
                              per month{isYearly && ', billed annually'}
                            </div>
                            {isYearly && (
                              <div className="text-sm text-green-600 mt-1">
                                Save {formatPrice(plan.monthlyPrice * 12 - plan.yearlyPrice!)} per year
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-4xl font-bold">Custom</div>
                        )}
                      </div>

                      <Button 
                        className={`w-full ${plan.popular ? 'bg-gradient-to-r from-primary to-secondary hover:opacity-90' : ''}`}
                        variant={plan.popular ? 'default' : 'outline'}
                        asChild
                      >
                        <Link href={plan.cta === 'Contact Sales' ? '/contact' : '/auth/register'}>
                          {plan.cta}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-3 text-green-600">What's included:</h4>
                          <ul className="space-y-2">
                            {plan.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span className="text-sm">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {plan.limitations.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3 text-muted-foreground">Not included:</h4>
                            <ul className="space-y-2">
                              {plan.limitations.map((limitation, limitationIndex) => (
                                <li key={limitationIndex} className="flex items-center gap-2">
                                  <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-sm text-muted-foreground">{limitation}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Add-ons */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Add-ons & Extras</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Enhance your SpareFlow experience with additional features and services
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {addOns.map((addon, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-primary/10 hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2">{addon.name}</h3>
                          <p className="text-muted-foreground">{addon.description}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-semibold text-primary">{addon.price}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-muted-foreground">
                Got questions? We've got answers.
              </p>
            </motion.div>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-primary/10">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-3">{faq.question}</h3>
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Transform Your Business?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of businesses already using SpareFlow to optimize their spare parts logistics. 
                Start your free trial today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90" asChild>
                  <Link href="/auth/register">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/contact">Talk to Sales</Link>
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