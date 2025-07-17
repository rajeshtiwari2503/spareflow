# Brand Dashboard User Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Inventory & Spare Catalog](#inventory--spare-catalog)
5. [Shipment Booking](#shipment-booking)
6. [Authorized Network Management](#authorized-network-management)
7. [Wallet Management](#wallet-management)
8. [Return Management](#return-management)
9. [Notifications](#notifications)
10. [Profile Management](#profile-management)
11. [Troubleshooting](#troubleshooting)

## Overview

The Brand Dashboard is designed for spare parts manufacturers and brand owners to manage their logistics operations, authorized dealer networks, inventory, and shipments efficiently.

### Key Features:
- **Inventory Management**: Catalog and manage spare parts
- **Shipment Booking**: Create secure shipments to authorized partners
- **Network Management**: Manage authorized service centers and distributors
- **Wallet Operations**: Handle payments and transaction history
- **Return Processing**: Manage product returns and exchanges
- **Analytics**: Track performance and business metrics

## Getting Started

### First Login
1. Navigate to the SpareFlow login page
2. Enter your brand credentials
3. Complete profile setup if prompted
4. Review dashboard overview

### Profile Setup
1. Click on your profile icon (top right)
2. Select "Profile Settings"
3. Complete all required fields:
   - Company Information
   - Contact Details
   - Business Address
   - GST/Tax Information
4. Click "Save Changes"

## Dashboard Overview

### Main Dashboard Metrics
- **Total Parts**: Number of parts in your catalog
- **Active Shipments**: Currently in-transit shipments
- **Authorized Partners**: Total service centers and distributors
- **Wallet Balance**: Current account balance
- **Pending Returns**: Returns awaiting processing
- **Monthly Revenue**: Current month's earnings

### Quick Actions
- Create New Shipment
- Add New Part
- View Notifications
- Check Wallet Balance
- Manage Network

## Inventory & Spare Catalog

### Adding New Parts

1. **Navigate to Inventory Tab**
   - Click "Inventory" in the main navigation
   - Select "Add New Part"

2. **Fill Part Details**
   ```
   Basic Information:
   - Part Name*
   - Part Number/SKU*
   - Category*
   - Brand Model*
   
   Technical Specifications:
   - Dimensions (L×B×H)*
   - Weight*
   - Material
   - Compatibility
   
   Pricing & Availability:
   - Cost Price*
   - Selling Price*
   - Stock Quantity*
   - Minimum Stock Level
   
   Media:
   - Part Images (up to 5)
   - Technical Drawings
   - Installation Videos
   ```

3. **Save and Publish**
   - Review all information
   - Click "Save as Draft" or "Publish"
   - Published parts are visible to authorized partners

### Managing Existing Parts

#### Edit Part Information
1. Go to Inventory → Manage Parts
2. Find the part using search or filters
3. Click "Edit" button
4. Update required fields
5. Save changes

#### Bulk Operations
1. Select multiple parts using checkboxes
2. Choose bulk action:
   - Update Prices
   - Adjust Stock
   - Change Status
   - Export Data

#### Stock Management
- **Restock Alerts**: Set minimum stock levels
- **Stock Adjustments**: Add/remove inventory
- **Stock History**: View all stock movements

## Shipment Booking

### Creating a New Shipment

#### Step 1: Select Service Center
1. Click "Shipment" tab
2. Select "Create New Shipment"
3. Choose from authorized service centers
4. Verify recipient details

> **Note**: Only authorized service centers will appear in the dropdown. If none are available, you'll see: "You have no authorized Service Centers. Please add one first."

#### Step 2: Select Parts
1. Browse available parts
2. Select required parts
3. Specify quantities
4. Review part details and weights

#### Step 3: Packaging Details
1. Enter number of boxes/packages
2. Specify package dimensions
3. Add special handling instructions
4. Select packaging type

#### Step 4: Calculate Shipping Cost
1. Click "Calculate Price"
2. Review cost breakdown:
   - Base shipping cost
   - Weight charges
   - Service charges
   - Total amount
3. Confirm pricing

#### Step 5: Part Allocation
1. Distribute parts across boxes
2. Ensure all parts are allocated
3. Review box weights
4. Confirm allocation

#### Step 6: Create Shipment
1. Review all details
2. Confirm wallet balance
3. Click "Create Secure Shipment"
4. AWB will be generated automatically

### Tracking Shipments
1. Go to Shipment → Track Shipments
2. View shipment status:
   - Created
   - Picked Up
   - In Transit
   - Out for Delivery
   - Delivered
3. Click on AWB number for detailed tracking

## Authorized Network Management

### Overview
Manage your authorized service centers and distributors who can receive shipments and access your parts catalog.

### Adding Existing Users

#### Search and Add
1. Navigate to "Network" tab
2. Select "Add Existing User"
3. Use search bar to find users by:
   - Email address
   - User ID
   - Company name
4. Select user from search results
5. Choose role type:
   - Service Center
   - Distributor
6. Click "Add to Authorized List"

#### Bulk Upload
1. Click "Bulk Upload" button
2. Download CSV template
3. Fill template with:
   - User Email/ID
   - Role Type
4. Upload completed CSV
5. Review validation results
6. Confirm additions

### Managing Authorized Partners

#### View Partners
- **My Service Centers**: List of authorized service centers
- **My Distributors**: List of authorized distributors

#### Partner Information Display
- User Name
- Role Type
- Email Address
- Phone Number
- Status (Active/Inactive)
- Date Added

#### Partner Actions
- **Toggle Status**: Activate/Deactivate access
- **Remove Access**: Permanently remove authorization
- **View Details**: See complete partner information
- **Send Message**: Direct communication

### Access Requests Management
1. Navigate to Network → Access Requests
2. Review pending requests:
   - Requester information
   - Requested role
   - Message/Reason
   - Supporting documents
3. Actions available:
   - Approve Request
   - Reject Request
   - Request More Information

## Wallet Management

### Wallet Overview
- **Current Balance**: Available funds
- **Pending Transactions**: Processing payments
- **Monthly Spending**: Current month expenses
- **Transaction History**: Complete payment log

### Adding Funds
1. Click "Add Funds" button
2. Enter amount
3. Select payment method:
   - UPI
   - Net Banking
   - Credit/Debit Card
4. Complete payment process
5. Funds reflect within 5-10 minutes

### Transaction History
- **Date & Time**: When transaction occurred
- **Type**: Credit/Debit
- **Amount**: Transaction value
- **Description**: Purpose/Details
- **Status**: Success/Failed/Pending
- **Balance**: Account balance after transaction

### Auto-Recharge Settings
1. Go to Wallet → Settings
2. Enable auto-recharge
3. Set minimum balance threshold
4. Set recharge amount
5. Select payment method
6. Save settings

## Return Management

### Processing Returns

#### Viewing Return Requests
1. Navigate to "Returns" tab
2. View all return requests:
   - Return ID
   - Service Center/Distributor
   - Parts Requested
   - Reason for Return
   - Status
   - Date Requested

#### Approving Returns
1. Click on return request
2. Review details:
   - Original shipment information
   - Return reason
   - Part condition
   - Photos/Documentation
3. Actions:
   - **Approve**: Generate return AWB
   - **Reject**: Provide reason
   - **Request Info**: Ask for clarification

#### Return Tracking
- Track return shipments
- Update return status
- Process refunds/replacements
- Update inventory upon receipt

### Return Analytics
- Return rates by part
- Common return reasons
- Partner-wise return statistics
- Cost impact analysis

## Notifications

### Notification Types
- **Shipment Updates**: Delivery status changes
- **Return Requests**: New return submissions
- **Access Requests**: Network authorization requests
- **Low Stock Alerts**: Inventory warnings
- **Payment Notifications**: Wallet transactions
- **System Updates**: Platform announcements

### Managing Notifications
1. Click notification bell icon
2. View recent notifications
3. Mark as read/unread
4. Set notification preferences:
   - Email notifications
   - SMS alerts
   - In-app notifications
   - WhatsApp updates

## Profile Management

### Company Information
- Company Name
- Registration Number
- GST Number
- PAN Number
- Industry Type
- Company Size

### Contact Details
- Primary Contact Person
- Email Address
- Phone Numbers
- Website URL
- Social Media Links

### Address Management
1. Go to Profile → Addresses
2. Add multiple addresses:
   - Registered Office
   - Warehouse Locations
   - Billing Address
   - Shipping Address
3. Set default addresses for different purposes

### Business Settings
- Operating Hours
- Service Areas
- Preferred Courier Partners
- Special Instructions
- Terms & Conditions

## Troubleshooting

### Common Issues

#### "No Authorized Service Centers" Error
**Problem**: Cannot create shipments due to no authorized partners
**Solution**:
1. Go to Network tab
2. Add service centers using "Add Existing User"
3. Ensure their status is "Active"
4. Try creating shipment again

#### Parts Not Loading in Shipment
**Problem**: No parts appear when creating shipment
**Solution**:
1. Verify parts are published (not draft)
2. Check part availability status
3. Ensure parts have stock quantity > 0
4. Refresh the page and try again

#### Courier Price Calculation Fails
**Problem**: "Calculate Price" button doesn't work
**Solution**:
1. Ensure all parts are selected
2. Verify total weight > 0
3. Check wallet balance
4. Try refreshing and recalculating

#### Search Not Finding Users
**Problem**: Cannot find users in network search
**Solution**:
1. Verify exact email address
2. Check if user exists in system
3. Ensure user has correct role type
4. Contact support if user should exist

### Error Messages

#### "Internal Server Error"
- Refresh the page
- Clear browser cache
- Try again in a few minutes
- Contact support if persistent

#### "Unauthorized Access"
- Verify login status
- Check user permissions
- Re-login if necessary
- Contact admin for role verification

#### "Insufficient Wallet Balance"
- Add funds to wallet
- Check pending transactions
- Verify transaction limits
- Contact support for payment issues

### Performance Tips

#### Faster Loading
- Use specific search terms
- Apply date range filters
- Limit results per page
- Close unused browser tabs

#### Better Experience
- Use Chrome or Firefox browsers
- Enable JavaScript
- Allow notifications
- Keep browser updated

### Getting Help

#### In-App Support
1. Click "Help" button
2. Search knowledge base
3. Submit support ticket
4. Live chat (business hours)

#### Contact Information
- **Email**: support@spareflow.com
- **Phone**: +91-XXXX-XXXX-XX
- **Hours**: 9 AM - 6 PM (Mon-Fri)
- **Emergency**: 24/7 for critical issues

#### Documentation
- API Documentation
- Video Tutorials
- Best Practices Guide
- FAQ Section

---

*This guide covers SpareFlow Brand Dashboard v2.0. For the latest updates, check the platform announcements.*