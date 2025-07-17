import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Clock, Users, Briefcase, Heart, Zap, Globe, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const jobOpenings = [
  {
    title: "Senior Full Stack Developer",
    department: "Engineering",
    location: "Bangalore, India",
    type: "Full-time",
    experience: "4-6 years",
    description: "Join our engineering team to build scalable AI-powered logistics solutions using React, Node.js, and Python.",
    requirements: ["React/Next.js", "Node.js", "Python", "PostgreSQL", "AWS/GCP"]
  },
  {
    title: "AI/ML Engineer",
    department: "AI Research",
    location: "Hyderabad, India",
    type: "Full-time",
    experience: "3-5 years",
    description: "Develop and deploy machine learning models for demand forecasting and supply chain optimization.",
    requirements: ["Python", "TensorFlow/PyTorch", "MLOps", "Statistics", "Supply Chain Knowledge"]
  },
  {
    title: "Product Manager",
    department: "Product",
    location: "Mumbai, India",
    type: "Full-time",
    experience: "5-7 years",
    description: "Lead product strategy and roadmap for our AI-powered spare parts logistics platform.",
    requirements: ["Product Strategy", "B2B SaaS", "Supply Chain", "Analytics", "Leadership"]
  },
  {
    title: "DevOps Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    experience: "3-5 years",
    description: "Build and maintain our cloud infrastructure, CI/CD pipelines, and monitoring systems.",
    requirements: ["AWS/GCP", "Kubernetes", "Docker", "Terraform", "Monitoring Tools"]
  },
  {
    title: "Sales Executive",
    department: "Sales",
    location: "Delhi, India",
    type: "Full-time",
    experience: "2-4 years",
    description: "Drive new business acquisition and manage relationships with enterprise clients.",
    requirements: ["B2B Sales", "SaaS Experience", "Communication", "CRM Tools", "Supply Chain Knowledge"]
  },
  {
    title: "UX/UI Designer",
    department: "Design",
    location: "Pune, India",
    type: "Full-time",
    experience: "3-5 years",
    description: "Design intuitive user experiences for our complex logistics management platform.",
    requirements: ["Figma", "User Research", "Prototyping", "B2B UX", "Design Systems"]
  }
];

const benefits = [
  {
    icon: <Heart className="h-8 w-8" />,
    title: "Health & Wellness",
    description: "Comprehensive health insurance, mental health support, and wellness programs"
  },
  {
    icon: <Zap className="h-8 w-8" />,
    title: "Learning & Growth",
    description: "Annual learning budget, conference attendance, and skill development programs"
  },
  {
    icon: <Globe className="h-8 w-8" />,
    title: "Flexible Work",
    description: "Remote-first culture with flexible hours and work-life balance"
  },
  {
    icon: <Award className="h-8 w-8" />,
    title: "Equity & Rewards",
    description: "Competitive salary, equity participation, and performance bonuses"
  }
];

const values = [
  {
    title: "Innovation First",
    description: "We encourage experimentation and creative problem-solving"
  },
  {
    title: "Customer Obsession",
    description: "Every decision is made with our customers' success in mind"
  },
  {
    title: "Transparency",
    description: "Open communication and honest feedback at all levels"
  },
  {
    title: "Continuous Learning",
    description: "We invest in our team's growth and development"
  }
];

export default function CareersPage() {
  return (
    <>
      <Head>
        <title>Careers - Join SpareFlow | AI-Powered Spare Parts Logistics</title>
        <meta name="description" content="Join SpareFlow's mission to revolutionize spare parts logistics. Explore career opportunities in engineering, AI, product, and more." />
        <meta name="keywords" content="spareflow careers, jobs, engineering jobs, AI jobs, logistics careers, startup jobs" />
        <meta property="og:title" content="Careers - Join SpareFlow" />
        <meta property="og:description" content="Join SpareFlow's mission to revolutionize spare parts logistics. Explore career opportunities in engineering, AI, product, and more." />
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
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                Build the Future of{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Logistics
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8">
                Join our mission to revolutionize spare parts logistics through AI and automation. 
                Work with cutting-edge technology while making a real impact on businesses worldwide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  View Open Positions
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline">
                  Learn About Our Culture
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Why SpareFlow */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Why SpareFlow?</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Be part of a team that's transforming how businesses manage their supply chains
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
                      <h3 className="text-xl font-semibold mb-3 text-primary">{value.title}</h3>
                      <p className="text-muted-foreground">{value.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Benefits & Perks</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                We believe in taking care of our team so they can do their best work
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => (
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
                        {benefit.icon}
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                      <p className="text-muted-foreground">{benefit.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Open Positions</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Find your next opportunity to make an impact
              </p>
            </motion.div>

            <div className="space-y-6">
              {jobOpenings.map((job, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-primary/10 hover:border-primary/30 transition-colors">
                    <CardHeader>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <CardTitle className="text-2xl mb-2">{job.title}</CardTitle>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-4 w-4" />
                              {job.department}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {job.type}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {job.experience}
                            </div>
                          </div>
                        </div>
                        <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                          Apply Now
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{job.description}</p>
                      <div>
                        <h4 className="font-semibold mb-2">Key Requirements:</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.requirements.map((req, reqIndex) => (
                            <Badge key={reqIndex} variant="secondary">
                              {req}
                            </Badge>
                          ))}
                        </div>
                      </div>
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
                Don't See the Right Role?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                We're always looking for talented individuals who share our passion for innovation. 
                Send us your resume and let's start a conversation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  Send Your Resume
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/contact">Contact HR Team</Link>
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