# SpareFlow Production Cleanup Guide

## Overview

This guide provides comprehensive instructions for cleaning all mock/test data from the SpareFlow system to prepare it for production use with real users and shipments.

## 🚨 Critical Warning

**This cleanup process is IRREVERSIBLE and will permanently delete all demo/test data. Always create a backup before proceeding.**

## What Gets Cleaned

### 1. Transactional Data (100% Removal)
- **Shipments**: All shipment records and tracking history
- **Orders**: Purchase orders, customer orders, and order items
- **Boxes**: Box allocations and part assignments
- **Returns**: Return requests and reverse shipments
- **Courier Transactions**: All courier-related transactions

### 2. Inventory Data (Reset to Clean State)
- **Stock Levels**: All parts reset to 0 stock
- **Stock Movements**: All movement history cleared
- **Service Center Inventory**: All inventory records cleared
- **Distributor Inventory**: All inventory records cleared
- **Consumption Logs**: All usage history cleared

### 3. Financial Data (Reset to Zero)
- **Wallet Transactions**: All transaction history cleared
- **Wallet Balances**: All balances reset to 0
- **Margin Logs**: All margin calculation history cleared

### 4. System Generated Data (Complete Removal)
- **Notifications**: All system notifications cleared
- **Activity Logs**: All user activity history cleared
- **AI Forecasting**: All forecasting alerts and data cleared
- **Warranty Data**: All warranty and service ticket records cleared

### 5. Mock/Test User Data (Configurable)
- **Mock Users**: Users with demo/test/mock patterns in email/name/phone
- **User Profiles**: All profile data cleared (addresses, company info, etc.)
- **Authorization Relationships**: All brand-partner relationships cleared

### 6. Mock/Test Parts (Selective Removal)
- **Demo Parts**: Parts with demo/test/mock patterns in name/code/description
- **Part Status**: All remaining parts reset to draft status
- **Part Pricing**: Cost and selling prices cleared

## What Gets Preserved

### 1. System Configuration (Always Preserved)
- **Pricing Rules**: Courier pricing configurations
- **System Settings**: Application configuration
- **Role-Based Pricing**: User role pricing rules
- **Weight/Pincode Pricing**: Location and weight-based pricing

### 2. User Accounts (Configurable)
- **Real User Accounts**: Non-mock user accounts can be preserved
- **Admin Accounts**: Super admin accounts are always preserved

### 3. Parts Structure (Configurable)
- **Part Definitions**: Part catalog structure can be preserved
- **Categories**: Part categorization maintained

## Mock Data Detection Patterns

The system identifies mock/test data using these patterns:

### Email Patterns
- Contains: `demo`, `test`, `mock`, `sample`, `example`
- Domains: `@test.com`, `@demo.com`, `@mock.com`, `@example.com`

### Name Patterns
- Contains: `Demo`, `Test`, `Mock`, `Sample`
- Starts with: `Test `, `Demo `, `Mock `

### Phone Patterns
- Exact matches: `0000000000`, `1234567890`, `9999999999`
- Starts with: `0000`, `1111`, `9999`

### Part Patterns
- Names containing: `Demo`, `Test`, `Mock`, `Sample`
- Codes containing: `DEMO`, `TEST`, `MOCK`
- Descriptions containing: `demo`, `test`, `mock`

## Cleanup Options

### Basic Options

1. **Preserve Parts Structure** (Default: ✅ Enabled)
   - Keeps part definitions but resets stock to 0
   - Maintains catalog structure for production use

2. **Preserve User Accounts** (Default: ❌ Disabled for production)
   - Keeps non-mock user accounts
   - Clears all profile data regardless

3. **Preserve System Config** (Default: ✅ Enabled)
   - Maintains pricing rules and system settings
   - Essential for production operation

### Advanced Options

1. **Create Backup** (Default: ✅ Enabled)
   - Creates database backup before cleanup
   - Recommended for safety

2. **Generate Report** (Default: ✅ Enabled)
   - Creates detailed cleanup report
   - Useful for audit trail

3. **Notify on Completion** (Default: ✅ Enabled)
   - Shows completion notifications
   - Helps track cleanup progress

4. **Schedule Cleanup** (Default: ❌ Disabled)
   - Allows scheduling cleanup for later
   - Useful for maintenance windows

## How to Execute Cleanup

### Method 1: Admin Dashboard (Recommended)

1. **Access Admin Dashboard**
   ```
   Navigate to: /dashboard/super-admin
   ```

2. **Open Cleanup Manager**
   - Look for "Demo Data Cleanup" section
   - Or use the DemoDataCleanupManager component

3. **Configure Options**
   - Review preservation settings
   - Enable/disable advanced options as needed

