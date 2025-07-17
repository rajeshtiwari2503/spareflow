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

    console.log('🧪 Starting DTDC account information diagnostic...');

    // Get credentials
    const customerCode = process.env.DTDC_CUSTOMER_CODE || process.env.DTDC_CUSTOMER_ID || '';
    const apiKey = process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY || '';

    if (!apiKey || !customerCode) {
      return res.status(400).json({
        error: 'Missing DTDC credentials',
        details: {
          hasApiKey: !!apiKey,
          hasCustomerCode: !!customerCode
        }
      });
    }

    console.log('🔧 Using credentials:', {
      hasApiKey: !!apiKey,
      hasCustomerCode: !!customerCode,
      apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}***` : 'NOT_SET',
      customerCode: customerCode || 'NOT_SET'
    });

    const headers = {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'Accept': 'application/json',
      'User-Agent': 'SpareFlow-AccountInfo/1.0'
    };

    const diagnosticResults = {
      customerAccount: {
        customerCode,
        isReverseCustomer: customerCode === 'GL10074'
      },
      tests: {} as any,
      recommendations: [] as string[]
    };

    // Test 1: Try to get customer account information
    console.log('🔍 Testing customer account information endpoint...');
    try {
      const accountResponse = await fetch(`https://pxapi.dtdc.in/api/customer/integration/customer/details?customer_code=${customerCode}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(15000)
      });

      const accountText = await accountResponse.text();
      let accountData;
      
      try {
        accountData = JSON.parse(accountText);
      } catch (parseError) {
        accountData = { rawResponse: accountText, parseError: 'Failed to parse JSON' };
      }

      diagnosticResults.tests.accountInfo = {
        success: accountResponse.ok,
        status: accountResponse.status,
        statusText: accountResponse.statusText,
        data: accountData
      };

    } catch (error) {
      diagnosticResults.tests.accountInfo = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Try to get service types for customer
    console.log('🔍 Testing service types endpoint...');
    try {
      const serviceTypesResponse = await fetch(`https://pxapi.dtdc.in/api/customer/integration/servicetype/list?customer_code=${customerCode}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(15000)
      });

      const serviceTypesText = await serviceTypesResponse.text();
      let serviceTypesData;
      
      try {
        serviceTypesData = JSON.parse(serviceTypesText);
      } catch (parseError) {
        serviceTypesData = { rawResponse: serviceTypesText, parseError: 'Failed to parse JSON' };
      }

      diagnosticResults.tests.serviceTypes = {
        success: serviceTypesResponse.ok,
        status: serviceTypesResponse.status,
        statusText: serviceTypesResponse.statusText,
        data: serviceTypesData
      };

    } catch (error) {
      diagnosticResults.tests.serviceTypes = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Try to get pincode serviceability
    console.log('🔍 Testing pincode serviceability...');
    try {
      const pincodePayload = {
        customer_code: customerCode,
        origin_pincode: '400069',
        destination_pincode: '110001'
      };

      const pincodeResponse = await fetch('https://pxapi.dtdc.in/api/customer/integration/pincode/serviceability', {
        method: 'POST',
        headers,
        body: JSON.stringify(pincodePayload),
        signal: AbortSignal.timeout(15000)
      });

      const pincodeText = await pincodeResponse.text();
      let pincodeData;
      
      try {
        pincodeData = JSON.parse(pincodeText);
      } catch (parseError) {
        pincodeData = { rawResponse: pincodeText, parseError: 'Failed to parse JSON' };
      }

      diagnosticResults.tests.pincodeServiceability = {
        success: pincodeResponse.ok,
        status: pincodeResponse.status,
        statusText: pincodeResponse.statusText,
        data: pincodeData
      };

    } catch (error) {
      diagnosticResults.tests.pincodeServiceability = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 4: Try alternative endpoints for service discovery
    console.log('🔍 Testing alternative service discovery endpoints...');
    const alternativeEndpoints = [
      '/api/customer/integration/servicetype/all',
      '/api/customer/integration/customer/servicetypes',
      '/api/customer/integration/services/available',
      '/api/customer/integration/account/services'
    ];

    diagnosticResults.tests.alternativeEndpoints = [];

    for (const endpoint of alternativeEndpoints) {
      try {
        const url = `https://pxapi.dtdc.in${endpoint}${endpoint.includes('?') ? '&' : '?'}customer_code=${customerCode}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(10000)
        });

        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          responseData = { rawResponse: responseText.substring(0, 500), parseError: 'Failed to parse JSON' };
        }

        diagnosticResults.tests.alternativeEndpoints.push({
          endpoint,
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });

      } catch (error) {
        diagnosticResults.tests.alternativeEndpoints.push({
          endpoint,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Test 5: Try numeric service type IDs (common in DTDC)
    console.log('🔍 Testing numeric service type IDs...');
    const numericServiceTypes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    
    diagnosticResults.tests.numericServiceTypes = [];

    for (const serviceTypeId of numericServiceTypes) {
      try {
        const testPayload = {
          consignments: [{
            customer_code: customerCode,
            service_type_id: serviceTypeId,
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
            commodity_id: 'Electric items',
            consignment_type: 'reverse', // Use reverse for GL10074
            
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
            
            customer_reference_number: `TEST-${serviceTypeId}-${Date.now()}`,
            cod_collection_mode: '',
            cod_amount: '',
            eway_bill: '',
            is_risk_surcharge_applicable: 'false',
            invoice_number: `INV-${serviceTypeId}-${Date.now()}`,
            invoice_date: new Date().toISOString().split('T')[0],
            reference_number: `REF-${serviceTypeId}-${Date.now()}`
          }]
        };

        const response = await fetch('https://pxapi.dtdc.in/api/customer/integration/consignment/softdata', {
          method: 'POST',
          headers,
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(10000)
        });

        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          responseData = { rawResponse: responseText, parseError: 'Failed to parse JSON' };
        }

        const isSuccess = response.ok && responseData && responseData.success === true && 
                         responseData.data && responseData.data.length > 0 && 
                         responseData.data[0].success !== false;

        diagnosticResults.tests.numericServiceTypes.push({
          serviceTypeId,
          success: response.ok,
          status: response.status,
          isValidServiceType: isSuccess,
          errorMessage: responseData?.data?.[0]?.message || responseData?.message || '',
          data: responseData
        });

        if (isSuccess) {
          console.log(`✅ SUCCESS: Numeric service type ${serviceTypeId} works!`);
        }

      } catch (error) {
        diagnosticResults.tests.numericServiceTypes.push({
          serviceTypeId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    // Generate recommendations
    const workingNumericTypes = diagnosticResults.tests.numericServiceTypes.filter((t: any) => t.isValidServiceType);
    
    if (workingNumericTypes.length > 0) {
      diagnosticResults.recommendations.push(`✅ Found ${workingNumericTypes.length} working numeric service type(s): ${workingNumericTypes.map((t: any) => t.serviceTypeId).join(', ')}`);
      diagnosticResults.recommendations.push(`🔧 Recommended: Use "${workingNumericTypes[0].serviceTypeId}" as DTDC_SERVICE_TYPE`);
    } else {
      diagnosticResults.recommendations.push('❌ No working service types found');
    }

    if (diagnosticResults.tests.serviceTypes?.success) {
      diagnosticResults.recommendations.push('✅ Service types endpoint accessible - check data for available types');
    }

    if (diagnosticResults.tests.accountInfo?.success) {
      diagnosticResults.recommendations.push('✅ Account info endpoint accessible - check data for account configuration');
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...diagnosticResults
    });

  } catch (error) {
    console.error('❌ Account info diagnostic failed:', error);
    
    return res.status(500).json({
      error: 'Account info diagnostic failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}