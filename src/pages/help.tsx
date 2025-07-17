import Head from 'next/head';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  Search, 
  HelpCircle, 
  Book, 
  MessageCircle, 
  Mail, 
  Phone,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Play,
  Download,
  Users,
  Settings,
  Truck,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import AuthHeader from '@/components/AuthHeader';
import Footer from '@/components/Footer';
import Link from 'next/link';

const faqCategories = [
  {
    title: "Getting Started",
    icon: <Book className="h-5 w-5" />,
    faqs: [
      {
        question: "How do I create an account on SpareFlow?",
        answer: "To create an account, click on 'Sign Up' in the top right corner, choose your role (Brand, Distributor, Service Center, or Customer), fill in your details, and verify your email address."
      },
      {
        question: "What are the different user roles available?",
        answer: "SpareFlow supports four main roles: Brand Manufacturers (manage catalogs and distribution), Distributors (handle inventory and orders), Service Centers (access parts and manage repairs), and Customers (search and order parts)."
      },
      {
        question: "Is there a free trial available?",
        answer: "Yes! We offer a 30-day free trial for all business accounts. No credit card required to start. You can explore all features during the trial period."
      },
      {
        question: "How long does it take to set up my account?",
        answer: "Account setup typically takes 5-10 minutes. Once you've verified your email, you can immediately start using the platform. For enterprise setups, our team can assist with data migration and custom configurations."
      }
    ]
  },
  {
    title: "Parts & Inventory",
    icon: <Package className="h-5 w-5" />,
    faqs: [
      {
        question: "How do I search for spare parts?",
        answer: "Use our AI-powered search by entering part names, codes, or even describing the problem (e.g., 'washing machine making noise'). Our semantic search will find relevant parts and suggest solutions."
      },
      {
        question: "Can I upload my existing parts catalog?",
        answer: "Yes! You can bulk upload your catalog using our CSV template. Our team can also assist with data migration from your existing systems. We support various formats and can help map your data structure."
      },
      {
        question: "How does inventory tracking work?",
        answer: "SpareFlow provides real-time inventory tracking with automated restock alerts. You can set minimum stock levels (MSL) and receive notifications when inventory runs low. Integration with your existing ERP systems is also available."
      },
      {
        question: "What is the AI DIY Assistant?",
        answer: "Our AI DIY Assistant helps customers find the right parts by describing their problems in natural language. It provides part recommendations along with video tutorials and step-by-step repair guides."
      }
    ]
  },
  {
    title: "Orders & Shipping",
    icon: <Truck className="h-5 w-5" />,
    faqs: [
      {
        question: "How does the shipping integration work?",
        answer: "We're integrated with DTDC courier services covering 18,000+ PIN codes across India. Orders automatically generate AWB numbers and tracking information. Real-time tracking updates are sent via WhatsApp and email."
      },
      {
        question: "Can I track my orders in real-time?",
        answer: "Yes! Every order comes with real-time tracking. You'll receive WhatsApp notifications for order confirmation, dispatch, in-transit updates, and delivery confirmation. You can also track orders through your dashboard."
      },
      {
        question: "What payment methods are supported?",
        answer: "We support UPI, credit/debit cards, net banking, and cash on delivery (COD). All online payments are processed securely through Razorpay with bank-grade encryption."
      },
      {
        question: "How do returns and reverse logistics work?",
        answer: "Returns are handled through our automated reverse logistics system. Simply create a return request, and we'll arrange pickup. Quality inspection and refund processing are tracked through your dashboard."
      }
    ]
  },
  {
    title: "Account & Billing",
    icon: <Settings className="h-5 w-5" />,
    faqs: [
      {
        question: "How does the pricing work?",
        answer: "We offer flexible pricing based on your role and usage. Customers pay per order, while businesses have subscription plans. Check our pricing page for detailed information. Enterprise customers get custom pricing."
      },
      {
        question: "Can I change my subscription plan?",
        answer: "Yes, you can upgrade or downgrade your plan anytime from your account settings. Changes take effect immediately, and billing is prorated accordingly."
      },
      {
        question: "How do I manage my team members?",
        answer: "Business accounts can add team members with different permission levels. Go to Account Settings > Team Management to invite users and assign roles like Admin, Manager, or Operator."
      },
      {
        question: "Is my data secure?",
        answer: "Absolutely! We use bank-grade encryption, are ISO 27001 certified, and SOC 2 compliant. Your data is stored securely with regular backups and 99.9% uptime guarantee."
      }
    ]
  }
];

