import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import formidable from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface InventoryRow {
  partNumber: string;
  brandName: string;
  quantity: number;
  unitPrice: number;
  minStockLevel?: number;
  maxStockLevel?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyToken(req);
    if (!user || user.role !== 'DISTRIBUTOR') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = file.filepath;
    const fileName = file.originalFilename || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    let inventoryData: InventoryRow[] = [];

    try {
      if (fileExtension === 'csv') {
        // Parse CSV file
        inventoryData = await parseCSV(filePath);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel file
        inventoryData = await parseExcel(filePath);
      } else {
        return res.status(400).json({ error: 'Unsupported file format. Please use CSV or Excel files.' });
      }

      // Validate and process the data
      const results = await processInventoryData(inventoryData, user.id);

      // Clean up the uploaded file
      fs.unlinkSync(filePath);

      // Create activity log
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'INVENTORY_BULK_UPLOAD',
          details: JSON.stringify({
            fileName,
            totalRows: inventoryData.length,
            successCount: results.successCount,
            errorCount: results.errorCount,
            errors: results.errors.slice(0, 10) // Limit errors in log
          })
        }
      });

      res.status(200).json({
        message: 'Bulk upload completed',
        results: {
          totalRows: inventoryData.length,
          successCount: results.successCount,
          errorCount: results.errorCount,
          errors: results.errors
        }
      });

    } catch (parseError) {
      // Clean up the uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw parseError;
    }

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Internal server error during bulk upload' });
  }
}

async function parseCSV(filePath: string): Promise<InventoryRow[]> {
  return new Promise((resolve, reject) => {
    const results: InventoryRow[] = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        try {
          const row: InventoryRow = {
            partNumber: data.partNumber || data['Part Number'] || data['part_number'],
            brandName: data.brandName || data['Brand Name'] || data['brand_name'],
            quantity: parseInt(data.quantity || data['Quantity'] || data['current_stock']) || 0,
            unitPrice: parseFloat(data.unitPrice || data['Unit Price'] || data['unit_price']) || 0,
            minStockLevel: parseInt(data.minStockLevel || data['Min Stock Level'] || data['min_stock_level']) || 10,
            maxStockLevel: parseInt(data.maxStockLevel || data['Max Stock Level'] || data['max_stock_level']) || 100,
          };
          
          if (row.partNumber && row.brandName && row.quantity >= 0 && row.unitPrice > 0) {
            results.push(row);
          }
        } catch (error) {
          console.error('Error parsing CSV row:', error);
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

async function parseExcel(filePath: string): Promise<InventoryRow[]> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  const results: InventoryRow[] = [];

  for (const data of jsonData) {
    try {
      const row: InventoryRow = {
        partNumber: (data as any).partNumber || (data as any)['Part Number'] || (data as any)['part_number'],
        brandName: (data as any).brandName || (data as any)['Brand Name'] || (data as any)['brand_name'],
        quantity: parseInt((data as any).quantity || (data as any)['Quantity'] || (data as any)['current_stock']) || 0,
        unitPrice: parseFloat((data as any).unitPrice || (data as any)['Unit Price'] || (data as any)['unit_price']) || 0,
        minStockLevel: parseInt((data as any).minStockLevel || (data as any)['Min Stock Level'] || (data as any)['min_stock_level']) || 10,
        maxStockLevel: parseInt((data as any).maxStockLevel || (data as any)['Max Stock Level'] || (data as any)['max_stock_level']) || 100,
      };

      if (row.partNumber && row.brandName && row.quantity >= 0 && row.unitPrice > 0) {
        results.push(row);
      }
    } catch (error) {
      console.error('Error parsing Excel row:', error);
    }
  }

  return results;
}

async function processInventoryData(inventoryData: InventoryRow[], distributorId: string) {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const [index, row] of inventoryData.entries()) {
    try {
      // Find the part by part number and brand
      const part = await prisma.part.findFirst({
        where: {
          partNumber: row.partNumber,
          brand: {
            OR: [
              { name: row.brandName },
              { companyName: row.brandName }
            ]
          }
        },
        include: {
          brand: true
        }
      });

      if (!part) {
        errors.push(`Row ${index + 1}: Part ${row.partNumber} from brand ${row.brandName} not found`);
        errorCount++;
        continue;
      }

      // Check if inventory item already exists
      const existingItem = await prisma.distributorInventory.findFirst({
        where: {
          distributorId: distributorId,
          partId: part.id,
        },
      });

      if (existingItem) {
        // Update existing item
        await prisma.distributorInventory.update({
          where: { id: existingItem.id },
          data: {
            currentStock: row.quantity,
            minStockLevel: row.minStockLevel || existingItem.minStockLevel,
            maxStockLevel: row.maxStockLevel || existingItem.maxStockLevel,
            unitPrice: row.unitPrice,
            lastRestocked: new Date(),
          },
        });
      } else {
        // Create new item
        await prisma.distributorInventory.create({
          data: {
            distributorId: distributorId,
            partId: part.id,
            currentStock: row.quantity,
            minStockLevel: row.minStockLevel || 10,
            maxStockLevel: row.maxStockLevel || 100,
            unitPrice: row.unitPrice,
            lastRestocked: new Date(),
          },
        });
      }

      // Check for low stock and create notification
      if (row.quantity <= (row.minStockLevel || 10)) {
        await prisma.notification.create({
          data: {
            userId: distributorId,
            title: 'Low Stock Alert',
            message: `Stock for ${part.name} (${part.partNumber}) is at ${row.quantity} units, below minimum level`,
            type: 'INVENTORY_ALERT',
            relatedId: part.id
          }
        });
      }

      successCount++;

    } catch (error) {
      console.error(`Error processing row ${index + 1}:`, error);
      errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errorCount++;
    }
  }

  return {
    successCount,
    errorCount,
    errors
  };
}