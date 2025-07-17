import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Clock, User, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AuthHeader from '@/components/AuthHeader';
import Footer from '@/components/Footer';

const blogPosts = [
  {
    id: 1,
    title: "The Future of AI in Spare Parts Logistics",
    excerpt: "Discover how artificial intelligence is revolutionizing spare parts management and supply chain optimization.",
    content: "AI is transforming the spare parts industry by enabling predictive maintenance, intelligent inventory management, and automated demand forecasting...",
    author: "Sarah Chen",
    date: "2024-01-15",
    readTime: "5 min read",
    category: "AI & Technology",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop",
    tags: ["AI", "Machine Learning", "Supply Chain"]
  },
  {
    id: 2,
    title: "Reducing Inventory Costs with Smart Analytics",
    excerpt: "Learn how data-driven insights can help businesses reduce inventory costs by up to 30% while improving availability.",
    content: "Smart analytics platforms are enabling businesses to optimize their inventory levels through advanced demand forecasting and real-time monitoring...",
    author: "Michael Rodriguez",
    date: "2024-01-10",
    readTime: "7 min read",
    category: "Analytics",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop",
    tags: ["Analytics", "Cost Reduction", "Inventory"]
  },
  {
    id: 3,
    title: "The Right to Repair Movement and Its Impact",
    excerpt: "Understanding how the Right to Repair legislation is changing the spare parts landscape and creating new opportunities.",
    content: "The Right to Repair movement is gaining momentum worldwide, creating new requirements for spare parts availability and documentation...",
    author: "Emma Thompson",
    date: "2024-01-05",
    readTime: "6 min read",
    category: "Industry Trends",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=400&fit=crop",
    tags: ["Right to Repair", "Legislation", "Industry"]
  },
  {
    id: 4,
    title: "Building Resilient Supply Chains in 2024",
    excerpt: "Strategies for creating robust supply chains that can withstand disruptions and maintain operational continuity.",
    content: "In an increasingly volatile world, building resilient supply chains has become critical for business continuity...",
    author: "David Kim",
    date: "2023-12-28",
    readTime: "8 min read",
    category: "Supply Chain",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=400&fit=crop",
    tags: ["Supply Chain", "Resilience", "Strategy"]
  },
  {
    id: 5,
    title: "Sustainability in Spare Parts Management",
    excerpt: "How companies are adopting sustainable practices in spare parts logistics to reduce environmental impact.",
    content: "Sustainability is becoming a key consideration in spare parts management, with companies adopting circular economy principles...",
    author: "Lisa Wang",
    date: "2023-12-20",
    readTime: "5 min read",
    category: "Sustainability",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&h=400&fit=crop",
    tags: ["Sustainability", "Environment", "Circular Economy"]
  },
  {
    id: 6,
    title: "Digital Transformation in Manufacturing",
    excerpt: "Exploring how digital technologies are transforming manufacturing operations and spare parts management.",
    content: "Digital transformation is reshaping manufacturing, with IoT, AI, and cloud technologies enabling new levels of efficiency...",
    author: "James Wilson",
    date: "2023-12-15",
    readTime: "6 min read",
    category: "Digital Transformation",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=400&fit=crop",
    tags: ["Digital Transformation", "Manufacturing", "IoT"]
  }
];

const categories = [
  "All Posts",
  "AI & Technology", 
  "Analytics",
  "Industry Trends",
  "Supply Chain",
  "Sustainability",
  "Digital Transformation"
];

export default function BlogPage() {
  return (
    <>
      <Head>
        <title>SpareFlow Blog | Reverse Logistics, Inventory, and Service Management Insights</title>
        <meta name="description" content="Get expert tips, industry news, and tutorials on managing spares, reverse shipments, courier APIs, and service logistics with SpareFlow." />
        <meta name="keywords" content="reverse logistics insights, spare parts inventory tips, courier management blog, warranty shipment strategy, B2B SaaS logistics, spare parts blog, logistics insights, AI technology, supply chain trends, inventory management, reverse logistics blog, service center management, courier integration tips" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://spareflow.com/blog" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://spareflow.com/blog" />
        <meta property="og:title" content="SpareFlow Blog | Reverse Logistics, Inventory, and Service Management Insights" />
        <meta property="og:description" content="Get expert tips, industry news, and tutorials on managing spares, reverse shipments, courier APIs, and service logistics with SpareFlow." />
        <meta property="og:image" content="https://spareflow.com/blog-og-image.jpg" />
        <meta property="og:site_name" content="SpareFlow" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://spareflow.com/blog" />
        <meta property="twitter:title" content="SpareFlow Blog | Reverse Logistics, Inventory, and Service Management Insights" />
        <meta property="twitter:description" content="Get expert tips, industry news, and tutorials on managing spares, reverse shipments, courier APIs, and service logistics with SpareFlow." />
        <meta property="twitter:image" content="https://spareflow.com/blog-twitter-image.jpg" />
        <meta property="twitter:site" content="@SpareFlow" />

        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="author" content="SpareFlow" />
        
        {/* Structured Data - Blog */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Blog",
              "name": "SpareFlow Blog",
              "description": "Expert insights on reverse logistics, spare parts management, and service center operations",
              "url": "https://spareflow.com/blog",
              "publisher": {
                "@type": "Organization",
                "name": "SpareFlow",
                "logo": {
                  "@type": "ImageObject",
                  "url": "https://spareflow.com/logo.svg"
                }
              },
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": "https://spareflow.com/blog"
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
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                SpareFlow{' '}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Blog
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Insights, trends, and expert perspectives on AI-powered spare parts logistics, 
                supply chain optimization, and the future of industrial operations.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Categories */}
        <section className="pb-12 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap justify-center gap-3"
            >
              {categories.map((category, index) => (
                <Badge 
                  key={category}
                  variant={index === 0 ? "default" : "secondary"}
                  className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {category}
                </Badge>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Featured Post */}
        <section className="pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="md:flex">
                  <div className="md:w-1/2">
                    <img 
                      src={blogPosts[0].image} 
                      alt={blogPosts[0].title}
                      className="w-full h-64 md:h-full object-cover"
                    />
                  </div>
                  <div className="md:w-1/2 p-8">
                    <Badge className="mb-4">{blogPosts[0].category}</Badge>
                    <h2 className="text-3xl font-bold mb-4">{blogPosts[0].title}</h2>
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {blogPosts[0].excerpt}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {blogPosts[0].author}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(blogPosts[0].date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {blogPosts[0].readTime}
                      </div>
                    </div>

                    <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                      Read Full Article
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Latest Articles</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Stay informed with our latest insights and expert analysis
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.slice(1).map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full hover:shadow-lg transition-all duration-300 border-primary/10">
                    <div className="aspect-video overflow-hidden">
                      <img 
                        src={post.image} 
                        alt={post.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary">{post.category}</Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {post.readTime}
                        </div>
                      </div>
                      <CardTitle className="text-xl hover:text-primary transition-colors cursor-pointer">
                        {post.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4 leading-relaxed">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          {post.author}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(post.date).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <Button variant="outline" className="w-full mt-4">
                        Read More
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Subscribe to our newsletter and get the latest insights on spare parts logistics 
                and supply chain optimization delivered to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="px-4 py-2 border border-input rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                  Subscribe
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