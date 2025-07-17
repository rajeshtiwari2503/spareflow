// Payment Gateway Integration Service
// Real payment gateway integration for production use

export interface PaymentRequest {
  amount: number; // Amount in smallest currency unit (paise for INR)
  currency: string; // Currency code (e.g., 'INR')
  orderId: string; // Unique order identifier
  customerDetails: {
    name: string;
    email: string;
    phone: string;
  };
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'cancelled';
  paymentUrl?: string; // For redirect-based payments
  error?: string;
  gatewayResponse?: any;
}

export interface PaymentVerificationRequest {
  paymentId: string;
  orderId: string;
  signature?: string; // For webhook verification
}

export interface PaymentVerificationResponse {
  success: boolean;
  verified: boolean;
  paymentId: string;
  orderId: string;
  amount: number;
  status: string;
  error?: string;
  details?: any;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // Partial refund amount, full refund if not specified
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  paymentId: string;
  amount: number;
  status: string;
  error?: string;
}

// Payment gateway configuration
const PAYMENT_CONFIG = {
  RAZORPAY: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    apiUrl: 'https://api.razorpay.com/v1'
  },
  STRIPE: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    apiUrl: 'https://api.stripe.com/v1'
  },
  PAYU: {
    merchantId: process.env.PAYU_MERCHANT_ID,
    merchantKey: process.env.PAYU_MERCHANT_KEY,
    salt: process.env.PAYU_SALT,
    apiUrl: process.env.NODE_ENV === 'production' 
      ? 'https://secure.payu.in/_payment'
      : 'https://test.payu.in/_payment'
  }
};

// Primary payment gateway (Razorpay for Indian market)
export async function createPayment(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' || !PAYMENT_CONFIG.RAZORPAY.keyId;
    
    if (isDevelopment) {
      // Use mock implementation for development
      return createMockPayment(request);
    }

    // Real Razorpay integration
    const { keyId, keySecret, apiUrl } = PAYMENT_CONFIG.RAZORPAY;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const payload = {
      amount: request.amount,
      currency: request.currency,
      receipt: request.orderId,
      notes: {
        customer_name: request.customerDetails.name,
        customer_email: request.customerDetails.email,
        customer_phone: request.customerDetails.phone,
        description: request.description || '',
        ...request.metadata
      }
    };

    const response = await fetch(`${apiUrl}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.description || `Razorpay API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      paymentId: data.id,
      orderId: request.orderId,
      amount: data.amount,
      currency: data.currency,
      status: 'created',
      gatewayResponse: data
    };

  } catch (error) {
    console.error('Payment creation error:', error);
    
    // Fallback to mock for development or if API fails
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to mock payment');
      return createMockPayment(request);
    }

    return {
      success: false,
      orderId: request.orderId,
      amount: request.amount,
      currency: request.currency,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Failed to create payment'
    };
  }
}

// Mock implementation for development
async function createMockPayment(request: PaymentRequest): Promise<PaymentResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('💳 Mock Payment Created:');
  console.log(`Order ID: ${request.orderId}`);
  console.log(`Amount: ${request.currency} ${request.amount / 100}`);
  console.log(`Customer: ${request.customerDetails.name} (${request.customerDetails.email})`);
  
  // Simulate 95% success rate
  if (Math.random() < 0.95) {
    const mockPaymentId = `pay_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      paymentId: mockPaymentId,
      orderId: request.orderId,
      amount: request.amount,
      currency: request.currency,
      status: 'created',
      paymentUrl: `https://checkout.razorpay.com/v1/checkout.js?payment_id=${mockPaymentId}`,
      gatewayResponse: { mock: true, timestamp: new Date().toISOString() }
    };
  } else {
    return {
      success: false,
      orderId: request.orderId,
      amount: request.amount,
      currency: request.currency,
      status: 'failed',
      error: 'Mock payment creation failure (5% chance)'
    };
  }
}

