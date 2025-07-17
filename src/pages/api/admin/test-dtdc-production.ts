import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';
import { 
  generateAWB, 
  generateShippingLabel, 
  trackShipment, 
  checkPincodeServiceability 
} from '@/lib/dtdc-production';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = authResult;

    // Only admin can test DTDC integration
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admin can test DTDC integration' });
    }

    const { testType, testData } = req.body;

    console.log('🧪 Starting DTDC Production API Test:', testType);

    const results: any = {
      testType,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      dtdcConfig: {
        hasCustomerCode: !!process.env.DTDC_CUSTOMER_CODE,
        hasApiKey: !!process.env.DTDC_API_KEY_NEW,
        hasServiceType: !!process.env.DTDC_SERVICE_TYPE,
        hasCommodityId: !!process.env.DTDC_COMMODITY_ID,
        customerCode: process.env.DTDC_CUSTOMER_CODE,
        serviceType: process.env.DTDC_SERVICE_TYPE,
        commodityId: process.env.DTDC_COMMODITY_ID
      }
    };

    switch (testType) {
      case 'pincode_check':
        console.log('🔍 Testing pincode serviceability...');
        try {
          const pincodeResult = await checkPincodeServiceability(
            testData?.orgPincode || '400069',
            testData?.desPincode || '110001'
          );
          
          results.pincodeCheck = {
            success: true,
            result: pincodeResult,
            testData: {
              orgPincode: testData?.orgPincode || '400069',
              desPincode: testData?.desPincode || '110001'
            }
          };
          
          console.log('✅ Pincode check completed:', pincodeResult);
        } catch (error) {
          results.pincodeCheck = {
            success: false,
            error: error instanceof Error ? error.message : 'Pincode check failed'
          };
          console.error('❌ Pincode check failed:', error);
        }
        break;

      case 'awb_generation':
        console.log('🚀 Testing AWB generation...');
        try {
          const awbRequest = {
            consignee_name: testData?.consignee_name || 'Test Service Center',
            consignee_phone: testData?.consignee_phone || '9876543210',
            consignee_address: testData?.consignee_address || 'Test Address, Test Area',
            consignee_city: testData?.consignee_city || 'Mumbai',
            consignee_state: testData?.consignee_state || 'Maharashtra',
            consignee_pincode: testData?.consignee_pincode || '400001',
            weight: testData?.weight || 1.0,
            pieces: testData?.pieces || 1,
            declared_value: testData?.declared_value || 1000,
            reference_number: `TEST-${Date.now()}`,
            shipment_id: `test-${Date.now()}`,
            pickup_pincode: '400069',
            product_type: 'NON-DOC'
          };

          const awbResult = await generateAWB(awbRequest);
          
          results.awbGeneration = {
            success: true,
            result: awbResult,
            testData: awbRequest
          };
          
          console.log('✅ AWB generation completed:', awbResult);

          // If AWB generation was successful, test label generation
          if (awbResult.success && awbResult.awb_number) {
            console.log('🏷️ Testing label generation...');
            try {
              const labelResult = await generateShippingLabel(awbResult.awb_number, 'test-box-id');
              
              results.labelGeneration = {
                success: true,
                result: labelResult,
                awbNumber: awbResult.awb_number
              };
              
              console.log('✅ Label generation completed:', labelResult);
            } catch (error) {
              results.labelGeneration = {
                success: false,
                error: error instanceof Error ? error.message : 'Label generation failed',
                awbNumber: awbResult.awb_number
              };
              console.error('❌ Label generation failed:', error);
            }
          }

        } catch (error) {
          results.awbGeneration = {
            success: false,
            error: error instanceof Error ? error.message : 'AWB generation failed'
          };
          console.error('❌ AWB generation failed:', error);
        }
        break;

      case 'tracking':
        console.log('🔍 Testing shipment tracking...');
        try {
          const awbNumber = testData?.awbNumber || 'TEST123456789';
          const trackingResult = await trackShipment(awbNumber);
          
          results.tracking = {
            success: true,
            result: trackingResult,
            testData: { awbNumber }
          };
          
          console.log('✅ Tracking completed:', trackingResult);
        } catch (error) {
          results.tracking = {
            success: false,
            error: error instanceof Error ? error.message : 'Tracking failed'
          };
          console.error('❌ Tracking failed:', error);
        }
        break;

      case 'comprehensive':
        console.log('🔄 Running comprehensive DTDC test...');
        
        // Test 1: Pincode Check
        try {
          const pincodeResult = await checkPincodeServiceability('400069', '110001');
          results.tests = results.tests || {};
          results.tests.pincodeCheck = { success: true, result: pincodeResult };
          console.log('✅ Comprehensive Test 1/3: Pincode check passed');
        } catch (error) {
          results.tests = results.tests || {};
          results.tests.pincodeCheck = { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed' 
          };
          console.error('❌ Comprehensive Test 1/3: Pincode check failed');
        }

        // Test 2: AWB Generation
        try {
          const awbRequest = {
            consignee_name: 'Comprehensive Test Service Center',
            consignee_phone: '9876543210',
            consignee_address: 'Test Address, Comprehensive Test Area',
            consignee_city: 'Delhi',
            consignee_state: 'Delhi',
            consignee_pincode: '110001',
            weight: 2.5,
            pieces: 2,
            declared_value: 5000,
            reference_number: `COMP-TEST-${Date.now()}`,
            shipment_id: `comp-test-${Date.now()}`,
            pickup_pincode: '400069',
            product_type: 'NON-DOC'
          };

          const awbResult = await generateAWB(awbRequest);
          results.tests.awbGeneration = { success: true, result: awbResult };
          console.log('✅ Comprehensive Test 2/3: AWB generation passed');

          // Test 3: Label Generation (if AWB was successful)
          if (awbResult.success && awbResult.awb_number) {
            try {
              const labelResult = await generateShippingLabel(awbResult.awb_number, 'comp-test-box');
              results.tests.labelGeneration = { success: true, result: labelResult };
              console.log('✅ Comprehensive Test 3/3: Label generation passed');
            } catch (error) {
              results.tests.labelGeneration = { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed' 
              };
              console.error('❌ Comprehensive Test 3/3: Label generation failed');
            }
          } else {
            results.tests.labelGeneration = { 
              success: false, 
              error: 'Skipped due to AWB generation failure' 
            };
            console.log('⏭️ Comprehensive Test 3/3: Label generation skipped');
          }

        } catch (error) {
          results.tests.awbGeneration = { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed' 
          };
          console.error('❌ Comprehensive Test 2/3: AWB generation failed');
        }

        // Calculate overall success
        const testResults = results.tests;
        const totalTests = Object.keys(testResults).length;
        const passedTests = Object.values(testResults).filter((test: any) => test.success).length;
        
        results.summary = {
          totalTests,
          passedTests,
          failedTests: totalTests - passedTests,
          successRate: `${Math.round((passedTests / totalTests) * 100)}%`,
          overallStatus: passedTests === totalTests ? 'PASS' : 'PARTIAL_PASS'
        };

        console.log('🎯 Comprehensive test completed:', results.summary);
        break;

      default:
        return res.status(400).json({ 
          error: 'Invalid test type. Use: pincode_check, awb_generation, tracking, or comprehensive' 
        });
    }

    // Add performance metrics
    results.performance = {
      testDuration: Date.now() - new Date(results.timestamp).getTime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    };

    console.log('🏁 DTDC Production API Test completed');

    return res.status(200).json({
      success: true,
      message: 'DTDC Production API test completed',
      results
    });

  } catch (error) {
    console.error('❌ DTDC Production API test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'DTDC test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}