4. **Safety Checks**
   - Create backup if not already done
   - Review system statistics
   - Use preview function to see impact

5. **Execute Cleanup**
   - Check confirmation checkbox
   - Type "DELETE ALL DEMO DATA" to confirm
   - Click "Execute Cleanup Now"

### Method 2: API Endpoint

```bash
curl -X POST /api/admin/cleanup-all-mock-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "confirmCleanup": true,
    "preservePartStructure": true,
    "preserveUserAccounts": false,
    "preserveSystemConfig": true,
    "createBackup": true
  }'
```

### Method 3: Command Line Script

```bash
node scripts/cleanup-demo-data.js \
  --preserve-parts \
  --preserve-config \
  --create-backup
```

## Verification Process

After cleanup completion, the system automatically verifies:

### Zero Count Verification
- Shipments: 0
- Orders: 0
- Transactions: 0
- Notifications: 0
- Activity Logs: 0
- Mock Users: 0 (if not preserving accounts)

### Data Integrity Checks
- No orphaned records
- Foreign key relationships intact
- System configurations preserved

### Production Readiness Indicators
- ✅ All transactional data cleared
- ✅ All mock users removed
- ✅ System configurations intact
- ✅ Database integrity maintained

## Post-Cleanup Steps

### 1. System Verification
- [ ] Test user registration flow
- [ ] Verify dashboard loading
- [ ] Check system configurations
- [ ] Test basic functionality

### 2. Production Setup
- [ ] Configure production environment variables
- [ ] Set up monitoring and alerts
- [ ] Configure backup schedules
- [ ] Update documentation

### 3. User Onboarding Preparation
- [ ] Prepare onboarding materials
- [ ] Set up support channels
- [ ] Configure notification systems
- [ ] Test access request flows

## Safety Guidelines

### Before Cleanup
- ✅ Create full database backup
- ✅ Verify preservation settings
- ✅ Review preview results
- ✅ Notify team members
- ✅ Schedule during low-traffic hours
- ✅ Test backup restoration process

### During Cleanup
- ⏳ Monitor cleanup progress
- ⏳ Keep backup accessible
- ⏳ Avoid system modifications
- ⏳ Document any issues

### After Cleanup
- ✅ Verify cleanup completion
- ✅ Test critical system functions
- ✅ Review cleanup report
- ✅ Update system documentation
- ✅ Monitor system performance
- ✅ Validate production readiness

## Troubleshooting

### Common Issues

1. **Cleanup Fails with Foreign Key Errors**
   - Solution: Operations are ordered to respect constraints
   - Check for custom relationships not covered

2. **Some Mock Data Remains**
   - Solution: Review detection patterns
   - May need manual cleanup for edge cases

3. **System Performance Issues Post-Cleanup**
   - Solution: Run database optimization
   - Consider reindexing after large deletions

4. **Configuration Lost**
   - Solution: Restore from backup
   - Verify preservation settings were correct

### Recovery Procedures

1. **Partial Failure Recovery**
   ```sql
   -- Check cleanup status
   SELECT COUNT(*) FROM shipments;
   SELECT COUNT(*) FROM users WHERE email LIKE '%demo%';
   ```

2. **Full Recovery from Backup**
   ```bash
   # Restore from backup
   pg_restore -d spareflow_db backup_file.sql
   ```

## API Endpoints

### Cleanup Endpoints
- `POST /api/admin/cleanup-all-mock-data` - Execute comprehensive cleanup
- `POST /api/admin/cleanup-demo-data/preview` - Preview cleanup impact
- `GET /api/admin/system-stats` - Get current system statistics

### Backup Endpoints
- `POST /api/admin/database-backup` - Create database backup
- `GET /api/admin/cleanup-history` - Get cleanup history

## Monitoring and Alerts

### Key Metrics to Monitor
- Database size reduction
- Query performance post-cleanup
- User registration success rate
- System error rates

### Recommended Alerts
- Failed cleanup operations
- Unexpected data patterns
- Performance degradation
- User access issues

## Compliance and Audit

### Audit Trail
- All cleanup operations are logged
- Detailed reports generated
- User actions tracked
- Timestamps recorded

### Compliance Considerations
- Data retention policies
- Privacy regulations
- Business continuity requirements
- Backup and recovery procedures

## Support and Maintenance

### Regular Maintenance
- Schedule periodic cleanup reviews
- Monitor for new mock data patterns
- Update detection algorithms
- Maintain backup procedures

### Support Contacts
- Technical Issues: Development Team
- Business Questions: Product Team
- Emergency Recovery: DevOps Team

---

**Last Updated**: January 2025
**Version**: 1.0
**Status**: Production Ready

For questions or issues, please contact the development team or refer to the system documentation.