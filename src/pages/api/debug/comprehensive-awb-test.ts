import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';
import { generateRobustAWB } from '@/lib/dtdc-robust-production';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
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

    console.log('🧪 Starting comprehensive AWB generation test...');

    // Step 1: Check DTDC Configuration
    console.log('🔧 Step 1: Checking DTDC Configuration...');
    const dtdcConfig = {
      apiKey: process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY,
      customerCode: process.env.DTDC_CUSTOMER_CODE || process.env.DTDC_CUSTOMER_ID,
      serviceType: process.env.DTDC_SERVICE_TYPE || 'GROUND EXPRESS',
      commodityId: process.env.DTDC_COMMODITY_ID || 'Electric items',
      trackingToken: process.env.DTDC_TRACKING_ACCESS_TOKEN,
      trackingUsername: process.env.DTDC_TRACKING_USERNAME,
      trackingPassword: process.env.DTDC_TRACKING_PASSWORD
    };

    const configStatus = {
      hasApiKey: !!dtdcConfig.apiKey,
      hasCustomerCode: !!dtdcConfig.customerCode,
      hasTrackingCredentials: !!(dtdcConfig.trackingToken || (dtdcConfig.trackingUsername && dtdcConfig.trackingPassword)),
      apiKeyPreview: dtdcConfig.apiKey ? `${dtdcConfig.apiKey.substring(0, 8)}***` : 'NOT_SET',
      customerCode: dtdcConfig.customerCode || 'NOT_SET',
      serviceType: dtdcConfig.serviceType,
      commodityId: dtdcConfig.commodityId
    };

    console.log('✅ Configuration status:', configStatus);

    // Step 2: Test DTDC API Connectivity
    console.log('🌐 Step 2: Testing DTDC API connectivity...');
    let connectivityTest = { success: false, error: 'Not tested', status: 0 };
    
    try {
      const testResponse = await fetch('https://pxapi.dtdc.in/health', {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });
      
      connectivityTest = {
        success: testResponse.ok,
        error: testResponse.ok ? null : `HTTP ${testResponse.status}: ${testResponse.statusText}`,
        status: testResponse.status
      };
    } catch (error) {
      connectivityTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown connectivity error',
        status: 0
      };
    }

    console.log('✅ Connectivity test:', connectivityTest);

    // Step 3: Test Real AWB Generation with Multiple Scenarios
    console.log('🚀 Step 3: Testing real AWB generation...');
    const testScenarios = [
      {
        name: 'Forward Shipment - Mumbai to Delhi',
        request: {
          shipmentId: `TEST-${Date.now()}`,
          recipientName: 'Test Service Center Delhi',
          recipientPhone: '9876543210',
          recipientAddress: {
            street: 'Test Address Line 1',
            area: 'Connaught Place',
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001',
            country: 'India'
          },
          weight: 0.5,
          declaredValue: 1500,
          numBoxes: 1,
          priority: 'MEDIUM',
          shipmentType: 'FORWARD' as const
        }
      },
      {
        name: 'Reverse Shipment - Delhi to Mumbai',
        request: {
          shipmentId: `TEST-REV-${Date.now()}`,
          recipientName: 'SpareFlow Warehouse',
          recipientPhone: '9876543200',
          recipientAddress: {
            street: 'Tech Park, Andheri East',
            area: 'Near Metro Station',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400069',
            country: 'India'
          },
          weight: 0.3,
          declaredValue: 800,
          numBoxes: 1,
          priority: 'HIGH',
          shipmentType: 'REVERSE' as const,
          senderDetails: {
            name: 'Test Customer Delhi',
            phone: '9876543211',
            address: {
              street: 'Customer Address',
              area: 'Karol Bagh',
              city: 'Delhi',
              state: 'Delhi',
              pincode: '110005',
              country: 'India'
            }
          }
        }
      }
    ];

    const awbTestResults = [];

    for (const scenario of testScenarios) {
      console.log(`🧪 Testing scenario: ${scenario.name}`);
      
      try {
        const startTime = Date.now();
        const awbResult = await generateRobustAWB(scenario.request);
        const processingTime = Date.now() - startTime;

        awbTestResults.push({
          scenario: scenario.name,
          success: awbResult.success,
          awbNumber: awbResult.awb_number,
          trackingUrl: awbResult.tracking_url,
          fallbackMode: awbResult.fallbackMode,
          processingTime,
          error: awbResult.error,
          dtdcResponse: awbResult.dtdcResponse
        });

        console.log(`✅ ${scenario.name} result:`, {
          success: awbResult.success,
          awbNumber: awbResult.awb_number,
          fallbackMode: awbResult.fallbackMode,
          processingTime
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ ${scenario.name} failed:`, errorMessage);
        
        awbTestResults.push({
          scenario: scenario.name,
          success: false,
          error: errorMessage,
          processingTime: 0
        });
      }
    }

    // Step 4: Test Direct DTDC API Call
    console.log('🔗 Step 4: Testing direct DTDC API call...');
    let directApiTest = { success: false, error: 'Not tested' };

    if (configStatus.hasApiKey && configStatus.hasCustomerCode) {
      try {
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
            consignment_type: 'forward',
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
            customer_reference_number: `DIRECT-TEST-${Date.now()}`,
            cod_collection_mode: '',
            cod_amount: '',
            eway_bill: '',
            is_risk_surcharge_applicable: 'false',
            invoice_number: `INV-DIRECT-${Date.now()}`,
            invoice_date: new Date().toISOString().split('T')[0],
            reference_number: `REF-DIRECT-${Date.now()}`
          }]
        };

        const response = await fetch('https://pxapi.dtdc.in/api/customer/integration/consignment/softdata', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': dtdcConfig.apiKey!,
            'Accept': 'application/json',
            'User-Agent': 'SpareFlow-DirectTest/1.0'
          },
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(30000)
        });

        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { rawResponse: responseText };
        }

        directApiTest = {
          success: response.ok && responseData?.success === true,
          error: response.ok ? (responseData?.success ? null : responseData?.message || 'API returned unsuccessful result') : `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          responseData,
          hasAwbNumber: !!(responseData?.data?.[0]?.awbNumber || responseData?.data?.[0]?.awb_number)
        };

        console.log('✅ Direct API test result:', directApiTest);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        directApiTest = {
          success: false,
          error: errorMessage
        };
        console.error('❌ Direct API test failed:', errorMessage);
      }
    } else {
      directApiTest = {
        success: false,
        error: 'Missing API credentials'
      };
    }

    // Step 5: Check Database for Recent Shipments
    console.log('🗄️ Step 5: Checking recent shipments in database...');
    const recentShipments = await prisma.shipment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        awbNumber: true,
        status: true,
        recipientType: true,
        totalWeight: true,
        totalValue: true,
        createdAt: true,
        dtdcData: true
      }
    });

    console.log('✅ Recent shipments found:', recentShipments.length);

    // Step 6: Generate Analysis and Recommendations
    console.log('📊 Step 6: Generating analysis...');
    const analysis = {
      configurationIssues: [],
      connectivityIssues: [],
      awbGenerationIssues: [],
      recommendations: []
    };

    // Configuration analysis
    if (!configStatus.hasApiKey) {
      analysis.configurationIssues.push('❌ CRITICAL: No DTDC API key configured');
      analysis.recommendations.push('Set DTDC_API_KEY_NEW or DTDC_API_KEY environment variable');
    }

    if (!configStatus.hasCustomerCode) {
      analysis.configurationIssues.push('❌ CRITICAL: No DTDC customer code configured');
      analysis.recommendations.push('Set DTDC_CUSTOMER_CODE or DTDC_CUSTOMER_ID environment variable');
    }

    if (!configStatus.hasTrackingCredentials) {
      analysis.configurationIssues.push('⚠️ WARNING: No DTDC tracking credentials configured');
      analysis.recommendations.push('Set DTDC_TRACKING_ACCESS_TOKEN or DTDC_TRACKING_USERNAME/PASSWORD');
    }

    // Connectivity analysis
    if (!connectivityTest.success) {
      analysis.connectivityIssues.push(`❌ DTDC API connectivity failed: ${connectivityTest.error}`);
      analysis.recommendations.push('Check internet connectivity and DTDC API status');
    }

    // AWB generation analysis
    const successfulAwbTests = awbTestResults.filter(test => test.success && !test.fallbackMode);
    const fallbackAwbTests = awbTestResults.filter(test => test.success && test.fallbackMode);
    const failedAwbTests = awbTestResults.filter(test => !test.success);

    if (successfulAwbTests.length === 0 && configStatus.hasApiKey && configStatus.hasCustomerCode) {
      analysis.awbGenerationIssues.push('❌ CRITICAL: No real AWB numbers generated despite having credentials');
      
      if (directApiTest.success === false) {
        analysis.awbGenerationIssues.push(`❌ Direct API test failed: ${directApiTest.error}`);
        
        if (directApiTest.status === 401 || directApiTest.status === 403) {
          analysis.recommendations.push('❌ Authentication failed - verify API key and customer code are correct and active');
        } else if (directApiTest.status === 400) {
          analysis.recommendations.push('❌ Bad request - check payload structure and required fields');
        } else {
          analysis.recommendations.push('❌ API error - contact DTDC support or check API documentation');
        }
      }
    }

    if (fallbackAwbTests.length > 0) {
      analysis.awbGenerationIssues.push('⚠️ WARNING: AWB generation falling back to mock mode');
      analysis.recommendations.push('Real AWB generation is not working - check DTDC credentials and API status');
    }

    if (successfulAwbTests.length > 0) {
      analysis.recommendations.push('✅ GOOD: Real AWB generation is working correctly');
    }

    // Final assessment
    const overallStatus = {
      configurationComplete: configStatus.hasApiKey && configStatus.hasCustomerCode,
      connectivityWorking: connectivityTest.success,
      awbGenerationWorking: successfulAwbTests.length > 0,
      usingFallbackMode: fallbackAwbTests.length > 0,
      criticalIssuesCount: analysis.configurationIssues.filter(issue => issue.includes('CRITICAL')).length + 
                          analysis.connectivityIssues.length + 
                          analysis.awbGenerationIssues.filter(issue => issue.includes('CRITICAL')).length
    };

    console.log('🎯 Overall assessment:', overallStatus);

    // Return comprehensive results
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      testResults: {
        configurationStatus: configStatus,
        connectivityTest,
        awbTestResults,
        directApiTest,
        recentShipments: recentShipments.map(shipment => ({
          ...shipment,
          dtdcData: shipment.dtdcData ? JSON.parse(shipment.dtdcData as string) : null
        }))
      },
      analysis,
      overallStatus,
      nextSteps: overallStatus.criticalIssuesCount > 0 ? [
        'Fix critical configuration issues first',
        'Verify DTDC credentials with DTDC support',
        'Test with a simple AWB generation request',
        'Check DTDC API documentation for any changes'
      ] : [
        'AWB generation appears to be working correctly',
        'Monitor shipment creation for any issues',
        'Consider implementing additional error handling',
        'Set up tracking credentials if not already configured'
      ]
    });

  } catch (error) {
    console.error('❌ Comprehensive AWB test failed:', error);
    
    return res.status(500).json({
      error: 'Comprehensive AWB test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}