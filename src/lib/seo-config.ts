// SEO Configuration for SpareFlow
// Centralized SEO settings and metadata

export const seoConfig = {
  // Site Information
  siteName: 'SpareFlow',
  siteUrl: 'https://spareflow.com',
  defaultTitle: 'SpareFlow – Smart Reverse Logistics & Spare Parts Management Software',
  titleTemplate: '%s | SpareFlow',
  defaultDescription: 'Streamline your forward and reverse logistics with SpareFlow – a powerful platform for brands, service centers, and distributors to manage shipments, spare parts inventory, courier integration, and warranty returns across India.',
  
  // Default Keywords
  defaultKeywords: [
    'spare parts logistics',
    'reverse logistics software',
    'courier integration India',
    'spare parts tracking',
    'service center shipment tool',
    'after-sales management SaaS',
    'spare parts management software',
    'reverse logistics platform',
    'B2B courier management system',
    'service center inventory tracking',
    'warranty return management',
    'repair and return logistics',
    'field service parts tracking',
    'after-sales service software',
    'parts supply chain management'
  ],
  
  // Social Media
  social: {
    twitter: '@SpareFlow',
    linkedin: 'https://www.linkedin.com/company/spareflow',
    facebook: 'https://www.facebook.com/spareflow',
    youtube: 'https://www.youtube.com/c/spareflow'
  },
  
  // Images
  images: {
    logo: '/logo.svg',
    ogImage: '/og-image.jpg',
    twitterImage: '/twitter-image.jpg',
    favicon: '/favicon.svg',
    appleTouchIcon: '/apple-touch-icon.png'
  },
  
  // Company Information
  company: {
    name: 'SpareFlow',
    legalName: 'SpareFlow Technologies Private Limited',
    foundingDate: '2020',
    address: {
      streetAddress: 'WeWork Galaxy, 43, Residency Rd, Shanthala Nagar, Ashok Nagar',
      addressLocality: 'Bengaluru',
      addressRegion: 'Karnataka',
      postalCode: '560025',
      addressCountry: 'IN'
    },
    contact: {
      phone: '+91-80-4567-8900',
      email: 'hello@spareflow.com',
      salesEmail: 'sales@spareflow.com',
      supportEmail: 'support@spareflow.com'
    }
  },
  
  // Page-specific SEO configurations
  pages: {
    home: {
      title: 'SpareFlow – Smart Reverse Logistics & Spare Parts Management Software',
      description: 'Streamline your forward and reverse logistics with SpareFlow – a powerful platform for brands, service centers, and distributors to manage shipments, spare parts inventory, courier integration, and warranty returns across India.',
      keywords: [
        'spare parts logistics',
        'reverse logistics software',
        'courier integration India',
        'spare parts tracking',
        'service center shipment tool',
        'after-sales management SaaS'
      ]
    },
    features: {
      title: 'Features | SpareFlow – Reverse Courier, Inventory, Shipment & Service Center Tools',
      description: 'Explore SpareFlow\'s full suite: reverse courier management, auto AWB generation, spare inventory tracking, brand-to-service center logistics, and analytics dashboard.',
      keywords: [
        'shipment tracking system',
        'parts inventory software',
        'reverse shipment automation',
        'logistics SaaS India',
        'service center tools',
        'courier API integration'
      ]
    },
    pricing: {
      title: 'Pricing | SpareFlow Courier & Logistics Software for Brands & Service Centers',
      description: 'Choose a pricing plan that fits your logistics needs. Whether you\'re a brand, service center, or distributor – SpareFlow offers scalable pricing with complete courier, inventory, and shipping tools.',
      keywords: [
        'logistics software pricing India',
        'courier SaaS plans',
        'spare parts software cost',
        'service center shipping pricing',
        'reverse logistics pricing'
      ]
    },
    about: {
      title: 'About SpareFlow | Transforming Reverse Logistics in India',
      description: 'SpareFlow is a B2B logistics technology platform helping electronics brands, service centers, and distributors simplify spare parts movement, tracking, and courier workflows across India.',
      keywords: [
        'about SpareFlow',
        'reverse logistics platform',
        'spare parts movement software',
        'logistics technology India',
        'B2B logistics platform'
      ]
    },
    blog: {
      title: 'SpareFlow Blog | Reverse Logistics, Inventory, and Service Management Insights',
      description: 'Get expert tips, industry news, and tutorials on managing spares, reverse shipments, courier APIs, and service logistics with SpareFlow.',
      keywords: [
        'reverse logistics insights',
        'spare parts inventory tips',
        'courier management blog',
        'warranty shipment strategy',
        'B2B SaaS logistics'
      ]
    },
    contact: {
      title: 'Contact SpareFlow | Talk to Our Logistics Experts',
      description: 'Get in touch with SpareFlow to optimize your spare parts logistics, reverse courier flow, and inventory tracking. Schedule a free consultation with our support team.',
      keywords: [
        'contact logistics platform',
        'courier software support',
        'spare parts SaaS India',
        'schedule SpareFlow demo',
        'logistics software consultation'
      ]
    }
  },
  
  // Structured Data Templates
  structuredData: {
    organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SpareFlow',
      alternateName: 'SpareFlow Logistics',
      url: 'https://spareflow.com',
      logo: 'https://spareflow.com/logo.svg',
      description: 'India\'s leading spare parts logistics platform for brands, distributors, and service centers'
    },
    
    softwareApplication: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'SpareFlow',
      description: 'Smart reverse logistics and spare parts management software for brands, service centers, and distributors',
      url: 'https://spareflow.com',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web'
    }
  }
};

// Helper function to generate page-specific SEO metadata
export function generateSEOMetadata(pageKey: keyof typeof seoConfig.pages, customData?: {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
}) {
  const pageConfig = seoConfig.pages[pageKey];
  const title = customData?.title || pageConfig.title;
  const description = customData?.description || pageConfig.description;
  const keywords = customData?.keywords || pageConfig.keywords;
  const image = customData?.image || seoConfig.images.ogImage;
  const url = customData?.url || `${seoConfig.siteUrl}/${pageKey === 'home' ? '' : pageKey}`;

  return {
    title,
    description,
    keywords: keywords.join(', '),
    openGraph: {
      title,
      description,
      url,
      siteName: seoConfig.siteName,
      images: [
        {
          url: `${seoConfig.siteUrl}${image}`,
          width: 1200,
          height: 630,
          alt: title
        }
      ],
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${seoConfig.siteUrl}${image}`],
      site: seoConfig.social.twitter
    },
    canonical: url,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  };
}

// Helper function to generate structured data
export function generateStructuredData(type: 'organization' | 'softwareApplication' | 'service', customData?: any) {
  const baseData = seoConfig.structuredData[type];
  return {
    ...baseData,
    ...customData
  };
}

export default seoConfig;