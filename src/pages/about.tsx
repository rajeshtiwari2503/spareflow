import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Target, Award, Globe, Heart, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const teamMembers = [
  {
    name: "Rajesh Kumar",
    role: "CEO & Founder",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face",
    bio: "15+ years in supply chain and logistics technology"
  },
  {
    name: "Priya Sharma",
    role: "CTO",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop&crop=face",
    bio: "Former tech lead at major e-commerce platforms"
  },
  {
    name: "Amit Patel",
    role: "Head of AI",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
    bio: "PhD in Machine Learning, 10+ years in AI research"
  },
  {
    name: "Sneha Reddy",
    role: "VP Operations",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face",
    bio: "Expert in logistics operations and process optimization"
  }
];

const values = [
  {
    icon: <Target className="h-8 w-8" />,
    title: "Innovation First",
    description: "We constantly push the boundaries of what's possible in spare parts logistics through cutting-edge AI and automation."
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "Customer Success",
    description: "Our customers' success is our success. We're committed to delivering exceptional value and support."
  },
  {
    icon: <Heart className="h-8 w-8" />,
    title: "Reliability",
    description: "Trust is the foundation of our business. We deliver on our promises with consistency and transparency."
  },
  {
    icon: <Globe className="h-8 w-8" />,
    title: "Sustainability",
    description: "We're building a more sustainable future by optimizing supply chains and reducing waste."
  }
];

const milestones = [
  { year: "2020", event: "SpareFlow founded with a vision to revolutionize spare parts logistics" },
  { year: "2021", event: "First AI-powered demand forecasting system launched" },
  { year: "2022", event: "Reached 100+ enterprise customers across India" },
  { year: "2023", event: "Processed over 1 million spare parts orders" },
  { year: "2024", event: "Expanded to Southeast Asia markets" }
];

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About SpareFlow | Transforming Reverse Logistics in India</title>
        <meta name="description" content="SpareFlow is a B2B logistics technology platform helping electronics brands, service centers, and distributors simplify spare parts movement, tracking, and courier workflows across India." />
        <meta name="keywords" content="about SpareFlow, reverse logistics platform, spare parts movement software, logistics technology India, B2B logistics platform, spare parts logistics company, reverse logistics India, courier management platform, service center logistics, brand logistics solutions" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://spareflow.com/about" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://spareflow.com/about" />
        <meta property="og:title" content="About SpareFlow | Transforming Reverse Logistics in India" />
        <meta property="og:description" content="SpareFlow is a B2B logistics technology platform helping electronics brands, service centers, and distributors simplify spare parts movement, tracking, and courier workflows across India." />
        <meta property="og:image" content="https://spareflow.com/about-og-image.jpg" />
        <meta property="og:site_name" content="SpareFlow" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://spareflow.com/about" />
        <meta property="twitter:title" content="About SpareFlow | Transforming Reverse Logistics in India" />
        <meta property="twitter:description" content="SpareFlow is a B2B logistics technology platform helping electronics brands, service centers, and distributors simplify spare parts movement, tracking, and courier workflows across India." />
        <meta property="twitter:image" content="https://spareflow.com/about-twitter-image.jpg" />
        <meta property="twitter:site" content="@SpareFlow" />

        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="author" content="SpareFlow" />
        
        {/* Structured Data - AboutPage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "AboutPage",
              "name": "About SpareFlow",
              "description": "Learn about SpareFlow's mission to transform reverse logistics in India",
              "url": "https://spareflow.com/about",
              "mainEntity": {
                "@type": "Organization",
                "name": "SpareFlow",
                "foundingDate": "2020",
                "foundingLocation": {
                  "@type": "Place",
                  "name": "Bangalore, India"
                },
                "mission": "To transform spare parts logistics by leveraging artificial intelligence and automation, enabling businesses to reduce costs, improve efficiency, and deliver exceptional customer experiences.",
                "numberOfEmployees": "50-100"
              }
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
                About{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  SpareFlow
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                We're on a mission to revolutionize spare parts logistics through AI-powered automation, 
                making supply chains smarter, faster, and more efficient for businesses worldwide.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardContent className="p-8">
                    <Target className="h-12 w-12 text-primary mb-6" />
                    <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      To transform spare parts logistics by leveraging artificial intelligence and automation, 
                      enabling businesses to reduce costs, improve efficiency, and deliver exceptional customer experiences.
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
                <Card className="h-full border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent">
                  <CardContent className="p-8">
                    <Zap className="h-12 w-12 text-secondary mb-6" />
                    <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      To become the global leader in AI-powered supply chain solutions, creating a world where 
                      spare parts are always available when and where they're needed most.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Our Values</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                The principles that guide everything we do
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full text-center border-primary/10 hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="text-primary mb-4 flex justify-center">
                        {value.icon}
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                      <p className="text-muted-foreground">{value.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Meet Our Team</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                The brilliant minds behind SpareFlow's innovation
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="text-center border-primary/10 hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
                        <img 
                          src={member.image} 
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                      <p className="text-primary font-medium mb-3">{member.role}</p>
                      <p className="text-sm text-muted-foreground">{member.bio}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Our Journey</h2>
              <p className="text-xl text-muted-foreground">
                Key milestones in our mission to transform spare parts logistics
              </p>
            </motion.div>

            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-6"
                >
                  <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {milestone.year}
                  </div>
                  <Card className="flex-1 border-primary/10">
                    <CardContent className="p-6">
                      <p className="text-lg">{milestone.event}</p>
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
                Ready to Transform Your Supply Chain?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of businesses already using SpareFlow to optimize their spare parts logistics.
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