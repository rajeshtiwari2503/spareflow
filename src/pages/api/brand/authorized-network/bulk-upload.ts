import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AccessRequestRoleType } from '@prisma/client';

interface BulkUploadRow {
  user_id: string;
  role_type: string;
  row_number: number;
}

interface ProcessingResult {
  success: boolean;
  user_id: string;
  role_type: string;
  row_number: number;
  message: string;
  user_email?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify brand authentication
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== 'brand') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const brandId = decoded.userId;
    const { csvData } = req.body;

    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({ error: 'Invalid CSV data format' });
    }

    const results: ProcessingResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each row
    for (const row of csvData as BulkUploadRow[]) {
      try {
        const { user_id, role_type, row_number } = row;

        // Validate required fields
        if (!user_id || !role_type) {
          results.push({
            success: false,
            user_id: user_id || 'N/A',
            role_type: role_type || 'N/A',
            row_number,
            message: 'Missing required fields (user_id or role_type)'
          });
          failureCount++;
          continue;
        }

        // Validate role type
        if (!['SERVICE_CENTER', 'DISTRIBUTOR'].includes(role_type.toUpperCase())) {
          results.push({
            success: false,
            user_id,
            role_type,
            row_number,
            message: 'Invalid role_type. Must be SERVICE_CENTER or DISTRIBUTOR'
          });
          failureCount++;
          continue;
        }

        const normalizedRoleType = role_type.toUpperCase() as AccessRequestRoleType;

        // Find user by ID or email
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { id: user_id },
              { email: user_id }
            ]
          }
        });

        if (!user) {
          results.push({
            success: false,
            user_id,
            role_type,
            row_number,
            message: 'User not found'
          });
          failureCount++;
          continue;
        }

        // Validate user role matches the requested role type
        const expectedRole = normalizedRoleType === 'SERVICE_CENTER' ? 'service_center' : 'distributor';
        if (user.role !== expectedRole) {
          results.push({
            success: false,
            user_id,
            role_type,
            row_number,
            message: `User role (${user.role}) does not match requested role type (${expectedRole})`,
            user_email: user.email
          });
          failureCount++;
          continue;
        }

        // Check for existing authorization
        let existingAuth;
        if (normalizedRoleType === 'SERVICE_CENTER') {
          existingAuth = await prisma.brandAuthorizedServiceCenter.findUnique({
            where: {
              brandId_serviceCenterUserId: {
                brandId,
                serviceCenterUserId: user.id
              }
            }
          });
        } else {
          existingAuth = await prisma.brandAuthorizedDistributor.findUnique({
            where: {
              brandId_distributorUserId: {
                brandId,
                distributorUserId: user.id
              }
            }
          });
        }

        if (existingAuth) {
          results.push({
            success: false,
            user_id,
            role_type,
            row_number,
            message: 'User is already authorized',
            user_email: user.email
          });
          failureCount++;
          continue;
        }

        // Create authorization
        if (normalizedRoleType === 'SERVICE_CENTER') {
          await prisma.brandAuthorizedServiceCenter.create({
            data: {
              brandId,
              serviceCenterUserId: user.id,
              status: 'Active'
            }
          });
        } else {
          await prisma.brandAuthorizedDistributor.create({
            data: {
              brandId,
              distributorUserId: user.id,
              status: 'Active'
            }
          });
        }

        results.push({
          success: true,
          user_id,
          role_type,
          row_number,
          message: 'Successfully authorized',
          user_email: user.email
        });
        successCount++;

      } catch (error) {
        console.error('Error processing row:', error);
        results.push({
          success: false,
          user_id: row.user_id || 'N/A',
          role_type: row.role_type || 'N/A',
          row_number: row.row_number,
          message: 'Internal error processing this entry'
        });
        failureCount++;
      }
    }

    return res.status(200).json({
      summary: {
        total: csvData.length,
        success: successCount,
        failure: failureCount
      },
      results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}