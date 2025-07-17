import type { NextApiRequest, NextApiResponse } from 'next';

interface TestResult {
  testName: string;
  serviceType: string;
  consignmentType?: string;
  pincodePair: {
    origin: string;
    destination: string;
    description: string;
  };
  success: boolean;
  status: number;
  statusText: string;
  hasAwbNumber: boolean;
  awbNumber: string | null;
  isValidServiceType: boolean;
  responseData: any;
  errorMessage?: string;
}

interface ComprehensiveTestResponse {
  success: boolean;
  timestamp: string;
  customerAccount: {
    customerCode: string;
    isReverseCustomer: boolean;
    apiKeyPreview: string;
  };
  tests: TestResult[];
  workingConfigurations: TestResult[];
  summary: {
    totalTests: number;
    workingConfigurations: number;
    uniqueWorkingServiceTypes: number;
    uniqueWorkingPincodePairs: number;
    validServiceTypes: string[];
    validPincodePairs: string[];
    recommendations: string[];
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ComprehensiveTestResponse>
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
        uniqueWorkingServiceTypes: 0,
        uniqueWorkingPincodePairs: 0,
        validServiceTypes: [],
        validPincodePairs: [],
        recommendations: ['Method not allowed']
      }
    } as ComprehensiveTestResponse);
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
        uniqueWorkingServiceTypes: 0,
        uniqueWorkingPincodePairs: 0,
        validServiceTypes: [],
        validPincodePairs: [],
        recommendations: ['Missing DTDC credentials']
      }
    } as ComprehensiveTestResponse);
  }

  const tests: TestResult[] = [];
  const workingConfigurations: TestResult[] = [];

  // Comprehensive service types to test
  const serviceTypesToTest = [
    // Standard service types
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
    
    // Reverse-specific service types
    'R1', 'R2', 'R3', 'R4', 'R5', 'REV1', 'REV2', 'REVERSE',
    
    // GL-specific service types
    'GL1', 'GL2', 'GL3', 'GL4', 'GL5', 'GL10074',
    
    // Common DTDC service types
    'SURFACE', 'EXPRESS', 'PRIORITY', 'ECONOMY', 'PREMIUM',
    'CARGO', 'BULK', 'COD', 'PREPAID', 'REVERSE_PICKUP',
    
    // Numeric variations
    '21', '22', '23', '24', '25', '30', '35', '40', '45', '50',
    '100', '101', '102', '103', '104', '105',
    
    // Zero and negative (edge cases)
    '0', '-1'
  ];

  // Diverse pincode pairs for testing
  const pincodePairs = [
    { origin: '400069', destination: '110001', description: 'Mumbai to Delhi' },
    { origin: '110001', destination: '400069', description: 'Delhi to Mumbai' },
    { origin: '400069', destination: '560001', description: 'Mumbai to Bangalore' },
    { origin: '560001', destination: '400069', description: 'Bangalore to Mumbai' },
    { origin: '110001', destination: '560001', description: 'Delhi to Bangalore' },
    { origin: '560001', destination: '110001', description: 'Bangalore to Delhi' },
    { origin: '700001', destination: '400069', description: 'Kolkata to Mumbai' },
    { origin: '600001', destination: '110001', description: 'Chennai to Delhi' },
    { origin: '500001', destination: '400069', description: 'Hyderabad to Mumbai' },
    { origin: '380001', destination: '560001', description: 'Ahmedabad to Bangalore' }
  ];

  // Consignment types to test
  const consignmentTypes = ['forward', 'reverse', 'cod', 'prepaid'];

  let testCounter = 0;

  for (const serviceType of serviceTypesToTest) {
    for (const pincodePair of pincodePairs.slice(0, 3)) { // Limit to first 3 pairs to avoid timeout
      for (const consignmentType of consignmentTypes.slice(0, 2)) { // Test forward and reverse
        testCounter++;
        
        try {
          const testName = `Service Type: ${serviceType} | ${pincodePair.description} | ${consignmentType}`;
          
          // Prepare payload
          const payload = {
            customer_code: DTDC_CUSTOMER_CODE,
            service_type_id: serviceType,
            consignment_type: consignmentType,
            load_type: 'NON-DOCUMENT',
            description: 'Test Spare Part',
            dimension_unit: 'cm',
            weight_unit: 'kg',
            pieces: [{
              description: 'Test Item',
              declared_value: '1000',
              weight: '0.5',
              height: '10',
              length: '15',
              width: '10'
            }],
            shipper: {
              name: 'Test Shipper',
              add: 'Test Address',
              city: 'Mumbai',
              state: 'Maharashtra',
              country: 'India',
              pin: pincodePair.origin,
              phone: '9999999999'
            },
            consignee: {
              name: 'Test Consignee',
              add: 'Test Address',
              city: 'Delhi',
              state: 'Delhi',
              country: 'India',
              pin: pincodePair.destination,
              phone: '9999999999'
            },
            reference_number: `COMP-${Date.now()}-${testCounter}`,
            customer_reference_number: `COMP-${Date.now()}-${testCounter}`
          };

          const response = await fetch('https://api.dtdc.com/api/shipment/create', {
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
          
          const testResult: TestResult = {
            testName,
            serviceType,
            consignmentType,
            pincodePair,
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

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          const testResult: TestResult = {
            testName: `Service Type: ${serviceType} | ${pincodePair.description} | ${consignmentType}`,
            serviceType,
            consignmentType,
            pincodePair,
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
  }

  // Generate summary
  const validServiceTypes = [...new Set(workingConfigurations.map(config => config.serviceType))];
  const validPincodePairs = [...new Set(workingConfigurations.map(config => config.pincodePair.description))];
  
  const recommendations: string[] = [];
  
  if (workingConfigurations.length === 0) {
    recommendations.push('❌ No working service type configurations found');
    recommendations.push('🔧 GL10074 account may require specific service types not in standard range');
    recommendations.push('🔧 Contact DTDC support to verify available service types for GL10074');
    recommendations.push('🔧 Account may need activation for specific service types');
    recommendations.push('🔧 Consider testing with DTDC staging environment first');
  } else {
    recommendations.push(`✅ Found ${workingConfigurations.length} working configurations`);
    recommendations.push(`✅ Valid service types: ${validServiceTypes.join(', ')}`);
    recommendations.push(`✅ Valid pincode pairs: ${validPincodePairs.join(', ')}`);
  }

  const response: ComprehensiveTestResponse = {
    success: true,
    timestamp: new Date().toISOString(),
    customerAccount: {
      customerCode: DTDC_CUSTOMER_CODE,
      isReverseCustomer: true, // GL10074 is confirmed as reverse customer
      apiKeyPreview: DTDC_API_KEY.substring(0, 8) + '***'
    },
    tests,
    workingConfigurations,
    summary: {
      totalTests: tests.length,
      workingConfigurations: workingConfigurations.length,
      uniqueWorkingServiceTypes: validServiceTypes.length,
      uniqueWorkingPincodePairs: validPincodePairs.length,
      validServiceTypes,
      validPincodePairs,
      recommendations
    }
  };

  return res.status(200).json(response);
}