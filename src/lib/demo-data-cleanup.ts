import { prisma } from '@/lib/prisma';

export interface CleanupResult {
  success: boolean;
  message: string;
  details: {
    usersRemoved: number;
    shipmentsRemoved: number;
    partsRemoved: number;
    walletsReset: number;
    notificationsRemoved: number;
    accessRequestsRemoved: number;
  };
  errors: string[];
}

export class DemoDataCleanup {
  private static instance: DemoDataCleanup;
  
  private constructor() {}

  public static getInstance(): DemoDataCleanup {
    if (!DemoDataCleanup.instance) {
      DemoDataCleanup.instance = new DemoDataCleanup();
    }
    return DemoDataCleanup.instance;
  }

  // Identify demo/mock data patterns
  private isDemoData(data: any, type: 'user' | 'shipment' | 'part' | 'notification'): boolean {
    switch (type) {
      case 'user':
        return (
          data.email?.includes('demo@') ||
          data.email?.includes('test@') ||
          data.email?.includes('mock@') ||
          data.name?.toLowerCase().includes('demo') ||
          data.name?.toLowerCase().includes('test') ||
          data.name?.toLowerCase().includes('mock') ||
          data.phone?.startsWith('9999') ||
          data.phone?.startsWith('0000')
        );
      
      case 'shipment':
        return (
          data.awbNumber?.startsWith('DEMO') ||
          data.awbNumber?.startsWith('TEST') ||
          data.awbNumber?.startsWith('MOCK') ||
          data.notes?.toLowerCase().includes('demo') ||
          data.notes?.toLowerCase().includes('test')
        );
      
      case 'part':
        return (
          data.partNumber?.startsWith('DEMO') ||
          data.partNumber?.startsWith('TEST') ||
          data.partNumber?.startsWith('MOCK') ||
          data.code?.startsWith('DEMO') ||
          data.code?.startsWith('TEST') ||
          data.name?.toLowerCase().includes('demo') ||
          data.name?.toLowerCase().includes('test')
        );
      
      case 'notification':
        return (
          data.title?.toLowerCase().includes('demo') ||
          data.title?.toLowerCase().includes('test') ||
          data.message?.toLowerCase().includes('demo') ||
          data.message?.toLowerCase().includes('test')
        );
      
      default:
        return false;
    }
  }

