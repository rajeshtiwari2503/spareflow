import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

interface PricingAuditEntry {
  id: string;
  timestamp: string;
  adminId: string;
  adminName: string;
  action: string;
  brandId?: string;
  brandName?: string;
  oldValue: any;
  newValue: any;
  affectedField: string;
  reason?: string;
  ipAddress?: string;
}

interface PricingAuditResponse {
  entries: PricingAuditEntry[];
  summary: {
    totalEntries: number;
    recentChanges: number;
    affectedBrands: number;
    lastUpdate: string;
  };
  filters: {
    brands: Array<{ id: string; name: string }>;
    actions: string[];
    dateRange: { from: string; to: string };
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user || authResult.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.method === 'GET') {
      const { brandId, action, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;
      
      const auditData = await getPricingAuditTrail({
        brandId: brandId as string,
        action: action as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      
      res.status(200).json(auditData);
    } else if (req.method === 'POST') {
      const { action, brandId, oldValue, newValue, affectedField, reason } = req.body;
      
      const entry = await createPricingAuditEntry({
        adminId: authResult.user.id,
        action,
        brandId,
        oldValue,
        newValue,
        affectedField,
        reason,
        ipAddress: getClientIP(req)
      });
      
      res.status(201).json({ success: true, entry });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in pricing audit trail API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPricingAuditTrail(filters: {
  brandId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  offset: number;
}): Promise<PricingAuditResponse> {
  // Build where clause for filtering
  const where: any = {
    action: {
      in: [
        'PRICING_CREATED',
        'PRICING_UPDATED',
        'PRICING_DELETED',
        'PRICING_ACTIVATED',
        'PRICING_DEACTIVATED',
        'DEFAULT_RATE_UPDATED',
        'ADVANCED_RULE_CREATED',
        'ADVANCED_RULE_UPDATED',
        'ROLE_PRICING_UPDATED',
        'WEIGHT_PRICING_UPDATED',
        'PINCODE_PRICING_UPDATED',
        'PRICING_SYNC'
      ]
    }
  };

  if (filters.brandId) {
    where.details = {
      contains: filters.brandId
    };
  }

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.createdAt.lte = new Date(filters.dateTo);
    }
  }

  // Get audit entries
  const auditLogs = await prisma.activityLog.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: filters.limit,
    skip: filters.offset
  });

  // Transform to audit entries
  const entries: PricingAuditEntry[] = [];
  
  for (const log of auditLogs) {
    try {
      const details = log.details ? JSON.parse(log.details) : {};
      
      // Extract brand information if available
      let brandName = '';
      if (details.brandId) {
        const brand = await prisma.user.findUnique({
          where: { id: details.brandId },
          select: { name: true }
        });
        brandName = brand?.name || 'Unknown Brand';
      }

      entries.push({
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        adminId: log.userId,
        adminName: log.user.name,
        action: log.action,
        brandId: details.brandId,
        brandName,
        oldValue: details.oldValue,
        newValue: details.newValue,
        affectedField: details.affectedField || 'unknown',
        reason: details.reason,
        ipAddress: log.ipAddress
      });
    } catch (error) {
      console.error('Error parsing audit log details:', error);
      // Include basic entry even if details parsing fails
      entries.push({
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        adminId: log.userId,
        adminName: log.user.name,
        action: log.action,
        oldValue: null,
        newValue: null,
        affectedField: 'unknown'
      });
    }
  }

  // Get summary statistics
  const totalEntries = await prisma.activityLog.count({ where });
  
  const recentChanges = await prisma.activityLog.count({
    where: {
      ...where,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    }
  });

  // Get affected brands
  const affectedBrandsSet = new Set(entries.filter(e => e.brandId).map(e => e.brandId));
  
  // Get filter options
  const brands = await prisma.user.findMany({
    where: { role: 'BRAND' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  const actions = [
    'PRICING_CREATED',
    'PRICING_UPDATED',
    'PRICING_DELETED',
    'PRICING_ACTIVATED',
    'PRICING_DEACTIVATED',
    'DEFAULT_RATE_UPDATED',
    'ADVANCED_RULE_CREATED',
    'ADVANCED_RULE_UPDATED',
    'ROLE_PRICING_UPDATED',
    'WEIGHT_PRICING_UPDATED',
    'PINCODE_PRICING_UPDATED',
    'PRICING_SYNC'
  ];

  const lastEntry = entries[0];
  
  return {
    entries,
    summary: {
      totalEntries,
      recentChanges,
      affectedBrands: affectedBrandsSet.size,
      lastUpdate: lastEntry?.timestamp || new Date().toISOString()
    },
    filters: {
      brands,
      actions,
      dateRange: {
        from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: filters.dateTo || new Date().toISOString()
      }
    }
  };
}

async function createPricingAuditEntry(data: {
  adminId: string;
  action: string;
  brandId?: string;
  oldValue: any;
  newValue: any;
  affectedField: string;
  reason?: string;
  ipAddress?: string;
}): Promise<PricingAuditEntry> {
  const details = {
    brandId: data.brandId,
    oldValue: data.oldValue,
    newValue: data.newValue,
    affectedField: data.affectedField,
    reason: data.reason,
    timestamp: new Date().toISOString()
  };

  const auditLog = await prisma.activityLog.create({
    data: {
      userId: data.adminId,
      action: data.action,
      details: JSON.stringify(details),
      ipAddress: data.ipAddress
    },
    include: {
      user: {
        select: { id: true, name: true }
      }
    }
  });

  // Get brand name if brandId is provided
  let brandName = '';
  if (data.brandId) {
    const brand = await prisma.user.findUnique({
      where: { id: data.brandId },
      select: { name: true }
    });
    brandName = brand?.name || 'Unknown Brand';
  }

  return {
    id: auditLog.id,
    timestamp: auditLog.createdAt.toISOString(),
    adminId: data.adminId,
    adminName: auditLog.user.name,
    action: data.action,
    brandId: data.brandId,
    brandName,
    oldValue: data.oldValue,
    newValue: data.newValue,
    affectedField: data.affectedField,
    reason: data.reason,
    ipAddress: data.ipAddress
  };
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.socket.remoteAddress;
  return ip || 'unknown';
}

// Helper function to log pricing changes (to be used in other APIs)
export async function logPricingChange(data: {
  adminId: string;
  action: string;
  brandId?: string;
  oldValue: any;
  newValue: any;
  affectedField: string;
  reason?: string;
  req?: NextApiRequest;
}) {
  try {
    const details = {
      brandId: data.brandId,
      oldValue: data.oldValue,
      newValue: data.newValue,
      affectedField: data.affectedField,
      reason: data.reason,
      timestamp: new Date().toISOString()
    };

    await prisma.activityLog.create({
      data: {
        userId: data.adminId,
        action: data.action,
        details: JSON.stringify(details),
        ipAddress: data.req ? getClientIP(data.req) : undefined
      }
    });
  } catch (error) {
    console.error('Error logging pricing change:', error);
    // Don't throw error to avoid breaking the main operation
  }
}