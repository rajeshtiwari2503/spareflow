import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Starting public DTDC integration test...');

    const testResults = {
      timestamp: new Date().toISOString(),
      configuration: {},
      connectivityTest: {},
      pincodeTest: {},
      awbGenerationTest: {},
      summary: {
        totalTests: 3,
        passedTests: 0,
        failedTests: 0,
        warnings: []
      }
    };

    // Test 1: Configuration Check
    console.log('📋 Test 1: Configuration Check');
    try {
      const apiKey = process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY;
      const customerCode = process.env.DTDC_CUSTOMER_CODE || process.env.DTDC_CUSTOMER_ID;
      const serviceType = process.env.DTDC_SERVICE_TYPE;
      const trackingToken = process.env.DTDC_TRACKING_ACCESS_TOKEN;

      testResults.configuration = {
        hasApiKey: !!apiKey,
        hasCustomerCode: !!customerCode,
        hasServiceType: !!serviceType,
        hasTrackingToken: !!trackingToken,
        apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}***` : 'NOT_SET',
        customerCode: customerCode || 'NOT_SET',
        serviceType: serviceType || 'NOT_SET',
        status: (!!apiKey && !!customerCode) ? 'PASS' : 'FAIL'
      };

      if (testResults.configuration.status === 'PASS') {
        testResults.summary.passedTests++;
        console.log('✅ Configuration test passed');
      } else {
        testResults.summary.failedTests++;
        console.log('❌ Configuration test failed');
      }
    } catch (error) {
      testResults.configuration = { status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' };
      testResults.summary.failedTests++;
      console.log('❌ Configuration test error:', error);
    }

    // Test 2: Basic Connectivity (Empty consignments to test auth)
    console.log('🌐 Test 2: DTDC API Connectivity');
    try {
      const connectivityResponse = await fetch('https://pxapi.dtdc.in/api/customer/integration/consignment/softdata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY || '',
          'Accept': 'application/json',
          'User-Agent': 'SpareFlow/1.0'
        },
        body: JSON.stringify({
          consignments: []
        }),
        signal: AbortSignal.timeout(15000)
      });

      const responseText = await connectivityResponse.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { rawResponse: responseText };
      }

      testResults.connectivityTest = {
        status: connectivityResponse.ok ? 'PASS' : 'FAIL',
        httpStatus: connectivityResponse.status,
        response: responseData,
        responseTime: Date.now()
      };

      if (connectivityResponse.ok) {
        testResults.summary.passedTests++;
        console.log('✅ Connectivity test passed');
      } else {
        testResults.summary.failedTests++;
        console.log('❌ Connectivity test failed:', connectivityResponse.status, responseData);
      }
    } catch (error) {
      testResults.connectivityTest = { status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' };
      testResults.summary.failedTests++;
      console.log('❌ Connectivity test error:', error);
    }

    // Test 3: AWB Generation (Test Shipment)
    console.log('📦 Test 3: AWB Generation');
    try {
      const testShipmentPayload = {
        consignments: [{
          customer_code: process.env.DTDC_CUSTOMER_CODE || process.env.DTDC_CUSTOMER_ID,
          service_type_id: process.env.DTDC_SERVICE_TYPE || 'B2C SMART EXPRESS',
          load_type: 'NON-DOCUMENT',
          description: 'Test Spare Parts',
          dimension_unit: 'cm',
          length: '30.0',
          width: '20.0',
          height: '15.0',
          weight_unit: 'kg',
          weight: '0.5',
          declared_value: '1000',
          num_pieces: '1',
          origin_details: {
            name: 'SpareFlow Logistics',
            phone: '9876543200',
            alternate_phone: '9876543200',
            address_line_1: 'Tech Park, Andheri East',
            address_line_2: '',
            pincode: '400069',
            city: 'Mumbai',
            state: 'Maharashtra'
          },
          destination_details: {
            name: 'Test Customer',
            phone: '9876543210',
            alternate_phone: '',
            address_line_1: 'Test Address, Andheri East',
            address_line_2: '',
            pincode: '400069',
            city: 'Mumbai',
            state: 'Maharashtra'
          },
          return_details: {
            name: 'SpareFlow Returns',
            phone: '9876543200',
            alternate_phone: '9876543200',
            address_line_1: 'Tech Park, Andheri East',
            address_line_2: '',
            pincode: '400069',
            city_name: 'Mumbai',
            state_name: 'Maharashtra',
            email: 'returns@spareflow.com'
          },
          customer_reference_number: `TEST-${Date.now()}`,
          cod_collection_mode: '',
          cod_amount: '',
          commodity_id: '99',
          eway_bill: '',
          is_risk_surcharge_applicable: 'false',
          invoice_number: '',
          invoice_date: '',
          reference_number: ''
        }]
      };

      const awbResponse = await fetch('https://pxapi.dtdc.in/api/customer/integration/consignment/softdata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY || '',
          'Accept': 'application/json',
          'User-Agent': 'SpareFlow/1.0'
        },
        body: JSON.stringify(testShipmentPayload),
        signal: AbortSignal.timeout(30000)
      });

      const awbData = await awbResponse.json();

      testResults.awbGenerationTest = {
        status: awbResponse.ok && awbData.success ? 'PASS' : 'FAIL',
        httpStatus: awbResponse.status,
        response: awbData,
        testPayload: testShipmentPayload
      };

      if (awbResponse.ok && awbData.success) {
        testResults.summary.passedTests++;
        console.log('✅ AWB generation test passed');
        
        // Store AWB for reference
        if (awbData.data && awbData.data.length > 0) {
          testResults.awbGenerationTest.generatedAWB = awbData.data[0].awbNumber;
        }
      } else {
        testResults.summary.failedTests++;
        console.log('❌ AWB generation test failed:', awbData);
      }
    } catch (error) {
      testResults.awbGenerationTest = { status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' };
      testResults.summary.failedTests++;
      console.log('❌ AWB generation test error:', error);
    }

    // Generate summary and recommendations
    const successRate = (testResults.summary.passedTests / testResults.summary.totalTests) * 100;
    
    testResults.summary.successRate = `${successRate.toFixed(1)}%`;
    testResults.summary.overallStatus = successRate >= 80 ? 'EXCELLENT' : successRate >= 60 ? 'GOOD' : successRate >= 40 ? 'FAIR' : 'POOR';
    
    // Add recommendations based on test results
    const recommendations = [];
    
    if (testResults.configuration.status !== 'PASS') {
      recommendations.push('❌ Fix DTDC configuration - ensure API key and customer code are set correctly');
    }
    
    if (testResults.connectivityTest.status !== 'PASS') {
      recommendations.push('❌ DTDC API connectivity issues - check network and API endpoint');
    }
    
    if (testResults.awbGenerationTest.status !== 'PASS') {
      recommendations.push('❌ AWB generation failing - verify API permissions and payload format');
    }
    
    if (successRate >= 80) {
      recommendations.push('✅ DTDC integration is working well - ready for production use');
    } else if (successRate >= 60) {
      recommendations.push('⚠️ DTDC integration partially working - address failing tests before production');
    } else {
      recommendations.push('❌ DTDC integration has significant issues - requires immediate attention');
    }

    testResults.summary.recommendations = recommendations;

    console.log(`🏁 DTDC integration test completed: ${testResults.summary.successRate} success rate`);

    return res.status(200).json({
      success: true,
      testResults,
      message: `DTDC integration test completed with ${testResults.summary.successRate} success rate`,
      instructions: {
        nextSteps: [
          'If tests are passing, the DTDC integration is working correctly',
          'If tests are failing, check the API credentials and network connectivity',
          'For production use, replace dummy credentials with real DTDC account credentials'
        ],
        productionCredentials: {
          customerCode: 'GL10074',
          businessName: 'LYBLEY INDIA PRIVATE LIMITED',
          note: 'Contact DTDC to get production API key for this customer code'
        }
      }
    });

  } catch (error) {
    console.error('❌ DTDC integration test failed:', error);
    
    return res.status(500).json({
      error: 'DTDC integration test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}