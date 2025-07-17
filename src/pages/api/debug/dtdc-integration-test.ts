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

    console.log('🧪 Starting comprehensive DTDC integration test...');

    const testResults = {
      timestamp: new Date().toISOString(),
      configuration: {},
      connectivityTest: {},
      pincodeTest: {},
      awbGenerationTest: {},
      trackingTest: {},
      labelGenerationTest: {},
      summary: {
        totalTests: 5,
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
      const trackingUsername = process.env.DTDC_TRACKING_USERNAME;
      const trackingPassword = process.env.DTDC_TRACKING_PASSWORD;

      testResults.configuration = {
        hasApiKey: !!apiKey,
        hasCustomerCode: !!customerCode,
        hasServiceType: !!serviceType,
        hasTrackingToken: !!trackingToken,
        hasTrackingCredentials: !!(trackingUsername && trackingPassword),
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

    // Test 2: Basic Connectivity
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

    // Test 3: Pincode Validation
    console.log('📍 Test 3: Pincode Validation');
    try {
      const pincodeResponse = await fetch('https://pxapi.dtdc.in/api/customer/integration/pincode/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY || '',
          'Accept': 'application/json',
          'User-Agent': 'SpareFlow/1.0'
        },
        body: JSON.stringify({
          customerCode: process.env.DTDC_CUSTOMER_CODE || process.env.DTDC_CUSTOMER_ID,
          pincodes: ['400069', '110001', '560001'] // Test Mumbai, Delhi, Bangalore
        }),
        signal: AbortSignal.timeout(15000)
      });

      const pincodeData = await pincodeResponse.json();

      testResults.pincodeTest = {
        status: pincodeResponse.ok ? 'PASS' : 'FAIL',
        httpStatus: pincodeResponse.status,
        response: pincodeData,
        testPincodes: ['400069', '110001', '560001']
      };

      if (pincodeResponse.ok) {
        testResults.summary.passedTests++;
        console.log('✅ Pincode validation test passed');
      } else {
        testResults.summary.failedTests++;
        console.log('❌ Pincode validation test failed:', pincodeData);
      }
    } catch (error) {
      testResults.pincodeTest = { status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' };
      testResults.summary.failedTests++;
      console.log('❌ Pincode validation test error:', error);
    }

    // Test 4: AWB Generation (Test Shipment)
    console.log('📦 Test 4: AWB Generation');
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
        
        // Store AWB for tracking test
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

    // Test 5: Tracking Test
    console.log('🔍 Test 5: Tracking Test');
    try {
      // Use generated AWB or a test AWB
      const testAWB = testResults.awbGenerationTest.generatedAWB || 'TEST123456789';
      
      const trackingResponse = await fetch('https://api.dtdc.in/dtdc-api/rest/JSONCnTrk/getTrackDetails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Token': process.env.DTDC_TRACKING_ACCESS_TOKEN || '',
          'Accept': 'application/json',
          'User-Agent': 'SpareFlow/1.0'
        },
        body: JSON.stringify({
          trkType: 'cnno',
          strcnno: testAWB,
          addtnlDtl: 'Y'
        }),
        signal: AbortSignal.timeout(15000)
      });

      const trackingData = await trackingResponse.json();

      testResults.trackingTest = {
        status: trackingResponse.ok ? 'PASS' : 'FAIL',
        httpStatus: trackingResponse.status,
        response: trackingData,
        testAWB: testAWB
      };

      if (trackingResponse.ok) {
        testResults.summary.passedTests++;
        console.log('✅ Tracking test passed');
      } else {
        testResults.summary.failedTests++;
        console.log('❌ Tracking test failed:', trackingData);
      }
    } catch (error) {
      testResults.trackingTest = { status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' };
      testResults.summary.failedTests++;
      console.log('❌ Tracking test error:', error);
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
    
    if (testResults.trackingTest.status !== 'PASS') {
      recommendations.push('⚠️ Tracking API issues - may need different endpoint or credentials');
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
      message: `DTDC integration test completed with ${testResults.summary.successRate} success rate`
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