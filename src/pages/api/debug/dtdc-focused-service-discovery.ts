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

    console.log('🎯 Starting focused DTDC service discovery...');

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

    const headers = {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'Accept': 'application/json',
      'User-Agent': 'SpareFlow-FocusedServiceDiscovery/1.0'
    };

    const isReverseCustomer = customerCode === 'GL10074';
    const consignmentType = isReverseCustomer ? 'reverse' : 'forward';
    
    console.log(`🔧 Account Analysis: ${customerCode} (Reverse: ${isReverseCustomer})`);

    // Test Results Storage
    const testResults = {
      highPriorityServiceTypes: [] as any[],
      alternativeConsignmentTypes: [] as any[],
      specialFormats: [] as any[]
    };

    // 1. High Priority Service Types (most likely to work for reverse customers)
    console.log('🧪 Phase 1: Testing high-priority service types...');
    
    const highPriorityServiceTypes = [
      // Extended numeric range that might work for reverse customers
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
      '21', '22', '23', '24', '25', '30', '35', '40', '45', '50',
      // Common reverse-specific service types
      'REVERSE', 'RETURN', 'PICKUP', 'RTO',
      // DTDC standard service types
      'GROUND EXPRESS', 'SURFACE', 'EXPRESS', 'PREMIUM',
      // Possible GL-specific codes
      'GL', 'GL1', 'GL2', 'GL3', 'GL10074'
    ];

    for (const serviceType of highPriorityServiceTypes) {
      console.log(`Testing high-priority service type: ${serviceType}`);
      
      const result = await testServiceTypeQuick(
        serviceType,
        customerCode,
        apiKey,
        commodityId,
        consignmentType,
        headers
      );
      
      testResults.highPriorityServiceTypes.push(result);
      
      if (result.isValidServiceType) {
        console.log(`✅ FOUND WORKING SERVICE TYPE: ${serviceType}`);
        // Continue testing a few more to see if there are multiple options
        if (testResults.highPriorityServiceTypes.filter(r => r.isValidServiceType).length >= 3) {
          break;
        }
      }
      
      // Very short delay to avoid rate limiting but keep it fast
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 2. Test Alternative Consignment Types (only if reverse customer and no success yet)
    if (isReverseCustomer && testResults.highPriorityServiceTypes.filter(r => r.isValidServiceType).length === 0) {
      console.log('🧪 Phase 2: Testing alternative consignment types...');
      
      const alternativeConsignmentTypes = ['forward', 'FORWARD', 'Forward', 'REVERSE', 'Return', 'Pickup'];
      
      for (const testConsignmentType of alternativeConsignmentTypes) {
        console.log(`Testing consignment type: ${testConsignmentType} with service type 1`);
        
        const result = await testServiceTypeWithConsignmentType(
          '1',
          customerCode,
          apiKey,
          commodityId,
          testConsignmentType,
          headers
        );
        
        result.testedConsignmentType = testConsignmentType;
        testResults.alternativeConsignmentTypes.push(result);
        
        if (result.isValidServiceType) {
          console.log(`✅ FOUND WORKING CONSIGNMENT TYPE: ${testConsignmentType}`);
          break; // Stop on first success
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // 3. Test Special Formats (only if still no success)
    const allSuccessful = [
      ...testResults.highPriorityServiceTypes.filter(r => r.isValidServiceType),
      ...testResults.alternativeConsignmentTypes.filter(r => r.isValidServiceType)
    ];

    if (allSuccessful.length === 0) {
      console.log('🧪 Phase 3: Testing special service type formats...');
      
      const specialFormats = [
        'REV001', 'RET001', 'GL001', 'R001',
        '001', '002', '003', '004', '005',
        'A', 'B', 'C', 'D', 'E',
        'GROUND', 'SURFACE_PLUS'
      ];

      for (const serviceType of specialFormats) {
        console.log(`Testing special format: ${serviceType}`);
        
        const result = await testServiceTypeQuick(
          serviceType,
          customerCode,
          apiKey,
          commodityId,
          consignmentType,
          headers
        );
        
        testResults.specialFormats.push(result);
        
        if (result.isValidServiceType) {
          console.log(`✅ FOUND WORKING SPECIAL FORMAT: ${serviceType}`);
          break; // Stop on first success
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Analyze results
    const allWorkingServiceTypes = [
      ...testResults.highPriorityServiceTypes.filter(r => r.isValidServiceType),
      ...testResults.alternativeConsignmentTypes.filter(r => r.isValidServiceType),
      ...testResults.specialFormats.filter(r => r.isValidServiceType)
    ];

    // Generate recommendations
    const recommendations = [];
    
    if (allWorkingServiceTypes.length > 0) {
      const firstWorking = allWorkingServiceTypes[0];
      recommendations.push(`✅ Found working service type: ${firstWorking.serviceType}`);
      recommendations.push(`🔧 Set DTDC_SERVICE_TYPE=${firstWorking.serviceType}`);
      
      if (firstWorking.testedConsignmentType && firstWorking.testedConsignmentType !== consignmentType) {
        recommendations.push(`🔧 Update consignment_type logic to use: ${firstWorking.testedConsignmentType}`);
      }
      
      if (allWorkingServiceTypes.length > 1) {
        recommendations.push(`📋 Alternative service types found: ${allWorkingServiceTypes.slice(1).map(r => r.serviceType).join(', ')}`);
      }
    } else {
      recommendations.push('❌ No working service types found in focused test');
      recommendations.push('🔧 Account may need specific configuration from DTDC');
      recommendations.push('🔧 Contact DTDC support with customer code: ' + customerCode);
    }

    // Quick error analysis
    const commonErrors = {};
    [...testResults.highPriorityServiceTypes, ...testResults.alternativeConsignmentTypes, ...testResults.specialFormats]
      .filter(r => !r.isValidServiceType && r.errorMessage)
      .forEach(r => {
        const error = r.errorMessage;
        commonErrors[error] = (commonErrors[error] || 0) + 1;
      });

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      customerAccount: {
        customerCode,
        isReverseCustomer,
        defaultConsignmentType: consignmentType
      },
      summary: {
        totalServiceTypesTested: testResults.highPriorityServiceTypes.length + testResults.specialFormats.length,
        totalConsignmentTypesTested: testResults.alternativeConsignmentTypes.length,
        workingServiceTypesFound: allWorkingServiceTypes.length,
        testDurationPhases: {
          phase1: testResults.highPriorityServiceTypes.length,
          phase2: testResults.alternativeConsignmentTypes.length,
          phase3: testResults.specialFormats.length
        }
      },
      workingConfigurations: allWorkingServiceTypes.map(r => ({
        serviceType: r.serviceType,
        awbNumber: r.awbNumber,
        consignmentType: r.testedConsignmentType || consignmentType,
        priority: r.priority || 'standard'
      })),
      recommendations,
      commonErrors,
      detailedResults: {
        highPriorityServiceTypes: testResults.highPriorityServiceTypes.slice(0, 15), // Limit for response size
        alternativeConsignmentTypes: testResults.alternativeConsignmentTypes,
        specialFormats: testResults.specialFormats.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('❌ Focused service discovery failed:', error);
    
    return res.status(500).json({
      error: 'Focused service discovery failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

// Quick service type test function
async function testServiceTypeQuick(
  serviceType: string,
  customerCode: string,
  apiKey: string,
  commodityId: string,
  consignmentType: string,
  headers: Record<string, string>
): Promise<any> {
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
        address_line_1: 'Test Origin Address',
        address_line_2: '',
        pincode: '400069',
        city: 'Mumbai',
        state: 'Maharashtra'
      },
      
      destination_details: {
        name: 'Test Destination',
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
      
      customer_reference_number: `FOCUSED-${serviceType}-${Date.now()}`,
      cod_collection_mode: '',
      cod_amount: '',
      eway_bill: '',
      is_risk_surcharge_applicable: 'false',
      invoice_number: `INV-FOCUSED-${serviceType}-${Date.now()}`,
      invoice_date: new Date().toISOString().split('T')[0],
      reference_number: `REF-FOCUSED-${serviceType}-${Date.now()}`
    }]
  };

  try {
    const response = await fetch('https://pxapi.dtdc.in/api/customer/integration/consignment/softdata', {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000) // Shorter timeout
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
      isValidServiceType: false,
      awbNumber: null,
      errorMessage: ''
    };

    // Analyze the response
    if (response.ok && responseData) {
      if (responseData.success === true && responseData.data && responseData.data.length > 0) {
        const consignmentData = responseData.data[0];
        
        if (consignmentData.success !== false) {
          const awbNumber = consignmentData.awbNumber || 
                           consignmentData.awb_number || 
                           consignmentData.referenceNumber || 
                           consignmentData.reference_number ||
                           consignmentData.consignment_number;
          
          if (awbNumber) {
            result.isValidServiceType = true;
            result.awbNumber = awbNumber;
            console.log(`✅ SUCCESS: Service type ${serviceType} generated AWB: ${awbNumber}`);
          }
        } else {
          result.errorMessage = consignmentData.message || consignmentData.reason || 'Unknown error';
        }
      } else {
        result.errorMessage = responseData.message || responseData.error || 'No data received';
      }
    } else {
      result.errorMessage = responseData?.message || responseData?.error || `HTTP ${response.status}`;
    }

    return result;

  } catch (error) {
    return {
      serviceType,
      success: false,
      isValidServiceType: false,
      awbNumber: null,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Test service type with specific consignment type
async function testServiceTypeWithConsignmentType(
  serviceType: string,
  customerCode: string,
  apiKey: string,
  commodityId: string,
  consignmentType: string,
  headers: Record<string, string>
): Promise<any> {
  return testServiceTypeQuick(serviceType, customerCode, apiKey, commodityId, consignmentType, headers);
}