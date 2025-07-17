# SpareFlow Demo Data Cleanup Guide

This guide provides comprehensive instructions for cleaning all demo and mock-up data from the SpareFlow platform before production deployment.

## Overview

The demo data cleanup system removes all transactional data, user activity, and test records while preserving the database structure and system configurations needed for production operation.

## What Gets Cleaned

### Transactional Data
- ✅ All shipments and boxes
- ✅ All tracking history
- ✅ All purchase orders and items
- ✅ All customer orders
- ✅ All shipping addresses

### Inventory & Stock Data
- ✅ All inventory records (Service Center & Distributor)
- ✅ All stock movements
- ✅ All inventory consumption logs
- ✅ All service center receipts
- ✅ Part stock quantities (reset to 0)

### Financial Data
- ✅ All wallet transactions
- ✅ All margin logs
- ✅ Wallet balances (reset to 0)
- ✅ Brand wallet balances (reset to 0)

### Requests & Returns
- ✅ All spare requests
- ✅ All return requests
- ✅ All reverse requests

### User Activity
- ✅ All notifications
- ✅ All activity logs
- ✅ All user profiles (optional)
- ✅ All addresses (optional)

### Authorization & Access
- ✅ All brand access requests
- ✅ All partner invitations
- ✅ All authorized relationships

### AI & Analytics
- ✅ All forecasting alerts
- ✅ All AI-generated data

### Warranty & Service
- ✅ All warranty records
- ✅ All service tickets

## What Gets Preserved

### System Configuration
- ✅ System settings
- ✅ Courier pricing rules
- ✅ Advanced pricing configurations
- ✅ Role-based pricing
- ✅ Weight-based pricing
- ✅ Pincode-based pricing

### Optional Preservation
- ✅ User accounts (configurable)
- ✅ Part definitions (configurable)
- ✅ Database schema and structure

## Cleanup Methods

### 1. Admin Dashboard (Recommended)

Access the Super Admin Dashboard and navigate to the Demo Data Cleanup section:

1. Log in as Super Admin
2. Go to System Management
3. Select "Demo Data Cleanup"
4. Configure cleanup options
5. Confirm and execute

### 2. API Endpoint

```bash
POST /api/admin/cleanup-demo-data
Content-Type: application/json

{
  "preservePartStructure": true,
  "preserveUserAccounts": true,
  "preserveSystemConfig": true,
  "confirmCleanup": true
}
```

### 3. Command Line Script

```bash
# Basic cleanup (preserves structure)
node scripts/cleanup-demo-data.js

# Full cleanup (removes everything except essentials)
node scripts/cleanup-demo-data.js --full-cleanup

# Custom options
node scripts/cleanup-demo-data.js --preserve-parts --preserve-users --preserve-config

# Verification only (no cleanup)
node scripts/cleanup-demo-data.js --verify-only
```

### 4. Programmatic Usage

```typescript
import DemoDataCleanup from '@/utils/cleanup-demo-data';

const cleanup = new DemoDataCleanup();

await cleanup.cleanupDemoData({
  preservePartStructure: true,
  preserveUserAccounts: true,
  preserveSystemConfig: true
});

// Verify cleanup completion
const isClean = await cleanup.verifyCleanup();
```

## Cleanup Options

### preservePartStructure (default: true)
- **true**: Keeps part definitions but resets stock to 0
- **false**: Completely removes all parts

### preserveUserAccounts (default: true)
- **true**: Keeps user accounts but removes profiles and addresses
- **false**: Removes all user data (use with extreme caution)

### preserveSystemConfig (default: true)
- **true**: Preserves all system settings and pricing rules
- **false**: Removes system configurations (not recommended)

## Pre-Cleanup Checklist

### 1. Database Backup
```bash
# Create a backup before cleanup
pg_dump $DATABASE_URL > spareflow_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Environment Verification
- ✅ Confirm you're running on the correct environment
- ✅ Verify database connection
- ✅ Check admin access permissions

### 3. System Health Check
```bash
# Run system health check
curl -X GET /api/system/health-check
```

## Post-Cleanup Verification

### 1. Automated Verification
The cleanup system automatically verifies completion and provides a detailed report.

### 2. Manual Verification
Check key metrics in the admin dashboard:
- User count
- Part count (should match expectations)
- Zero transactional records
- Preserved system settings

### 3. Application Testing
- ✅ Test user login
- ✅ Verify dashboard access
- ✅ Check system configurations
- ✅ Test basic functionality

## Production Readiness Steps

After cleanup completion:

### 1. System Configuration
- ✅ Update system settings for production
- ✅ Configure courier pricing
- ✅ Set up payment gateways
- ✅ Configure notification settings

### 2. Initial Data Setup
- ✅ Create production admin accounts
- ✅ Set up initial brand accounts
- ✅ Configure initial part catalog
- ✅ Set up courier integrations

### 3. Security Review
- ✅ Update API keys and secrets
- ✅ Review user permissions
- ✅ Configure rate limiting
- ✅ Set up monitoring

## Troubleshooting

### Common Issues

#### Foreign Key Constraints
If cleanup fails due to foreign key constraints:
1. Check the cleanup order in the utility
2. Manually resolve dependencies
3. Re-run cleanup

#### Insufficient Permissions
```bash
# Check database permissions
psql $DATABASE_URL -c "\du"
```

#### Partial Cleanup
If cleanup is incomplete:
1. Run verification to identify remaining data
2. Use targeted cleanup for specific tables
3. Check for custom data not covered by the utility

### Recovery Options

#### Restore from Backup
```bash
# Restore from backup if needed
psql $DATABASE_URL < spareflow_backup_YYYYMMDD_HHMMSS.sql
```

#### Selective Cleanup
```typescript
// Clean specific data types only
const cleanup = new DemoDataCleanup();

// Clean only transactional data
await cleanup.cleanTransactionalData();

// Clean only inventory data
await cleanup.cleanInventoryData();
```

## Support

For issues with demo data cleanup:

1. Check the cleanup logs for detailed error messages
2. Verify database connectivity and permissions
3. Review the troubleshooting section above
4. Contact system administrator if issues persist

## Security Notes

- ✅ Cleanup requires Super Admin privileges
- ✅ All operations are logged
- ✅ Confirmation required for destructive operations
- ✅ Backup recommended before cleanup
- ✅ Verification provided after cleanup

## Performance Considerations

- Large datasets may take several minutes to clean
- Database locks may occur during cleanup
- Consider running during maintenance windows
- Monitor system resources during cleanup

---

**⚠️ Important**: This operation is irreversible. Always backup your database before running demo data cleanup in production environments.