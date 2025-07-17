// WhatsApp Business API Integration Service
// Real WhatsApp API integration for production use

export interface WhatsAppMessage {
  to: string; // Phone number with country code (e.g., +919876543210)
  type: 'text' | 'template';
  content: string | WhatsAppTemplate;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  components?: WhatsAppTemplateComponent[];
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button';
  parameters?: WhatsAppTemplateParameter[];
}

export interface WhatsAppTemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename: string;
  };
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

// Pre-defined templates for SpareFlow
export const WHATSAPP_TEMPLATES = {
  ORDER_CONFIRMATION: {
    name: 'order_confirmation',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{customer_name}}' },
          { type: 'text', text: '{{order_details}}' },
          { type: 'text', text: '{{total_amount}}' },
          { type: 'text', text: '{{tracking_link}}' }
        ]
      }
    ]
  },
  SHIPMENT_UPDATE: {
    name: 'shipment_update',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{customer_name}}' },
          { type: 'text', text: '{{awb_number}}' },
          { type: 'text', text: '{{status}}' },
          { type: 'text', text: '{{location}}' },
          { type: 'text', text: '{{tracking_link}}' }
        ]
      }
    ]
  },
  DELIVERY_NOTIFICATION: {
    name: 'delivery_notification',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{customer_name}}' },
          { type: 'text', text: '{{awb_number}}' },
          { type: 'text', text: '{{delivery_time}}' }
        ]
      }
    ]
  },
  REVERSE_PICKUP: {
    name: 'reverse_pickup',
    language: 'en',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: '{{service_center_name}}' },
          { type: 'text', text: '{{part_name}}' },
          { type: 'text', text: '{{pickup_awb}}' },
          { type: 'text', text: '{{pickup_date}}' }
        ]
      }
    ]
  }
};

// Real WhatsApp Business API integration
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
  try {
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.WHATSAPP_ACCESS_TOKEN;
    
    if (isDevelopment) {
      // Use mock implementation for development
      return sendMockWhatsAppMessage(message);
    }

    // Real WhatsApp Business API integration
    const whatsappApiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp API credentials not configured');
    }

    const url = `${whatsappApiUrl}/${phoneNumberId}/messages`;

    let payload: any = {
      messaging_product: 'whatsapp',
      to: message.to.replace(/[^\d+]/g, ''), // Clean phone number
      type: message.type
    };

    if (message.type === 'text') {
      payload.text = {
        body: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
      };
    } else if (message.type === 'template' && typeof message.content === 'object') {
      payload.template = message.content;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `WhatsApp API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.messages && data.messages[0]) {
      return {
        success: true,
        messageId: data.messages[0].id,
        details: data
      };
    } else {
      throw new Error('No message ID returned from WhatsApp API');
    }

  } catch (error) {
    console.error('WhatsApp message error:', error);
    
    // Fallback to mock for development or if API fails
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to mock WhatsApp message');
      return sendMockWhatsAppMessage(message);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp message'
    };
  }
}

// Mock implementation for development
async function sendMockWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('📱 Mock WhatsApp Message:');
  console.log(`To: ${message.to}`);
  console.log(`Type: ${message.type}`);
  console.log(`Content:`, message.content);
  
  // Simulate 95% success rate
  if (Math.random() < 0.95) {
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      details: { mock: true, timestamp: new Date().toISOString() }
    };
  } else {
    return {
      success: false,
      error: 'Mock WhatsApp API failure (5% chance)'
    };
  }
}

// Helper functions for common SpareFlow notifications

export async function sendOrderConfirmation(
  customerPhone: string,
  customerName: string,
  orderDetails: string,
  totalAmount: number,
  trackingLink: string
): Promise<WhatsAppResponse> {
  const template = { ...WHATSAPP_TEMPLATES.ORDER_CONFIRMATION };
  
  // Replace template parameters
  if (template.components && template.components[0].parameters) {
    template.components[0].parameters = [
      { type: 'text', text: customerName },
      { type: 'text', text: orderDetails },
      { type: 'text', text: `₹${totalAmount}` },
      { type: 'text', text: trackingLink }
    ];
  }

  return sendWhatsAppMessage({
    to: customerPhone,
    type: 'template',
    content: template
  });
}

export async function sendShipmentUpdate(
  customerPhone: string,
  customerName: string,
  awbNumber: string,
  status: string,
  location: string,
  trackingLink: string
): Promise<WhatsAppResponse> {
  const template = { ...WHATSAPP_TEMPLATES.SHIPMENT_UPDATE };
  
  // Replace template parameters
  if (template.components && template.components[0].parameters) {
    template.components[0].parameters = [
      { type: 'text', text: customerName },
      { type: 'text', text: awbNumber },
      { type: 'text', text: status },
      { type: 'text', text: location },
      { type: 'text', text: trackingLink }
    ];
  }

  return sendWhatsAppMessage({
    to: customerPhone,
    type: 'template',
    content: template
  });
}

export async function sendDeliveryNotification(
  customerPhone: string,
  customerName: string,
  awbNumber: string,
  deliveryTime: string
): Promise<WhatsAppResponse> {
  const template = { ...WHATSAPP_TEMPLATES.DELIVERY_NOTIFICATION };
  
  // Replace template parameters
  if (template.components && template.components[0].parameters) {
    template.components[0].parameters = [
      { type: 'text', text: customerName },
      { type: 'text', text: awbNumber },
      { type: 'text', text: deliveryTime }
    ];
  }

  return sendWhatsAppMessage({
    to: customerPhone,
    type: 'template',
    content: template
  });
}

export async function sendReversePickupNotification(
  serviceCenterPhone: string,
  serviceCenterName: string,
  partName: string,
  pickupAwb: string,
  pickupDate: string
): Promise<WhatsAppResponse> {
  const template = { ...WHATSAPP_TEMPLATES.REVERSE_PICKUP };
  
  // Replace template parameters
  if (template.components && template.components[0].parameters) {
    template.components[0].parameters = [
      { type: 'text', text: serviceCenterName },
      { type: 'text', text: partName },
      { type: 'text', text: pickupAwb },
      { type: 'text', text: pickupDate }
    ];
  }

  return sendWhatsAppMessage({
    to: serviceCenterPhone,
    type: 'template',
    content: template
  });
}

// Send simple text message (for development/testing)
export async function sendTextMessage(
  phone: string,
  message: string
): Promise<WhatsAppResponse> {
  return sendWhatsAppMessage({
    to: phone,
    type: 'text',
    content: message
  });
}

// Validate phone number format
export function validatePhoneNumber(phone: string): boolean {
  // Basic validation for international phone numbers
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Format phone number for WhatsApp API
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Add + if not present and starts with country code
  if (!cleaned.startsWith('+') && cleaned.length >= 10) {
    // Assume Indian number if no country code
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  
  return cleaned;
}

// Batch send messages (with rate limiting)
export async function sendBatchWhatsAppMessages(
  messages: WhatsAppMessage[],
  delayMs: number = 1000
): Promise<WhatsAppResponse[]> {
  const results: WhatsAppResponse[] = [];
  
  for (let i = 0; i < messages.length; i++) {
    try {
      const result = await sendWhatsAppMessage(messages[i]);
      results.push(result);
      
      // Add delay between messages to respect rate limits
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}