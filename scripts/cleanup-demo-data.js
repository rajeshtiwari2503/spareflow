/**
 * SpareFlow Demo Data Cleanup Script
 * 
 * Run this script to clean all demo and mock-up data from the database.
 * 
 * Usage:
 * node scripts/cleanup-demo-data.js [options]
 * 
 * Options:
 * --preserve-parts     Keep part definitions but reset stock to 0
 * --preserve-users     Keep user accounts but clear profiles
 * --preserve-config    Keep system configurations and pricing rules
 * --full-cleanup       Remove everything except system essentials
 * --verify-only        Only verify current state without cleanup
 */

const { PrismaClient } = require('@prisma/client');

// Import the cleanup utility (we'll need to compile TypeScript first)
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    preservePartStructure: args.includes('--preserve-parts') || !args.includes('--full-cleanup'),
    preserveUserAccounts: args.includes('--preserve-users') || !args.includes('--full-cleanup'),
    preserveSystemConfig: args.includes('--preserve-config') || !args.includes('--full-cleanup'),
    verifyOnly: args.includes('--verify-only')
  };

  console.log('🚀 SpareFlow Demo Data Cleanup Script');
  console.log('=====================================');
  console.log('Options:', options);
  console.log('=====================================\n');

  if (options.verifyOnly) {
    console.log('🔍 Running verification only...\n');
  } else {
    // Safety confirmation
    console.log('⚠️  WARNING: This will permanently delete demo data from your database!');
    console.log('⚠️  Make sure you have a backup if needed.');
    console.log('\nPress Ctrl+C to cancel, or wait 10 seconds to continue...\n');
    
    // Wait 10 seconds for user to cancel
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('🚀 Starting cleanup...\n');
  }

  try {
    // We need to dynamically import the TypeScript module
    // For now, let's create a simple JavaScript version
    const prisma = new PrismaClient();
    
    if (options.verifyOnly) {
      await verifyCurrentState(prisma);
    } else {
      await performCleanup(prisma, options);
    }

    await prisma.$disconnect();
    console.log('✅ Script completed successfully!');

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

async function verifyCurrentState(prisma) {
  console.log('📊 Current Database State:');
  console.log('==========================');

  const counts = {
    users: await prisma.user.count(),
    parts: await prisma.part.count(),
    shipments: await prisma.shipment.count(),
    purchaseOrders: await prisma.purchaseOrder.count(),
    customerOrders: await prisma.customerOrder.count(),
    walletTransactions: await prisma.walletTransaction.count(),
    notifications: await prisma.notification.count(),
    activityLogs: await prisma.activityLog.count(),
    returnRequests: await prisma.returnRequest.count(),
    spareRequests: await prisma.spareRequest.count(),
    inventory: await prisma.serviceCenterInventory.count() + await prisma.distributorInventory.count(),
    systemSettings: await prisma.systemSettings.count()
  };

  Object.entries(counts).forEach(([key, count]) => {
    console.log(`${key}: ${count}`);
  });

  console.log('==========================\n');
}

async function performCleanup(prisma, options) {
  console.log('🧹 Starting database cleanup...\n');

  try {
    // Clean in order to respect foreign key constraints
    
    // 1. Clean tracking and shipment data
    console.log('Cleaning shipment data...');
    await prisma.boxTrackingHistory.deleteMany({});
    await prisma.boxPart.deleteMany({});
    await prisma.box.deleteMany({});
    await prisma.shipmentReceived.deleteMany({});
    await prisma.shipment.deleteMany({});
    console.log('✓ Shipment data cleaned\n');

    // 2. Clean order data
    console.log('Cleaning order data...');
    await prisma.shippingAddress.deleteMany({});
    await prisma.purchaseOrderItem.deleteMany({});
    await prisma.purchaseOrder.deleteMany({});
    await prisma.customerOrder.deleteMany({});
    console.log('✓ Order data cleaned\n');

    // 3. Clean requests and returns
    console.log('Cleaning requests and returns...');
    await prisma.returnRequest.deleteMany({});
    await prisma.reverseRequest.deleteMany({});
    await prisma.spareRequest.deleteMany({});
    console.log('✓ Requests and returns cleaned\n');

    // 4. Clean inventory
    console.log('Cleaning inventory data...');
    await prisma.inventoryConsumption.deleteMany({});
    await prisma.serviceCenterInventory.deleteMany({});
    await prisma.distributorInventory.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.serviceCenterReceipt.deleteMany({});
    console.log('✓ Inventory data cleaned\n');

    // 5. Clean financial data
    console.log('Cleaning financial data...');
    await prisma.walletTransaction.deleteMany({});
    await prisma.marginLog.deleteMany({});
    
    // Reset wallet balances
    await prisma.wallet.updateMany({
      data: { balance: 0, totalEarned: 0, totalSpent: 0, lastRecharge: null }
    });
    await prisma.brandWallet.updateMany({
      data: { balance: 0, totalSpent: 0, lastRecharge: null }
    });
    console.log('✓ Financial data cleaned\n');

    // 6. Clean AI and forecasting
    console.log('Cleaning AI data...');
    await prisma.forecastingAlert.deleteMany({});
    console.log('✓ AI data cleaned\n');

    // 7. Clean notifications and activity
    console.log('Cleaning activity data...');
    await prisma.notification.deleteMany({});
    await prisma.activityLog.deleteMany({});
    console.log('✓ Activity data cleaned\n');

    // 8. Clean warranty data
    console.log('Cleaning warranty data...');
    await prisma.serviceTicket.deleteMany({});
    await prisma.warranty.deleteMany({});
    console.log('✓ Warranty data cleaned\n');

    // 9. Clean authorization data
    console.log('Cleaning authorization data...');
    await prisma.brandPartnerInvitation.deleteMany({});
    await prisma.brandAccessRequest.deleteMany({});
    await prisma.brandAuthorizedServiceCenter.deleteMany({});
    await prisma.brandAuthorizedDistributor.deleteMany({});
    console.log('✓ Authorization data cleaned\n');

    // 10. Handle parts based on options
    if (options.preservePartStructure) {
      console.log('Resetting parts stock...');
      await prisma.part.updateMany({
        data: {
          stockQuantity: 0,
          status: 'draft',
          publishedAt: null,
          featured: false
        }
      });
      console.log('✓ Parts stock reset (structure preserved)\n');
    } else {
      console.log('Removing all parts...');
      await prisma.part.deleteMany({});
      console.log('✓ All parts removed\n');
    }

    // 11. Handle user profiles based on options
    if (options.preserveUserAccounts) {
      console.log('Cleaning user profiles...');
      await prisma.address.deleteMany({});
      await prisma.brandProfile.deleteMany({});
      await prisma.serviceCenterProfile.deleteMany({});
      await prisma.customerProfile.deleteMany({});
      await prisma.distributorProfile.deleteMany({});
      console.log('✓ User profiles cleaned (accounts preserved)\n');
    }

    // 12. Show preserved system config
    if (options.preserveSystemConfig) {
      const systemSettings = await prisma.systemSettings.count();
      const courierPricing = await prisma.courierPricing.count();
      console.log(`✓ System configurations preserved (${systemSettings} settings, ${courierPricing} pricing rules)\n`);
    }

    console.log('🎉 Cleanup completed successfully!\n');

    // Verify cleanup
    await verifyCurrentState(prisma);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run the script
main().catch(console.error);