import Head from 'next/head';
import { motion } from 'framer-motion';
import { FileText, Scale, AlertTriangle, Shield, Users, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const sections = [
  {
    title: "Acceptance of Terms",
    icon: <Scale className="h-6 w-6" />,
    content: "By accessing and using SpareFlow's services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service."
  },
  {
    title: "Description of Service",
    icon: <FileText className="h-6 w-6" />,
    content: "SpareFlow provides an AI-powered spare parts logistics platform that enables businesses to manage their supply chain operations, including inventory management, demand forecasting, shipment tracking, and customer service automation."
  },
  {
    title: "User Accounts",
    icon: <Users className="h-6 w-6" />,
    content: "To access certain features of our service, you must register for an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account."
  },
  {
    title: "Payment Terms",
    icon: <CreditCard className="h-6 w-6" />,
    content: "Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law. We reserve the right to change our pricing with 30 days' notice."
  },
  {
    title: "Acceptable Use",
    icon: <Shield className="h-6 w-6" />,
    content: "You agree not to use the service for any unlawful purpose or in any way that could damage, disable, overburden, or impair our servers or networks. You may not attempt to gain unauthorized access to any part of the service."
  },
  {
    title: "Intellectual Property",
    icon: <FileText className="h-6 w-6" />,
    content: "The service and its original content, features, and functionality are and will remain the exclusive property of SpareFlow and its licensors. The service is protected by copyright, trademark, and other laws."
  }
];

const prohibitedUses = [
  "Use the service for any illegal purpose or to solicit others to perform illegal acts",
  "Violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances",
  "Infringe upon or violate our intellectual property rights or the intellectual property rights of others",
  "Harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate",
  "Submit false or misleading information",
  "Upload viruses or any other type of malicious code",
  "Spam, phish, pharm, pretext, spider, crawl, or scrape",
  "Use the service for any obscene or immoral purpose",
  "Interfere with or circumvent the security features of the service"
];

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service - SpareFlow | Legal Terms & Conditions</title>
        <meta name="description" content="SpareFlow's Terms of Service. Read our legal terms and conditions for using the SpareFlow AI-powered spare parts logistics platform." />
        <meta name="keywords" content="terms of service, legal terms, conditions, spareflow terms, user agreement" />
        <meta property="og:title" content="Terms of Service - SpareFlow" />
        <meta property="og:description" content="Read SpareFlow's Terms of Service and legal conditions for using our platform." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Header />
        
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
                  <Scale className="h-12 w-12" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Terms of{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Service
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-6">
                Please read these terms and conditions carefully before using our service.
              </p>
              <p className="text-sm text-muted-foreground">
                Last updated: January 1, 2024
              </p>
            </motion.div>
          </div>
        </section>

        {/* Introduction */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-8">
                  <p className="text-lg leading-relaxed">
                    These Terms of Service ("Terms") govern your use of the SpareFlow platform and services 
                    operated by SpareFlow Technologies Private Limited ("us", "we", or "our"). 
                    By using our service, you agree to these terms.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Main Sections */}
        {sections.map((section, index) => (
          <section key={index} className={`py-12 px-4 ${index % 2 === 1 ? 'bg-muted/30' : ''}`}>
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <Card className="border-primary/10">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {section.icon}
                      </div>
                      <CardTitle className="text-2xl">{section.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>
        ))}

        {/* Prohibited Uses */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Card className="border-red-200 bg-gradient-to-br from-red-50 to-transparent">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                    <CardTitle className="text-2xl">Prohibited Uses</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    You may not use our service for any of the following purposes:
                  </p>
                  <ul className="space-y-3">
                    {prohibitedUses.map((use, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-muted-foreground">{use}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Additional Terms */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-xl">Limitation of Liability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      In no event shall SpareFlow be liable for any indirect, incidental, special, 
                      consequential, or punitive damages, including without limitation, loss of profits, 
                      data, use, goodwill, or other intangible losses.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-xl">Termination</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      We may terminate or suspend your account immediately, without prior notice or liability, 
                      for any reason whatsoever, including without limitation if you breach the Terms.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-xl">Governing Law</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      These Terms shall be interpreted and governed by the laws of India, 
                      and you submit to the jurisdiction of the courts in Bangalore, Karnataka.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-xl">Changes to Terms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      We reserve the right to modify or replace these Terms at any time. 
                      If a revision is material, we will try to provide at least 30 days notice.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Card className="border-primary/20 text-center">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-4">Questions About These Terms?</h2>
                  <p className="text-muted-foreground mb-6">
                    If you have any questions about these Terms of Service, please contact us:
                  </p>
                  <div className="space-y-2 text-sm">
                    <p><strong>Email:</strong> legal@spareflow.com</p>
                    <p><strong>Address:</strong> SpareFlow Technologies Pvt Ltd, WeWork Galaxy, 43 Residency Road, Bangalore 560025, India</p>
                    <p><strong>Phone:</strong> +91 80 4567 8900</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
        
        <Footer />
      </div>
    </>
  );
}