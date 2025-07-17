import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

    console.log('🧪 Testing DTDC with real credentials...');

    // Get DTDC configuration
    const dtdcConfig = {
      apiKey: process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY,
      customerCode: process.env.DTDC_CUSTOMER_CODE || process.env.DTDC_CUSTOMER_ID,
      serviceType: process.env.DTDC_SERVICE_TYPE || 'GROUND EXPRESS',
      commodityId: process.env.DTDC_COMMODITY_ID || 'Electric items'
    };

    console.log('🔧 DTDC Config for testing:', {
      hasApiKey: !!dtdcConfig.apiKey,
      hasCustomerCode: !!dtdcConfig.customerCode,
      apiKeyPreview: dtdcConfig.apiKey ? `${dtdcConfig.apiKey.substring(0, 8)}***` : 'NOT_SET',
      customerCode: dtdcConfig.customerCode || 'NOT_SET',
      serviceType: dtdcConfig.serviceType,
      commodityId: dtdcConfig.commodityId
    });

    if (!dtdcConfig.apiKey || !dtdcConfig.customerCode) {
      return res.status(400).json({
        error: 'DTDC credentials not configured',
        details: 'Missing API key or customer code',
        config: {
          hasApiKey: !!dtdcConfig.apiKey,
          hasCustomerCode: !!dtdcConfig.customerCode
        }
      });
    }

    // Test payload with real data structure
    const testPayload = {
      consignments: [{
        customer_code: dtdcConfig.customerCode,
        service_type_id: dtdcConfig.serviceType,
        load_type: 'NON-DOCUMENT',
        description: 'Test Spare Parts Shipment',
        dimension_unit: 'cm',
        length: '30.0',
        width: '20.0',
        height: '15.0',
        weight_unit: 'kg',
        weight: '0.5',
        declared_value: '1500',
        num_pieces: '1',
        commodity_id: dtdcConfig.commodityId,
        origin_details: {
          name: 'SpareFlow Test Warehouse',
          phone: '9876543200',
          alternate_phone: '9876543200',
          address_line_1: 'Test Address Line 1',
          address_line_2: 'Test Address Line 2',
          pincode: '400069',
          city: 'Mumbai',
          state: 'Maharashtra'
        },
        destination_details: {
          name: 'Test Service Center',
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
          address_line_1: 'Return Address Line 1',
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
        invoice_number: `INV-TEST-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        reference_number: `REF-TEST-${Date.now()}`
      }]
    };

    console.log('📦 Test payload:', JSON.stringify(testPayload, null, 2));

    // Make the API call
    const startTime = Date.now();
    const response = await fetch('https://pxapi.dtdc.in/api/customer/integration/consignment/softdata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': dtdcConfig.apiKey,
        'Accept': 'application/json',
        'User-Agent': 'SpareFlow-Test/1.0'
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(30000)
    });

    const processingTime = Date.now() - startTime;

    console.log('📡 DTDC API response status:', response.status);
    console.log('📡 DTDC API response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📋 DTDC API raw response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError);
      responseData = { rawResponse: responseText, parseError: parseError instanceof Error ? parseError.message : 'Parse error' };
    }

    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      processingTime,
      headers: Object.fromEntries(response.headers.entries()),
      responseData,
      rawResponse: responseText,
      testPayload,
      dtdcConfig: {
        hasApiKey: !!dtdcConfig.apiKey,
        hasCustomerCode: !!dtdcConfig.customerCode,
        apiKeyPreview: dtdcConfig.apiKey ? `${dtdcConfig.apiKey.substring(0, 8)}***` : 'NOT_SET',
        customerCode: dtdcConfig.customerCode,
        serviceType: dtdcConfig.serviceType,
        commodityId: dtdcConfig.commodityId
      },
      analysis: {
        isSuccessful: response.ok && responseData?.success === true,
        hasAwbNumber: !!(responseData?.data?.[0]?.awbNumber || responseData?.data?.[0]?.awb_number),
        errorMessage: responseData?.message || responseData?.error || (response.ok ? null : 'HTTP error'),
        recommendations: []
      }
    };

    // Add recommendations based on the response
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        result.analysis.recommendations.push('❌ Authentication failed - check API key and customer code');
      } else if (response.status === 400) {
        result.analysis.recommendations.push('❌ Bad request - check payload structure and required fields');
      } else {
        result.analysis.recommendations.push(`❌ HTTP error ${response.status} - check DTDC API status`);
      }
    } else if (responseData?.success === true) {
      result.analysis.recommendations.push('✅ DTDC API is working correctly');
      if (responseData?.data?.[0]?.awbNumber) {
        result.analysis.recommendations.push('✅ AWB number generated successfully');
      }
    } else {
      result.analysis.recommendations.push('⚠️ API responded but returned unsuccessful result');
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ DTDC test failed:', error);
    
    return res.status(500).json({
      error: 'DTDC test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}