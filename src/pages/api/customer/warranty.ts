import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthUser } from '@/lib/auth';
import formidable from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), 'public/uploads/warranty');

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse, user: AuthUser) {
  try {
    console.log('Warranty API - User:', user.email, user.role);
    
    if (user.role !== 'CUSTOMER') {
      return res.status(403).json({ success: false, message: 'Access denied. Only customers can access warranty features.' });
    }

    if (req.method === 'GET') {
      // Get warranty items for the customer
      const warranties = await prisma.warranty.findMany({
        where: { customerId: user.id },
        include: {
          serviceTickets: {
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({
        success: true,
        warranties: warranties.map(warranty => ({
          ...warranty,
          status: getWarrantyStatus(warranty.purchaseDate, warranty.warrantyPeriod)
        }))
      });
    }

    if (req.method === 'POST') {
      await ensureUploadDir();

      const form = formidable({
        uploadDir,
        keepExtensions: true,
        maxFileSize: 5 * 1024 * 1024, // 5MB
      });

      const [fields, files] = await form.parse(req);
      
      const partName = Array.isArray(fields.partName) ? fields.partName[0] : fields.partName;
      const purchaseDate = Array.isArray(fields.purchaseDate) ? fields.purchaseDate[0] : fields.purchaseDate;
      const warrantyPeriod = Array.isArray(fields.warrantyPeriod) ? fields.warrantyPeriod[0] : fields.warrantyPeriod;
      const billImageFile = Array.isArray(files.billImage) ? files.billImage[0] : files.billImage;

      if (!partName || !purchaseDate || !warrantyPeriod || !billImageFile) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Move uploaded file to permanent location
      const fileName = `warranty_${Date.now()}_${billImageFile.originalFilename}`;
      const newPath = path.join(uploadDir, fileName);
      await fs.rename(billImageFile.filepath, newPath);

      const warranty = await prisma.warranty.create({
        data: {
          customerId: user.id,
          partName: partName as string,
          purchaseDate: new Date(purchaseDate as string),
          warrantyPeriod: parseInt(warrantyPeriod as string),
          billImage: `/uploads/warranty/${fileName}`,
        }
      });

      return res.status(201).json({
        success: true,
        warranty: {
          ...warranty,
          status: getWarrantyStatus(warranty.purchaseDate, warranty.warrantyPeriod)
        }
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Warranty API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

function getWarrantyStatus(purchaseDate: Date, warrantyPeriod: number): 'ACTIVE' | 'EXPIRED' {
  const expiryDate = new Date(purchaseDate);
  expiryDate.setMonth(expiryDate.getMonth() + warrantyPeriod);
  
  return new Date() <= expiryDate ? 'ACTIVE' : 'EXPIRED';
}

export default withAuth(handler);