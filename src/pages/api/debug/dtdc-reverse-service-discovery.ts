import type { NextApiRequest, NextApiResponse } from 'next';

interface ReverseTestResult {
  testName: string;
  serviceType: string;
  endpoint: string;
  payload: any;
  success: boolean;
  status: number;
  statusText: string;
  hasAwbNumber: boolean;
  awbNumber: string | null;
  isValidServiceType: boolean;
  responseData: any;
  errorMessage?: string;
}

interface ReverseTestResponse {
  success: boolean;
  timestamp: string;
  customerAccount: {
    customerCode: string;
    isReverseCustomer: boolean;
    apiKeyPreview: string;
  };
  tests: ReverseTestResult[];
  workingConfigurations: ReverseTestResult[];
  summary: {
    totalTests: number;
    workingConfigurations: number;
    validServiceTypes: string[];
    recommendations: string[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReverseTestResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      timestamp: new Date().toISOString(),
      customerAccount: {
        customerCode: '',
        isReverseCustomer: false,
        apiKeyPreview: ''
      },
      tests: [],
      workingConfigurations: [],
      summary: {
        totalTests: 0,
        workingConfigurations: 0,
        validServiceTypes: [],
        recommendations: ['Method not allowed']
      }
    } as ReverseTestResponse);
  }

  const DTDC_API_KEY = process.env.DTDC_API_KEY_NEW;
  const DTDC_CUSTOMER_CODE = process.env.DTDC_CUSTOMER_CODE;

  if (!DTDC_API_KEY || !DTDC_CUSTOMER_CODE) {
    return res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      customerAccount: {
        customerCode: '',
        isReverseCustomer: false,
        apiKeyPreview: ''
      },
      tests: [],
      workingConfigurations: [],
      summary: {
        totalTests: 0,
        workingConfigurations: 0,
        validServiceTypes: [],
        recommendations: ['Missing DTDC credentials']
      }
    } as ReverseTestResponse);
  }

  const tests: ReverseTestResult[] = [];
  const workingConfigurations: ReverseTestResult[] = [];

  // Reverse-specific service types and configurations
  const reverseConfigurations = [
    // Standard reverse service types
    { serviceType: '1', consignmentType: 'reverse' },
    { serviceType: '2', consignmentType: 'reverse' },
    { serviceType: '3', consignmentType: 'reverse' },
    
    // Reverse-specific service types
    { serviceType: 'R1', consignmentType: 'reverse' },
    { serviceType: 'R2', consignmentType: 'reverse' },
    { serviceType: 'REV', consignmentType: 'reverse' },
    { serviceType: 'REVERSE', consignmentType: 'reverse' },
    
    // Try without specifying consignment type
    { serviceType: '1', consignmentType: undefined },
    { serviceType: '2', consignmentType: undefined },
    
    // GL-specific configurations
    { serviceType: 'GL1', consignmentType: 'reverse' },
    { serviceType: 'GL2', consignmentType: 'reverse' },
    
    // Common reverse logistics service types
    { serviceType: 'PICKUP', consignmentType: 'reverse' },
    { serviceType: 'RETURN', consignmentType: 'reverse' },
    { serviceType: 'RTO', consignmentType: 'reverse' },
  ];

  // Alternative endpoints to test
  const endpoints = [
    'https://api.dtdc.com/api/shipment/create',
    'https://api.dtdc.com/api/reverse/create',
    'https://api.dtdc.com/api/pickup/create',
    'https://api.dtdc.com/v2/shipment/create'
  ];

  let testCounter = 0;

  for (const endpoint of endpoints) {
    for (const config of reverseConfigurations) {
      testCounter++;
      
      try {
        const testName = `${config.serviceType} | ${config.consignmentType || 'default'} | ${endpoint.split('/').pop()}`;
        
        // Prepare reverse logistics payload
        const basePayload = {
          customer_code: DTDC_CUSTOMER_CODE,
          service_type_id: config.serviceType,
          load_type: 'NON-DOCUMENT',
          description: 'Reverse Logistics Test',
          dimension_unit: 'cm',
          weight_unit: 'kg',
          pieces: [{
            description: 'Return Item',
            declared_value: '1000',
            weight: '0.5',
            height: '10',
            length: '15',
            width: '10'
          }],
          // For reverse logistics, shipper is the destination (where item is picked up from)
          shipper: {
            name: 'Customer Return',
            add: 'Customer Address',
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            pin: '110001',
            phone: '9999999999'
          },
          // Consignee is the brand/company (where item is returned to)
          consignee: {
            name: 'Brand Warehouse',
            add: 'Warehouse Address',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            pin: '400069',
            phone: '9999999999'
          },
          reference_number: `REV-${Date.now()}-${testCounter}`,
          customer_reference_number: `REV-${Date.now()}-${testCounter}`
        };

        // Add consignment type if specified
        const payload = config.consignmentType 
          ? { ...basePayload, consignment_type: config.consignmentType }
          : basePayload;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': DTDC_API_KEY
          },
          body: JSON.stringify(payload)
        });

        const responseData = await response.json();
        
        // Check if AWB was generated successfully
        const hasAwbNumber = responseData?.data?.[0]?.awb_number ? true : false;
        const awbNumber = responseData?.data?.[0]?.awb_number || null;
        const isValidServiceType = hasAwbNumber && responseData?.data?.[0]?.success === true;
        
        const testResult: ReverseTestResult = {
          testName,
          serviceType: config.serviceType,
          endpoint,
          payload,
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          hasAwbNumber,
          awbNumber,
          isValidServiceType,
          responseData,
          errorMessage: responseData?.data?.[0]?.message || responseData?.message
        };

        tests.push(testResult);

        if (isValidServiceType) {
          workingConfigurations.push(testResult);
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        const testResult: ReverseTestResult = {
          testName: `${config.serviceType} | ${config.consignmentType || 'default'} | ${endpoint.split('/').pop()}`,
          serviceType: config.serviceType,
          endpoint,
          payload: {},
          success: false,
          status: 0,
          statusText: 'Network Error',
          hasAwbNumber: false,
          awbNumber: null,
          isValidServiceType: false,
          responseData: null,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        };

        tests.push(testResult);
      }
    }
  }

  // Generate summary
  const validServiceTypes = [...new Set(workingConfigurations.map(config => config.serviceType))];
  
  const recommendations: string[] = [];
  
  if (workingConfigurations.length === 0) {
    recommendations.push('❌ No working reverse logistics configurations found');
    recommendations.push('🔧 GL10074 may require specific reverse logistics activation');
    recommendations.push('🔧 Try contacting DTDC to enable reverse logistics services');
    recommendations.push('🔧 Account may need different API endpoints for reverse logistics');
    recommendations.push('🔧 Consider using DTDC pickup/return specific APIs');
  } else {
    recommendations.push(`✅ Found ${workingConfigurations.length} working reverse configurations`);
    recommendations.push(`✅ Valid service types: ${validServiceTypes.join(', ')}`);
    recommendations.push('✅ Use these configurations for reverse logistics');
  }

  const response: ReverseTestResponse = {
    success: true,
    timestamp: new Date().toISOString(),
    customerAccount: {
      customerCode: DTDC_CUSTOMER_CODE,
      isReverseCustomer: true,
      apiKeyPreview: DTDC_API_KEY.substring(0, 8) + '***'
    },
    tests,
    workingConfigurations,
    summary: {
      totalTests: tests.length,
      workingConfigurations: workingConfigurations.length,
      validServiceTypes,
      recommendations
    }
  };

  return res.status(200).json(response);
}