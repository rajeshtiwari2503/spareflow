# SpareFlow - Error Codes & Logs Reference

## Table of Contents
1. [Overview](#overview)
2. [Error Code Structure](#error-code-structure)
3. [Authentication Errors](#authentication-errors)
4. [Authorization Errors](#authorization-errors)
5. [Database Errors](#database-errors)
6. [External API Errors](#external-api-errors)
7. [Business Logic Errors](#business-logic-errors)
8. [System Errors](#system-errors)
9. [Logging System](#logging-system)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Log Analysis](#log-analysis)

## Overview

SpareFlow uses a structured error handling system with standardized error codes and comprehensive logging. This document provides reference for all error codes, their meanings, and troubleshooting steps.

### Error Response Format
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": "Additional error details",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_123456789",
  "path": "/api/endpoint"
}
```

## Error Code Structure

Error codes follow the pattern: `CATEGORY_SPECIFIC_ERROR`

### Categories
- `AUTH_*` - Authentication related errors
- `AUTHZ_*` - Authorization related errors
- `DB_*` - Database related errors
- `API_*` - External API related errors
- `BIZ_*` - Business logic errors
- `SYS_*` - System errors
- `VAL_*` - Validation errors

## Authentication Errors

### AUTH_001 - Invalid Credentials
**Message**: "Invalid email or password"
**HTTP Status**: 401
**Cause**: User provided incorrect login credentials
**Solution**: 
- Verify email and password
- Check if account exists
- Reset password if needed

```javascript
// Example occurrence
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "wrongpassword"
}

// Response
{
  "error": "Invalid email or password",
  "code": "AUTH_001"
}
```

### AUTH_002 - Token Missing
**Message**: "No authentication token provided"
**HTTP Status**: 401
**Cause**: Request missing Authorization header
**Solution**: Include Bearer token in request headers

```javascript
// Missing header
GET /api/protected-endpoint

// Should include
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### AUTH_003 - Token Invalid
**Message**: "Invalid or expired authentication token"
**HTTP Status**: 401
**Cause**: JWT token is malformed, expired, or invalid
**Solution**: 
- Refresh token
- Re-authenticate user
- Check JWT_SECRET configuration

### AUTH_004 - Token Expired
**Message**: "Authentication token has expired"
**HTTP Status**: 401
**Cause**: JWT token exceeded expiration time (7 days)
**Solution**: Redirect user to login page

### AUTH_005 - Account Disabled
**Message**: "User account has been disabled"
**HTTP Status**: 403
**Cause**: User account marked as inactive
**Solution**: Contact administrator to reactivate account

### AUTH_006 - Registration Failed
**Message**: "Failed to create user account"
**HTTP Status**: 400
**Cause**: Registration validation failed or email already exists
**Solution**: 
- Check email uniqueness
- Validate input data
- Check password requirements

## Authorization Errors

### AUTHZ_001 - Insufficient Permissions
**Message**: "Insufficient permissions for this operation"
**HTTP Status**: 403
**Cause**: User role doesn't have required permissions
**Solution**: Check user role and endpoint requirements

```javascript
// Example: Customer trying to access admin endpoint
GET /api/admin/users
Authorization: Bearer <customer-token>

// Response
{
  "error": "Insufficient permissions for this operation",
  "code": "AUTHZ_001",
  "details": "Required role: SUPER_ADMIN, Current role: CUSTOMER"
}
```

### AUTHZ_002 - Brand Authorization Required
**Message**: "Brand authorization required for this service center"
**HTTP Status**: 403
**Cause**: Brand trying to ship to unauthorized service center
**Solution**: Add service center to authorized network

### AUTHZ_003 - Access Request Pending
**Message**: "Access request is pending approval"
**HTTP Status**: 403
**Cause**: Service center/distributor access request not yet approved
**Solution**: Wait for brand approval or contact brand

### AUTHZ_004 - Access Request Rejected
**Message**: "Access request has been rejected"
**HTTP Status**: 403
**Cause**: Brand rejected the access request
**Solution**: Contact brand for clarification or submit new request

## Database Errors

### DB_001 - Connection Failed
**Message**: "Database connection failed"
**HTTP Status**: 500
**Cause**: Cannot connect to PostgreSQL database
**Solution**: 
- Check DATABASE_URL
- Verify database server status
- Check network connectivity

```bash
# Troubleshooting steps
psql $DATABASE_URL -c "SELECT 1;"
# Check connection pool status
# Verify Prisma configuration
```

### DB_002 - Query Timeout
**Message**: "Database query timeout"
**HTTP Status**: 500
**Cause**: Query execution exceeded timeout limit
**Solution**: 
- Optimize query performance
- Add database indexes
- Check for table locks

### DB_003 - Constraint Violation
**Message**: "Database constraint violation"
**HTTP Status**: 400
**Cause**: Foreign key, unique, or check constraint violated
**Solution**: 
- Check data integrity
- Verify referenced records exist
- Handle unique constraint violations

```javascript
// Example: Trying to delete user with existing parts
DELETE /api/users?id=user123

// Response
{
  "error": "Cannot delete user with existing parts",
  "code": "DB_003",
  "details": "Foreign key constraint violated: parts_brand_id_fkey"
}
```

### DB_004 - Record Not Found
**Message**: "Requested record not found"
**HTTP Status**: 404
**Cause**: Queried record doesn't exist in database
**Solution**: Verify record ID and existence

### DB_005 - Duplicate Entry
**Message**: "Duplicate entry for unique field"
**HTTP Status**: 400
**Cause**: Attempting to insert duplicate value for unique field
**Solution**: Check for existing records before insertion

## External API Errors

### API_001 - DTDC API Failure
**Message**: "DTDC API request failed"
**HTTP Status**: 502
**Cause**: DTDC courier API returned error or timeout
**Solution**: 
- Check DTDC API credentials
- Verify API endpoint availability
- Retry request after delay

```javascript
// Log entry
{
  "level": "error",
  "message": "DTDC API Error",
  "code": "API_001",
  "details": {
    "endpoint": "https://pxapi.dtdc.in/api/customer/integration/consignment/softdata",
    "status": 500,
    "response": "Internal Server Error"
  }
}
```

### API_002 - WhatsApp API Failure
**Message**: "WhatsApp API request failed"
**HTTP Status**: 502
**Cause**: WhatsApp Business API error
**Solution**: 
- Check WhatsApp API credentials
- Verify phone number ID
- Check message template approval

### API_003 - Razorpay API Failure
**Message**: "Payment processing failed"
**HTTP Status**: 502
**Cause**: Razorpay API error or payment failure
**Solution**: 
- Check Razorpay credentials
- Verify payment details
- Check account status

### API_004 - OpenAI API Failure
**Message**: "AI service unavailable"
**HTTP Status**: 502
**Cause**: OpenAI API error or quota exceeded
**Solution**: 
- Check OpenAI API key
- Verify quota limits
- Implement fallback responses

### API_005 - Rate Limit Exceeded
**Message**: "External API rate limit exceeded"
**HTTP Status**: 429
**Cause**: Too many requests to external API
**Solution**: 
- Implement request throttling
- Add retry with exponential backoff
- Check API rate limits

## Business Logic Errors

### BIZ_001 - Insufficient Wallet Balance
**Message**: "Insufficient wallet balance for this operation"
**HTTP Status**: 400
**Cause**: User wallet balance less than required amount
**Solution**: Add funds to wallet

```javascript
// Example response
{
  "error": "Insufficient wallet balance for this operation",
  "code": "BIZ_001",
  "details": {
    "currentBalance": 150.00,
    "requiredAmount": 500.00,
    "shortfall": 350.00
  }
}
```

### BIZ_002 - Invalid Shipment Configuration
**Message**: "Invalid shipment configuration"
**HTTP Status**: 400
**Cause**: Shipment parameters don't meet business rules
**Solution**: 
- Check box count limits
- Verify weight restrictions
- Validate service center authorization

### BIZ_003 - Part Not Available
**Message**: "Requested part is not available"
**HTTP Status**: 400
**Cause**: Part is inactive or out of stock
**Solution**: 
- Check part availability
- Contact brand for restock
- Use alternative parts

### BIZ_004 - Order Processing Failed
**Message**: "Order processing failed"
**HTTP Status**: 400
**Cause**: Business rule validation failed during order processing
**Solution**: 
- Verify order details
- Check inventory availability
- Validate customer information

### BIZ_005 - Pricing Calculation Failed
**Message**: "Unable to calculate pricing"
**HTTP Status**: 500
**Cause**: Pricing rules misconfigured or missing
**Solution**: 
- Check pricing configuration
- Verify user role pricing
- Update pricing rules

## System Errors

### SYS_001 - Internal Server Error
**Message**: "Internal server error occurred"
**HTTP Status**: 500
**Cause**: Unhandled exception in application code
**Solution**: 
- Check application logs
- Review error stack trace
- Fix underlying code issue

### SYS_002 - Service Unavailable
**Message**: "Service temporarily unavailable"
**HTTP Status**: 503
**Cause**: System maintenance or overload
**Solution**: 
- Check system status
- Wait and retry
- Scale resources if needed

### SYS_003 - Configuration Error
**Message**: "System configuration error"
**HTTP Status**: 500
**Cause**: Missing or invalid environment variables
**Solution**: 
- Check environment configuration
- Verify all required variables are set
- Validate configuration values

### SYS_004 - File Upload Failed
**Message**: "File upload failed"
**HTTP Status**: 400
**Cause**: File upload validation or processing failed
**Solution**: 
- Check file size limits
- Verify file type restrictions
- Check storage availability

### SYS_005 - Health Check Failed
**Message**: "System health check failed"
**HTTP Status**: 503
**Cause**: One or more system components unhealthy
**Solution**: 
- Check database connectivity
- Verify external API availability
- Review system resources

## Logging System

### Log Levels
- **ERROR**: System errors, exceptions, failures
- **WARN**: Warnings, deprecated features, potential issues
- **INFO**: General information, successful operations
- **DEBUG**: Detailed debugging information (development only)

### Log Format
```json
{
  "level": "error",
  "message": "Database connection failed",
  "timestamp": "2024-01-15T10:30:00.123Z",
  "requestId": "req_123456789",
  "userId": "user_abc123",
  "path": "/api/shipments",
  "method": "POST",
  "statusCode": 500,
  "error": {
    "code": "DB_001",
    "stack": "Error: Connection timeout...",
    "details": {
      "host": "localhost",
      "port": 5432,
      "database": "spareflow"
    }
  },
  "context": {
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.1",
    "referer": "https://app.spareflow.com/dashboard"
  }
}
```

### Log Categories

#### Authentication Logs
```json
{
  "level": "info",
  "message": "User login successful",
  "userId": "user_123",
  "email": "user@example.com",
  "ip": "192.168.1.1",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### API Request Logs
```json
{
  "level": "info",
  "message": "API request completed",
  "method": "POST",
  "path": "/api/shipments",
  "statusCode": 201,
  "responseTime": 1250,
  "userId": "user_123",
  "requestId": "req_456"
}
```

#### Business Operation Logs
```json
{
  "level": "info",
  "message": "Shipment created successfully",
  "shipmentId": "ship_789",
  "brandId": "brand_123",
  "serviceCenterId": "sc_456",
  "numBoxes": 5,
  "totalCost": 500.00
}
```

#### Error Logs
```json
{
  "level": "error",
  "message": "DTDC API request failed",
  "code": "API_001",
  "error": {
    "message": "Request timeout",
    "status": 500,
    "endpoint": "https://pxapi.dtdc.in/api/..."
  },
  "context": {
    "shipmentId": "ship_789",
    "awbRequest": {
      "consignee_pincode": "400001",
      "weight": 2.5
    }
  }
}
```

### Log Storage Locations

#### Development
- **Console**: All logs output to console
- **File**: Optional file logging in `logs/` directory

#### Production
- **Vercel Logs**: Automatic log collection
- **External Service**: Optional integration with logging services
- **Database**: Critical errors stored in database

### Log Retention
- **Development**: No retention limit
- **Staging**: 7 days
- **Production**: 30 days for application logs, 90 days for audit logs

## Troubleshooting Guide

### Common Error Scenarios

#### 1. User Cannot Login
```bash
# Check logs for AUTH_* errors
grep "AUTH_" logs/application.log

# Common causes:
# - Wrong credentials (AUTH_001)
# - Account disabled (AUTH_005)
# - Database connection issue (DB_001)

# Troubleshooting steps:
1. Verify user exists in database
2. Check password hash
3. Verify account status
4. Check database connectivity
```

#### 2. Shipment Creation Fails
```bash
# Check for BIZ_* and API_* errors
grep -E "(BIZ_|API_)" logs/application.log

# Common causes:
# - Insufficient wallet balance (BIZ_001)
# - DTDC API failure (API_001)
# - Authorization issue (AUTHZ_002)

# Troubleshooting steps:
1. Check wallet balance
2. Verify DTDC API credentials
3. Check brand authorization
4. Validate shipment parameters
```

#### 3. Database Connection Issues
```bash
# Check DB_* errors
grep "DB_001" logs/application.log

# Troubleshooting steps:
1. Test database connection: psql $DATABASE_URL -c "SELECT 1;"
2. Check connection pool status
3. Verify DATABASE_URL format
4. Check network connectivity
5. Review database server logs
```

#### 4. External API Failures
```bash
# Check API_* errors
grep -E "API_00[1-5]" logs/application.log

# Troubleshooting steps:
1. Verify API credentials
2. Check API endpoint status
3. Review rate limiting
4. Test API endpoints manually
5. Check network connectivity
```

### Debug Commands

#### Application Debugging
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check specific modules
DEBUG="prisma:*" npm run dev
DEBUG="dtdc:*" npm run dev

# View real-time logs
tail -f logs/application.log

# Search for specific errors
grep -i "error" logs/application.log | tail -20
```

#### Database Debugging
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql $DATABASE_URL -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

#### API Debugging
```bash
# Test DTDC API
curl -X POST "https://pxapi.dtdc.in/api/customer/integration/consignment/softdata" \
  -H "api-key: $DTDC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Test WhatsApp API
curl -X POST "https://graph.facebook.com/v17.0/$WHATSAPP_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product": "whatsapp", "to": "test", "type": "text", "text": {"body": "test"}}'
```

## Log Analysis

### Performance Analysis
```bash
# Find slow API requests (>2 seconds)
grep '"responseTime":[2-9][0-9][0-9][0-9]' logs/application.log

# Most common errors
grep '"level":"error"' logs/application.log | jq -r '.code' | sort | uniq -c | sort -nr

# User activity analysis
grep '"level":"info"' logs/application.log | jq -r '.userId' | sort | uniq -c | sort -nr
```

### Error Pattern Analysis
```bash
# Error frequency by hour
grep '"level":"error"' logs/application.log | jq -r '.timestamp' | cut -c12-13 | sort | uniq -c

# Most affected endpoints
grep '"level":"error"' logs/application.log | jq -r '.path' | sort | uniq -c | sort -nr

# Error correlation with user roles
grep '"level":"error"' logs/application.log | jq -r '.userRole' | sort | uniq -c
```

### Automated Monitoring
```bash
# Error rate monitoring script
#!/bin/bash
ERROR_COUNT=$(grep '"level":"error"' logs/application.log | wc -l)
TOTAL_REQUESTS=$(grep '"level":"info"' logs/application.log | grep "API request" | wc -l)
ERROR_RATE=$(echo "scale=2; $ERROR_COUNT / $TOTAL_REQUESTS * 100" | bc)

if (( $(echo "$ERROR_RATE > 5" | bc -l) )); then
    echo "High error rate detected: $ERROR_RATE%"
    # Send alert
fi
```

This comprehensive error codes and logs reference provides the foundation for effective troubleshooting and monitoring of the SpareFlow platform.