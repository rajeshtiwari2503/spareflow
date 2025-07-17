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

    console.log('🎯 Testing service types for specific pincode pairs with GL10074');

    const results = {
      success: true,
      timestamp: new Date().toISOString(),
      customerAccount: {
        customerCode,
        isReverseCustomer: customerCode === 'GL10074',
        apiKeyPreview: `${apiKey.substring(0, 8)}***`
      },
      tests: [] as any[],
      workingConfigurations: [] as any[]
    };

    // Test different pincode pairs that are commonly used
    const pincodePairs = [
      { origin: '400069', destination: '110001', description: 'Mumbai to Delhi' },
      { origin: '110001', destination: '400069', description: 'Delhi to Mumbai' },
      { origin: '400069', destination: '560001', description: 'Mumbai to Bangalore' },
      { origin: '560001', destination: '400069', description: 'Bangalore to Mumbai' },
      { origin: '400069', destination: '600001', description: 'Mumbai to Chennai' },
      { origin: '600001', destination: '400069', description: 'Chennai to Mumbai' },
      { origin: '400069', destination: '700001', description: 'Mumbai to Kolkata' },
      { origin: '700001', destination: '400069', description: 'Kolkata to Mumbai' },
      { origin: '400069', destination: '411001', description: 'Mumbai to Pune' },
      { origin: '411001', destination: '400069', description: 'Pune to Mumbai' }
    ];

    // Test service types that are commonly used for reverse customers
    const serviceTypes = [
      // Standard numeric service types
      '2', '3', '4', '5', '6', '7', '8', '9', '10',
      // Extended numeric
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
      // Reverse-specific service types
      'REVERSE', 'REV', 'RETURN', 'RET',
      // Ground service types
      'GROUND', 'GROUND_EXPRESS', 'EXPRESS', 'STANDARD',
      // GL-specific (since customer code is GL10074)
      'GL1', 'GL2', 'GL3', 'GL4', 'GL5',
      // Common DTDC service types
      'B2B', 'B2C', 'C2C', 'PICKUP', 'DELIVERY'
    ];

    const headers = {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'Accept': 'application/json',
      'User-Agent': 'SpareFlow-PincodeDiscovery/1.0'
    };

    let testCount = 0;
    const maxTests = 50; // Limit to prevent timeout

    // Test each service type with the first few pincode pairs
    for (const serviceType of serviceTypes) {
      if (testCount >= maxTests) break;

      for (const pincodes of pincodePairs.slice(0, 3)) { // Test first 3 pincode pairs
        if (testCount >= maxTests) break;

        testCount++;
        const testName = `Service Type: ${serviceType} | ${pincodes.description}`;

        try {
          console.log(`🧪 Testing: ${testName}`);

          const payload = {
            consignments: [{
              customer_code: customerCode,
              service_type_id: serviceType,
              load_type: 'NON-DOCUMENT',
              description: 'Test Shipment for Service Discovery',
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
                name: 'Test Origin',
                phone: '9876543210',
                alternate_phone: '',
                address_line_1: 'Test Origin Address',
                address_line_2: '',
                pincode: pincodes.origin,
                city: 'Test City',
                state: 'Test State'
              },
              destination_details: {
                name: 'Test Destination',
                phone: '9876543210',
                alternate_phone: '',
                address_line_1: 'Test Destination Address',
                address_line_2: '',
                pincode: pincodes.destination,
                city: 'Test City',
                state: 'Test State'
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
              customer_reference_number: `DISC-${Date.now()}-${testCount}`,
              cod_collection_mode: '',
              cod_amount: '',
              eway_bill: '',
              is_risk_surcharge_applicable: 'false',
              invoice_number: `INV-${Date.now()}-${testCount}`,
              invoice_date: new Date().toISOString().split('T')[0],
              reference_number: `REF-${Date.now()}-${testCount}`
            }]
          };

          const response = await fetch('https://pxapi.dtdc.in/api/customer/integration/consignment/softdata', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(8000) // 8 second timeout
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
            serviceType,
            pincodePair: pincodes,
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            hasAwbNumber: false,
            awbNumber: null,
            isValidServiceType: false,
            responseData,
            errorMessage: null
          };

          // Check for AWB number in response
          if (response.ok && responseData && responseData.status === 'OK' && responseData.data && responseData.data.length > 0) {
            const consignmentData = responseData.data[0];
            
            // Check if this service type is valid (no "WRONG_INPUT" or "NOT APPLICABLE" errors)
            if (consignmentData.success !== false && !consignmentData.reason && !consignmentData.message?.includes('NOT APPLICABLE')) {
              const awbNumber = consignmentData.awbNumber || 
                               consignmentData.awb_number || 
                               consignmentData.referenceNumber || 
                               consignmentData.reference_number ||
                               consignmentData.consignment_number;
              
              if (awbNumber) {
                testResult.hasAwbNumber = true;
                testResult.awbNumber = awbNumber;
                testResult.isValidServiceType = true;
                
                console.log(`✅ SUCCESS: Found working configuration!`);
                console.log(`   Service Type: ${serviceType}`);
                console.log(`   Pincode Pair: ${pincodes.description}`);
                console.log(`   AWB Number: ${awbNumber}`);
                
                results.workingConfigurations.push({
                  serviceType,
                  pincodePair: pincodes,
                  awbNumber,
                  testName
                });
              }
            } else {
              // Valid response but service type not applicable
              testResult.isValidServiceType = false;
              testResult.errorMessage = consignmentData.message || consignmentData.reason || 'Service type not applicable';
            }
          } else if (!response.ok) {
            testResult.errorMessage = responseData.message || responseData.error || `HTTP ${response.status}`;
          } else {
            testResult.errorMessage = 'No data received or invalid response structure';
          }

          results.tests.push(testResult);

          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          console.error(`❌ Test failed: ${testName}`, error);
          
          results.tests.push({
            testName,
            serviceType,
            pincodePair: pincodes,
            success: false,
            status: 0,
            statusText: 'Request Failed',
            hasAwbNumber: false,
            awbNumber: null,
            isValidServiceType: false,
            responseData: null,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    // Generate summary and recommendations
    const workingTests = results.tests.filter(test => test.hasAwbNumber);
    const validServiceTypes = [...new Set(workingTests.map(test => test.serviceType))];
    const validPincodePairs = [...new Set(workingTests.map(test => `${test.pincodePair.origin}-${test.pincodePair.destination}`))];
    
    const summary = {
      totalTests: results.tests.length,
      workingConfigurations: workingTests.length,
      uniqueWorkingServiceTypes: validServiceTypes.length,
      uniqueWorkingPincodePairs: validPincodePairs.length,
      validServiceTypes,
      validPincodePairs,
      recommendations: [] as string[]
    };

    if (workingTests.length > 0) {
      summary.recommendations.push(`🎉 SUCCESS: Found ${workingTests.length} working configuration(s)!`);
      summary.recommendations.push(`✅ Working Service Types: ${validServiceTypes.join(', ')}`);
      summary.recommendations.push(`✅ Working Pincode Pairs: ${validPincodePairs.join(', ')}`);
      summary.recommendations.push('🔧 Update DTDC_SERVICE_TYPE environment variable with one of the working service types');
      summary.recommendations.push('🔧 Ensure your shipments use compatible pincode pairs');
    } else {
      summary.recommendations.push('❌ No working service type configurations found');
      summary.recommendations.push('🔧 Try testing with different pincode pairs');
      summary.recommendations.push('🔧 Contact DTDC support to verify available service types for GL10074');
      summary.recommendations.push('🔧 Check if account needs specific activation for certain service types');
    }

    return res.status(200).json({
      ...results,
      summary
    });

  } catch (error) {
    console.error('❌ Pincode service discovery failed:', error);
    
    return res.status(500).json({
      error: 'Pincode service discovery failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}