import type { NextApiRequest, NextApiResponse } from 'next';
import { dtdcFallbackService, type ShipmentData, type DTDCResponse } from '../../../lib/dtdc-fallback-production';

interface FallbackTestResponse {
  success: boolean;
  timestamp: string;
  fallbackStatus: {
    config: any;
    nextAWBNumber: string;
    shouldUseFallback: boolean;
  };
  testResults: {
    testName: string;
    success: boolean;
    awbNumber: string | null;
    isMock: boolean;
    responseTime: number;
    response: DTDCResponse;
    error?: string;
  }[];
  summary: {
    totalTests: number;
    successfulTests: number;
    mockAWBsGenerated: number;
    realAWBsGenerated: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FallbackTestResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      timestamp: new Date().toISOString(),
      fallbackStatus: {
        config: {},
        nextAWBNumber: '',
        shouldUseFallback: false
      },
      testResults: [],
      summary: {
        totalTests: 0,
        successfulTests: 0,
        mockAWBsGenerated: 0,
        realAWBsGenerated: 0
      }
    });
  }

  const testResults = [];
  let successfulTests = 0;
  let mockAWBsGenerated = 0;
  let realAWBsGenerated = 0;

  // Get fallback service status
  const fallbackStatus = {
    config: dtdcFallbackService.getStatus().config,
    nextAWBNumber: dtdcFallbackService.getStatus().nextAWBNumber,
    shouldUseFallback: await dtdcFallbackService.shouldUseFallbackMode()
  };

  // Test scenarios
  const testScenarios = [
    {
      testName: 'Standard Forward Shipment',
      serviceType: '1',
      consignmentType: 'forward'
    },
    {
      testName: 'Reverse Logistics Shipment',
      serviceType: '1',
      consignmentType: 'reverse'
    },
    {
      testName: 'Service Type 2 Test',
      serviceType: '2',
      consignmentType: 'reverse'
    }
  ];

  for (const scenario of testScenarios) {
    const startTime = Date.now();
    
    try {
      const testShipmentData: ShipmentData = {
        customerCode: 'GL10074',
        serviceType: scenario.serviceType,
        consignmentType: scenario.consignmentType,
        loadType: 'NON-DOCUMENT',
        description: `Test Shipment - ${scenario.testName}`,
        dimensionUnit: 'cm',
        weightUnit: 'kg',
        pieces: [{
          description: 'Test Spare Part',
          declaredValue: '1000',
          weight: '0.5',
          height: '10',
          length: '15',
          width: '10'
        }],
        shipper: {
          name: 'Test Shipper',
          add: 'Test Address',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          pin: '400069',
          phone: '9999999999'
        },
        consignee: {
          name: 'Test Consignee',
          add: 'Test Address',
          city: 'Delhi',
          state: 'Delhi',
          country: 'India',
          pin: '110001',
          phone: '9999999999'
        },
        referenceNumber: `FALLBACK-TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        customerReferenceNumber: `FALLBACK-TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const response = await dtdcFallbackService.createShipment(testShipmentData);
      const responseTime = Date.now() - startTime;
      
      const success = response.data[0]?.success || false;
      const awbNumber = response.data[0]?.awb_number || null;
      const isMock = awbNumber?.includes('GL10074-') || false;

      if (success) {
        successfulTests++;
        if (isMock) {
          mockAWBsGenerated++;
        } else {
          realAWBsGenerated++;
        }
      }

      testResults.push({
        testName: scenario.testName,
        success,
        awbNumber,
        isMock,
        responseTime,
        response
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      testResults.push({
        testName: scenario.testName,
        success: false,
        awbNumber: null,
        isMock: false,
        responseTime,
        response: {
          status: 'ERROR',
          data: [{
            success: false,
            reference_number: '',
            customer_reference_number: '',
            message: 'Test failed',
            reason: 'EXCEPTION'
          }]
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  const result: FallbackTestResponse = {
    success: true,
    timestamp: new Date().toISOString(),
    fallbackStatus,
    testResults,
    summary: {
      totalTests: testScenarios.length,
      successfulTests,
      mockAWBsGenerated,
      realAWBsGenerated
    }
  };

  return res.status(200).json(result);
}