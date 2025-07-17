/**
 * SpareFlow Demo Data Cleanup Utility
 * 
 * This script removes all demo and mock-up data from the SpareFlow platform
 * while preserving the database structure and system configurations.
 * 
 * WARNING: This action is irreversible. Make sure to backup your database
 * if you need to preserve any data.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DemoDataCleanup {
  private async logProgress(message: string) {
    console.log(`[CLEANUP] ${new Date().toISOString()}: ${message}`);
  }

  private async logError(message: string, error: any) {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error);
  }

  /**
   * Clean all transactional data (orders, shipments, etc.)
   */
  private async cleanTransactionalData() {
    await this.logProgress('Cleaning transactional data...');

    try {
      // Clean tracking and shipment related data
      await prisma.boxTrackingHistory.deleteMany({});
      await this.logProgress('✓ Cleared box tracking history');

      await prisma.boxPart.deleteMany({});
      await this.logProgress('✓ Cleared box parts');

      await prisma.box.deleteMany({});
      await this.logProgress('✓ Cleared boxes');

      await prisma.shipmentReceived.deleteMany({});
      await this.logProgress('✓ Cleared shipment received records');

      await prisma.shipment.deleteMany({});
      await this.logProgress('✓ Cleared shipments');

      // Clean order related data
      await prisma.shippingAddress.deleteMany({});
      await this.logProgress('✓ Cleared shipping addresses');

      await prisma.purchaseOrderItem.deleteMany({});
      await this.logProgress('✓ Cleared purchase order items');

      await prisma.purchaseOrder.deleteMany({});
      await this.logProgress('✓ Cleared purchase orders');

      await prisma.customerOrder.deleteMany({});
      await this.logProgress('✓ Cleared customer orders');

      // Clean return and reverse requests
      await prisma.returnRequest.deleteMany({});
      await this.logProgress('✓ Cleared return requests');

      await prisma.reverseRequest.deleteMany({});
      await this.logProgress('✓ Cleared reverse requests');

      // Clean spare requests
      await prisma.spareRequest.deleteMany({});
      await this.logProgress('✓ Cleared spare requests');

    } catch (error) {
      await this.logError('Failed to clean transactional data', error);
      throw error;
    }
  }

  /**
   * Clean inventory and stock data
   */
  private async cleanInventoryData() {
    await this.logProgress('Cleaning inventory data...');

    try {
      // Clean inventory consumption logs
      await prisma.inventoryConsumption.deleteMany({});
      await this.logProgress('✓ Cleared inventory consumption logs');

      // Clean service center inventory
      await prisma.serviceCenterInventory.deleteMany({});
      await this.logProgress('✓ Cleared service center inventory');

      // Clean distributor inventory
      await prisma.distributorInventory.deleteMany({});
      await this.logProgress('✓ Cleared distributor inventory');

      // Clean stock movements
      await prisma.stockMovement.deleteMany({});
      await this.logProgress('✓ Cleared stock movements');

      // Clean service center receipts
      await prisma.serviceCenterReceipt.deleteMany({});
      await this.logProgress('✓ Cleared service center receipts');

    } catch (error) {
      await this.logError('Failed to clean inventory data', error);
      throw error;
    }
  }

  /**
   * Clean financial data (wallets, transactions, etc.)
   */
  private async cleanFinancialData() {
    await this.logProgress('Cleaning financial data...');

    try {
      // Clean wallet transactions
      await prisma.walletTransaction.deleteMany({});
      await this.logProgress('✓ Cleared wallet transactions');

      // Reset wallet balances to zero
      await prisma.wallet.updateMany({
        data: {
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          lastRecharge: null
        }
      });
      await this.logProgress('✓ Reset wallet balances');

      // Reset brand wallet balances to zero
      await prisma.brandWallet.updateMany({
        data: {
          balance: 0,
          totalSpent: 0,
          lastRecharge: null
        }
      });
      await this.logProgress('✓ Reset brand wallet balances');

      // Clean margin logs
      await prisma.marginLog.deleteMany({});
      await this.logProgress('✓ Cleared margin logs');

    } catch (error) {
      await this.logError('Failed to clean financial data', error);
      throw error;
    }
  }

  /**
   * Clean AI and forecasting data
   */
  private async cleanAIData() {
    await this.logProgress('Cleaning AI and forecasting data...');

    try {
      // Clean forecasting alerts
      await prisma.forecastingAlert.deleteMany({});
      await this.logProgress('✓ Cleared forecasting alerts');

    } catch (error) {
      await this.logError('Failed to clean AI data', error);
      throw error;
    }
  }

  /**
   * Clean notification and activity data
   */
  private async cleanActivityData() {
    await this.logProgress('Cleaning activity and notification data...');

    try {
      // Clean notifications
      await prisma.notification.deleteMany({});
      await this.logProgress('✓ Cleared notifications');

      // Clean activity logs
      await prisma.activityLog.deleteMany({});
      await this.logProgress('✓ Cleared activity logs');

    } catch (error) {
      await this.logError('Failed to clean activity data', error);
      throw error;
    }
  }

  /**
   * Clean warranty and service data
   */
  private async cleanWarrantyData() {
    await this.logProgress('Cleaning warranty and service data...');

    try {
      // Clean service tickets
      await prisma.serviceTicket.deleteMany({});
      await this.logProgress('✓ Cleared service tickets');

      // Clean warranties
      await prisma.warranty.deleteMany({});
      await this.logProgress('✓ Cleared warranties');

    } catch (error) {
      await this.logError('Failed to clean warranty data', error);
      throw error;
    }
  }

  /**
   * Clean authorization and access data
   */
  private async cleanAuthorizationData() {
    await this.logProgress('Cleaning authorization data...');

    try {
      // Clean brand partner invitations
      await prisma.brandPartnerInvitation.deleteMany({});
      await this.logProgress('✓ Cleared brand partner invitations');

      // Clean brand access requests
      await prisma.brandAccessRequest.deleteMany({});
      await this.logProgress('✓ Cleared brand access requests');

      // Clean brand authorized relationships
      await prisma.brandAuthorizedServiceCenter.deleteMany({});
      await this.logProgress('✓ Cleared brand authorized service centers');

      await prisma.brandAuthorizedDistributor.deleteMany({});
      await this.logProgress('✓ Cleared brand authorized distributors');

    } catch (error) {
      await this.logError('Failed to clean authorization data', error);
      throw error;
    }
  }

  /**
   * Clean parts catalog (optional - preserves structure but removes demo parts)
   */
  private async cleanPartsCatalog(preserveStructure: boolean = true) {
    await this.logProgress('Cleaning parts catalog...');

    try {
      if (preserveStructure) {
        // Reset stock quantities to 0 but keep part definitions
        await prisma.part.updateMany({
          data: {
            stockQuantity: 0,
            status: 'draft',
            publishedAt: null,
            featured: false
          }
        });
        await this.logProgress('✓ Reset parts stock and status (preserved structure)');
      } else {
        // Completely remove all parts
        await prisma.part.deleteMany({});
        await this.logProgress('✓ Removed all parts');
      }

    } catch (error) {
      await this.logError('Failed to clean parts catalog', error);
      throw error;
    }
  }

  /**
   * Clean user profiles but preserve user accounts
   */
  private async cleanUserProfiles(preserveAccounts: boolean = true) {
    await this.logProgress('Cleaning user profiles...');

    try {
      if (preserveAccounts) {
        // Clean addresses
        await prisma.address.deleteMany({});
        await this.logProgress('✓ Cleared addresses');

        // Reset profile data but keep accounts
        await prisma.brandProfile.deleteMany({});
        await prisma.serviceCenterProfile.deleteMany({});
        await prisma.customerProfile.deleteMany({});
        await prisma.distributorProfile.deleteMany({});
        await this.logProgress('✓ Reset user profiles (preserved accounts)');
      } else {
        // This would remove all users - use with extreme caution
        await this.logProgress('⚠️  Skipping user account deletion for safety');
      }

    } catch (error) {
      await this.logError('Failed to clean user profiles', error);
      throw error;
    }
  }

  /**
   * Preserve system configurations and pricing rules
   */
  private async preserveSystemConfig() {
    await this.logProgress('Preserving system configurations...');

    try {
      // Keep system settings
      const systemSettingsCount = await prisma.systemSettings.count();
      await this.logProgress(`✓ Preserved ${systemSettingsCount} system settings`);

      // Keep courier pricing configurations
      const courierPricingCount = await prisma.courierPricing.count();
      await this.logProgress(`✓ Preserved ${courierPricingCount} courier pricing rules`);

      // Keep advanced pricing rules
      const advancedPricingCount = await prisma.advancedCourierPricing.count();
      await this.logProgress(`✓ Preserved ${advancedPricingCount} advanced pricing rules`);

      // Keep role-based pricing
      const rolePricingCount = await prisma.roleBasedPricing.count();
      await this.logProgress(`✓ Preserved ${rolePricingCount} role-based pricing rules`);

      // Keep weight-based pricing
      const weightPricingCount = await prisma.weightBasedPricing.count();
      await this.logProgress(`✓ Preserved ${weightPricingCount} weight-based pricing rules`);

      // Keep pincode-based pricing
      const pincodePricingCount = await prisma.pincodeBasedPricing.count();
      await this.logProgress(`✓ Preserved ${pincodePricingCount} pincode-based pricing rules`);

    } catch (error) {
      await this.logError('Failed to preserve system config', error);
      throw error;
    }
  }

  /**
   * Main cleanup function
   */
  async cleanupDemoData(options: {
    preservePartStructure?: boolean;
    preserveUserAccounts?: boolean;
    preserveSystemConfig?: boolean;
  } = {}) {
    const {
      preservePartStructure = true,
      preserveUserAccounts = true,
      preserveSystemConfig = true
    } = options;

    await this.logProgress('🚀 Starting SpareFlow demo data cleanup...');
    await this.logProgress(`Options: preservePartStructure=${preservePartStructure}, preserveUserAccounts=${preserveUserAccounts}, preserveSystemConfig=${preserveSystemConfig}`);

    try {
      // Clean in order to respect foreign key constraints
      await this.cleanTransactionalData();
      await this.cleanInventoryData();
      await this.cleanFinancialData();
      await this.cleanAIData();
      await this.cleanActivityData();
      await this.cleanWarrantyData();
      await this.cleanAuthorizationData();
      await this.cleanPartsCatalog(preservePartStructure);
      await this.cleanUserProfiles(preserveUserAccounts);

      if (preserveSystemConfig) {
        await this.preserveSystemConfig();
      }

      await this.logProgress('✅ Demo data cleanup completed successfully!');
      
      // Generate cleanup summary
      await this.generateCleanupSummary();

    } catch (error) {
      await this.logError('Demo data cleanup failed', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Generate cleanup summary
   */
  private async generateCleanupSummary() {
    await this.logProgress('Generating cleanup summary...');

    try {
      const summary = {
        users: await prisma.user.count(),
        parts: await prisma.part.count(),
        shipments: await prisma.shipment.count(),
        orders: await prisma.purchaseOrder.count() + await prisma.customerOrder.count(),
        walletTransactions: await prisma.walletTransaction.count(),
        notifications: await prisma.notification.count(),
        activityLogs: await prisma.activityLog.count(),
        systemSettings: await prisma.systemSettings.count(),
        courierPricingRules: await prisma.courierPricing.count() + await prisma.advancedCourierPricing.count()
      };

      console.log('\n📊 CLEANUP SUMMARY:');
      console.log('==================');
      console.log(`Users remaining: ${summary.users}`);
      console.log(`Parts remaining: ${summary.parts}`);
      console.log(`Shipments remaining: ${summary.shipments}`);
      console.log(`Orders remaining: ${summary.orders}`);
      console.log(`Wallet transactions remaining: ${summary.walletTransactions}`);
      console.log(`Notifications remaining: ${summary.notifications}`);
      console.log(`Activity logs remaining: ${summary.activityLogs}`);
      console.log(`System settings preserved: ${summary.systemSettings}`);
      console.log(`Courier pricing rules preserved: ${summary.courierPricingRules}`);
      console.log('==================\n');

    } catch (error) {
      await this.logError('Failed to generate cleanup summary', error);
    }
  }

  /**
   * Verify cleanup completion
   */
  async verifyCleanup() {
    await this.logProgress('Verifying cleanup completion...');

    const checks = [
      { name: 'Shipments', count: await prisma.shipment.count() },
      { name: 'Boxes', count: await prisma.box.count() },
      { name: 'Purchase Orders', count: await prisma.purchaseOrder.count() },
      { name: 'Customer Orders', count: await prisma.customerOrder.count() },
      { name: 'Wallet Transactions', count: await prisma.walletTransaction.count() },
      { name: 'Notifications', count: await prisma.notification.count() },
      { name: 'Activity Logs', count: await prisma.activityLog.count() },
      { name: 'Return Requests', count: await prisma.returnRequest.count() },
      { name: 'Reverse Requests', count: await prisma.reverseRequest.count() },
      { name: 'Spare Requests', count: await prisma.spareRequest.count() },
      { name: 'Inventory Consumption', count: await prisma.inventoryConsumption.count() },
      { name: 'Service Center Inventory', count: await prisma.serviceCenterInventory.count() },
      { name: 'Distributor Inventory', count: await prisma.distributorInventory.count() },
      { name: 'Stock Movements', count: await prisma.stockMovement.count() },
      { name: 'Forecasting Alerts', count: await prisma.forecastingAlert.count() },
      { name: 'Margin Logs', count: await prisma.marginLog.count() },
      { name: 'Service Tickets', count: await prisma.serviceTicket.count() },
      { name: 'Warranties', count: await prisma.warranty.count() },
      { name: 'Brand Access Requests', count: await prisma.brandAccessRequest.count() },
      { name: 'Brand Partner Invitations', count: await prisma.brandPartnerInvitation.count() },
      { name: 'Brand Authorized Service Centers', count: await prisma.brandAuthorizedServiceCenter.count() },
      { name: 'Brand Authorized Distributors', count: await prisma.brandAuthorizedDistributor.count() }
    ];

    console.log('\n🔍 CLEANUP VERIFICATION:');
    console.log('========================');
    
    let allClean = true;
    for (const check of checks) {
      const status = check.count === 0 ? '✅' : '❌';
      console.log(`${status} ${check.name}: ${check.count}`);
      if (check.count > 0) allClean = false;
    }

    console.log('========================');
    console.log(allClean ? '✅ All demo data successfully cleaned!' : '❌ Some data remains - check above');
    console.log('========================\n');

    return allClean;
  }
}

// Export for use in API or scripts
export default DemoDataCleanup;