# SuperAdmin Dashboard User Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [User Role Management](#user-role-management)
5. [Unified Pricing System](#unified-pricing-system)
6. [Product Catalog Master](#product-catalog-master)
7. [Wallet & Financial Control](#wallet--financial-control)
8. [System Analytics & Reports](#system-analytics--reports)
9. [Courier API Management](#courier-api-management)
10. [System Configuration](#system-configuration)
11. [Audit Logs & Monitoring](#audit-logs--monitoring)
12. [Troubleshooting](#troubleshooting)

## Overview

The SuperAdmin Dashboard provides comprehensive system-wide management capabilities for the SpareFlow platform. It enables administrators to manage users, configure pricing, monitor system health, and maintain overall platform operations.

### Key Responsibilities:
- **User Management**: Control user accounts, roles, and permissions
- **Pricing Control**: Manage global and brand-specific pricing
- **System Monitoring**: Track performance and system health
- **Financial Oversight**: Monitor transactions and wallet operations
- **Content Management**: Oversee product catalogs and approvals
- **Security Management**: Maintain system security and compliance

### Access Levels:
- **Super Administrator**: Full system access
- **System Administrator**: Limited administrative functions
- **Support Administrator**: User support and basic operations
- **Read-Only Administrator**: View-only access for reporting

## Getting Started

### Initial Setup
1. **Secure Login**
   - Use provided SuperAdmin credentials
   - Enable two-factor authentication
   - Set strong password
   - Configure session timeout

2. **Dashboard Familiarization**
   - Review system overview
   - Check critical alerts
   - Verify system health
   - Review pending tasks

3. **Security Configuration**
   - Review user access logs
   - Check system permissions
   - Verify backup status
   - Update security settings

## Dashboard Overview

### System Health Indicators
- **System Status**: Overall platform health
- **Active Users**: Currently logged-in users
- **Transaction Volume**: Real-time transaction count
- **Error Rate**: System error percentage
- **Response Time**: Average API response time
- **Database Health**: Database performance metrics

### Critical Alerts Panel
- **Security Alerts**: Suspicious activities
- **System Errors**: Critical system issues
- **Performance Warnings**: Resource utilization alerts
- **Backup Status**: Data backup notifications
- **Integration Issues**: Third-party service problems

### Quick Actions
- **User Management**: Add/modify users
- **System Configuration**: Update settings
- **Pricing Updates**: Modify pricing rules
- **Content Approval**: Review pending content
- **Generate Reports**: Create system reports

## User Role Management

### User Overview Dashboard
```
User Statistics:
- Total Users: All registered users
- Active Users: Recently active users
- New Registrations: Recent sign-ups
- Role Distribution: Users by role type
- Geographic Distribution: Users by location
- Account Status: Active/Inactive/Suspended
```

### Managing User Accounts

#### User Search & Filtering
1. **Search Options**:
   - Email address
   - Phone number
   - User ID
   - Company name
   - Registration date range

2. **Filter Criteria**:
   - User role (Brand/Distributor/Service Center/Customer)
   - Account status (Active/Inactive/Suspended)
   - Registration date
   - Last login date
   - Geographic location

#### User Actions
1. **View User Details**
   ```
   User Information:
   - Personal details
   - Contact information
   - Account status
   - Role assignments
   - Activity history
   - Transaction summary
   ```

2. **Account Management**
   - **Activate Account**: Enable user access
   - **Suspend Account**: Temporarily disable access
   - **Reset Password**: Force password reset
   - **Update Role**: Change user permissions
   - **Delete Account**: Permanently remove user

3. **Communication**
   - **Send Message**: Direct communication
   - **Email Notification**: System notifications
   - **Account Alerts**: Important updates

### Role-Based Access Control

#### Role Definitions
1. **Brand Users**
   - Manage spare parts catalog
   - Create shipments to authorized partners
   - Handle returns and warranty claims
   - Access brand-specific analytics

2. **Distributor Users**
   - Process incoming orders
   - Manage inventory
   - Handle payments and transactions
   - Access distributor analytics

3. **Service Center Users**
   - Request spare parts
   - Manage incoming shipments
   - Process returns
   - Handle customer service

4. **Customer Users**
   - Search and order spare parts
   - Track orders and shipments
   - Manage warranties
   - Access AI diagnostic tools

#### Permission Management
- **Feature Access**: Control feature availability
- **Data Access**: Limit data visibility
- **Transaction Limits**: Set spending limits
- **Geographic Restrictions**: Limit service areas
- **Time-based Access**: Set access schedules

### Bulk User Operations
1. **Bulk Import**
   - Upload user data via CSV
   - Validate user information
   - Assign roles automatically
   - Send welcome notifications

2. **Bulk Updates**
   - Update user information
   - Change role assignments
   - Modify account status
   - Apply policy changes

3. **Bulk Communications**
   - Send announcements
   - Policy updates
   - System maintenance notices
   - Feature announcements

## Unified Pricing System

### Pricing Overview
The unified pricing system manages all courier pricing across the platform, including global defaults and brand-specific overrides.

#### Pricing Components
- **Base Rates**: Fundamental shipping costs
- **Weight Charges**: Additional charges per kg
- **Distance Multipliers**: Location-based pricing
- **Service Type Rates**: Express/Standard pricing
- **Markup Percentages**: Platform commission
- **Minimum Charges**: Floor pricing limits

### Global Pricing Configuration

#### Default Pricing Rules
1. **Navigate to Pricing Tab**
2. **Configure Global Settings**:
   ```
   Base Configuration:
   - Base Rate: ₹50.00
   - Weight Charge per KG: ₹15.00
   - Free Weight Limit: 0.5 KG
   - Minimum Charge: ₹30.00
   - Maximum Weight: 50 KG
   
   Service Multipliers:
   - Standard Service: 1.0x
   - Express Service: 1.5x
   - Same Day: 2.0x
   - Next Day: 1.3x
   
   Location Charges:
   - Metro Cities: 1.0x
   - Tier 2 Cities: 1.2x
   - Remote Areas: 1.5x
   - Northeast: 1.8x
   ```

3. **Markup Settings**:
   - Default Markup: 15%
   - Minimum Markup: 5%
   - Maximum Markup: 50%
   - Brand-specific overrides

### Brand-Specific Pricing

#### Creating Brand Overrides
1. **Select Brand**: Choose target brand
2. **Override Settings**:
   ```
   Brand Pricing Override:
   - Custom Base Rate
   - Modified Weight Charges
   - Special Markup Percentage
   - Minimum Order Value
   - Volume Discounts
   - Seasonal Adjustments
   ```

3. **Approval Workflow**:
   - Submit pricing changes
   - Review and approve
   - Implement changes
   - Monitor impact

#### Volume-Based Pricing
- **Tier 1**: 0-100 shipments/month
- **Tier 2**: 101-500 shipments/month
- **Tier 3**: 501-1000 shipments/month
- **Tier 4**: 1000+ shipments/month

### Price Calculator Tool

#### Real-Time Calculations
1. **Input Parameters**:
   - Weight and dimensions
   - Origin and destination
   - Service type
   - Brand selection
   - Special requirements

2. **Price Breakdown**:
   - Base shipping cost
   - Weight charges
   - Service multipliers
   - Location adjustments
   - Platform markup
   - Total cost

3. **Comparison Tool**:
   - Compare different service types
   - Brand-specific pricing
   - Volume discount impact
   - Historical pricing trends

### Pricing Analytics
- **Revenue Impact**: Pricing change effects
- **Margin Analysis**: Profitability metrics
- **Competitive Analysis**: Market positioning
- **Volume Trends**: Shipping volume patterns
- **Cost Optimization**: Efficiency improvements

## Product Catalog Master

### Catalog Overview
Centralized management of all spare parts across all brands on the platform.

#### Catalog Statistics
- **Total Parts**: All parts in system
- **Pending Approvals**: Parts awaiting review
- **Active Parts**: Currently available parts
- **Inactive Parts**: Discontinued/unavailable parts
- **Brand Distribution**: Parts by brand
- **Category Breakdown**: Parts by category

### Part Approval Workflow

#### Review Process
1. **Pending Parts Queue**
   - New part submissions
   - Part modification requests
   - Bulk upload reviews
   - Brand catalog updates

2. **Part Review Criteria**:
   ```
   Technical Validation:
   - Part number accuracy
   - Specification completeness
   - Image quality
   - Compatibility information
   
   Business Validation:
   - Pricing reasonableness
   - Market demand
   - Brand authorization
   - Compliance requirements
   ```

3. **Approval Actions**:
   - **Approve**: Make part available
   - **Reject**: Return with feedback
   - **Request Changes**: Ask for modifications
   - **Hold**: Pending additional review

### Catalog Management Tools

#### Bulk Operations
1. **Mass Approval**: Approve multiple parts
2. **Bulk Rejection**: Reject with common reason
3. **Category Updates**: Change part categories
4. **Price Adjustments**: Modify pricing
5. **Status Changes**: Update availability

#### Quality Control
- **Duplicate Detection**: Identify duplicate parts
- **Data Validation**: Check data completeness
- **Image Quality**: Verify image standards
- **Specification Accuracy**: Validate technical data
- **Compliance Check**: Ensure regulatory compliance

### Category Management
1. **Category Structure**:
   - Main categories
   - Sub-categories
   - Product types
   - Compatibility groups

2. **Category Operations**:
   - Add new categories
   - Modify existing categories
   - Merge categories
   - Archive unused categories

## Wallet & Financial Control

### Financial Dashboard
```
Financial Overview:
- Total Platform Revenue
- Transaction Volume
- Commission Earned
- Pending Settlements
- Refund Processing
- Payment Gateway Costs
```

### Wallet Management

#### User Wallet Operations
1. **Wallet Overview**:
   - Total wallet balances
   - Active wallets
   - Inactive wallets
   - Negative balances
   - Credit limits

2. **Wallet Actions**:
   - **Credit Wallet**: Add funds to user wallet
   - **Debit Wallet**: Deduct funds (with reason)
   - **Freeze Wallet**: Temporarily suspend
   - **Adjust Balance**: Correct discrepancies
   - **Set Limits**: Configure spending limits

#### Transaction Monitoring
1. **Transaction Types**:
   - Order payments
   - Refund processing
   - Wallet top-ups
   - Commission deductions
   - Penalty charges

2. **Transaction Analysis**:
   - Volume trends
   - Value patterns
   - Failure rates
   - Processing times
   - Geographic distribution

### Financial Reports

#### Revenue Reports
- **Daily Revenue**: Day-wise earnings
- **Monthly Trends**: Month-over-month growth
- **Brand Performance**: Revenue by brand
- **Commission Analysis**: Platform earnings
- **Payment Method**: Revenue by payment type

#### Settlement Reports
- **Pending Settlements**: Outstanding payments
- **Settlement History**: Completed settlements
- **Reconciliation**: Payment matching
- **Dispute Resolution**: Payment disputes
- **Tax Reporting**: GST and TDS reports

### Payment Gateway Management
1. **Gateway Configuration**:
   - Payment method setup
   - Gateway credentials
   - Transaction limits
   - Failure handling

2. **Gateway Monitoring**:
   - Success rates
   - Failure analysis
   - Response times
   - Cost analysis

## System Analytics & Reports

### Platform Analytics

#### User Analytics
```
User Metrics:
- Registration trends
- User activity patterns
- Role distribution
- Geographic spread
- Retention rates
- Churn analysis
```

#### Business Analytics
```
Business Metrics:
- Order volume trends
- Revenue growth
- Market penetration
- Brand performance
- Category analysis
- Seasonal patterns
```

#### Operational Analytics
```
Operational Metrics:
- System performance
- API response times
- Error rates
- Database performance
- Integration health
- Resource utilization
```

### Custom Report Builder

#### Report Configuration
1. **Select Data Sources**:
   - User data
   - Transaction data
   - Inventory data
   - System logs
   - Performance metrics

2. **Define Parameters**:
   - Date ranges
   - User filters
   - Geographic filters
   - Category filters
   - Custom conditions

3. **Output Options**:
   - PDF reports
   - Excel exports
   - CSV downloads
   - Email delivery
   - Scheduled reports

### Real-Time Dashboards
- **Live Metrics**: Real-time system status
- **Alert Monitoring**: Critical issue tracking
- **Performance Tracking**: System health metrics
- **User Activity**: Live user interactions
- **Transaction Monitoring**: Real-time payments

## Courier API Management

### API Integration Overview
Management of all courier partner integrations and API configurations.

#### Supported Courier Partners
- **DTDC**: Primary courier partner
- **Blue Dart**: Express delivery
- **Delhivery**: Pan-India coverage
- **Ecom Express**: E-commerce focused
- **Xpressbees**: Regional coverage

### API Configuration

#### DTDC Integration
1. **API Credentials**:
   ```
   DTDC Configuration:
   - Customer ID
   - API Key
   - Service Type
   - Tracking Credentials
   - Webhook URLs
   ```

2. **Service Configuration**:
   - Available services
   - Service area mapping
   - Pricing integration
   - Tracking setup

#### API Monitoring
1. **Performance Metrics**:
   - API response times
   - Success rates
   - Error frequencies
   - Timeout occurrences
   - Rate limit usage

2. **Error Tracking**:
   - API failures
   - Integration issues
   - Data sync problems
   - Webhook failures

### Courier Logs Management

#### Log Categories
1. **API Calls**: All courier API interactions
2. **Shipment Creation**: AWB generation logs
3. **Tracking Updates**: Status update logs
4. **Error Logs**: Failed API calls
5. **Webhook Logs**: Incoming notifications

#### Log Analysis
- **Performance Analysis**: API efficiency
- **Error Pattern Recognition**: Common issues
- **Volume Analysis**: API usage patterns
- **Cost Analysis**: API usage costs
- **Optimization Opportunities**: Improvement areas

## System Configuration

### Platform Settings

#### General Configuration
```
System Settings:
- Platform Name & Branding
- Default Language & Currency
- Time Zone Settings
- Session Timeout
- File Upload Limits
- Email Templates
```

#### Feature Toggles
- **Maintenance Mode**: System-wide maintenance
- **New Registrations**: Enable/disable sign-ups
- **Payment Processing**: Enable/disable payments
- **API Access**: Control API availability
- **Feature Rollouts**: Gradual feature deployment

### Security Configuration

#### Authentication Settings
1. **Password Policies**:
   - Minimum length requirements
   - Complexity requirements
   - Expiration policies
   - History restrictions

2. **Session Management**:
   - Session timeout
   - Concurrent sessions
   - IP restrictions
   - Device tracking

#### Access Control
- **Role-based permissions**
- **Feature-level access**
- **Data-level security**
- **API access control**
- **Geographic restrictions**

### Integration Settings

#### Third-Party Services
1. **Payment Gateways**:
   - Razorpay configuration
   - UPI settings
   - Bank integration
   - Wallet services

2. **Communication Services**:
   - Email service (SMTP)
   - SMS gateway
   - WhatsApp Business API
   - Push notifications

3. **AI Services**:
   - OpenAI integration
   - Machine learning models
   - Natural language processing
   - Image recognition

## Audit Logs & Monitoring

### System Monitoring

#### Health Checks
1. **Automated Monitoring**:
   - Database connectivity
   - API responsiveness
   - Service availability
   - Resource utilization
   - Error rates

2. **Alert Configuration**:
   - Threshold settings
   - Notification channels
   - Escalation procedures
   - Recovery actions

#### Performance Monitoring
- **Response Time Tracking**: API and page load times
- **Resource Usage**: CPU, memory, storage
- **Database Performance**: Query optimization
- **Network Monitoring**: Bandwidth and latency
- **User Experience**: Page load and interaction times

### Audit Trail Management

#### Activity Logging
```
Logged Activities:
- User login/logout
- Data modifications
- System configuration changes
- Financial transactions
- Security events
- API access
```

#### Log Analysis
1. **Security Auditing**:
   - Suspicious activities
   - Failed login attempts
   - Unauthorized access
   - Data breaches
   - Policy violations

2. **Compliance Reporting**:
   - Regulatory compliance
   - Data protection
   - Financial regulations
   - Industry standards
   - Internal policies

### Backup & Recovery

#### Backup Management
1. **Automated Backups**:
   - Database backups
   - File system backups
   - Configuration backups
   - Log backups

2. **Backup Verification**:
   - Backup integrity checks
   - Recovery testing
   - Backup retention policies
   - Offsite storage

#### Disaster Recovery
- **Recovery Procedures**: Step-by-step recovery
- **RTO/RPO Targets**: Recovery time objectives
- **Failover Procedures**: System failover
- **Communication Plans**: Incident communication
- **Testing Schedules**: Regular DR testing

## Troubleshooting

### Common Administrative Issues

#### User Access Problems
**Problem**: Users cannot access their accounts
**Solution**:
1. Check account status (Active/Suspended)
2. Verify role permissions
3. Check for system-wide issues
4. Reset user credentials if needed
5. Review security logs for blocks

#### System Performance Issues
**Problem**: Platform running slowly
**Solution**:
1. Check system resource usage
2. Review database performance
3. Analyze API response times
4. Check third-party service status
5. Scale resources if needed

#### Payment Processing Issues
**Problem**: Payments failing or delayed
**Solution**:
1. Check payment gateway status
2. Verify gateway configurations
3. Review transaction logs
4. Check for API limits
5. Contact payment provider support

#### Integration Failures
**Problem**: Third-party services not working
**Solution**:
1. Verify API credentials
2. Check service status
3. Review error logs
4. Test API endpoints
5. Update integration settings

### Error Resolution

#### Critical Errors
1. **System Down**: Complete platform failure
   - Activate disaster recovery
   - Communicate with stakeholders
   - Implement emergency procedures
   - Monitor recovery progress

2. **Data Corruption**: Database integrity issues
   - Stop affected services
   - Restore from backup
   - Verify data integrity
   - Resume operations

3. **Security Breach**: Unauthorized access
   - Isolate affected systems
   - Change all credentials
   - Investigate breach scope
   - Implement security patches

#### Performance Issues
1. **Slow Response Times**:
   - Identify bottlenecks
   - Optimize database queries
   - Scale infrastructure
   - Implement caching

2. **High Error Rates**:
   - Analyze error patterns
   - Fix code issues
   - Update configurations
   - Monitor improvements

### Maintenance Procedures

#### Regular Maintenance
1. **Daily Tasks**:
   - System health checks
   - Review critical alerts
   - Monitor performance metrics
   - Check backup status

2. **Weekly Tasks**:
   - Security log review
   - Performance analysis
   - User activity review
   - System updates

3. **Monthly Tasks**:
   - Comprehensive system review
   - Security audit
   - Performance optimization
   - Disaster recovery testing

#### Emergency Procedures
1. **Incident Response**:
   - Incident identification
   - Impact assessment
   - Response team activation
   - Resolution implementation
   - Post-incident review

2. **Communication Protocol**:
   - Stakeholder notification
   - Status updates
   - Resolution communication
   - Post-mortem sharing

### Getting Support

#### Internal Support
1. **Technical Team**: Development and infrastructure
2. **Security Team**: Security and compliance
3. **Business Team**: Business operations
4. **External Vendors**: Third-party support

#### External Support
- **Cloud Provider**: Infrastructure support
- **Payment Gateway**: Payment processing
- **Courier Partners**: Logistics support
- **Security Vendors**: Security services

#### Documentation Resources
- **System Architecture**: Technical documentation
- **API Documentation**: Integration guides
- **Security Policies**: Security procedures
- **Operational Procedures**: Standard operations
- **Troubleshooting Guides**: Problem resolution

---

*This guide covers SpareFlow SuperAdmin Dashboard v2.0. For system updates and new features, refer to the technical documentation and change logs.*