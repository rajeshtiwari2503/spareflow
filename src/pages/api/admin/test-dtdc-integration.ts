import { NextApiRequest, NextApiResponse } from 'next'
import { generateAWBWithLabelEnhanced, checkPincodeServiceabilityEnhanced, runNetworkDiagnostics, DTDCShipmentRequest } from '@/lib/dtdc-enhanced'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    console.log('Starting comprehensive DTDC integration test...')
    
    const testResults = {
      timestamp: new Date().toISOString(),
      networkDiagnostics: null as any,
      pincodeCheck: null as any,
      awbGeneration: null as any,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDtdcApiKey: !!process.env.DTDC_API_KEY_NEW,
        hasDtdcCustomerCode: !!process.env.DTDC_CUSTOMER_CODE,
        dtdcServiceType: process.env.DTDC_SERVICE_TYPE || 'B2C SMART EXPRESS'
      }
    }

    // Step 1: Network Diagnostics
    console.log('Step 1: Running network diagnostics...')
    try {
      testResults.networkDiagnostics = await runNetworkDiagnostics()
      console.log('Network diagnostics completed:', testResults.networkDiagnostics)
    } catch (error) {
      testResults.networkDiagnostics = {
        error: error instanceof Error ? error.message : 'Network diagnostics failed'
      }
      console.error('Network diagnostics failed:', error)
    }

    // Step 2: Pincode Serviceability Check
    console.log('Step 2: Testing pincode serviceability...')
    try {
      testResults.pincodeCheck = await checkPincodeServiceabilityEnhanced('400069', '110001')
      console.log('Pincode check completed:', testResults.pincodeCheck)
    } catch (error) {
      testResults.pincodeCheck = {
        success: false,
        error: error instanceof Error ? error.message : 'Pincode check failed'
      }
      console.error('Pincode check failed:', error)
    }

    // Step 3: AWB Generation Test
    console.log('Step 3: Testing AWB generation...')
    try {
      const testRequest: DTDCShipmentRequest = {
        consignee_name: 'Test Service Center',
        consignee_address: 'Test Address, Test Area',
        consignee_city: 'New Delhi',
        consignee_state: 'Delhi',
        consignee_pincode: '110001',
        consignee_phone: '9999999999',
        weight: 1.0,
        pieces: 1,
        reference_number: `TEST-${Date.now()}`,
        box_id: 'test-box-id',
        pickup_pincode: '400069',
        declared_value: 1000
      }

      testResults.awbGeneration = await generateAWBWithLabelEnhanced(testRequest)
      console.log('AWB generation completed:', testResults.awbGeneration)
    } catch (error) {
      testResults.awbGeneration = {
        success: false,
        error: error instanceof Error ? error.message : 'AWB generation failed'
      }
      console.error('AWB generation failed:', error)
    }

    // Determine overall status
    const overallSuccess = testResults.networkDiagnostics?.networkConnectivity && 
                          testResults.pincodeCheck?.success && 
                          testResults.awbGeneration?.success

    console.log('DTDC integration test completed. Overall success:', overallSuccess)

    res.status(200).json({
      success: true,
      overallSuccess,
      message: overallSuccess ? 
        'DTDC integration is working properly' : 
        'DTDC integration has issues - check individual test results',
      testResults,
      recommendations: generateRecommendations(testResults)
    })

  } catch (error) {
    console.error('DTDC integration test error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to run DTDC integration test',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

function generateRecommendations(testResults: any): string[] {
  const recommendations = []

  if (!testResults.networkDiagnostics?.networkConnectivity) {
    recommendations.push('Network connectivity issue detected. Check internet connection and DNS resolution.')
  }

  if (testResults.networkDiagnostics?.dtdcEndpoints && 
      !testResults.networkDiagnostics.dtdcEndpoints.some((e: any) => e.reachable)) {
    recommendations.push('All DTDC API endpoints are unreachable. This may be a temporary issue or DNS problem.')
  }

  if (!testResults.environment.hasDtdcApiKey) {
    recommendations.push('DTDC_API_KEY_NEW environment variable is missing.')
  }

  if (!testResults.environment.hasDtdcCustomerCode) {
    recommendations.push('DTDC_CUSTOMER_CODE environment variable is missing.')
  }

  if (!testResults.pincodeCheck?.success) {
    recommendations.push('Pincode serviceability check failed. Verify DTDC API credentials and endpoint availability.')
  }

  if (!testResults.awbGeneration?.success) {
    recommendations.push('AWB generation failed. System will fall back to mock AWB generation to maintain functionality.')
  }

  if (testResults.awbGeneration?.success && testResults.awbGeneration?.awb_number?.startsWith('DTDC')) {
    recommendations.push('AWB generation is working with mock data. Real DTDC API may not be accessible.')
  }

  if (recommendations.length === 0) {
    recommendations.push('All tests passed. DTDC integration is working properly.')
  }

  return recommendations
}