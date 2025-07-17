import Head from 'next/head';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, Headphones, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const contactMethods = [
  {
    icon: <Mail className="h-8 w-8" />,
    title: "Email Us",
    description: "Get in touch via email",
    contact: "hello@spareflow.com",
    action: "mailto:hello@spareflow.com"
  },
  {
    icon: <Phone className="h-8 w-8" />,
    title: "Call Us",
    description: "Speak with our team",
    contact: "+91 80 4567 8900",
    action: "tel:+918045678900"
  },
  {
    icon: <MessageSquare className="h-8 w-8" />,
    title: "Live Chat",
    description: "Chat with support",
    contact: "Available 24/7",
    action: "#"
  },
  {
    icon: <MapPin className="h-8 w-8" />,
    title: "Visit Us",
    description: "Our headquarters",
    contact: "Bangalore, India",
    action: "#"
  }
];

const offices = [
  {
    city: "Bangalore",
    address: "WeWork Galaxy, 43, Residency Rd, Shanthala Nagar, Ashok Nagar, Bengaluru, Karnataka 560025",
    phone: "+91 80 4567 8900",
    email: "bangalore@spareflow.com",
    type: "Headquarters"
  },
  {
    city: "Mumbai",
    address: "Lower Parel, Mumbai, Maharashtra 400013",
    phone: "+91 22 4567 8900",
    email: "mumbai@spareflow.com",
    type: "Sales Office"
  },
  {
    city: "Delhi",
    address: "Connaught Place, New Delhi, Delhi 110001",
    phone: "+91 11 4567 8900",
    email: "delhi@spareflow.com",
    type: "Regional Office"
  }
];

const departments = [
  { value: "sales", label: "Sales & Partnerships" },
  { value: "support", label: "Technical Support" },
  { value: "careers", label: "Careers & HR" },
  { value: "press", label: "Press & Media" },
  { value: "general", label: "General Inquiry" }
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    department: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you within 24 hours.",
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        department: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Contact SpareFlow | Talk to Our Logistics Experts</title>
        <meta name="description" content="Get in touch with SpareFlow to optimize your spare parts logistics, reverse courier flow, and inventory tracking. Schedule a free consultation with our support team." />
        <meta name="keywords" content="contact logistics platform, courier software support, spare parts SaaS India, schedule SpareFlow demo, logistics software consultation, reverse logistics support, spare parts management help, courier integration support, service center logistics contact" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://spareflow.com/contact" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://spareflow.com/contact" />
        <meta property="og:title" content="Contact SpareFlow | Talk to Our Logistics Experts" />
        <meta property="og:description" content="Get in touch with SpareFlow to optimize your spare parts logistics, reverse courier flow, and inventory tracking. Schedule a free consultation with our support team." />
        <meta property="og:image" content="https://spareflow.com/contact-og-image.jpg" />
        <meta property="og:site_name" content="SpareFlow" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://spareflow.com/contact" />
        <meta property="twitter:title" content="Contact SpareFlow | Talk to Our Logistics Experts" />
        <meta property="twitter:description" content="Get in touch with SpareFlow to optimize your spare parts logistics, reverse courier flow, and inventory tracking. Schedule a free consultation with our support team." />
        <meta property="twitter:image" content="https://spareflow.com/contact-twitter-image.jpg" />
        <meta property="twitter:site" content="@SpareFlow" />

        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="author" content="SpareFlow" />
        
        {/* Structured Data - ContactPage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ContactPage",
              "name": "Contact SpareFlow",
              "description": "Get in touch with SpareFlow logistics experts for consultation and support",
              "url": "https://spareflow.com/contact",
              "mainEntity": {
                "@type": "Organization",
                "name": "SpareFlow",
                "contactPoint": [
                  {
                    "@type": "ContactPoint",
                    "telephone": "+91-80-4567-8900",
                    "contactType": "customer service",
                    "areaServed": "IN",
                    "availableLanguage": ["English", "Hindi"]
                  },
                  {
                    "@type": "ContactPoint",
                    "email": "hello@spareflow.com",
                    "contactType": "customer service"
                  }
                ]
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
                Get in{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Touch
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                Ready to transform your spare parts logistics? Our team is here to help you get started 
                or answer any questions you might have.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
              {contactMethods.map((method, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full text-center border-primary/10 hover:border-primary/30 transition-colors cursor-pointer"
                        onClick={() => method.action !== '#' && window.open(method.action, '_blank')}>
                    <CardContent className="p-6">
                      <div className="text-primary mb-4 flex justify-center">
                        {method.icon}
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{method.title}</h3>
                      <p className="text-muted-foreground mb-3">{method.description}</p>
                      <p className="text-primary font-medium">{method.contact}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Contact Form and Info */}
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-2xl">Send us a Message</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Name *</label>
                          <Input
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="Your full name"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Email *</label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="your@email.com"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Company</label>
                          <Input
                            value={formData.company}
                            onChange={(e) => handleInputChange('company', e.target.value)}
                            placeholder="Your company name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Phone</label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            placeholder="+91 98765 43210"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Department *</label>
                        <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map((dept) => (
                              <SelectItem key={dept.value} value={dept.value}>
                                {dept.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Subject *</label>
                        <Input
                          value={formData.subject}
                          onChange={(e) => handleInputChange('subject', e.target.value)}
                          placeholder="Brief subject of your inquiry"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Message *</label>
                        <Textarea
                          value={formData.message}
                          onChange={(e) => handleInputChange('message', e.target.value)}
                          placeholder="Tell us more about your inquiry..."
                          rows={5}
                          required
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          "Sending..."
                        ) : (
                          <>
                            Send Message
                            <Send className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Office Information */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-3xl font-bold mb-6">Our Offices</h2>
                  <p className="text-muted-foreground mb-8">
                    Visit us at one of our locations or reach out to the office nearest to you.
                  </p>
                </div>

                {offices.map((office, index) => (
                  <Card key={index} className="border-primary/10">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Building className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold">{office.city}</h3>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              {office.type}
                            </span>
                          </div>
                          <p className="text-muted-foreground mb-3">{office.address}</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-primary" />
                              <a href={`tel:${office.phone}`} className="hover:text-primary transition-colors">
                                {office.phone}
                              </a>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-primary" />
                              <a href={`mailto:${office.email}`} className="hover:text-primary transition-colors">
                                {office.email}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Business Hours */}
                <Card className="border-primary/10">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Clock className="h-6 w-6 text-primary mt-1" />
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Business Hours</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Monday - Friday: 9:00 AM - 6:00 PM IST</p>
                          <p>Saturday: 10:00 AM - 2:00 PM IST</p>
                          <p>Sunday: Closed</p>
                          <p className="text-primary font-medium mt-2">
                            <Headphones className="h-4 w-4 inline mr-1" />
                            24/7 Support Available
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>
        
        <Footer />
      </div>
    </>
  );
}