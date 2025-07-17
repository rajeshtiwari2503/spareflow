import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { demoDataCleanup, validateSystemIntegrity } from '@/lib/demo-data-cleanup';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(401).json({ error: 'Unauthorized - Super Admin access required' });
    }

    if (req.method === 'POST') {
      const { action = 'cleanup' } = req.body;

      switch (action) {
        case 'cleanup':
          const cleanupResult = await demoDataCleanup.performFullCleanup();
          return res.status(200).json({
            success: cleanupResult.success,
            message: cleanupResult.message,
            details: cleanupResult.details,
            errors: cleanupResult.errors
          });

        case 'validate':
          const validationResult = await validateSystemIntegrity();
          return res.status(200).json({
            success: validationResult.valid,
            message: validationResult.valid 
              ? 'System integrity validated successfully'
              : 'System integrity issues found',
            issues: validationResult.issues
          });

        case 'cleanup-users':
          const usersResult = await demoDataCleanup.cleanupDemoUsers();
          return res.status(200).json({
            success: usersResult.errors.length === 0,
            message: `Removed ${usersResult.removed} demo users`,
            removed: usersResult.removed,
            errors: usersResult.errors
          });

        case 'cleanup-shipments':
          const shipmentsResult = await demoDataCleanup.cleanupDemoShipments();
          return res.status(200).json({
            success: shipmentsResult.errors.length === 0,
            message: `Removed ${shipmentsResult.removed} demo shipments`,
            removed: shipmentsResult.removed,
            errors: shipmentsResult.errors
          });

        case 'cleanup-parts':
          const partsResult = await demoDataCleanup.cleanupDemoParts();
          return res.status(200).json({
            success: partsResult.errors.length === 0,
            message: `Removed ${partsResult.removed} demo parts`,
            removed: partsResult.removed,
            errors: partsResult.errors
          });

        case 'cleanup-notifications':
          const notificationsResult = await demoDataCleanup.cleanupDemoNotifications();
          return res.status(200).json({
            success: notificationsResult.errors.length === 0,
            message: `Removed ${notificationsResult.removed} demo notifications`,
            removed: notificationsResult.removed,
            errors: notificationsResult.errors
          });

        case 'reset-wallets':
          const walletsResult = await demoDataCleanup.resetDemoWallets();
          return res.status(200).json({
            success: walletsResult.errors.length === 0,
            message: `Reset ${walletsResult.reset} demo wallets`,
            reset: walletsResult.reset,
            errors: walletsResult.errors
          });

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    if (req.method === 'GET') {
      // Get cleanup status and statistics
      const validationResult = await validateSystemIntegrity();
      
      return res.status(200).json({
        systemIntegrity: validationResult,
        availableActions: [
          'cleanup',
          'validate',
          'cleanup-users',
          'cleanup-shipments',
          'cleanup-parts',
          'cleanup-notifications',
          'reset-wallets'
        ]
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Demo data cleanup API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}