// Verify payment after completion
export async function verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
  try {
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' || !PAYMENT_CONFIG.RAZORPAY.keyId;
    
    if (isDevelopment) {
      // Use mock implementation for development
      return verifyMockPayment(request);
    }

    // Real Razorpay verification
    const { keyId, keySecret, apiUrl } = PAYMENT_CONFIG.RAZORPAY;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    // Fetch payment details from Razorpay
    const response = await fetch(`${apiUrl}/payments/${request.paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Razorpay API error:', errorData);
      throw new Error(errorData.error?.description || `Razorpay verification error: ${response.status}`);
    }

    const paymentData = await response.json();
    console.log('Payment data from Razorpay:', paymentData);

    // Verify signature if provided (using key secret, not webhook secret)
    let signatureVerified = true;
    if (request.signature) {
      signatureVerified = verifyRazorpayPaymentSignature(
        request.orderId,
        request.paymentId,
        request.signature,
        keySecret
      );
    }

    // Check if payment is captured and signature is valid
    const isVerified = signatureVerified && paymentData.status === 'captured';

    return {
      success: true,
      verified: isVerified,
      paymentId: paymentData.id,
      orderId: paymentData.order_id || request.orderId,
      amount: paymentData.amount,
      status: paymentData.status,
      details: paymentData
    };

  } catch (error) {
    console.error('Payment verification error:', error);
    
    // Fallback to mock for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to mock payment verification');
      return verifyMockPayment(request);
    }

    return {
      success: false,
      verified: false,
      paymentId: request.paymentId,
      orderId: request.orderId,
      amount: 0,
      status: 'unknown',
      error: error instanceof Error ? error.message : 'Failed to verify payment'
    };
  }
}

// Mock verification for development
async function verifyMockPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('✅ Mock Payment Verification:');
  console.log(`Payment ID: ${request.paymentId}`);
  console.log(`Order ID: ${request.orderId}`);
  
  // Simulate 90% success rate for verification
  const isVerified = Math.random() < 0.9;
  
  return {
    success: true,
    verified: isVerified,
    paymentId: request.paymentId,
    orderId: request.orderId,
    amount: 100000, // Mock amount (₹1000)
    status: isVerified ? 'captured' : 'failed',
    details: { mock: true, timestamp: new Date().toISOString() }
  };
}

// Process refund
export async function processRefund(request: RefundRequest): Promise<RefundResponse> {
  try {
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' || !PAYMENT_CONFIG.RAZORPAY.keyId;
    
    if (isDevelopment) {
      // Use mock implementation for development
      return processMockRefund(request);
    }

    // Real Razorpay refund
    const { keyId, keySecret, apiUrl } = PAYMENT_CONFIG.RAZORPAY;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const payload: any = {};
    if (request.amount) {
      payload.amount = request.amount;
    }
    if (request.reason) {
      payload.notes = { reason: request.reason };
    }

    const response = await fetch(`${apiUrl}/payments/${request.paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.description || `Razorpay refund error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      refundId: data.id,
      paymentId: request.paymentId,
      amount: data.amount,
      status: data.status
    };

  } catch (error) {
    console.error('Refund processing error:', error);
    
    // Fallback to mock for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to mock refund');
      return processMockRefund(request);
    }

    return {
      success: false,
      paymentId: request.paymentId,
      amount: request.amount || 0,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Failed to process refund'
    };
  }
}

// Mock refund for development
async function processMockRefund(request: RefundRequest): Promise<RefundResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  console.log('💰 Mock Refund Processed:');
  console.log(`Payment ID: ${request.paymentId}`);
  console.log(`Amount: ${request.amount || 'Full refund'}`);
  console.log(`Reason: ${request.reason || 'No reason provided'}`);
  
  // Simulate 95% success rate
  if (Math.random() < 0.95) {
    return {
      success: true,
      refundId: `rfnd_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentId: request.paymentId,
      amount: request.amount || 100000, // Mock amount
      status: 'processed'
    };
  } else {
    return {
      success: false,
      paymentId: request.paymentId,
      amount: request.amount || 0,
      status: 'failed',
      error: 'Mock refund failure (5% chance)'
    };
  }
}

// Verify Razorpay payment signature (for payment verification)
function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  try {
    const crypto = require('crypto');
    
    if (!keySecret) {
      console.warn('Razorpay key secret not configured');
      return false;
    }

    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Payment signature verification error:', error);
    return false;
  }
}

// Verify Razorpay signature for webhook security
function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  try {
    const crypto = require('crypto');
    const { webhookSecret } = PAYMENT_CONFIG.RAZORPAY;
    
    if (!webhookSecret) {
      console.warn('Razorpay webhook secret not configured');
      return false;
    }

    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body.toString())
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Helper function to convert amount to smallest currency unit
export function toSmallestCurrencyUnit(amount: number, currency: string = 'INR'): number {
  // For INR, convert rupees to paise (multiply by 100)
  // For USD, convert dollars to cents (multiply by 100)
  const multipliers: Record<string, number> = {
    'INR': 100,
    'USD': 100,
    'EUR': 100,
    'GBP': 100
  };

  return Math.round(amount * (multipliers[currency] || 100));
}

// Helper function to convert from smallest currency unit to main unit
export function fromSmallestCurrencyUnit(amount: number, currency: string = 'INR'): number {
  const divisors: Record<string, number> = {
    'INR': 100,
    'USD': 100,
    'EUR': 100,
    'GBP': 100
  };

  return amount / (divisors[currency] || 100);
}

// Format currency for display
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const formatters: Record<string, Intl.NumberFormat> = {
    'INR': new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }),
    'USD': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    'EUR': new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }),
    'GBP': new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
  };

  const formatter = formatters[currency] || formatters['INR'];
  return formatter.format(fromSmallestCurrencyUnit(amount, currency));
}

// Generate unique order ID
export function generateOrderId(prefix: string = 'SF'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

// Validate payment amount
export function validatePaymentAmount(amount: number, minAmount: number = 100): boolean {
  return amount >= minAmount && amount <= 10000000; // Max ₹1,00,000
}

// Get payment status color for UI
export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'created': 'blue',
    'authorized': 'yellow',
    'captured': 'green',
    'failed': 'red',
    'cancelled': 'gray',
    'refunded': 'purple'
  };

  return colors[status] || 'gray';
}

// Get payment status display text
export function getPaymentStatusText(status: string): string {
  const texts: Record<string, string> = {
    'created': 'Payment Created',
    'authorized': 'Payment Authorized',
    'captured': 'Payment Successful',
    'failed': 'Payment Failed',
    'cancelled': 'Payment Cancelled',
    'refunded': 'Payment Refunded'
  };

  return texts[status] || status;
}