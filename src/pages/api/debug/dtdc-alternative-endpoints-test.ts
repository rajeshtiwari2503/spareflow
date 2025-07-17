import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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

    const customerCode = process.env.DTDC_CUSTOMER_CODE || process.env.DTDC_CUSTOMER_ID || '';
    const apiKey = process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY || '';

    if (!customerCode || !apiKey) {
      return res.status(400).json({
        error: 'Missing DTDC credentials',
        details: 'DTDC_CUSTOMER_CODE and DTDC_API_KEY_NEW are required'
      });
    }

    console.log('🔍 Testing alternative DTDC endpoints and approaches for:', customerCode);

    const results = {
      success: true,
      timestamp: new Date().toISOString(),
      customerAccount: {
        customerCode,
        isReverseCustomer: customerCode === 'GL10074',
        apiKeyPreview: `${apiKey.substring(0, 8)}***`
      },
      tests: [] as any[]
    };

    // Test 1: Try different DTDC API endpoints
    const endpoints = [
      {
        name: 'Standard Production API',
        url: 'https://pxapi.dtdc.in/api/customer/integration/consignment/softdata',
        description: 'Current endpoint we\'ve been using'
      },
      {
        name: 'Alternative Production API',
        url: 'https://api.dtdc.in/api/customer/integration/consignment/softdata',
        description: 'Alternative production endpoint'
      },
      {
        name: 'Reverse Shipment Specific API',
        url: 'https://pxapi.dtdc.in/api/customer/integration/reverse/consignment/softdata',
        description: 'Potential reverse-specific endpoint'
      },
      {
        name: 'Legacy API Endpoint',
        url: 'https://pxapi.dtdc.in/api/customer/consignment/softdata',
        description: 'Legacy endpoint format'
      }
    ];

    // Test 2: Try different payload structures
    const payloadVariations = [
      {
        name: 'Standard Payload',
        getPayload: () => ({
          consignments: [{
            customer_code: customerCode,
            service_type_id: '1',
            load_type: 'NON-DOCUMENT',
            description: 'Test Shipment',
            dimension_unit: 'cm',
            length: '30.0',
            width: '20.0',
            height: '15.0',
            weight_unit: 'kg',
            weight: '0.5',
            declared_value: '500',
            num_pieces: '1',
            commodity_id: 'Electric items',
            consignment_type: 'reverse',
            origin_details: {
              name: 'Test Sender',
              phone: '9876543210',
              alternate_phone: '',
              address_line_1: 'Test Address',
              address_line_2: '',
              pincode: '400069',
              city: 'Mumbai',
              state: 'Maharashtra'
            },
            destination_details: {
              name: 'Test Recipient',
              phone: '9876543210',
              alternate_phone: '',
              address_line_1: 'Test Destination',
              address_line_2: '',
              pincode: '110001',
              city: 'Delhi',
              state: 'Delhi'
            },
            return_details: {
              name: 'SpareFlow Returns',
              phone: '9876543200',
              alternate_phone: '',
              address_line_1: 'Tech Park, Andheri East',
              address_line_2: 'Returns Department',
              pincode: '400069',
              city_name: 'Mumbai',
              state_name: 'Maharashtra',
              email: 'returns@spareflow.com'
            },
            customer_reference_number: `TEST-${Date.now()}`,
            cod_collection_mode: '',
            cod_amount: '',
            eway_bill: '',
            is_risk_surcharge_applicable: 'false',
            invoice_number: `INV-${Date.now()}`,
            invoice_date: new Date().toISOString().split('T')[0],
            reference_number: `REF-${Date.now()}`
          }]
        })
      },
      {
        name: 'Simplified Payload',
        getPayload: () => ({
          customer_code: customerCode,
          service_type_id: '1',
          consignment_type: 'reverse',
          origin_pincode: '400069',
          destination_pincode: '110001',
          weight: '0.5',
          declared_value: '500',
          num_pieces: '1',
          reference_number: `SIMPLE-${Date.now()}`
        })
      },
      {
        name: 'Reverse-Specific Payload',
        getPayload: () => ({
          consignments: [{
            customer_code: customerCode,
            service_type_id: 'REVERSE',
            shipment_type: 'REVERSE',
            consignment_type: 'reverse',
            pickup_details: {
              name: 'Test Pickup',
              phone: '9876543210',
              address_line_1: 'Test Pickup Address',
              pincode: '110001',
              city: 'Delhi',
              state: 'Delhi'
            },
            delivery_details: {
              name: 'Test Delivery',
              phone: '9876543210',
              address_line_1: 'Test Delivery Address',
              pincode: '400069',
              city: 'Mumbai',
              state: 'Maharashtra'
            },
            weight: '0.5',
            declared_value: '500',
            num_pieces: '1',
            reference_number: `REV-${Date.now()}`
          }]
        })
      }
    ];

    // Test 3: Try different authentication methods
    const authMethods = [
      {
        name: 'Standard API Key Header',
        getHeaders: () => ({
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'Accept': 'application/json',
          'User-Agent': 'SpareFlow-Alternative/1.0'
        })
      },
      {
        name: 'Alternative Auth Header',
        getHeaders: () => ({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'SpareFlow-Alternative/1.0'
        })
      },
      {
        name: 'Customer Code in Header',
        getHeaders: () => ({
          'Content-Type': 'application/json',
          'api-key': apiKey,
          'customer-code': customerCode,
          'Accept': 'application/json',
          'User-Agent': 'SpareFlow-Alternative/1.0'
        })
      }
    ];

    // Test combinations
    let testCount = 0;
    const maxTests = 15; // Limit to prevent timeout

    for (const endpoint of endpoints.slice(0, 2)) { // Test first 2 endpoints
      for (const payload of payloadVariations.slice(0, 2)) { // Test first 2 payload types
        for (const auth of authMethods.slice(0, 2)) { // Test first 2 auth methods
          if (testCount >= maxTests) break;
          
          testCount++;
          const testName = `${endpoint.name} + ${payload.name} + ${auth.name}`;
          
          try {
            console.log(`🧪 Testing: ${testName}`);
            
            const response = await fetch(endpoint.url, {
              method: 'POST',
              headers: auth.getHeaders(),
              body: JSON.stringify(payload.getPayload()),
              signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            const responseText = await response.text();
            let responseData;
            
            try {
              responseData = JSON.parse(responseText);
            } catch {
              responseData = { rawResponse: responseText };
            }

            const testResult = {
              testName,
              endpoint: endpoint.name,
              payload: payload.name,
              auth: auth.name,
              success: response.ok,
              status: response.status,
              statusText: response.statusText,
              hasAwbNumber: false,
              awbNumber: null,
              responseData,
              errorMessage: null
            };

            // Check for AWB number in response
            if (response.ok && responseData) {
              if (responseData.success && responseData.data && responseData.data.length > 0) {
                const consignmentData = responseData.data[0];
                const awbNumber = consignmentData.awbNumber || 
                                 consignmentData.awb_number || 
                                 consignmentData.referenceNumber || 
                                 consignmentData.reference_number ||
                                 consignmentData.consignment_number;
                
                if (awbNumber) {
                  testResult.hasAwbNumber = true;
                  testResult.awbNumber = awbNumber;
                  console.log(`✅ SUCCESS: Found AWB number: ${awbNumber}`);
                }
              }
            }

            if (!response.ok) {
              testResult.errorMessage = responseData.message || responseData.error || `HTTP ${response.status}`;
            } else if (!testResult.hasAwbNumber) {
              testResult.errorMessage = 'No AWB number in response';
            }

            results.tests.push(testResult);

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (error) {
            console.error(`❌ Test failed: ${testName}`, error);
            
            results.tests.push({
              testName,
              endpoint: endpoint.name,
              payload: payload.name,
              auth: auth.name,
              success: false,
              status: 0,
              statusText: 'Request Failed',
              hasAwbNumber: false,
              awbNumber: null,
              responseData: null,
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    }

    // Test 4: Try account information endpoint
    try {
      console.log('🔍 Testing account information endpoint...');
      
      const accountInfoResponse = await fetch('https://pxapi.dtdc.in/api/customer/account/info', {
        method: 'GET',
        headers: {
          'api-key': apiKey,
          'Accept': 'application/json',
          'User-Agent': 'SpareFlow-Alternative/1.0'
        },
        signal: AbortSignal.timeout(10000)
      });

      const accountInfoText = await accountInfoResponse.text();
      let accountInfoData;
      
      try {
        accountInfoData = JSON.parse(accountInfoText);
      } catch {
        accountInfoData = { rawResponse: accountInfoText };
      }

      results.tests.push({
        testName: 'Account Information Endpoint',
        endpoint: 'Account Info API',
        payload: 'N/A',
        auth: 'Standard API Key',
        success: accountInfoResponse.ok,
        status: accountInfoResponse.status,
        statusText: accountInfoResponse.statusText,
        hasAwbNumber: false,
        awbNumber: null,
        responseData: accountInfoData,
        errorMessage: accountInfoResponse.ok ? null : `HTTP ${accountInfoResponse.status}`
      });

    } catch (error) {
      results.tests.push({
        testName: 'Account Information Endpoint',
        endpoint: 'Account Info API',
        payload: 'N/A',
        auth: 'Standard API Key',
        success: false,
        status: 0,
        statusText: 'Request Failed',
        hasAwbNumber: false,
        awbNumber: null,
        responseData: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Generate summary and recommendations
    const workingTests = results.tests.filter(test => test.hasAwbNumber);
    const successfulResponses = results.tests.filter(test => test.success);
    
    const summary = {
      totalTests: results.tests.length,
      workingAwbGeneration: workingTests.length,
      successfulResponses: successfulResponses.length,
      recommendations: [] as string[]
    };

    if (workingTests.length > 0) {
      summary.recommendations.push(`✅ Found ${workingTests.length} working configuration(s)!`);
      workingTests.forEach(test => {
        summary.recommendations.push(`✅ Working: ${test.testName} - AWB: ${test.awbNumber}`);
      });
    } else if (successfulResponses.length > 0) {
      summary.recommendations.push('⚠️ Some endpoints responded successfully but no AWB numbers generated');
      summary.recommendations.push('🔧 Account may need specific configuration from DTDC');
    } else {
      summary.recommendations.push('❌ No working configurations found');
      summary.recommendations.push('🔧 Contact DTDC support with customer code: ' + customerCode);
      summary.recommendations.push('🔧 Verify API key has proper permissions for AWB generation');
      summary.recommendations.push('🔧 Check if account needs activation or special setup');
    }

    return res.status(200).json({
      ...results,
      summary
    });

  } catch (error) {
    console.error('❌ Alternative endpoints test failed:', error);
    
    return res.status(500).json({
      error: 'Alternative endpoints test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}