const quickLinks = [
  {
    title: "Video Tutorials",
    description: "Watch step-by-step guides",
    icon: <Play className="h-6 w-6" />,
    link: "#"
  },
  {
    title: "API Documentation",
    description: "Developer resources and guides",
    icon: <Book className="h-6 w-6" />,
    link: "/api-docs"
  },
  {
    title: "Download Resources",
    description: "Templates and user guides",
    icon: <Download className="h-6 w-6" />,
    link: "#"
  },
  {
    title: "Community Forum",
    description: "Connect with other users",
    icon: <Users className="h-6 w-6" />,
    link: "#"
  }
];

const contactOptions = [
  {
    title: "Live Chat",
    description: "Get instant help from our support team",
    icon: <MessageCircle className="h-6 w-6" />,
    action: "Start Chat",
    available: "24/7"
  },
  {
    title: "Email Support",
    description: "Send us a detailed message",
    icon: <Mail className="h-6 w-6" />,
    action: "Send Email",
    available: "Response within 2 hours"
  },
  {
    title: "Phone Support",
    description: "Speak directly with our experts",
    icon: <Phone className="h-6 w-6" />,
    action: "Call Now",
    available: "Mon-Fri 9AM-6PM IST"
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<number[]>([0]);

  const toggleCategory = (index: number) => {
    setOpenCategories(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const filteredFAQs = faqCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq => 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0);

  return (
    <>
      <Head>
        <title>Help Center - SpareFlow | Support & Documentation</title>
        <meta name="description" content="Get help with SpareFlow. Find answers to common questions, access tutorials, and contact our support team for AI-powered spare parts logistics." />
        <meta name="keywords" content="spareflow help, support, documentation, tutorials, FAQ, customer service" />
        <meta property="og:title" content="Help Center - SpareFlow" />
        <meta property="og:description" content="Get help with SpareFlow. Find answers, tutorials, and support for spare parts logistics." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <AuthHeader />
        
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl text-primary">
                  <HelpCircle className="h-12 w-12" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                How can we{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  help you?
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
                Find answers to your questions, explore our documentation, or get in touch with our support team.
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Search for help articles, tutorials, or FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-4 text-lg border-primary/20 focus:border-primary"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickLinks.map((link, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="text-center border-primary/10 hover:border-primary/30 transition-colors cursor-pointer">
                    <CardContent className="p-6">
                      <div className="text-primary mb-4 flex justify-center">
                        {link.icon}
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{link.title}</h3>
                      <p className="text-muted-foreground text-sm mb-4">{link.description}</p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={link.link}>
                          Explore
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">
                Find quick answers to the most common questions about SpareFlow
              </p>
            </motion.div>

            <div className="space-y-6">
              {(searchQuery ? filteredFAQs : faqCategories).map((category, categoryIndex) => (
                <motion.div
                  key={categoryIndex}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-primary/10">
                    <Collapsible 
                      open={openCategories.includes(categoryIndex)}
                      onOpenChange={() => toggleCategory(categoryIndex)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-primary">
                                {category.icon}
                              </div>
                              <CardTitle className="text-xl">{category.title}</CardTitle>
                              <Badge variant="secondary">{category.faqs.length}</Badge>
                            </div>
                            {openCategories.includes(categoryIndex) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-4">
                            {category.faqs.map((faq, faqIndex) => (
                              <div key={faqIndex} className="border-l-2 border-primary/20 pl-4">
                                <h4 className="font-semibold mb-2">{faq.question}</h4>
                                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                </motion.div>
              ))}
            </div>

            {searchQuery && filteredFAQs.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground mb-4">
                  We couldn't find any articles matching "{searchQuery}"
                </p>
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              </motion.div>
            )}
          </div>
        </section>

        {/* Contact Support */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
              <p className="text-muted-foreground">
                Our support team is here to help you succeed with SpareFlow
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {contactOptions.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="text-center border-primary/10 hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="text-primary mb-4 flex justify-center">
                        {option.icon}
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{option.title}</h3>
                      <p className="text-muted-foreground mb-4">{option.description}</p>
                      <div className="text-sm text-muted-foreground mb-4">
                        {option.available}
                      </div>
                      <Button className="w-full">
                        {option.action}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Resources */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6">Additional Resources</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-primary/10">
                  <CardContent className="p-6">
                    <Book className="h-8 w-8 text-primary mb-4 mx-auto" />
                    <h3 className="text-lg font-semibold mb-2">User Guide</h3>
                    <p className="text-muted-foreground mb-4">
                      Comprehensive documentation for all SpareFlow features
                    </p>
                    <Button variant="outline" asChild>
                      <Link href="/api-docs">View Documentation</Link>
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="border-primary/10">
                  <CardContent className="p-6">
                    <MessageCircle className="h-8 w-8 text-primary mb-4 mx-auto" />
                    <h3 className="text-lg font-semibold mb-2">Feature Requests</h3>
                    <p className="text-muted-foreground mb-4">
                      Suggest new features or improvements to our platform
                    </p>
                    <Button variant="outline" asChild>
                      <Link href="/contact">Submit Request</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}