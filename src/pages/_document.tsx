import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        
        {/* DNS Prefetch for external resources */}
        <link rel="dns-prefetch" href="//checkout.razorpay.com" />
        <link rel="dns-prefetch" href="//assets.co.dev" />
        
        {/* Global SEO Meta Tags */}
        <meta name="theme-color" content="#7c3aed" />
        <meta name="msapplication-TileColor" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SpareFlow" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Favicon and App Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Global Structured Data - Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "SpareFlow",
              "alternateName": "SpareFlow Logistics",
              "url": "https://spareflow.com",
              "logo": "https://spareflow.com/logo.svg",
              "description": "India's leading spare parts logistics platform for brands, distributors, and service centers",
              "foundingDate": "2020",
              "founders": [
                {
                  "@type": "Person",
                  "name": "Rajesh Kumar"
                }
              ],
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "WeWork Galaxy, 43, Residency Rd, Shanthala Nagar, Ashok Nagar",
                "addressLocality": "Bengaluru",
                "addressRegion": "Karnataka",
                "postalCode": "560025",
                "addressCountry": "IN"
              },
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
                },
                {
                  "@type": "ContactPoint",
                  "email": "sales@spareflow.com",
                  "contactType": "sales"
                }
              ],
              "sameAs": [
                "https://www.linkedin.com/company/spareflow",
                "https://twitter.com/spareflow",
                "https://www.facebook.com/spareflow",
                "https://www.youtube.com/c/spareflow"
              ],
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "SpareFlow Services",
                "itemListElement": [
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Service",
                      "name": "Reverse Logistics Management",
                      "description": "Complete reverse logistics solution for spare parts"
                    }
                  },
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Service",
                      "name": "Inventory Tracking",
                      "description": "Real-time spare parts inventory management"
                    }
                  },
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Service",
                      "name": "Courier Integration",
                      "description": "Seamless courier and shipping management"
                    }
                  }
                ]
              }
            })
          }}
        />
        
        {/* Global Structured Data - WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "SpareFlow",
              "url": "https://spareflow.com",
              "description": "Smart reverse logistics and spare parts management software",
              "publisher": {
                "@type": "Organization",
                "name": "SpareFlow"
              },
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://spareflow.com/search?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
        <Script 
          src="https://checkout.razorpay.com/v1/checkout.js" 
          strategy="afterInteractive"
        />
        <Script src="https://assets.co.dev/files/codevscript.js" strategy="afterInteractive" />
      </body>
    </Html>
  );
}