# SpareFlow - System Architecture Document

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Architecture](#database-architecture)
6. [Third-Party Integrations](#third-party-integrations)
7. [Security Architecture](#security-architecture)
8. [Scalability & Performance](#scalability--performance)
9. [Monitoring & Logging](#monitoring--logging)

## Overview

SpareFlow is a comprehensive AI-powered spare parts logistics platform built using modern web technologies. The system manages spare parts logistics across multiple user roles including Brands, Service Centers, Distributors, Customers, and Super Admins.

### Technology Stack
- **Frontend**: Next.js 14 (React 18) with TypeScript
- **Backend**: Next.js API Routes (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based authentication
- **UI Framework**: Tailwind CSS with Radix UI components
- **Real-time Communication**: Socket.IO
- **File Storage**: Local/Cloud storage for documents and images
- **Payment Processing**: Razorpay integration
- **Courier Integration**: DTDC API
- **Communication**: WhatsApp Business API
- **AI/ML**: OpenAI API for intelligent features

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile Client  │    │  Admin Panel    │
│   (Next.js)     │    │   (Future)      │    │   (Next.js)     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     Load Balancer         │
                    │      (Vercel)             │
                    └─────────────┬─────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │   Next.js Application     │
                    │   (Frontend + API)        │
                    └─────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
┌─────────┴───────┐    ┌─────────┴───────┐    ┌─────────┴───────┐
│   PostgreSQL    │    │   File Storage  │    │  External APIs  │
│   Database      │    │   (Images/Docs) │    │  (DTDC, etc.)   │
│   (Prisma)      │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Microservices Architecture

The system follows a modular monolithic architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                      │
├─────────────────────────────────────────────────────────────┤
│                    Presentation Layer                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Dashboard  │ │    Auth     │ │   Public    │           │
│  │   Pages     │ │   Pages     │ │   Pages     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│                     API Layer                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │    Auth     │ │  Shipment   │ │   Admin     │           │
│  │     API     │ │     API     │ │    API      │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Wallet    │ │  Tracking   │ │   Public    │           │
│  │     API     │ │     API     │ │    API      │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│                   Business Logic Layer                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │    Auth     │ │   Pricing   │ │   DTDC      │           │
│  │  Service    │ │  Service    │ │  Service    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Wallet    │ │  Tracking   │ │    AI       │           │
│  │  Service    │ │  Service    │ │  Service    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│                    Data Access Layer                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Prisma    │ │    File     │ │   Cache     │           │
│  │    ORM      │ │  Storage    │ │  Service    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI components (Radix UI)
│   ├── dashboard/             # Dashboard-specific components
│   ├── auth/                  # Authentication components
│   └── shared/                # Shared business components
├── pages/
│   ├── dashboard/             # Dashboard pages
│   ├── auth/                  # Authentication pages
│   ├── api/                   # API routes
│   └── public/                # Public pages
├── hooks/                     # Custom React hooks
├── contexts/                  # React contexts
├── lib/                       # Utility libraries
└── styles/                    # Global styles
```

### State Management

- **Local State**: React useState and useReducer
- **Global State**: React Context API
- **Server State**: SWR/React Query patterns
- **Form State**: React Hook Form with Zod validation

### Routing

- **File-based Routing**: Next.js pages directory
- **Dynamic Routes**: `[id].tsx` pattern
- **API Routes**: `/api/*` endpoints
- **Protected Routes**: HOC-based route protection

## Backend Architecture

### API Structure

```
/api/
├── auth/                      # Authentication endpoints
│   ├── login.ts
│   ├── register.ts
│   ├── logout.ts
│   └── me.ts
├── admin/                     # Admin-only endpoints
│   ├── users.ts
│   ├── analytics.ts
│   └── system-config.ts
├── brand/                     # Brand-specific endpoints
│   ├── authorized-network.ts
│   └── access-requests.ts
├── distributor/               # Distributor endpoints
│   ├── orders.ts
│   ├── inventory.ts
│   └── analytics.ts
├── service-center/            # Service Center endpoints
│   ├── spare-requests.ts
│   ├── inventory.ts
│   └── shipments-received.ts
├── customer/                  # Customer endpoints
│   ├── orders.ts
│   ├── warranty.ts
│   └── service-tickets.ts
├── public/                    # Public endpoints
│   ├── parts.ts
│   ├── checkout.ts
│   └── semantic-search.ts
├── shipments.ts               # Shipment management
├── tracking/                  # Tracking endpoints
├── dtdc/                      # DTDC integration
└── system/                    # System utilities
```

### Middleware Architecture

```typescript
// Request Flow
Request → Authentication → Authorization → Rate Limiting → Handler → Response

// Middleware Stack
1. CORS Handling
2. Request Parsing
3. Authentication (JWT)
4. Authorization (Role-based)
5. Rate Limiting
6. Request Validation
7. Business Logic
8. Response Formatting
9. Error Handling
10. Logging
```

### Service Layer

```typescript
// Service Architecture
interface ServiceLayer {
  auth: AuthService;
  wallet: WalletService;
  pricing: PricingService;
  dtdc: DTDCService;
  tracking: TrackingService;
  ai: AIService;
  notification: NotificationService;
  file: FileService;
}
```

## Database Architecture

### Entity Relationship Overview

```
Users (Central Entity)
├── BrandProfile
├── ServiceCenterProfile
├── DistributorProfile
├── CustomerProfile
├── Wallet
├── BrandWallet
└── ActivityLog

Parts (Product Catalog)
├── Brand (User)
├── BoxParts
├── DistributorInventory
├── ServiceCenterInventory
└── CustomerOrders

Shipments (Logistics)
├── Brand (User)
├── ServiceCenter (User)
├── Boxes
│   ├── BoxParts
│   └── TrackingHistory
└── MarginLogs

Orders (Commerce)
├── PurchaseOrders
│   ├── PurchaseOrderItems
│   └── ShippingAddress
├── CustomerOrders
└── WalletTransactions

Authorization (Access Control)
├── BrandAuthorizedServiceCenters
├── BrandAuthorizedDistributors
└── BrandAccessRequests
```

### Database Schema Highlights

#### Core Tables
- **users**: Central user management with role-based access
- **parts**: Product catalog with enhanced metadata
- **shipments**: Logistics management
- **boxes**: Individual shipment units with tracking
- **wallets**: Financial management

#### Authorization Tables
- **brand_authorized_service_centers**: Brand-Service Center relationships
- **brand_authorized_distributors**: Brand-Distributor relationships
- **brand_access_requests**: Access request management

#### Financial Tables
- **wallet_transactions**: All financial transactions
- **margin_logs**: Profit margin tracking
- **courier_pricing**: Dynamic pricing rules

### Indexing Strategy

```sql
-- Performance Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_parts_brand_id ON parts(brand_id);
CREATE INDEX idx_parts_code ON parts(code);
CREATE INDEX idx_shipments_brand_service ON shipments(brand_id, service_center_id);
CREATE INDEX idx_boxes_awb ON boxes(awb_number);
CREATE INDEX idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX idx_tracking_history_awb ON box_tracking_history(awb_number);

-- Composite Indexes
CREATE INDEX idx_parts_brand_active ON parts(brand_id, is_active);
CREATE INDEX idx_shipments_status_created ON shipments(status, created_at);
CREATE INDEX idx_boxes_shipment_status ON boxes(shipment_id, status);
```

## Third-Party Integrations

### DTDC Courier Integration

```typescript
interface DTDCIntegration {
  endpoints: {
    awbGeneration: 'https://pxapi.dtdc.in/api/customer/integration/consignment/softdata';
    tracking: 'https://blktracksvc.dtdc.com/dtdc-api/rest/JSONCnTrk/getTrackDetails';
    labelGeneration: 'https://pxapi.dtdc.in/api/customer/integration/consignment/shippinglabel/stream';
    cancellation: 'https://pxapi.dtdc.in/api/customer/integration/consignment/cancel';
  };
  authentication: 'API Key';
  rateLimit: '100 requests/minute';
  fallback: 'Mock implementation for development';
}
```

### WhatsApp Business API

```typescript
interface WhatsAppIntegration {
  endpoint: 'https://graph.facebook.com/v17.0/{phone-number-id}/messages';
  authentication: 'Bearer Token';
  features: [
    'Order notifications',
    'Shipment updates',
    'Customer support',
    'Automated responses'
  ];
}
```

### Razorpay Payment Gateway

```typescript
interface RazorpayIntegration {
  endpoints: {
    orders: 'https://api.razorpay.com/v1/orders';
    payments: 'https://api.razorpay.com/v1/payments';
    webhooks: '/api/payment/webhook';
  };
  authentication: 'Basic Auth (Key ID + Secret)';
  features: [
    'Wallet recharge',
    'Order payments',
    'Refund processing',
    'Payment verification'
  ];
}
```

### OpenAI API Integration

```typescript
interface OpenAIIntegration {
  endpoint: 'https://api.openai.com/v1/chat/completions';
  authentication: 'Bearer Token';
  features: [
    'Semantic search',
    'AI support chat',
    'Demand forecasting',
    'Automated responses'
  ];
  models: ['gpt-3.5-turbo', 'gpt-4'];
}
```

## Security Architecture

### Authentication & Authorization

```typescript
// JWT-based Authentication
interface AuthFlow {
  login: 'POST /api/auth/login';
  token: 'JWT with 7-day expiry';
  refresh: 'Automatic token refresh';
  logout: 'POST /api/auth/logout';
}

// Role-based Authorization
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BRAND = 'BRAND',
  DISTRIBUTOR = 'DISTRIBUTOR',
  SERVICE_CENTER = 'SERVICE_CENTER',
  CUSTOMER = 'CUSTOMER'
}
```

### Data Protection

- **Password Hashing**: bcrypt with salt rounds = 12
- **JWT Secrets**: Environment-based secret keys
- **API Keys**: Encrypted storage in environment variables
- **Database**: Connection string encryption
- **File Uploads**: Validation and sanitization

### Security Headers

```typescript
// Next.js Security Headers
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin'
};
```

### Input Validation

- **Zod Schemas**: Type-safe validation
- **Sanitization**: XSS prevention
- **Rate Limiting**: API endpoint protection
- **CORS**: Cross-origin request control

## Scalability & Performance

### Horizontal Scaling

```typescript
// Vercel Serverless Functions
interface ScalingStrategy {
  functions: 'Auto-scaling serverless functions';
  database: 'PostgreSQL with connection pooling';
  cdn: 'Vercel Edge Network';
  caching: 'Redis for session and data caching';
}
```

### Performance Optimizations

- **Database**: Query optimization with Prisma
- **Frontend**: Code splitting and lazy loading
- **Images**: Next.js Image optimization
- **API**: Response caching and compression
- **Real-time**: Socket.IO with Redis adapter

### Monitoring

```typescript
interface MonitoringStack {
  application: 'Vercel Analytics';
  database: 'Prisma metrics';
  errors: 'Error boundaries and logging';
  performance: 'Web Vitals tracking';
  uptime: 'Health check endpoints';
}
```

## Monitoring & Logging

### Health Checks

```typescript
// System Health Monitoring
interface HealthCheck {
  endpoint: '/api/system/health-check';
  frequency: 'Every 6 hours (cron job)';
  checks: [
    'Database connectivity',
    'External API availability',
    'Wallet balance validation',
    'Authorization system integrity'
  ];
}
```

### Error Handling

```typescript
// Centralized Error Handling
interface ErrorHandling {
  boundaries: 'React Error Boundaries';
  logging: 'Console and external service';
  reporting: 'Automatic error reporting';
  recovery: 'Graceful degradation';
}
```

### Logging Strategy

```typescript
interface LoggingStrategy {
  levels: ['error', 'warn', 'info', 'debug'];
  destinations: ['console', 'file', 'external_service'];
  format: 'Structured JSON logging';
  retention: '30 days for application logs';
}
```

## Deployment Architecture

### Environment Configuration

```typescript
interface Environments {
  development: {
    database: 'Local PostgreSQL';
    apis: 'Mock implementations';
    debugging: 'Enabled';
  };
  staging: {
    database: 'Staging PostgreSQL';
    apis: 'Sandbox endpoints';
    debugging: 'Limited';
  };
  production: {
    database: 'Production PostgreSQL';
    apis: 'Live endpoints';
    debugging: 'Disabled';
  };
}
```

### CI/CD Pipeline

```yaml
# Deployment Flow
Development → Git Push → Vercel Build → Automated Tests → Staging Deploy → Manual Approval → Production Deploy
```

This architecture provides a robust, scalable foundation for the SpareFlow platform with clear separation of concerns, comprehensive security measures, and efficient data management.