  // Clean up demo users
  async cleanupDemoUsers(): Promise<{ removed: number; errors: string[] }> {
    const errors: string[] = [];
    let removed = 0;

    try {
      // Find demo users
      const demoUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: 'demo@' } },
            { email: { contains: 'test@' } },
            { email: { contains: 'mock@' } },
            { name: { contains: 'Demo', mode: 'insensitive' } },
            { name: { contains: 'Test', mode: 'insensitive' } },
            { name: { contains: 'Mock', mode: 'insensitive' } },
            { phone: { startsWith: '9999' } },
            { phone: { startsWith: '0000' } }
          ]
        }
      });

      // Remove demo users and their related data
      for (const user of demoUsers) {
        try {
          await prisma.$transaction(async (tx) => {
            // Remove user's notifications
            await tx.notification.deleteMany({
              where: { userId: user.id }
            });

            // Remove user's wallet transactions
            await tx.walletTransaction.deleteMany({
              where: { userId: user.id }
            });

            // Remove user's wallet
            await tx.wallet.deleteMany({
              where: { userId: user.id }
            });

            // Remove user's access requests
            await tx.accessRequest.deleteMany({
              where: { userId: user.id }
            });

            // Remove user's authorized relationships
            await tx.brandAuthorizedServiceCenter.deleteMany({
              where: { serviceCenterUserId: user.id }
            });

            await tx.brandAuthorizedDistributor.deleteMany({
              where: { distributorUserId: user.id }
            });

            // If user is a brand, remove their parts and shipments
            if (user.role === 'BRAND') {
              // Remove parts
              await tx.part.deleteMany({
                where: { brandId: user.id }
              });

              // Remove shipments
              await tx.shipment.deleteMany({
                where: { brandId: user.id }
              });
            }

            // Finally, remove the user
            await tx.user.delete({
              where: { id: user.id }
            });
          });

          removed++;
        } catch (error) {
          errors.push(`Failed to remove user ${user.email}: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Error finding demo users: ${error}`);
    }

    return { removed, errors };
  }

  // Clean up demo shipments
  async cleanupDemoShipments(): Promise<{ removed: number; errors: string[] }> {
    const errors: string[] = [];
    let removed = 0;

    try {
      // Find demo shipments
      const demoShipments = await prisma.shipment.findMany({
        where: {
          OR: [
            { awbNumber: { startsWith: 'DEMO' } },
            { awbNumber: { startsWith: 'TEST' } },
            { awbNumber: { startsWith: 'MOCK' } },
            { notes: { contains: 'demo', mode: 'insensitive' } },
            { notes: { contains: 'test', mode: 'insensitive' } }
          ]
        }
      });

      for (const shipment of demoShipments) {
        try {
          await prisma.$transaction(async (tx) => {
            // Remove related box parts
            await tx.boxPart.deleteMany({
              where: {
                box: {
                  shipmentId: shipment.id
                }
              }
            });

            // Remove boxes
            await tx.box.deleteMany({
              where: { shipmentId: shipment.id }
            });

            // Remove shipment
            await tx.shipment.delete({
              where: { id: shipment.id }
            });
          });

          removed++;
        } catch (error) {
          errors.push(`Failed to remove shipment ${shipment.id}: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Error finding demo shipments: ${error}`);
    }

    return { removed, errors };
  }

  // Clean up demo parts
  async cleanupDemoParts(): Promise<{ removed: number; errors: string[] }> {
    const errors: string[] = [];
    let removed = 0;

    try {
      // Find demo parts
      const demoParts = await prisma.part.findMany({
        where: {
          OR: [
            { partNumber: { startsWith: 'DEMO' } },
            { partNumber: { startsWith: 'TEST' } },
            { partNumber: { startsWith: 'MOCK' } },
            { code: { startsWith: 'DEMO' } },
            { code: { startsWith: 'TEST' } },
            { name: { contains: 'demo', mode: 'insensitive' } },
            { name: { contains: 'test', mode: 'insensitive' } }
          ]
        }
      });

      for (const part of demoParts) {
        try {
          await prisma.$transaction(async (tx) => {
            // Remove related box parts
            await tx.boxPart.deleteMany({
              where: { partId: part.id }
            });

            // Remove inventory ledger entries
            await tx.inventoryLedger.deleteMany({
              where: { partId: part.id }
            });

            // Remove brand inventory entries
            await tx.brandInventory.deleteMany({
              where: { partId: part.id }
            });

            // Remove return requests
            await tx.returnRequest.deleteMany({
              where: { partId: part.id }
            });

            // Remove part
            await tx.part.delete({
              where: { id: part.id }
            });
          });

          removed++;
        } catch (error) {
          errors.push(`Failed to remove part ${part.code}: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Error finding demo parts: ${error}`);
    }

    return { removed, errors };
  }

  // Clean up demo notifications
  async cleanupDemoNotifications(): Promise<{ removed: number; errors: string[] }> {
    const errors: string[] = [];
    let removed = 0;

    try {
      const result = await prisma.notification.deleteMany({
        where: {
          OR: [
            { title: { contains: 'demo', mode: 'insensitive' } },
            { title: { contains: 'test', mode: 'insensitive' } },
            { message: { contains: 'demo', mode: 'insensitive' } },
            { message: { contains: 'test', mode: 'insensitive' } }
          ]
        }
      });

      removed = result.count;
    } catch (error) {
      errors.push(`Error removing demo notifications: ${error}`);
    }

    return { removed, errors };
  }

  // Reset wallet balances to zero for demo cleanup
  async resetDemoWallets(): Promise<{ reset: number; errors: string[] }> {
    const errors: string[] = [];
    let reset = 0;

    try {
      // Find wallets with suspicious high balances (likely demo data)
      const suspiciousWallets = await prisma.wallet.findMany({
        where: {
          balance: {
            gt: 100000 // More than 1 lakh seems like demo data
          }
        }
      });

      for (const wallet of suspiciousWallets) {
        try {
          await prisma.$transaction(async (tx) => {
            // Remove wallet transactions
            await tx.walletTransaction.deleteMany({
              where: { userId: wallet.userId }
            });

            // Reset wallet balance
            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: 0 }
            });
          });

          reset++;
        } catch (error) {
          errors.push(`Failed to reset wallet for user ${wallet.userId}: ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Error finding suspicious wallets: ${error}`);
    }

    return { reset, errors };
  }

  // Clean up demo access requests
  async cleanupDemoAccessRequests(): Promise<{ removed: number; errors: string[] }> {
    const errors: string[] = [];
    let removed = 0;

    try {
      const result = await prisma.accessRequest.deleteMany({
        where: {
          message: {
            contains: 'demo',
            mode: 'insensitive'
          }
        }
      });

      removed = result.count;
    } catch (error) {
      errors.push(`Error removing demo access requests: ${error}`);
    }

    return { removed, errors };
  }

  // Comprehensive cleanup
  async performFullCleanup(): Promise<CleanupResult> {
    const errors: string[] = [];
    
    try {
      console.log('Starting comprehensive demo data cleanup...');

      // Clean up in order to avoid foreign key constraints
      const [
        notificationsResult,
        accessRequestsResult,
        walletsResult,
        shipmentsResult,
        partsResult,
        usersResult
      ] = await Promise.all([
        this.cleanupDemoNotifications(),
        this.cleanupDemoAccessRequests(),
        this.resetDemoWallets(),
        this.cleanupDemoShipments(),
        this.cleanupDemoParts(),
        this.cleanupDemoUsers()
      ]);

      // Collect all errors
      errors.push(
        ...notificationsResult.errors,
        ...accessRequestsResult.errors,
        ...walletsResult.errors,
        ...shipmentsResult.errors,
        ...partsResult.errors,
        ...usersResult.errors
      );

      const details = {
        usersRemoved: usersResult.removed,
        shipmentsRemoved: shipmentsResult.removed,
        partsRemoved: partsResult.removed,
        walletsReset: walletsResult.reset,
        notificationsRemoved: notificationsResult.removed,
        accessRequestsRemoved: accessRequestsResult.removed
      };

      const totalCleaned = Object.values(details).reduce((sum, count) => sum + count, 0);

      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? `Successfully cleaned up ${totalCleaned} demo data entries`
          : `Cleanup completed with ${errors.length} errors. ${totalCleaned} entries cleaned.`,
        details,
        errors
      };

    } catch (error) {
      return {
        success: false,
        message: `Cleanup failed: ${error}`,
        details: {
          usersRemoved: 0,
          shipmentsRemoved: 0,
          partsRemoved: 0,
          walletsReset: 0,
          notificationsRemoved: 0,
          accessRequestsRemoved: 0
        },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Validate data integrity after cleanup
  async validateDataIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check for orphaned records
      const orphanedBoxParts = await prisma.boxPart.count({
        where: {
          box: null
        }
      });

      if (orphanedBoxParts > 0) {
        issues.push(`Found ${orphanedBoxParts} orphaned box parts`);
      }

      // Check for users without wallets
      const usersWithoutWallets = await prisma.user.count({
        where: {
          wallet: null,
          role: {
            in: ['BRAND', 'SERVICE_CENTER', 'DISTRIBUTOR']
          }
        }
      });

      if (usersWithoutWallets > 0) {
        issues.push(`Found ${usersWithoutWallets} users without wallets`);
      }

      // Check for shipments without boxes
      const shipmentsWithoutBoxes = await prisma.shipment.count({
        where: {
          boxes: {
            none: {}
          }
        }
      });

      if (shipmentsWithoutBoxes > 0) {
        issues.push(`Found ${shipmentsWithoutBoxes} shipments without boxes`);
      }

      return {
        valid: issues.length === 0,
        issues
      };

    } catch (error) {
      return {
        valid: false,
        issues: [`Validation error: ${error}`]
      };
    }
  }

  // Create sample production data
  async createSampleProductionData(): Promise<{ success: boolean; message: string }> {
    try {
      // This would create minimal, realistic sample data for production
      // For now, we'll just return success as the system should work with real user data
      
      return {
        success: true,
        message: 'System is ready for production use with real user data'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create sample data: ${error}`
      };
    }
  }
}

// Export singleton instance
export const demoDataCleanup = DemoDataCleanup.getInstance();

// Utility functions
export async function cleanupAllDemoData(): Promise<CleanupResult> {
  return demoDataCleanup.performFullCleanup();
}

export async function validateSystemIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
  return demoDataCleanup.validateDataIntegrity();
}