import Head from 'next/head';
import { motion } from 'framer-motion';
import { Shield, Eye, Lock, Users, FileText, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const sections = [
  {
    title: "Information We Collect",
    icon: <FileText className="h-6 w-6" />,
    content: [
      {
        subtitle: "Personal Information",
        text: "We collect information you provide directly to us, such as when you create an account, use our services, or contact us. This may include your name, email address, phone number, company information, and billing details."
      },
      {
        subtitle: "Usage Information",
        text: "We automatically collect information about how you use our services, including your IP address, browser type, operating system, referring URLs, access times, and pages viewed."
      },
      {
        subtitle: "Device Information",
        text: "We may collect information about the devices you use to access our services, including hardware model, operating system version, unique device identifiers, and mobile network information."
      }
    ]
  },
  {
    title: "How We Use Your Information",
    icon: <Users className="h-6 w-6" />,
    content: [
      {
        subtitle: "Service Provision",
        text: "We use your information to provide, maintain, and improve our services, process transactions, and provide customer support."
      },
      {
        subtitle: "Communication",
        text: "We may use your information to send you technical notices, updates, security alerts, and administrative messages."
      },
      {
        subtitle: "Analytics and Improvement",
        text: "We use information to understand how our services are used and to improve our platform's functionality and user experience."
      }
    ]
  },
  {
    title: "Information Sharing",
    icon: <Eye className="h-6 w-6" />,
    content: [
      {
        subtitle: "Service Providers",
        text: "We may share your information with third-party service providers who perform services on our behalf, such as payment processing, data analysis, and customer service."
      },
      {
        subtitle: "Legal Requirements",
        text: "We may disclose your information if required to do so by law or in response to valid requests by public authorities."
      },
      {
        subtitle: "Business Transfers",
        text: "In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction."
      }
    ]
  },
  {
    title: "Data Security",
    icon: <Lock className="h-6 w-6" />,
    content: [
      {
        subtitle: "Security Measures",
        text: "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction."
      },
      {
        subtitle: "Encryption",
        text: "All data transmission is encrypted using industry-standard SSL/TLS protocols. Data at rest is encrypted using AES-256 encryption."
      },
      {
        subtitle: "Access Controls",
        text: "We maintain strict access controls and regularly audit our systems to ensure the security of your information."
      }
    ]
  }
];

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy - SpareFlow | Data Protection & Privacy</title>
        <meta name="description" content="SpareFlow's Privacy Policy. Learn how we collect, use, and protect your personal information in compliance with GDPR and other privacy regulations." />
        <meta name="keywords" content="privacy policy, data protection, GDPR, personal information, spareflow privacy" />
        <meta property="og:title" content="Privacy Policy - SpareFlow" />
        <meta property="og:description" content="Learn how SpareFlow protects your privacy and personal information." />
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
                  <Shield className="h-12 w-12" />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Privacy{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Policy
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-6">
                Your privacy is important to us. This policy explains how we collect, use, and protect your information.
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
                    SpareFlow Technologies Private Limited ("we," "our," or "us") is committed to protecting your privacy. 
                    This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use 
                    our SpareFlow platform and related services (collectively, the "Services").
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Main Sections */}
        {sections.map((section, sectionIndex) => (
          <section key={sectionIndex} className={`py-16 px-4 ${sectionIndex % 2 === 1 ? 'bg-muted/30' : ''}`}>
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="mb-12"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {section.icon}
                  </div>
                  <h2 className="text-3xl font-bold">{section.title}</h2>
                </div>
              </motion.div>

              <div className="space-y-8">
                {section.content.map((item, itemIndex) => (
                  <motion.div
                    key={itemIndex}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: itemIndex * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className="border-primary/10">
                      <CardHeader>
                        <CardTitle className="text-xl">{item.subtitle}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground leading-relaxed">{item.text}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* Your Rights */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-8">Your Rights and Choices</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Access and Portability",
                    description: "You have the right to access your personal information and request a copy of your data in a portable format."
                  },
                  {
                    title: "Correction",
                    description: "You can request that we correct any inaccurate or incomplete personal information we hold about you."
                  },
                  {
                    title: "Deletion",
                    description: "You can request that we delete your personal information, subject to certain legal obligations."
                  },
                  {
                    title: "Opt-out",
                    description: "You can opt out of receiving marketing communications from us at any time."
                  }
                ].map((right, index) => (
                  <Card key={index} className="border-primary/10">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-2">{right.title}</h3>
                      <p className="text-muted-foreground">{right.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Contact Information */}
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
                    <Mail className="h-6 w-6 text-primary" />
                    <CardTitle className="text-2xl">Contact Us</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    If you have any questions about this Privacy Policy or our privacy practices, please contact us:
                  </p>
                  <div className="space-y-2">
                    <p><strong>Email:</strong> privacy@spareflow.com</p>
                    <p><strong>Address:</strong> SpareFlow Technologies Pvt Ltd, WeWork Galaxy, 43 Residency Road, Bangalore 560025, India</p>
                    <p><strong>Phone:</strong> +91 80 4567 8900</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Updates */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Card className="border-primary/10">
                <CardContent className="p-8 text-center">
                  <h2 className="text-2xl font-bold mb-4">Policy Updates</h2>
                  <p className="text-muted-foreground">
                    We may update this Privacy Policy from time to time. We will notify you of any material changes 
                    by posting the new Privacy Policy on this page and updating the "Last updated" date. 
                    We encourage you to review this Privacy Policy periodically.
                  </p>
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