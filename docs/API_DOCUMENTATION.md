# SpareFlow - API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [API Endpoints](#api-endpoints)
6. [External API Integrations](#external-api-integrations)
7. [WebSocket Events](#websocket-events)
8. [SDK Examples](#sdk-examples)

## Overview

The SpareFlow API is a RESTful API built with Next.js API routes. All endpoints return JSON responses and use standard HTTP status codes.

### Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

### Content Type
All requests should include:
```
Content-Type: application/json
```

## Authentication

### JWT Token Authentication

Most endpoints require authentication using JWT tokens.

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "BRAND"
  }
}
```

#### Using the Token
Include the token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password123",
  "role": "BRAND",
  "phone": "+91-9876543210"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Rate Limiting

- **General API**: 100 requests per minute per IP
- **Authentication**: 10 requests per minute per IP
- **File Upload**: 5 requests per minute per user

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user and return JWT token.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "BRAND|DISTRIBUTOR|SERVICE_CENTER|CUSTOMER|SUPER_ADMIN"
  }
}
```

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "BRAND|DISTRIBUTOR|SERVICE_CENTER|CUSTOMER",
  "phone": "string (optional)"
}
```

### User Management

#### GET /api/users
Get all users (Admin only).

**Query Parameters:**
- `role` - Filter by user role
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:**
```json
{
  "users": [
    {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "string",
      "createdAt": "ISO date",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

#### PUT /api/users
Update user information.

**Request:**
```json
{
  "id": "string",
  "name": "string (optional)",
  "email": "string (optional)",
  "phone": "string (optional)",
  "isActive": "boolean (optional)"
}
```

#### DELETE /api/users?id=user_id
Delete a user (Admin only).

### Parts Management

#### GET /api/parts
Get parts catalog.

**Query Parameters:**
- `brandId` - Filter by brand
- `category` - Filter by category
- `search` - Search term
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "parts": [
    {
      "id": "string",
      "code": "string",
      "name": "string",
      "description": "string",
      "price": 100.00,
      "weight": 0.5,
      "imageUrl": "string",
      "category": "string",
      "brand": {
        "id": "string",
        "name": "string"
      }
    }
  ]
}
```

#### POST /api/parts
Create a new part (Brand only).

**Request:**
```json
{
  "code": "string",
  "name": "string",
  "description": "string",
  "price": 100.00,
  "weight": 0.5,
  "category": "string",
  "imageUrl": "string (optional)",
  "specifications": "object (optional)"
}
```

#### PUT /api/parts
Update a part (Brand only).

**Request:**
```json
{
  "id": "string",
  "name": "string (optional)",
  "description": "string (optional)",
  "price": "number (optional)",
  "weight": "number (optional)",
  "isActive": "boolean (optional)"
}
```

### Shipment Management

#### GET /api/shipments
Get shipments list.

**Query Parameters:**
- `brandId` - Filter by brand
- `serviceCenterId` - Filter by service center
- `status` - Filter by status
- `page` - Page number

**Response:**
```json
{
  "shipments": [
    {
      "id": "string",
      "brandId": "string",
      "serviceCenterId": "string",
      "numBoxes": 5,
      "status": "INITIATED|DISPATCHED|DELIVERED",
      "createdAt": "ISO date",
      "brand": {
        "id": "string",
        "name": "string"
      },
      "serviceCenter": {
        "id": "string",
        "name": "string"
      },
      "boxes": [
        {
          "id": "string",
          "boxNumber": "string",
          "awbNumber": "string",
          "status": "PENDING|IN_TRANSIT|DELIVERED",
          "weight": 1.5
        }
      ]
    }
  ]
}
```

#### POST /api/shipments
Create a new shipment (Brand only).

**Request:**
```json
{
  "serviceCenterId": "string",
  "numBoxes": 5,
  "estimatedWeight": 10.0,
  "serviceCenterPincode": "400001"
}
```

**Response:**
```json
{
  "success": true,
  "shipment": {
    "id": "string",
    "brandId": "string",
    "serviceCenterId": "string",
    "numBoxes": 5,
    "status": "INITIATED"
  },
  "costEstimate": {
    "totalCost": 500.00,
    "breakdown": {
      "baseRate": 400.00,
      "weightCharges": 50.00,
      "taxes": 50.00
    }
  },
  "wallet": {
    "deducted": 500.00,
    "balanceAfter": 1500.00
  },
  "dtdc": {
    "success": true,
    "boxes": [
      {
        "boxNumber": 1,
        "awbNumber": "DTDC123456789",
        "trackingUrl": "https://www.dtdc.in/tracking/track.asp?strAWBNo=DTDC123456789"
      }
    ]
  }
}
```

### Tracking

#### GET /api/tracking/get-tracking?awb=AWB_NUMBER
Get tracking information for an AWB.

**Response:**
```json
{
  "success": true,
  "awb_number": "DTDC123456789",
  "current_status": "IN_TRANSIT",
  "location": "Mumbai Hub",
  "timestamp": "2024-01-15T10:30:00Z",
  "tracking_history": [
    {
      "scan_code": "BK",
      "status": "BOOKED",
      "location": "Origin",
      "timestamp": "2024-01-15T08:00:00Z",
      "description": "Shipment booked"
    },
    {
      "scan_code": "PU",
      "status": "PICKED_UP",
      "location": "Origin Hub",
      "timestamp": "2024-01-15T09:00:00Z",
      "description": "Package picked up"
    }
  ]
}
```

### Wallet Management

#### GET /api/distributor/wallet
Get wallet balance and transactions.

**Response:**
```json
{
  "wallet": {
    "id": "string",
    "balance": 1500.00,
    "totalEarned": 5000.00,
    "totalSpent": 3500.00,
    "lastRecharge": "2024-01-15T10:00:00Z"
  },
  "recentTransactions": [
    {
      "id": "string",
      "type": "CREDIT|DEBIT",
      "amount": 500.00,
      "description": "Wallet recharge",
      "balanceAfter": 1500.00,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/distributor/wallet
Add funds to wallet.

**Request:**
```json
{
  "amount": 1000.00,
  "paymentMethod": "razorpay",
  "paymentId": "pay_xyz123"
}
```

### Brand Authorization

#### GET /api/brand/authorized-network
Get authorized service centers and distributors.

**Response:**
```json
{
  "serviceCenters": [
    {
      "id": "string",
      "userId": "string",
      "name": "string",
      "email": "string",
      "phone": "string",
      "status": "Active|Inactive",
      "createdAt": "ISO date"
    }
  ],
  "distributors": [
    {
      "id": "string",
      "userId": "string",
      "name": "string",
      "email": "string",
      "phone": "string",
      "status": "Active|Inactive",
      "createdAt": "ISO date"
    }
  ]
}
```

#### POST /api/brand/authorized-network/add-existing
Add existing user to authorized network.

**Request:**
```json
{
  "userEmail": "serviceCenter@example.com",
  "roleType": "SERVICE_CENTER|DISTRIBUTOR"
}
```

#### POST /api/access-requests
Request access to a brand (Service Center/Distributor).

**Request:**
```json
{
  "brandId": "string",
  "roleType": "SERVICE_CENTER|DISTRIBUTOR",
  "message": "string",
  "documentUrl": "string (optional)"
}
```

### Admin Endpoints

#### GET /api/admin/analytics
Get system analytics (Super Admin only).

**Response:**
```json
{
  "users": {
    "total": 1000,
    "byRole": {
      "BRAND": 100,
      "SERVICE_CENTER": 300,
      "DISTRIBUTOR": 200,
      "CUSTOMER": 400
    }
  },
  "shipments": {
    "total": 5000,
    "thisMonth": 500,
    "byStatus": {
      "DELIVERED": 4000,
      "IN_TRANSIT": 800,
      "PENDING": 200
    }
  },
  "revenue": {
    "total": 500000.00,
    "thisMonth": 50000.00,
    "margins": {
      "average": 25.5,
      "total": 125000.00
    }
  }
}
```

#### GET /api/admin/courier-logs
Get courier API logs (Super Admin only).

**Query Parameters:**
- `startDate` - Start date filter
- `endDate` - End date filter
- `status` - Filter by success/failure

#### POST /api/admin/system-config
Update system configuration (Super Admin only).

**Request:**
```json
{
  "key": "string",
  "value": "string",
  "description": "string"
}
```

### Public Endpoints

#### GET /api/public/parts
Public parts search (no authentication required).

**Query Parameters:**
- `search` - Search term
- `category` - Filter by category
- `brand` - Filter by brand name

#### POST /api/public/checkout
Public checkout for customers.

**Request:**
```json
{
  "partId": "string",
  "quantity": 1,
  "customerInfo": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": {
      "street": "string",
      "city": "string",
      "state": "string",
      "pincode": "string"
    }
  },
  "paymentMethod": "razorpay|cod"
}
```

## External API Integrations

### DTDC Courier API

#### Generate AWB
```http
POST /api/dtdc/generate-awb
Authorization: Bearer <token>

{
  "consignee_name": "string",
  "consignee_address": "string",
  "consignee_city": "string",
  "consignee_state": "string",
  "consignee_pincode": "string",
  "consignee_phone": "string",
  "weight": 1.5,
  "pieces": 1
}
```

#### Check Pincode Serviceability
```http
POST /api/dtdc/pincode-check
Authorization: Bearer <token>

{
  "orgPincode": "400069",
  "desPincode": "110001"
}
```

**Response:**
```json
{
  "success": true,
  "serviceable": true,
  "estimated_days": 3
}
```

### WhatsApp Business API

#### Send Notification
```http
POST /api/notifications/whatsapp
Authorization: Bearer <token>

{
  "phone": "+919876543210",
  "template": "shipment_update",
  "parameters": {
    "awb_number": "DTDC123456789",
    "status": "Delivered"
  }
}
```

### Razorpay Payment API

#### Create Order
```http
POST /api/payment/create-order
Authorization: Bearer <token>

{
  "amount": 1000.00,
  "currency": "INR",
  "receipt": "receipt_123"
}
```

#### Verify Payment
```http
POST /api/payment/verify
Authorization: Bearer <token>

{
  "razorpay_order_id": "order_xyz",
  "razorpay_payment_id": "pay_abc",
  "razorpay_signature": "signature_123"
}
```

## WebSocket Events

### Connection
```javascript
const socket = io('wss://your-domain.com', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Shipment Updates
```javascript
// Listen for shipment updates
socket.on('shipment:created', (data) => {
  console.log('New shipment created:', data);
});

socket.on('shipment:status_updated', (data) => {
  console.log('Shipment status updated:', data);
});
```

#### Wallet Updates
```javascript
// Listen for wallet updates
socket.on('wallet:transaction', (data) => {
  console.log('Wallet transaction:', data);
});

socket.on('wallet:balance_updated', (data) => {
  console.log('Wallet balance updated:', data);
});
```

#### Notifications
```javascript
// Listen for notifications
socket.on('notification:new', (data) => {
  console.log('New notification:', data);
});
```

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
class SpareFlowAPI {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Parts
  async getParts(filters: any = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/parts?${params}`);
  }

  async createPart(partData: any) {
    return this.request('/parts', {
      method: 'POST',
      body: JSON.stringify(partData),
    });
  }

  // Shipments
  async createShipment(shipmentData: any) {
    return this.request('/shipments', {
      method: 'POST',
      body: JSON.stringify(shipmentData),
    });
  }

  async trackShipment(awbNumber: string) {
    return this.request(`/tracking/get-tracking?awb=${awbNumber}`);
  }
}

// Usage
const api = new SpareFlowAPI('https://your-domain.com/api', 'your-token');

// Create a shipment
const shipment = await api.createShipment({
  serviceCenterId: 'sc_123',
  numBoxes: 3,
  estimatedWeight: 5.0,
  serviceCenterPincode: '400001'
});
```

### Python SDK Example

```python
import requests
import json

class SpareFlowAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }
    
    def request(self, endpoint, method='GET', data=None):
        url = f"{self.base_url}{endpoint}"
        response = requests.request(
            method=method,
            url=url,
            headers=self.headers,
            json=data
        )
        response.raise_for_status()
        return response.json()
    
    def get_parts(self, **filters):
        params = '&'.join([f"{k}={v}" for k, v in filters.items()])
        return self.request(f"/parts?{params}")
    
    def create_shipment(self, shipment_data):
        return self.request("/shipments", method='POST', data=shipment_data)

# Usage
api = SpareFlowAPI('https://your-domain.com/api', 'your-token')
parts = api.get_parts(category='Motor', brand='TechCorp')
```

This API documentation provides comprehensive coverage of all available endpoints, authentication methods, and integration examples for the SpareFlow platform.