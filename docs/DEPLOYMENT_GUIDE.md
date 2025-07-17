# SpareFlow - Deployment & Environment Guide

## Table of Contents
1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Database Management](#database-management)
7. [Environment Variables](#environment-variables)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Monitoring & Health Checks](#monitoring--health-checks)
10. [Backup & Restore](#backup--restore)
11. [Troubleshooting](#troubleshooting)

## Overview

SpareFlow is deployed using Vercel for the frontend and API, with PostgreSQL database hosted on cloud providers. The application supports multiple environments with proper configuration management.

### Deployment Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging     │    │   Production    │
│   (localhost)   │    │   (Vercel)      │    │   (Vercel)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local DB      │    │   Staging DB    │    │  Production DB  │
│  (PostgreSQL)   │    │  (Cloud SQL)    │    │  (Cloud SQL)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Environment Setup

### Prerequisites
- Node.js 20.x or higher
- npm or pnpm package manager
- PostgreSQL 14+ (local development)
- Git
- Vercel CLI (for deployment)

### System Requirements
- **Development**: 8GB RAM, 2GB free disk space
- **Staging**: 2GB RAM, 10GB storage
- **Production**: 4GB RAM, 50GB storage, CDN

## Local Development

### 1. Clone Repository
```bash
git clone https://github.com/your-org/spareflow.git
cd spareflow
```

### 2. Install Dependencies
```bash
# Using npm
npm install

# Using pnpm (recommended)
pnpm install
```

### 3. Environment Configuration
Create `.env.local` file:
```bash
cp .env.example .env.local
```

### 4. Database Setup
```bash
# Start PostgreSQL locally
# macOS with Homebrew
brew services start postgresql

# Ubuntu/Debian
sudo systemctl start postgresql

# Create database
createdb spareflow_dev

# Set database URL in .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/spareflow_dev"
```

### 5. Database Migration
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma db push

# Seed database (optional)
npx prisma db seed
```

### 6. Start Development Server
```bash
npm run dev
# or
pnpm dev
```

The application will be available at `http://localhost:3000`

### Development Workflow
```bash
# Make changes to code
# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests (if available)
npm run test

# Build for production (test)
npm run build
```

## Staging Deployment

### 1. Vercel Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

### 2. Environment Variables
Set environment variables in Vercel dashboard or via CLI:
```bash
# Set environment variables
vercel env add DATABASE_URL
vercel env add DTDC_API_KEY
vercel env add WHATSAPP_ACCESS_TOKEN
vercel env add RAZORPAY_KEY_ID
vercel env add JWT_SECRET
```

### 3. Database Setup (Staging)
```bash
# Create staging database (example with Supabase)
# 1. Create project on Supabase
# 2. Get connection string
# 3. Set DATABASE_URL environment variable

# Run migrations on staging
DATABASE_URL="your-staging-db-url" npx prisma db push
```

### 4. Deploy to Staging
```bash
# Deploy to staging
vercel --prod=false

# Or deploy specific branch
git push origin staging
# (if configured with Git integration)
```

### 5. Staging Verification
```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Test staging endpoints
curl https://your-staging-url.vercel.app/api/health
```

## Production Deployment

### 1. Production Database Setup
```bash
# Create production database
# Recommended: Use managed PostgreSQL service
# - AWS RDS
# - Google Cloud SQL
# - Azure Database for PostgreSQL
# - Supabase
# - PlanetScale

# Example with Google Cloud SQL
gcloud sql instances create spareflow-prod \
  --database-version=POSTGRES_14 \
  --tier=db-g1-small \
  --region=us-central1

# Create database
gcloud sql databases create spareflow --instance=spareflow-prod
```

### 2. Environment Configuration
Set production environment variables:
```bash
# Database
vercel env add DATABASE_URL production

# External APIs
vercel env add DTDC_API_KEY production
vercel env add DTDC_CUSTOMER_CODE production
vercel env add WHATSAPP_ACCESS_TOKEN production
vercel env add WHATSAPP_PHONE_NUMBER_ID production
vercel env add RAZORPAY_KEY_ID production
vercel env add RAZORPAY_KEY_SECRET production
vercel env add OPENAI_API_KEY production

# Security
vercel env add JWT_SECRET production
vercel env add NEXTAUTH_SECRET production
```

### 3. Production Deployment
```bash
# Deploy to production
vercel --prod

# Or via Git (main branch)
git push origin main
```

### 4. Post-Deployment Steps
```bash
# Run database migrations
DATABASE_URL="production-url" npx prisma db push

# Verify deployment
curl https://your-domain.com/api/health

# Check all endpoints
curl https://your-domain.com/api/auth/me
curl https://your-domain.com/api/parts
```

### 5. Domain Configuration
```bash
# Add custom domain
vercel domains add your-domain.com

# Configure DNS
# Add CNAME record: your-domain.com -> cname.vercel-dns.com
```

## Database Management

### Prisma Commands
```bash
# Generate client
npx prisma generate

# Push schema changes
npx prisma db push

# Create migration
npx prisma migrate dev --name migration-name

# Deploy migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

### Database Backup
```bash
# PostgreSQL backup
pg_dump -h hostname -U username -d database_name > backup.sql

# Restore from backup
psql -h hostname -U username -d database_name < backup.sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > "backup_$DATE.sql"
```

### Database Monitoring
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('spareflow'));

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT count(*) FROM pg_stat_activity;
```

## Environment Variables

### Required Variables
```bash
# Database
DATABASE_URL="postgresql://user:pass@host:port/db"

# Authentication
JWT_SECRET="your-jwt-secret-key"

# DTDC Courier API
DTDC_API_KEY="your-dtdc-api-key"
DTDC_CUSTOMER_CODE="your-customer-code"
DTDC_SERVICE_TYPE="B2C SMART EXPRESS"

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN="your-whatsapp-token"
WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"

# Razorpay Payment
RAZORPAY_KEY_ID="your-razorpay-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-secret"

# OpenAI API
OPENAI_API_KEY="your-openai-api-key"
```

### Optional Variables
```bash
# Tracking API
DTDC_TRACKING_ACCESS_TOKEN="tracking-token"
DTDC_TRACKING_USERNAME="username"
DTDC_TRACKING_PASSWORD="password"

# Development
NEXT_PUBLIC_CO_DEV_ENV="development"
NODE_ENV="production"
```

### Environment Variable Management
```bash
# Vercel CLI
vercel env ls                    # List all variables
vercel env add VAR_NAME          # Add variable
vercel env rm VAR_NAME           # Remove variable
vercel env pull .env.local       # Pull variables to local file

# Environment-specific variables
vercel env add VAR_NAME development
vercel env add VAR_NAME preview
vercel env add VAR_NAME production
```

## CI/CD Pipeline

### GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run linting
        run: npm run lint
      
      - name: Build application
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
        if: github.ref == 'refs/heads/main'
```

### Deployment Hooks
```bash
# Pre-deployment script
#!/bin/bash
echo "Running pre-deployment checks..."
npm run type-check
npm run lint
npm run build

# Post-deployment script
#!/bin/bash
echo "Running post-deployment tasks..."
curl -f https://your-domain.com/api/health || exit 1
echo "Health check passed"
```

## Monitoring & Health Checks

### Health Check Endpoint
The application includes a health check endpoint at `/api/system/health-check`:
```typescript
// Health check response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "database": "connected",
  "external_apis": {
    "dtdc": "available",
    "whatsapp": "available",
    "razorpay": "available"
  },
  "system": {
    "memory_usage": "45%",
    "uptime": "24h 30m"
  }
}
```

### Monitoring Setup
```bash
# Vercel Analytics
# Automatically enabled for Vercel deployments

# Custom monitoring
curl -f https://your-domain.com/api/health || echo "Health check failed"

# Uptime monitoring (example with UptimeRobot)
# Configure external monitoring service to check:
# - https://your-domain.com/api/health
# - https://your-domain.com/api/auth/me
```

### Logging Configuration
```javascript
// Custom logging setup
const log = {
  info: (message, data) => console.log(JSON.stringify({ level: 'info', message, data, timestamp: new Date().toISOString() })),
  error: (message, error) => console.error(JSON.stringify({ level: 'error', message, error: error.message, timestamp: new Date().toISOString() })),
  warn: (message, data) => console.warn(JSON.stringify({ level: 'warn', message, data, timestamp: new Date().toISOString() }))
};
```

## Backup & Restore

### Database Backup Strategy
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_FILE="spareflow_backup_$DATE.sql"

# Create backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to cloud storage (example with AWS S3)
aws s3 cp $BACKUP_FILE.gz s3://your-backup-bucket/database/

# Clean up local file
rm $BACKUP_FILE.gz

# Keep only last 30 days of backups
aws s3 ls s3://your-backup-bucket/database/ | grep "spareflow_backup" | sort | head -n -30 | awk '{print $4}' | xargs -I {} aws s3 rm s3://your-backup-bucket/database/{}
```

### Restore Process
```bash
# Download backup
aws s3 cp s3://your-backup-bucket/database/spareflow_backup_20240115.sql.gz .

# Decompress
gunzip spareflow_backup_20240115.sql.gz

# Restore database
psql $DATABASE_URL < spareflow_backup_20240115.sql

# Verify restore
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

### File Backup (if using local storage)
```bash
# Backup uploaded files
tar -czf files_backup_$(date +%Y%m%d).tar.gz public/uploads/

# Upload to cloud storage
aws s3 cp files_backup_$(date +%Y%m%d).tar.gz s3://your-backup-bucket/files/
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
# In application logs, look for:
# "Error: P1001: Can't reach database server"

# Solution: Check DATABASE_URL and network connectivity
```

#### 2. Build Failures
```bash
# Type errors
npm run type-check

# Dependency issues
rm -rf node_modules package-lock.json
npm install

# Memory issues during build
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

#### 3. API Timeout Issues
```bash
# Check Vercel function timeout (max 30s)
# Optimize long-running operations
# Use background jobs for heavy tasks

# Check external API response times
curl -w "@curl-format.txt" -o /dev/null -s "https://api.external-service.com/endpoint"
```

#### 4. Environment Variable Issues
```bash
# Check if variables are set
vercel env ls

# Pull latest variables
vercel env pull .env.local

# Verify in application
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
```

### Debug Commands
```bash
# View deployment logs
vercel logs

# Check function invocations
vercel logs --follow

# Local debugging
DEBUG=* npm run dev

# Database debugging
DEBUG="prisma:*" npm run dev
```

### Performance Optimization
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Database query optimization
# Enable Prisma query logging
# Add to schema.prisma:
# log = ["query", "info", "warn", "error"]

# Monitor API response times
# Add timing middleware to API routes
```

### Emergency Procedures

#### 1. Rollback Deployment
```bash
# Rollback to previous deployment
vercel rollback

# Or deploy specific commit
vercel --prod --force
```

#### 2. Database Recovery
```bash
# Restore from latest backup
# 1. Stop application (maintenance mode)
# 2. Restore database from backup
# 3. Verify data integrity
# 4. Resume application
```

#### 3. API Key Rotation
```bash
# 1. Generate new API keys
# 2. Update environment variables
vercel env add NEW_API_KEY production
vercel env rm OLD_API_KEY production

# 3. Redeploy application
vercel --prod
```

This deployment guide provides comprehensive instructions for setting up, deploying, and maintaining the SpareFlow application across different environments.