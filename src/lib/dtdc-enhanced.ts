// Enhanced DTDC API Integration with robust error handling and retry mechanisms
import { DTDCShipmentRequest, DTDCShipmentResponse, DTDCTrackingResponse } from './dtdc';

interface EnhancedDTDCRequest extends DTDCShipmentRequest {
  shipmentId?: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: {
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  weight: number;
  declaredValue: number;
  numBoxes: number;
  priority: string;
}

interface EnhancedDTDCResponse extends DTDCShipmentResponse {
  dtdcResponse?: any;
  retryCount?: number;
  processingTime?: number;
}

interface LabelGenerationRequest {
  boxId: string;
  shipmentId: string;
  awbNumber: string;
  recipientName: string;
  recipientAddress: {
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  boxNumber: number;
  totalBoxes: number;
  weight: number;
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
}

interface LabelGenerationResponse {
  success: boolean;
  labelUrl?: string;
  error?: string;
}

// Enhanced AWB generation with retry mechanism and better error handling
export async function generateAWB(request: EnhancedDTDCRequest): Promise<EnhancedDTDCResponse> {
  const startTime = Date.now();
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  console.log('🚀 Enhanced AWB generation started for shipment:', request.shipmentId);

  // Validate input parameters
  const validationError = validateAWBRequest(request);
  if (validationError) {
    console.error('❌ AWB request validation failed:', validationError);
    return {
      success: false,
      awb_number: '',
      tracking_url: '',
      error: validationError,
      retryCount: 0,
      processingTime: Date.now() - startTime
    };
  }

  while (retryCount <= maxRetries) {
    try {
      console.log(`🔄 AWB generation attempt ${retryCount + 1}/${maxRetries + 1}`);

      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.DTDC_API_KEY_NEW;
      
      if (isDevelopment) {
        console.log('🧪 Using development mode - generating mock AWB');
        return await generateMockAWBEnhanced(request, retryCount, startTime);
      }

      const customerCode = process.env.DTDC_CUSTOMER_CODE || process.env.DTDC_CUSTOMER_ID;
      const apiKey = process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY;
      const serviceType = process.env.DTDC_SERVICE_TYPE || 'B2C SMART EXPRESS';

      console.log('🔑 DTDC API Configuration:', {
        customerCode: customerCode ? `${customerCode.substring(0, 4)}***` : 'NOT_SET',
        apiKey: apiKey ? `${apiKey.substring(0, 8)}***` : 'NOT_SET',
        serviceType
      });

      if (!apiKey || !customerCode) {
        throw new Error(`DTDC API credentials not configured. CustomerCode: ${customerCode ? 'SET' : 'MISSING'}, ApiKey: ${apiKey ? 'SET' : 'MISSING'}`);
      }

      // Validate and ensure minimum weight
      const weight = Math.max(request.weight, 0.1); // Minimum 100g
      
      // Validate pincode
      if (!request.recipientAddress.pincode || request.recipientAddress.pincode.length !== 6) {
        throw new Error(`Invalid pincode: ${request.recipientAddress.pincode}. Must be 6 digits.`);
      }
      
      // Generate reference number
      const referenceNumber = request.shipmentId ? `SF-${request.shipmentId}` : `SF-${Date.now()}`;

      console.log('📦 Preparing DTDC payload:', {
        weight,
        pieces: request.numBoxes,
        declaredValue: request.declaredValue,
        recipientPincode: request.recipientAddress.pincode,
        recipientName: request.recipientName,
        recipientPhone: request.recipientPhone
      });

      // Prepare enhanced shipment payload
      const payload = {
        customerCode: customerCode,
        serviceTypeId: serviceType,
        consignments: [{
          customerReferenceNumber: referenceNumber,
          consignee: {
            name: request.recipientName.substring(0, 50), // DTDC name limit
            address: `${request.recipientAddress.street}, ${request.recipientAddress.area}`.substring(0, 100),
            city: request.recipientAddress.city,
            state: request.recipientAddress.state,
            pincode: request.recipientAddress.pincode,
            phone: request.recipientPhone.replace(/[^0-9]/g, '').substring(0, 10),
            email: 'customer@spareflow.com'
          },
          shipper: {
            name: 'SpareFlow Logistics',
            address: 'Tech Park, Andheri East',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400069',
            phone: '9876543200',
            email: 'shipping@spareflow.com'
          },
          productDetails: {
            productType: 'NON-DOC',
            pieces: request.numBoxes,
            weight: weight,
            declaredValue: Math.max(request.declaredValue, 100), // Minimum declared value
            codAmount: 0,
            description: 'Spare Parts and Components'
          },
          additionalServices: {
            pickupRequired: true,
            insuranceRequired: request.declaredValue > 5000,
            smsRequired: true,
            emailRequired: true
          }
        }]
      };

      console.log('🌐 Sending request to DTDC API...');

      const response = await fetch('https://pxapi.dtdc.in/api/customer/integration/consignment/softdata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      console.log('📡 DTDC API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ DTDC API error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        throw new Error(errorData.message || `DTDC API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 DTDC API response data:', JSON.stringify(data, null, 2));

      if (data.success && data.data && data.data.length > 0) {
        const consignmentData = data.data[0];
        const awbNumber = consignmentData.awbNumber || consignmentData.referenceNumber;

        if (!awbNumber) {
          throw new Error('No AWB number received from DTDC API');
        }

        console.log('✅ AWB generated successfully:', awbNumber);

        const response: EnhancedDTDCResponse = {
          success: true,
          awb_number: awbNumber,
          tracking_url: `https://www.dtdc.in/tracking/track.asp?strAWBNo=${awbNumber}`,
          reference_number: referenceNumber,
          label_generated: false,
          dtdcResponse: data,
          retryCount,
          processingTime: Date.now() - startTime
        };

        return response;
      } else {
        throw new Error(data.message || 'Failed to generate AWB - no data received');
      }

    } catch (error) {
      console.error(`❌ AWB generation attempt ${retryCount + 1} failed:`, error);
      
      retryCount++;
      
      if (retryCount <= maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('❌ All AWB generation attempts failed');
        
        return {
          success: false,
          awb_number: '',
          tracking_url: '',
          error: error instanceof Error ? error.message : 'Failed to generate AWB after multiple attempts',
          retryCount,
          processingTime: Date.now() - startTime
        };
      }
    }
  }

  // This should never be reached, but TypeScript requires it
  return {
    success: false,
    awb_number: '',
    tracking_url: '',
    error: 'Unexpected error in AWB generation',
    retryCount,
    processingTime: Date.now() - startTime
  };
}

// Enhanced label generation
export async function createShipmentLabel(request: LabelGenerationRequest): Promise<LabelGenerationResponse> {
  try {
    console.log('🏷️ Generating label for box:', request.boxId);

    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.DTDC_API_KEY_NEW;
    
    if (isDevelopment) {
      console.log('🧪 Using development mode - generating mock label');
      return {
        success: true,
        labelUrl: `/api/labels/download/mock-${request.boxId}`
      };
    }

    const apiKey = process.env.DTDC_API_KEY_NEW;
    
    if (!apiKey) {
      throw new Error('DTDC API key not configured');
    }

    // Generate label using DTDC API
    const response = await fetch(`https://pxapi.dtdc.in/api/customer/integration/consignment/shippinglabel/stream?reference_number=${request.awbNumber}&label_code=SHIP_LABEL_4X6&label_format=pdf`, {
      method: 'GET',
      headers: {
        'api-key': apiKey,
        'Accept': 'application/pdf'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`Label generation failed: ${response.status}`);
    }

    // In a real implementation, you would save the PDF to cloud storage
    // For now, we'll return a download URL
    return {
      success: true,
      labelUrl: `/api/labels/download/${request.boxId}`
    };

  } catch (error) {
    console.error('❌ Label generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Label generation failed'
    };
  }
}

// Enhanced tracking with better error handling
export async function trackShipmentEnhanced(awbNumber: string): Promise<DTDCTrackingResponse> {
  try {
    console.log('🔍 Tracking shipment:', awbNumber);

    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.DTDC_TRACKING_ACCESS_TOKEN;
    
    if (isDevelopment) {
      console.log('🧪 Using development mode - generating mock tracking');
      return generateMockTrackingEnhanced(awbNumber);
    }

    const accessToken = process.env.DTDC_TRACKING_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error('DTDC tracking credentials not configured');
    }

    const response = await fetch('https://blktracksvc.dtdc.com/dtdc-api/rest/JSONCnTrk/getTrackDetails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': accessToken,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        trkType: 'cnno',
        strcnno: awbNumber,
        addtnlDtl: 'Y'
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `DTDC Tracking API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const trackingData = data[0];
      
      // Map DTDC tracking events to our format
      const trackingHistory = trackingData.trackingDetails?.map((event: any) => ({
        scan_code: event.statusCode || 'UNK',
        status: mapDTDCStatus(event.status),
        location: event.location || 'Unknown',
        timestamp: event.statusDateTime || new Date().toISOString(),
        description: event.statusDescription || event.status || 'Status update'
      })) || [];

      const currentEvent = trackingHistory[trackingHistory.length - 1] || {
        scan_code: 'UNK',
        status: 'UNKNOWN',
        location: 'Unknown',
        timestamp: new Date().toISOString(),
        description: 'No tracking information available'
      };

      return {
        success: true,
        awb_number: awbNumber,
        current_status: currentEvent.status,
        scan_code: currentEvent.scan_code,
        location: currentEvent.location,
        timestamp: currentEvent.timestamp,
        description: currentEvent.description,
        tracking_history: trackingHistory
      };
    } else {
      throw new Error('No tracking information found');
    }

  } catch (error) {
    console.error('❌ Tracking failed:', error);
    
    return {
      success: false,
      awb_number: awbNumber,
      current_status: 'UNKNOWN',
      timestamp: new Date().toISOString(),
      tracking_history: [],
      error: error instanceof Error ? error.message : 'Unable to fetch tracking information'
    };
  }
}

// Validation function for AWB requests
function validateAWBRequest(request: EnhancedDTDCRequest): string | null {
  if (!request.recipientName || request.recipientName.trim().length === 0) {
    return 'Recipient name is required';
  }

  if (!request.recipientPhone || request.recipientPhone.replace(/[^0-9]/g, '').length < 10) {
    return 'Valid recipient phone number is required';
  }

  if (!request.recipientAddress.pincode || request.recipientAddress.pincode.length !== 6) {
    return 'Valid 6-digit pincode is required';
  }

  if (!request.recipientAddress.city || request.recipientAddress.city.trim().length === 0) {
    return 'Recipient city is required';
  }

  if (!request.recipientAddress.state || request.recipientAddress.state.trim().length === 0) {
    return 'Recipient state is required';
  }

  if (request.weight <= 0) {
    return 'Weight must be greater than 0';
  }

  if (request.numBoxes <= 0) {
    return 'Number of boxes must be greater than 0';
  }

  if (request.declaredValue <= 0) {
    return 'Declared value must be greater than 0';
  }

  return null;
}

// Enhanced mock AWB generation for development
async function generateMockAWBEnhanced(request: EnhancedDTDCRequest, retryCount: number, startTime: number): Promise<EnhancedDTDCResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + (retryCount * 500)));
  
  const awbNumber = `DTDC${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  
  // Simulate 95% success rate, but higher success on retries
  const successRate = 0.85 + (retryCount * 0.05);
  
  if (Math.random() < successRate) {
    return {
      success: true,
      awb_number: awbNumber,
      tracking_url: `https://www.dtdc.in/tracking/track.asp?strAWBNo=${awbNumber}`,
      reference_number: request.shipmentId ? `SF-${request.shipmentId}` : `SF-${Date.now()}`,
      label_generated: false,
      dtdcResponse: {
        success: true,
        data: [{
          awbNumber,
          referenceNumber: request.shipmentId ? `SF-${request.shipmentId}` : `SF-${Date.now()}`,
          status: 'BOOKED'
        }]
      },
      retryCount,
      processingTime: Date.now() - startTime
    };
  } else {
    throw new Error(`Mock DTDC API error (attempt ${retryCount + 1})`);
  }
}

// Enhanced mock tracking for development
function generateMockTrackingEnhanced(awbNumber: string): DTDCTrackingResponse {
  const awbTimestamp = extractTimestampFromAWB(awbNumber);
  const ageInHours = (Date.now() - awbTimestamp) / (1000 * 60 * 60);
  
  const trackingHistory = generateMockTrackingHistory(awbNumber, awbTimestamp, ageInHours);
  const currentEvent = trackingHistory[trackingHistory.length - 1];
  
  return {
    success: true,
    awb_number: awbNumber,
    current_status: currentEvent.status,
    scan_code: currentEvent.scan_code,
    location: currentEvent.location,
    timestamp: currentEvent.timestamp,
    description: currentEvent.description,
    tracking_history: trackingHistory
  };
}

// Helper functions
function extractTimestampFromAWB(awbNumber: string): number {
  const match = awbNumber.match(/DTDC(\d{13})/);
  if (match) {
    return parseInt(match[1]);
  }
  return Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000);
}

function generateMockTrackingHistory(awbNumber: string, startTime: number, ageInHours: number): any[] {
  const events: any[] = [];
  const locations = [
    'Mumbai Hub',
    'Delhi Hub', 
    'Bangalore Hub',
    'Chennai Hub',
    'Kolkata Hub',
    'Hyderabad Hub',
    'Pune Hub',
    'Local Facility',
    'Out for Delivery',
    'Delivered'
  ];
  
  let currentTime = startTime;
  
  events.push({
    scan_code: 'BK',
    status: 'BOOKED',
    location: 'Origin',
    timestamp: new Date(currentTime).toISOString(),
    description: 'Shipment booked and ready for pickup'
  });
  
  if (ageInHours > 2) {
    currentTime += 2 * 60 * 60 * 1000;
    events.push({
      scan_code: 'PU',
      status: 'PICKED_UP',
      location: 'Origin Hub',
      timestamp: new Date(currentTime).toISOString(),
      description: 'Package picked up from sender'
    });
  }
  
  if (ageInHours > 6) {
    currentTime += 4 * 60 * 60 * 1000;
    events.push({
      scan_code: 'IT',
      status: 'IN_TRANSIT',
      location: locations[Math.floor(Math.random() * 3)],
      timestamp: new Date(currentTime).toISOString(),
      description: 'Package in transit to destination hub'
    });
  }
  
  if (ageInHours > 24) {
    currentTime += 18 * 60 * 60 * 1000;
    events.push({
      scan_code: 'RH',
      status: 'REACHED_HUB',
      location: locations[Math.floor(Math.random() * locations.length - 2)],
      timestamp: new Date(currentTime).toISOString(),
      description: 'Package reached destination hub'
    });
  }
  
  if (ageInHours > 36) {
    currentTime += 12 * 60 * 60 * 1000;
    events.push({
      scan_code: 'OD',
      status: 'OUT_FOR_DELIVERY',
      location: 'Local Facility',
      timestamp: new Date(currentTime).toISOString(),
      description: 'Package out for delivery'
    });
  }
  
  if (ageInHours > 48) {
    currentTime += 8 * 60 * 60 * 1000;
    events.push({
      scan_code: 'DL',
      status: 'DELIVERED',
      location: 'Destination',
      timestamp: new Date(currentTime).toISOString(),
      description: 'Package delivered successfully'
    });
  }
  
  return events;
}

function mapDTDCStatus(dtdcStatus: string): string {
  const statusMap: Record<string, string> = {
    'BOOKED': 'BOOKED',
    'PICKUP_SCHEDULED': 'PICKUP_SCHEDULED',
    'PICKED_UP': 'PICKED_UP',
    'PICKED UP': 'PICKED_UP',
    'IN_TRANSIT': 'IN_TRANSIT',
    'IN TRANSIT': 'IN_TRANSIT',
    'REACHED_DESTINATION': 'REACHED_HUB',
    'REACHED DESTINATION': 'REACHED_HUB',
    'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
    'OUT FOR DELIVERY': 'OUT_FOR_DELIVERY',
    'DELIVERED': 'DELIVERED',
    'DELIVERY_ATTEMPTED': 'DELIVERY_ATTEMPTED',
    'DELIVERY ATTEMPTED': 'DELIVERY_ATTEMPTED',
    'RTO': 'RETURN_TO_ORIGIN',
    'RETURN TO ORIGIN': 'RETURN_TO_ORIGIN',
    'CANCELLED': 'CANCELLED',
    'LOST': 'LOST',
    'DAMAGED': 'DAMAGED'
  };

  return statusMap[dtdcStatus?.toUpperCase()] || dtdcStatus || 'UNKNOWN';
}