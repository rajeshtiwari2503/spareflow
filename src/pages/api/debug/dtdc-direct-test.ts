import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
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

    console.log('🧪 Starting direct DTDC API test...');

    // Get credentials
    const customerCode = process.env.DTDC_CUSTOMER_CODE || process.env.DTDC_CUSTOMER_ID || '';
    const apiKey = process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY || '';
    const serviceType = process.env.DTDC_SERVICE_TYPE || 'GROUND EXPRESS';
    const commodityId = process.env.DTDC_COMMODITY_ID || 'Electric items';

    console.log('🔧 Using credentials:', {
      hasApiKey: !!apiKey,
      hasCustomerCode: !!customerCode,
      apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}***` : 'NOT_SET',
      customerCode: customerCode || 'NOT_SET',
      serviceType,
      commodityId
    });

    if (!apiKey || !customerCode) {
      return res.status(400).json({
        error: 'Missing DTDC credentials',
        details: {
          hasApiKey: !!apiKey,
          hasCustomerCode: !!customerCode
        }
      });
    }

    // Test 1: Check API connectivity
    console.log('🌐 Testing DTDC API connectivity...');
    let connectivityTest;
    try {
      const healthResponse = await fetch('https://pxapi.dtdc.in/health', {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });
      connectivityTest = {
        success: healthResponse.ok,
        status: healthResponse.status,
        statusText: healthResponse.statusText
      };
    } catch (error) {
      connectivityTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Try a minimal AWB generation request
    console.log('📦 Testing minimal AWB generation...');
    
    // Determine correct consignment type based on customer account
    const isReverseCustomer = customerCode === 'GL10074';
    const consignmentType = isReverseCustomer ? 'reverse' : 'forward';
    
    console.log(`🔧 Using consignment type: ${consignmentType} (isReverseCustomer: ${isReverseCustomer})`);
    
    const minimalPayload = {
      consignments: [{
        customer_code: customerCode,
        service_type_id: serviceType,
        load_type: 'NON-DOCUMENT',
        description: 'Test Spare Parts',
        dimension_unit: 'cm',
        length: '30.0',
        width: '20.0',
        height: '15.0',
        weight_unit: 'kg',
        weight: '0.5',
        declared_value: '1500',
        num_pieces: '1',
        commodity_id: commodityId,
        consignment_type: consignmentType,
        
        origin_details: {
          name: 'SpareFlow Test',
          phone: '9876543200',
          alternate_phone: '',
          address_line_1: 'Test Address Line 1',
          address_line_2: '',
          pincode: '400069',
          city: 'Mumbai',
          state: 'Maharashtra'
        },
        
        destination_details: {
          name: 'Test Recipient',
          phone: '9876543201',
          alternate_phone: '',
          address_line_1: 'Test Destination Address',
          address_line_2: '',
          pincode: '110001',
          city: 'Delhi',
          state: 'Delhi'
        },
        
        return_details: {
          name: 'SpareFlow Returns',
          phone: '9876543200',
          alternate_phone: '9876543200',
          address_line_1: 'Return Address',
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
    };

    console.log('📦 Sending test payload to DTDC...');
    console.log('📦 Payload:', JSON.stringify(minimalPayload, null, 2));

    const headers = {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'Accept': 'application/json',
      'User-Agent': 'SpareFlow-DirectTest/1.0'
    };

    console.log('📡 Request headers:', {
      'Content-Type': headers['Content-Type'],
      'api-key': `${apiKey.substring(0, 8)}***`,
      'Accept': headers['Accept'],
      'User-Agent': headers['User-Agent']
    });

    let awbTest;
    try {
      const awbResponse = await fetch('https://pxapi.dtdc.in/api/customer/integration/consignment/softdata', {
        method: 'POST',
        headers,
        body: JSON.stringify(minimalPayload),
        signal: AbortSignal.timeout(30000)
      });

      console.log('📡 DTDC Response status:', awbResponse.status);
      console.log('📡 DTDC Response headers:', Object.fromEntries(awbResponse.headers.entries()));

      const responseText = await awbResponse.text();
      console.log('📋 DTDC Raw response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        responseData = { rawResponse: responseText, parseError: parseError instanceof Error ? parseError.message : 'Parse failed' };
      }

      awbTest = {
        success: awbResponse.ok,
        status: awbResponse.status,
        statusText: awbResponse.statusText,
        responseData,
        rawResponse: responseText.substring(0, 1000) // Limit response size
      };

    } catch (error) {
      awbTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Try different API endpoints
    console.log('🔍 Testing alternative DTDC endpoints...');
    
    const alternativeTests = [];
    
    // Test pincode serviceability
    try {
      const pincodeResponse = await fetch('https://pxapi.dtdc.in/api/customer/integration/pincode/serviceability', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          origin_pincode: '400069',
          destination_pincode: '110001'
        }),
        signal: AbortSignal.timeout(10000)
      });
      
      const pincodeText = await pincodeResponse.text();
      alternativeTests.push({
        endpoint: 'pincode/serviceability',
        success: pincodeResponse.ok,
        status: pincodeResponse.status,
        response: pincodeText.substring(0, 500)
      });
    } catch (error) {
      alternativeTests.push({
        endpoint: 'pincode/serviceability',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      credentials: {
        hasApiKey: !!apiKey,
        hasCustomerCode: !!customerCode,
        apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}***` : 'NOT_SET',
        customerCode: customerCode || 'NOT_SET'
      },
      tests: {
        connectivity: connectivityTest,
        awbGeneration: awbTest,
        alternativeEndpoints: alternativeTests
      },
      analysis: {
        credentialsValid: !!(apiKey && customerCode),
        apiReachable: connectivityTest.success,
        awbGenerationWorking: awbTest.success,
        recommendations: [
          !apiKey ? '❌ Set DTDC_API_KEY_NEW or DTDC_API_KEY' : '✅ API key configured',
          !customerCode ? '❌ Set DTDC_CUSTOMER_CODE or DTDC_CUSTOMER_ID' : '✅ Customer code configured',
          !connectivityTest.success ? '❌ DTDC API not reachable' : '✅ DTDC API reachable',
          !awbTest.success ? '❌ AWB generation failed - check credentials and payload' : '✅ AWB generation working'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Direct DTDC test failed:', error);
    
    return res.status(500).json({
      error: 'Direct DTDC test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}