import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication - only SUPER_ADMIN can access this
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (authResult.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only super admin can access this endpoint' });
    }

    console.log('🧪 Starting comprehensive DTDC test...');

    // Step 1: Check environment variables
    const envCheck = {
      DTDC_API_KEY: !!process.env.DTDC_API_KEY,
      DTDC_API_KEY_NEW: !!process.env.DTDC_API_KEY_NEW,
      DTDC_CUSTOMER_CODE: !!process.env.DTDC_CUSTOMER_CODE,
      DTDC_CUSTOMER_ID: !!process.env.DTDC_CUSTOMER_ID,
      DTDC_SERVICE_TYPE: !!process.env.DTDC_SERVICE_TYPE,
      DTDC_COMMODITY_ID: !!process.env.DTDC_COMMODITY_ID,
      DTDC_TRACKING_ACCESS_TOKEN: !!process.env.DTDC_TRACKING_ACCESS_TOKEN,
      DTDC_TRACKING_USERNAME: !!process.env.DTDC_TRACKING_USERNAME,
      DTDC_TRACKING_PASSWORD: !!process.env.DTDC_TRACKING_PASSWORD
    };

    const envValues = {
      DTDC_API_KEY: process.env.DTDC_API_KEY ? `${process.env.DTDC_API_KEY.substring(0, 8)}***` : 'NOT_SET',
      DTDC_API_KEY_NEW: process.env.DTDC_API_KEY_NEW ? `${process.env.DTDC_API_KEY_NEW.substring(0, 8)}***` : 'NOT_SET',
      DTDC_CUSTOMER_CODE: process.env.DTDC_CUSTOMER_CODE || 'NOT_SET',
      DTDC_CUSTOMER_ID: process.env.DTDC_CUSTOMER_ID || 'NOT_SET',
      DTDC_SERVICE_TYPE: process.env.DTDC_SERVICE_TYPE || 'NOT_SET',
      DTDC_COMMODITY_ID: process.env.DTDC_COMMODITY_ID || 'NOT_SET'
    };

    console.log('🔧 Environment variables check:', envCheck);
    console.log('🔧 Environment values:', envValues);

    // Step 2: Determine which credentials to use
    const apiKey = process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY;
    const customerCode = process.env.DTDC_CUSTOMER_CODE || process.env.DTDC_CUSTOMER_ID;
    const serviceType = process.env.DTDC_SERVICE_TYPE || 'GROUND EXPRESS';
    const commodityId = process.env.DTDC_COMMODITY_ID || 'Electric items';

    if (!apiKey || !customerCode) {
      return res.status(400).json({
        error: 'Missing DTDC credentials',
        envCheck,
        envValues,
        missingCredentials: {
          apiKey: !apiKey,
          customerCode: !customerCode
        }
      });
    }

    // Step 3: Test multiple payload variations for both forward and reverse shipments
    const testResults = [];
    
    // Determine if this is a reverse customer account
    const isReverseCustomer = customerCode === 'GL10074' || process.env.DTDC_ACCOUNT_TYPE === 'REVERSE';
    
    console.log(`🧪 Account type detected: ${isReverseCustomer ? 'REVERSE' : 'FORWARD'} customer`);

    // Test 1: Forward shipment (Brand to Service Center)
    console.log('🧪 Test 1: Forward shipment payload (Brand to Service Center)...');
    const forwardPayload = {
      consignments: [{
        customer_code: customerCode,
        service_type_id: serviceType,
        load_type: 'NON-DOCUMENT',
        description: 'Spare Parts and Electronic Components',
        dimension_unit: 'cm',
        length: '30.0',
        width: '20.0',
        height: '15.0',
        weight_unit: 'kg',
        weight: '0.5',
        declared_value: '1000',
        num_pieces: '1',
        commodity_id: commodityId,
        consignment_type: 'forward',
        
        // For forward shipment: Origin = Brand warehouse, Destination = Service center
        origin_details: {
          name: 'SpareFlow Logistics Pvt Ltd',
          phone: '9876543200',
          alternate_phone: '9876543200',
          address_line_1: 'Tech Park, Andheri East',
          address_line_2: 'Near Metro Station',
          pincode: '400069',
          city: 'Mumbai',
          state: 'Maharashtra'
        },
        destination_details: {
          name: 'Test Service Center',
          phone: '9876543201',
          alternate_phone: '',
          address_line_1: 'Test Service Center Address',
          address_line_2: 'Service Area',
          pincode: '110001',
          city: 'Delhi',
          state: 'Delhi'
        },
        return_details: {
          name: 'SpareFlow Returns',
          phone: '9876543200',
          alternate_phone: '9876543200',
          address_line_1: 'Tech Park, Andheri East',
          address_line_2: 'Returns Department',
          pincode: '400069',
          city_name: 'Mumbai',
          state_name: 'Maharashtra',
          email: 'returns@spareflow.com'
        },
        customer_reference_number: `TEST-FWD-${Date.now()}`,
        cod_collection_mode: '',
        cod_amount: '',
        eway_bill: '',
        is_risk_surcharge_applicable: 'false',
        invoice_number: `INV-FWD-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        reference_number: `REF-FWD-${Date.now()}`
      }]
    };

    const forwardResult = await testDTDCPayload(forwardPayload, apiKey, 'Forward Shipment (Brand to Service Center)');
    testResults.push(forwardResult);

    // Test 2: Reverse shipment (Service Center to Brand)
    console.log('🧪 Test 2: Reverse shipment payload (Service Center to Brand)...');
    const reversePayload = {
      consignments: [{
        customer_code: customerCode,
        service_type_id: serviceType,
        load_type: 'NON-DOCUMENT',
        description: 'Spare Parts Return',
        dimension_unit: 'cm',
        length: '30.0',
        width: '20.0',
        height: '15.0',
        weight_unit: 'kg',
        weight: '0.5',
        declared_value: '1000',
        num_pieces: '1',
        commodity_id: commodityId,
        consignment_type: 'reverse',
        
        // For reverse shipment: Origin = Service center (pickup), Destination = Brand warehouse
        origin_details: {
          name: 'Test Service Center',
          phone: '9876543201',
          alternate_phone: '',
          address_line_1: 'Test Service Center Address',
          address_line_2: 'Service Area',
          pincode: '110001',
          city: 'Delhi',
          state: 'Delhi'
        },
        destination_details: {
          name: 'SpareFlow Logistics Pvt Ltd',
          phone: '9876543200',
          alternate_phone: '9876543200',
          address_line_1: 'Tech Park, Andheri East',
          address_line_2: 'Near Metro Station',
          pincode: '400069',
          city: 'Mumbai',
          state: 'Maharashtra'
        },
        return_details: {
          name: 'SpareFlow Returns',
          phone: '9876543200',
          alternate_phone: '9876543200',
          address_line_1: 'Tech Park, Andheri East',
          address_line_2: 'Returns Department',
          pincode: '400069',
          city_name: 'Mumbai',
          state_name: 'Maharashtra',
          email: 'returns@spareflow.com'
        },
        customer_reference_number: `TEST-REV-${Date.now()}`,
        cod_collection_mode: '',
        cod_amount: '',
        eway_bill: '',
        is_risk_surcharge_applicable: 'false',
        invoice_number: `INV-REV-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        reference_number: `REF-REV-${Date.now()}`
      }]
    };

    const reverseResult = await testDTDCPayload(reversePayload, apiKey, 'Reverse Shipment (Service Center to Brand)');
    testResults.push(reverseResult);

    // Test 3: Minimal forward payload
    console.log('🧪 Test 3: Minimal forward payload...');
    const minimalForwardPayload = {
      consignments: [{
        customer_code: customerCode,
        service_type_id: serviceType,
        load_type: 'NON-DOCUMENT',
        description: 'Minimal Forward Test',
        dimension_unit: 'cm',
        length: '30.0',
        width: '20.0',
        height: '15.0',
        weight_unit: 'kg',
        weight: '0.5',
        declared_value: '500',
        num_pieces: '1',
        commodity_id: commodityId,
        consignment_type: 'forward',
        origin_details: {
          name: 'SpareFlow Logistics',
          phone: '9876543200',
          address_line_1: 'Tech Park, Andheri East',
          pincode: '400069',
          city: 'Mumbai',
          state: 'Maharashtra'
        },
        destination_details: {
          name: 'Service Center',
          phone: '9876543201',
          address_line_1: 'Service Center Address',
          pincode: '110001',
          city: 'Delhi',
          state: 'Delhi'
        },
        customer_reference_number: `MIN-FWD-${Date.now()}`
      }]
    };

    const minimalForwardResult = await testDTDCPayload(minimalForwardPayload, apiKey, 'Minimal Forward Payload');
    testResults.push(minimalForwardResult);

    // Test 4: Minimal reverse payload
    console.log('🧪 Test 4: Minimal reverse payload...');
    const minimalReversePayload = {
      consignments: [{
        customer_code: customerCode,
        service_type_id: serviceType,
        load_type: 'NON-DOCUMENT',
        description: 'Minimal Reverse Test',
        dimension_unit: 'cm',
        length: '30.0',
        width: '20.0',
        height: '15.0',
        weight_unit: 'kg',
        weight: '0.5',
        declared_value: '500',
        num_pieces: '1',
        commodity_id: commodityId,
        consignment_type: 'reverse',
        origin_details: {
          name: 'Service Center',
          phone: '9876543201',
          address_line_1: 'Service Center Address',
          pincode: '110001',
          city: 'Delhi',
          state: 'Delhi'
        },
        destination_details: {
          name: 'SpareFlow Logistics',
          phone: '9876543200',
          address_line_1: 'Tech Park, Andheri East',
          pincode: '400069',
          city: 'Mumbai',
          state: 'Maharashtra'
        },
        customer_reference_number: `MIN-REV-${Date.now()}`
      }]
    };

    const minimalReverseResult = await testDTDCPayload(minimalReversePayload, apiKey, 'Minimal Reverse Payload');
    testResults.push(minimalReverseResult);

    // Test 5: Production-like forward payload
    console.log('🧪 Test 5: Production-like forward payload...');
    const productionForwardPayload = {
      consignments: [{
        customer_code: customerCode,
        service_type_id: serviceType,
        load_type: 'NON-DOCUMENT',
        description: 'Spare Parts and Electronic Components',
        dimension_unit: 'cm',
        length: '30.0',
        width: '20.0',
        height: '15.0',
        weight_unit: 'kg',
        weight: '0.5',
        declared_value: '1500',
        num_pieces: '1',
        commodity_id: commodityId,
        consignment_type: 'forward',
        origin_details: {
          name: 'SpareFlow Logistics Pvt Ltd',
          phone: '9876543200',
          alternate_phone: '9876543200',
          address_line_1: 'Tech Park, Andheri East',
          address_line_2: 'Near Metro Station',
          pincode: '400069',
          city: 'Mumbai',
          state: 'Maharashtra'
        },
        destination_details: {
          name: 'Test Service Center',
          phone: '9876543201',
          alternate_phone: '',
          address_line_1: 'Service Center Address, Main Road',
          address_line_2: '',
          pincode: '110001',
          city: 'Delhi',
          state: 'Delhi'
        },
        return_details: {
          name: 'SpareFlow Returns',
          phone: '9876543200',
          alternate_phone: '9876543200',
          address_line_1: 'Tech Park, Andheri East',
          address_line_2: 'Returns Department',
          pincode: '400069',
          city_name: 'Mumbai',
          state_name: 'Maharashtra',
          email: 'returns@spareflow.com'
        },
        customer_reference_number: `SF-PROD-FWD-${Date.now()}`,
        cod_collection_mode: '',
        cod_amount: '',
        eway_bill: '',
        is_risk_surcharge_applicable: 'false',
        invoice_number: `SF-INV-FWD-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        reference_number: `SF-REF-FWD-${Date.now()}`
      }]
    };

    const productionForwardResult = await testDTDCPayload(productionForwardPayload, apiKey, 'Production-like Forward Payload');
    testResults.push(productionForwardResult);

    // Test 6: Production-like reverse payload
    console.log('🧪 Test 6: Production-like reverse payload...');
    const productionReversePayload = {
      consignments: [{
        customer_code: customerCode,
        service_type_id: serviceType,
        load_type: 'NON-DOCUMENT',
        description: 'Spare Parts Return',
        dimension_unit: 'cm',
        length: '30.0',
        width: '20.0',
        height: '15.0',
        weight_unit: 'kg',
        weight: '0.5',
        declared_value: '1500',
        num_pieces: '1',
        commodity_id: commodityId,
        consignment_type: 'reverse',
        origin_details: {
          name: 'Test Service Center',
          phone: '9876543201',
          alternate_phone: '',
          address_line_1: 'Service Center Address, Main Road',
          address_line_2: '',
          pincode: '110001',
          city: 'Delhi',
          state: 'Delhi'
        },
        destination_details: {
          name: 'SpareFlow Logistics Pvt Ltd',
          phone: '9876543200',
          alternate_phone: '9876543200',
          address_line_1: 'Tech Park, Andheri East',
          address_line_2: 'Near Metro Station',
          pincode: '400069',
          city: 'Mumbai',
          state: 'Maharashtra'
        },
        return_details: {
          name: 'SpareFlow Returns',
          phone: '9876543200',
          alternate_phone: '9876543200',
          address_line_1: 'Tech Park, Andheri East',
          address_line_2: 'Returns Department',
          pincode: '400069',
          city_name: 'Mumbai',
          state_name: 'Maharashtra',
          email: 'returns@spareflow.com'
        },
        customer_reference_number: `SF-PROD-REV-${Date.now()}`,
        cod_collection_mode: '',
        cod_amount: '',
        eway_bill: '',
        is_risk_surcharge_applicable: 'false',
        invoice_number: `SF-INV-REV-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        reference_number: `SF-REF-REV-${Date.now()}`
      }]
    };

    const productionReverseResult = await testDTDCPayload(productionReversePayload, apiKey, 'Production-like Reverse Payload');
    testResults.push(productionReverseResult);

    // Step 4: Test different API endpoints
    console.log('🧪 Test 4: Testing different API endpoints...');
    const endpointTests = [];

    // Use the forward payload for endpoint testing
    const testPayload = forwardPayload;

    // Test primary endpoint
    const primaryEndpointTest = await testDTDCEndpoint(
      'https://pxapi.dtdc.in/api/customer/integration/consignment/softdata',
      testPayload,
      apiKey,
      'Primary Endpoint'
    );
    endpointTests.push(primaryEndpointTest);

    // Test alternative endpoint (if exists)
    const altEndpointTest = await testDTDCEndpoint(
      'https://api.dtdc.in/api/customer/integration/consignment/softdata',
      testPayload,
      apiKey,
      'Alternative Endpoint'
    );
    endpointTests.push(altEndpointTest);

    // Step 5: Test authentication variations
    console.log('🧪 Test 5: Testing authentication variations...');
    const authTests = [];

    // Test with different header formats
    const authVariations = [
      { 'api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      { 'API-KEY': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }
    ];

    for (let i = 0; i < authVariations.length; i++) {
      const headers = authVariations[i];
      const authTest = await testDTDCAuth(
        'https://pxapi.dtdc.in/api/customer/integration/consignment/softdata',
        testPayload,
        headers,
        `Auth Variation ${i + 1}`
      );
      authTests.push(authTest);
    }

    // Step 6: Compile comprehensive results
    const comprehensiveResults = {
      timestamp: new Date().toISOString(),
      environmentCheck: {
        variables: envCheck,
        values: envValues,
        credentialsAvailable: {
          apiKey: !!apiKey,
          customerCode: !!customerCode,
          serviceType: !!serviceType,
          commodityId: !!commodityId
        }
      },
      payloadTests: testResults,
      endpointTests,
      authenticationTests: authTests,
      summary: {
        totalTests: testResults.length + endpointTests.length + authTests.length,
        successfulTests: [
          ...testResults,
          ...endpointTests,
          ...authTests
        ].filter(test => test.success).length,
        recommendations: []
      }
    };

    // Generate recommendations
    const allTests = [...testResults, ...endpointTests, ...authTests];
    const successfulTests = allTests.filter(test => test.success);
    const failedTests = allTests.filter(test => !test.success);

    if (successfulTests.length === 0) {
      comprehensiveResults.summary.recommendations.push('❌ All tests failed - check DTDC credentials and API access');
    } else if (successfulTests.length < allTests.length) {
      comprehensiveResults.summary.recommendations.push('⚠️ Some tests passed - check specific configurations');
    } else {
      comprehensiveResults.summary.recommendations.push('✅ All tests passed - DTDC integration should work');
    }

    // Check for common error patterns
    const authErrors = failedTests.filter(test => 
      test.status === 401 || test.status === 403 || 
      (test.error && test.error.includes('auth'))
    );
    
    if (authErrors.length > 0) {
      comprehensiveResults.summary.recommendations.push('🔑 Authentication issues detected - verify API key and customer code');
    }

    const badRequestErrors = failedTests.filter(test => test.status === 400);
    if (badRequestErrors.length > 0) {
      comprehensiveResults.summary.recommendations.push('📦 Payload format issues detected - check required fields');
    }

    return res.status(200).json(comprehensiveResults);

  } catch (error) {
    console.error('❌ Comprehensive DTDC test failed:', error);
    
    return res.status(500).json({
      error: 'Comprehensive DTDC test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

// Helper function to test DTDC payload
async function testDTDCPayload(payload: any, apiKey: string, testName: string) {
  const startTime = Date.now();
  
  try {
    console.log(`🧪 Testing ${testName}...`);
    
    const response = await fetch('https://pxapi.dtdc.in/api/customer/integration/consignment/softdata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'SpareFlow-Test/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000)
    });

    const processingTime = Date.now() - startTime;
    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    return {
      testName,
      success: response.ok && responseData.success === true,
      status: response.status,
      statusText: response.statusText,
      processingTime,
      responseData,
      rawResponse: responseText.substring(0, 500), // Truncate for readability
      payload: JSON.stringify(payload, null, 2).substring(0, 1000), // Truncate for readability
      error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
    };

  } catch (error) {
    return {
      testName,
      success: false,
      status: 0,
      statusText: 'Network Error',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      payload: JSON.stringify(payload, null, 2).substring(0, 1000)
    };
  }
}

// Helper function to test DTDC endpoint
async function testDTDCEndpoint(endpoint: string, payload: any, apiKey: string, testName: string) {
  const startTime = Date.now();
  
  try {
    console.log(`🧪 Testing ${testName} at ${endpoint}...`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'SpareFlow-Test/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000)
    });

    const processingTime = Date.now() - startTime;
    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    return {
      testName,
      endpoint,
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      processingTime,
      responseData,
      error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
    };

  } catch (error) {
    return {
      testName,
      endpoint,
      success: false,
      status: 0,
      statusText: 'Network Error',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to test DTDC authentication
async function testDTDCAuth(endpoint: string, payload: any, headers: any, testName: string) {
  const startTime = Date.now();
  
  try {
    console.log(`🧪 Testing ${testName}...`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'User-Agent': 'SpareFlow-Test/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000)
    });

    const processingTime = Date.now() - startTime;
    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }

    return {
      testName,
      headers,
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      processingTime,
      responseData,
      error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
    };

  } catch (error) {
    return {
      testName,
      headers,
      success: false,
      status: 0,
      statusText: 'Network Error',
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}