// import { NextApiRequest, NextApiResponse } from 'next';
// import { verifyAuth } from '@/lib/auth';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   try {
//     const user = await verifyAuth(req);
//     if (!user || user.role !== 'BRAND') {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     if (req.method === 'GET') {
//       const { brandId } = req.query;

//       // Mock settings data - replace with actual database query
//       const settings = {
//         company: {
//           name: 'Sample Brand',
//           logo: '',
//           description: 'Leading automotive parts manufacturer',
//           website: 'https://samplebrand.com',
//           industry: 'automotive',
//           size: '51-200',
//           founded: '2010'
//         },
//         contact: {
//           email: 'contact@samplebrand.com',
//           phone: '+91 9876543210',
//           address: {
//             street: '123 Industrial Area',
//             city: 'Mumbai',
//             state: 'Maharashtra',
//             pincode: '400001',
//             country: 'India'
//           }
//         },
//         branding: {
//           primaryColor: '#3b82f6',
//           secondaryColor: '#f97316',
//           logoUrl: '',
//           favicon: '',
//           customCss: ''
//         },
//         api: {
//           webhookUrl: '',
//           apiKeys: [],
//           rateLimits: {
//             requestsPerMinute: 60,
//             requestsPerHour: 1000,
//             requestsPerDay: 10000
//           }
//         },
//         integrations: {
//           dtdc: {
//             enabled: true,
//             customerId: process.env.DTDC_CUSTOMER_ID || '',
//             customerCode: process.env.DTDC_CUSTOMER_CODE || '',
//             apiKey: process.env.DTDC_API_KEY || '',
//             serviceType: 'B2C PRIORITY'
//           },
//           whatsapp: {
//             enabled: true,
//             accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
//             phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || ''
//           },
//           email: {
//             enabled: true,
//             provider: 'smtp',
//             smtpHost: process.env.EMAIL_HOST || '',
//             smtpPort: parseInt(process.env.EMAIL_PORT || '587'),
//             username: process.env.EMAIL_USER || '',
//             password: process.env.EMAIL_PASS || '',
//             fromEmail: process.env.EMAIL_FROM || ''
//           },
//           payment: {
//             razorpay: {
//               enabled: true,
//               keyId: process.env.RAZORPAY_KEY_ID || '',
//               keySecret: process.env.RAZORPAY_KEY_SECRET || ''
//             }
//           }
//         },
//         security: {
//           twoFactorEnabled: false,
//           sessionTimeout: 30,
//           ipWhitelist: [],
//           allowedDomains: [],
//           passwordPolicy: {
//             minLength: 8,
//             requireUppercase: true,
//             requireLowercase: true,
//             requireNumbers: true,
//             requireSpecialChars: false
//           }
//         },
//         preferences: {
//           timezone: 'Asia/Kolkata',
//           dateFormat: 'DD/MM/YYYY',
//           currency: 'INR',
//           language: 'en',
//           autoBackup: true,
//           maintenanceMode: false
//         }
//       };

//       res.status(200).json({ settings });
//     } else if (req.method === 'PUT') {
//       const { brandId, settings } = req.body;

//       // Here you would save the settings to the database
//       // For now, we'll just return success

//       res.status(200).json({ message: 'Settings updated successfully' });
//     } else {
//       res.status(405).json({ error: 'Method not allowed' });
//     }
//   } catch (error) {
//     console.error('Settings API error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// }


import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma'; // Adjust to your prisma import path
import { verifyAuth } from '@/lib/auth'; // Adjust this too

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyAuth(req);

    if (!user || user?.user?.role !== 'BRAND') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const brandUserId = user.user.id;

   if (req.method === 'GET') {
  try {
    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: brandUserId },
      include: {
        addresses: true,
      },
    });

    if (!brandProfile) {
      return res.status(404).json({ error: 'Brand profile not found' });
    }

    // Optional: cast settings to a known type if using TypeScript
    const settings = brandProfile.settings as BrandSettings | null;

    return res.status(200).json({
      brandProfile: {
        ...brandProfile,
        settings,
      },
    });
  } catch (error) {
    console.error('Error fetching brand profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


  if (req.method === 'PUT') {
  const { settings } = req.body;
  const company = settings?.company || {};

  const {
    name: companyName,
    gstNumber,
    panNumber,
    contactPerson,
    website,
    description,
  } = {
    name: company.name,
    gstNumber: company.gstNumber,
    panNumber: company.panNumber,
    contactPerson: company.contactPerson,
    website: company.website,
    description: company.description,
  };

  if (!companyName) {
    return res.status(400).json({ error: 'companyName is required' });
  }

 const updatedBrandProfile = await prisma.brandProfile.upsert({
  where: { userId: brandUserId },
  update: {
    companyName,
    gstNumber,
    panNumber,
    contactPerson,
    website,
    description,
    settings,  // <-- now this works because of JSON type
  },
  create: {
    userId: brandUserId,
    companyName,
    gstNumber,
    panNumber,
    contactPerson,
    website,
    description,
    settings,
  },
});


  return res.status(200).json({ brandProfile: updatedBrandProfile });
}



    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error('Brand Profile API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
