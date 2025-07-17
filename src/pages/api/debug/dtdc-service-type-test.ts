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

    console.log('🧪 Starting DTDC service type diagnostic test...');

    // Get credentials
    const customerCode = process.env.DTDC_CUSTOMER_CODE || process.env.DTDC_CUSTOMER_ID || '';
    const apiKey = process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY || '';
    const commodityId = process.env.DTDC_COMMODITY_ID || 'Electric items';

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

    // Common service types to test
    const serviceTypesToTest = [
      'GROUND EXPRESS',
      'SURFACE',
      'EXPRESS',
      'PREMIUM',
      'ECONOMY',
      'STANDARD',
      'REVERSE',
      'REVERSE PICKUP',
      'RETURN',
      'B2B',
      'B2C',
      'C2C',
      'DOMESTIC',
      'SURFACE CARGO',
      'AIR CARGO',
      'GROUND',
      'NEXT DAY',
      'SAME DAY',
      'OVERNIGHT',
      'PRIORITY'
    ];

    const headers = {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'Accept': 'application/json',
      'User-Agent': 'SpareFlow-ServiceTypeTest/1.0'
    };

    // Determine correct consignment type based on customer account
    const isReverseCustomer = customerCode === 'GL10074';
    const consignmentType = isReverseCustomer ? 'reverse' : 'forward';
    
    console.log(`🔧 Using consignment type: ${consignmentType} (isReverseCustomer: ${isReverseCustomer})`);

    const testResults = [];

    for (const serviceType of serviceTypesToTest) {
      console.log(`🧪 Testing service type: ${serviceType}`);
      
      const testPayload = {
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
          
          customer_reference_number: `TEST-${serviceType}-${Date.now()}`,
          cod_collection_mode: '',
          cod_amount: '',
          eway_bill: '',
          is_risk_surcharge_applicable: 'false',
          invoice_number: `INV-${serviceType}-${Date.now()}`,
          invoice_date: new Date().toISOString().split('T')[0],
          reference_number: `REF-${serviceType}-${Date.now()}`
        }]
      };

      try {
        const response = await fetch('https://pxapi.dtdc.in/api/customer/integration/consignment/softdata', {
          method: 'POST',
          headers,
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(15000)
        });

        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          responseData = { rawResponse: responseText, parseError: 'Failed to parse JSON' };
        }

        const result = {
          serviceType,
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          responseData,
          analysis: {
            hasAwbNumber: false,
            errorMessage: '',
            isServiceTypeValid: false
          }
        };

        // Analyze the response
        if (response.ok && responseData) {
          if (responseData.success === true && responseData.data && responseData.data.length > 0) {
            const consignmentData = responseData.data[0];
            const awbNumber = consignmentData.awbNumber || 
                             consignmentData.awb_number || 
                             consignmentData.referenceNumber || 
                             consignmentData.reference_number ||
                             consignmentData.consignment_number;
            
            if (awbNumber) {
              result.analysis.hasAwbNumber = true;
              result.analysis.isServiceTypeValid = true;
              console.log(`✅ SUCCESS: Service type ${serviceType} works! AWB: ${awbNumber}`);
            } else if (consignmentData.success === false) {
              result.analysis.errorMessage = consignmentData.message || consignmentData.reason || 'Unknown error';
              if (result.analysis.errorMessage.includes('Service Type')) {
                result.analysis.isServiceTypeValid = false;
              }
            }
          } else {
            result.analysis.errorMessage = responseData.message || responseData.error || 'No data received';
          }
        } else {
          result.analysis.errorMessage = responseData.message || responseData.error || `HTTP ${response.status}`;
        }

        testResults.push(result);

        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Error testing service type ${serviceType}:`, error);
        testResults.push({
          serviceType,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          analysis: {
            hasAwbNumber: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            isServiceTypeValid: false
          }
        });
      }
    }

    // Analyze results
    const workingServiceTypes = testResults.filter(r => r.analysis.isServiceTypeValid);
    const failedServiceTypes = testResults.filter(r => !r.analysis.isServiceTypeValid);
    
    const recommendations = [];
    
    if (workingServiceTypes.length > 0) {
      recommendations.push(`✅ Found ${workingServiceTypes.length} working service type(s): ${workingServiceTypes.map(r => r.serviceType).join(', ')}`);
      recommendations.push(`🔧 Recommended: Use "${workingServiceTypes[0].serviceType}" as DTDC_SERVICE_TYPE`);
    } else {
      recommendations.push('❌ No working service types found');
      recommendations.push('🔧 Check customer account configuration with DTDC');
    }

    const commonErrors = failedServiceTypes.reduce((acc, result) => {
      const error = result.analysis.errorMessage;
      if (error) {
        acc[error] = (acc[error] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      customerAccount: {
        customerCode,
        isReverseCustomer,
        consignmentType
      },
      summary: {
        totalTested: serviceTypesToTest.length,
        workingServiceTypes: workingServiceTypes.length,
        failedServiceTypes: failedServiceTypes.length,
        workingTypes: workingServiceTypes.map(r => r.serviceType),
        recommendedServiceType: workingServiceTypes.length > 0 ? workingServiceTypes[0].serviceType : null
      },
      commonErrors,
      recommendations,
      detailedResults: testResults.map(r => ({
        serviceType: r.serviceType,
        success: r.success,
        status: r.status,
        hasAwbNumber: r.analysis.hasAwbNumber,
        errorMessage: r.analysis.errorMessage,
        isValid: r.analysis.isServiceTypeValid
      })),
      fullResults: testResults // Complete results for debugging
    });

  } catch (error) {
    console.error('❌ Service type test failed:', error);
    
    return res.status(500).json({
      error: 'Service type test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}