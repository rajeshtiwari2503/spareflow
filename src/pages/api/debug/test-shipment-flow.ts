import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import {
  classifyShipmentType,
  assignCourierPayer,
  getCourierPricing,
  calculateShipmentCostBreakdown,
  calculateInsuranceRequirement,
  calculateBulkShipmentCosts,
  generateCostSummaryCSV
} from '@/lib/shipment-flow-logic';
import { UserRole } from '@prisma/client';

interface TestScenario {
  name: string;
  description: string;
  originRole: UserRole;
  destinationRole: UserRole;
  returnReason?: string;
  expectedClassification: any;
  expectedPayerAssignment: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Starting comprehensive shipment flow test...');
    
    // Verify authentication (optional for debug endpoint)
    const authResult = await verifyAuth(req);
    const user = authResult.user;

    const testResults = {
      timestamp: new Date().toISOString(),
      user: user ? { id: user.id, email: user.email, role: user.role } : null,
      tests: {
        classification: [],
        payerAssignment: [],
        pricing: [],
        costCalculation: [],
        insurance: [],
        bulkCalculation: []
      },
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        successRate: 0
      }
    };

    // Test Scenarios for Classification
    const classificationScenarios: TestScenario[] = [
      {
        name: 'Brand to Service Center',
        description: 'Forward shipment from brand to service center',
        originRole: 'BRAND',
        destinationRole: 'SERVICE_CENTER',
        expectedClassification: {
          shipment_type: 'FORWARD',
          shipment_direction: 'BRAND'
        },
        expectedPayerAssignment: {
          courier_payer: 'BRAND'
        }
      },
      {
        name: 'Brand to Distributor',
        description: 'Forward shipment from brand to distributor',
        originRole: 'BRAND',
        destinationRole: 'DISTRIBUTOR',
        expectedClassification: {
          shipment_type: 'FORWARD',
          shipment_direction: 'BRAND'
        },
        expectedPayerAssignment: {
          courier_payer: 'BRAND'
        }
      },
      {
        name: 'Service Center to Customer',
        description: 'Forward shipment from service center to customer',
        originRole: 'SERVICE_CENTER',
        destinationRole: 'CUSTOMER',
        expectedClassification: {
          shipment_type: 'FORWARD',
          shipment_direction: 'SERVICE_CENTER'
        },
        expectedPayerAssignment: {
          courier_payer: 'SERVICE_CENTER'
        }
      },
      {
        name: 'Service Center to Brand (Defective)',
        description: 'Reverse shipment - defective parts return',
        originRole: 'SERVICE_CENTER',
        destinationRole: 'BRAND',
        returnReason: 'DEFECTIVE',
        expectedClassification: {
          shipment_type: 'REVERSE',
          shipment_direction: 'SERVICE_CENTER',
          return_reason: 'DEFECTIVE'
        },
        expectedPayerAssignment: {
          courier_payer: 'BRAND'
        }
      },
      {
        name: 'Service Center to Brand (Excess)',
        description: 'Reverse shipment - excess stock return',
        originRole: 'SERVICE_CENTER',
        destinationRole: 'BRAND',
        returnReason: 'EXCESS',
        expectedClassification: {
          shipment_type: 'REVERSE',
          shipment_direction: 'SERVICE_CENTER',
          return_reason: 'EXCESS'
        },
        expectedPayerAssignment: {
          courier_payer: 'SERVICE_CENTER'
        }
      },
      {
        name: 'Customer to Service Center',
        description: 'Reverse shipment - warranty return',
        originRole: 'CUSTOMER',
        destinationRole: 'SERVICE_CENTER',
        expectedClassification: {
          shipment_type: 'REVERSE',
          shipment_direction: 'SERVICE_CENTER',
          return_reason: 'WARRANTY_RETURN'
        },
        expectedPayerAssignment: {
          courier_payer: 'CUSTOMER'
        }
      },
      {
        name: 'Distributor to Service Center',
        description: 'Forward shipment from distributor to service center',
        originRole: 'DISTRIBUTOR',
        destinationRole: 'SERVICE_CENTER',
        expectedClassification: {
          shipment_type: 'FORWARD',
          shipment_direction: 'DISTRIBUTOR'
        },
        expectedPayerAssignment: {
          courier_payer: 'SERVICE_CENTER'
        }
      }
    ];

    // Test 1: Classification Logic
    console.log('🧭 Testing shipment classification logic...');
    for (const scenario of classificationScenarios) {
      try {
        const classification = classifyShipmentType(
          scenario.originRole,
          scenario.destinationRole,
          scenario.returnReason
        );

        const payerAssignment = assignCourierPayer(
          classification.shipment_type,
          classification.shipment_direction,
          classification.return_reason
        );

        const classificationPassed = 
          classification.shipment_type === scenario.expectedClassification.shipment_type &&
          classification.shipment_direction === scenario.expectedClassification.shipment_direction &&
          (!scenario.expectedClassification.return_reason || 
           classification.return_reason === scenario.expectedClassification.return_reason);

        const payerPassed = payerAssignment.courier_payer === scenario.expectedPayerAssignment.courier_payer;

        testResults.tests.classification.push({
          scenario: scenario.name,
          description: scenario.description,
          input: {
            originRole: scenario.originRole,
            destinationRole: scenario.destinationRole,
            returnReason: scenario.returnReason
          },
          expected: {
            classification: scenario.expectedClassification,
            payerAssignment: scenario.expectedPayerAssignment
          },
          actual: {
            classification,
            payerAssignment
          },
          passed: classificationPassed && payerPassed,
          details: {
            classificationPassed,
            payerPassed
          }
        });

        testResults.summary.totalTests++;
        if (classificationPassed && payerPassed) {
          testResults.summary.passedTests++;
        } else {
          testResults.summary.failedTests++;
        }

      } catch (error) {
        testResults.tests.classification.push({
          scenario: scenario.name,
          description: scenario.description,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        testResults.summary.totalTests++;
        testResults.summary.failedTests++;
      }
    }

    // Test 2: Pricing Configuration (if user is authenticated as BRAND)
    if (user && user.role === 'BRAND') {
      console.log('🧮 Testing pricing configuration...');
      
      const pricingTests = [
        { shipmentType: 'FORWARD', courierPayer: 'BRAND' },
        { shipmentType: 'REVERSE', courierPayer: 'BRAND' },
        { shipmentType: 'REVERSE', courierPayer: 'SERVICE_CENTER' }
      ];

      for (const test of pricingTests) {
        try {
          const pricing = await getCourierPricing(
            test.shipmentType as any,
            test.courierPayer as any,
            user.id
          );

          const passed = pricing.base_rate_per_box > 0 && 
                        pricing.weight_rate_per_kg > 0 && 
                        pricing.min_charge > 0;

          testResults.tests.pricing.push({
            scenario: `${test.shipmentType} - ${test.courierPayer} pays`,
            input: test,
            actual: pricing,
            passed,
            details: {
              hasValidRates: pricing.base_rate_per_box > 0,
              hasWeightRate: pricing.weight_rate_per_kg > 0,
              hasMinCharge: pricing.min_charge > 0,
              source: pricing.source
            }
          });

          testResults.summary.totalTests++;
          if (passed) {
            testResults.summary.passedTests++;
          } else {
            testResults.summary.failedTests++;
          }

        } catch (error) {
          testResults.tests.pricing.push({
            scenario: `${test.shipmentType} - ${test.courierPayer} pays`,
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          testResults.summary.totalTests++;
          testResults.summary.failedTests++;
        }
      }

      // Test 3: Cost Calculation
      console.log('💰 Testing cost calculation...');
      
      const costTests = [
        {
          name: 'Standard Forward Shipment',
          pricing: {
            base_rate_per_box: 50,
            weight_rate_per_kg: 25,
            min_charge: 75,
            markup_percent: 15,
            location_surcharge: 25,
            express_multiplier: 1.5,
            source: 'test' as const
          },
          numBoxes: 2,
          totalWeight: 1.5,
          isExpress: false,
          isRemoteArea: false,
          declaredValue: 1000,
          insuranceRequired: false
        },
        {
          name: 'Express Remote Area Shipment',
          pricing: {
            base_rate_per_box: 50,
            weight_rate_per_kg: 25,
            min_charge: 75,
            markup_percent: 15,
            location_surcharge: 25,
            express_multiplier: 1.5,
            source: 'test' as const
          },
          numBoxes: 1,
          totalWeight: 2.0,
          isExpress: true,
          isRemoteArea: true,
          declaredValue: 8000,
          insuranceRequired: true
        }
      ];

      for (const test of costTests) {
        try {
          const costBreakdown = calculateShipmentCostBreakdown(
            test.pricing,
            test.numBoxes,
            test.totalWeight,
            test.isExpress,
            test.isRemoteArea,
            test.declaredValue,
            test.insuranceRequired
          );

          const passed = costBreakdown.total_cost > 0 && 
                        costBreakdown.base_cost > 0 &&
                        costBreakdown.applied_rules.length > 0;

          testResults.tests.costCalculation.push({
            scenario: test.name,
            input: test,
            actual: costBreakdown,
            passed,
            details: {
              hasPositiveCost: costBreakdown.total_cost > 0,
              hasBaseCost: costBreakdown.base_cost > 0,
              hasRules: costBreakdown.applied_rules.length > 0,
              rulesCount: costBreakdown.applied_rules.length
            }
          });

          testResults.summary.totalTests++;
          if (passed) {
            testResults.summary.passedTests++;
          } else {
            testResults.summary.failedTests++;
          }

        } catch (error) {
          testResults.tests.costCalculation.push({
            scenario: test.name,
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          testResults.summary.totalTests++;
          testResults.summary.failedTests++;
        }
      }
    }

    // Test 4: Insurance Calculation
    console.log('🛡 Testing insurance calculation...');
    
    const insuranceTests = [
      { declaredValue: 3000, expectedRequired: false },
      { declaredValue: 5000, expectedRequired: true },
      { declaredValue: 10000, expectedRequired: true }
    ];

    for (const test of insuranceTests) {
      try {
        const insurance = calculateInsuranceRequirement(test.declaredValue);
        
        const passed = insurance.insurance_required === test.expectedRequired &&
                      (test.expectedRequired ? insurance.total_insurance_charge > 0 : insurance.total_insurance_charge === 0);

        testResults.tests.insurance.push({
          scenario: `Declared Value: ₹${test.declaredValue}`,
          input: test,
          actual: insurance,
          passed,
          details: {
            correctRequirement: insurance.insurance_required === test.expectedRequired,
            correctCharge: test.expectedRequired ? insurance.total_insurance_charge > 0 : insurance.total_insurance_charge === 0
          }
        });

        testResults.summary.totalTests++;
        if (passed) {
          testResults.summary.passedTests++;
        } else {
          testResults.summary.failedTests++;
        }

      } catch (error) {
        testResults.tests.insurance.push({
          scenario: `Declared Value: ₹${test.declaredValue}`,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        testResults.summary.totalTests++;
        testResults.summary.failedTests++;
      }
    }

    // Test 5: Bulk Calculation
    console.log('📊 Testing bulk calculation...');
    
    try {
      const mockShipments = [
        {
          shipment_id: 'test_1',
          recipient_name: 'Test Service Center 1',
          cost_breakdown: {
            base_cost: 100,
            weight_cost: 25,
            surcharge_cost: 0,
            markup_cost: 15,
            insurance_cost: 0,
            total_cost: 140,
            pricing_source: 'test',
            applied_rules: []
          },
          courier_payer: 'BRAND' as const
        },
        {
          shipment_id: 'test_2',
          recipient_name: 'Test Service Center 2',
          cost_breakdown: {
            base_cost: 50,
            weight_cost: 0,
            surcharge_cost: 25,
            markup_cost: 7.5,
            insurance_cost: 20,
            total_cost: 102.5,
            pricing_source: 'test',
            applied_rules: []
          },
          courier_payer: 'SERVICE_CENTER' as const
        }
      ];

      const bulkSummary = calculateBulkShipmentCosts(mockShipments);
      
      const expectedTotal = 140 + 102.5;
      const passed = bulkSummary.grand_total === expectedTotal &&
                    bulkSummary.total_shipments === 2 &&
                    bulkSummary.cost_by_payer.BRAND === 140 &&
                    bulkSummary.cost_by_payer.SERVICE_CENTER === 102.5;

      testResults.tests.bulkCalculation.push({
        scenario: 'Bulk Cost Summary',
        input: { shipments: mockShipments },
        actual: bulkSummary,
        passed,
        details: {
          correctTotal: bulkSummary.grand_total === expectedTotal,
          correctCount: bulkSummary.total_shipments === 2,
          correctBrandCost: bulkSummary.cost_by_payer.BRAND === 140,
          correctSCCost: bulkSummary.cost_by_payer.SERVICE_CENTER === 102.5
        }
      });

      // Test CSV generation
      const csvContent = generateCostSummaryCSV(bulkSummary);
      const csvPassed = csvContent.includes('Shipment ID') && 
                       csvContent.includes('GRAND TOTAL') &&
                       csvContent.includes('242.50');

      testResults.tests.bulkCalculation.push({
        scenario: 'CSV Generation',
        input: { bulkSummary },
        actual: { csvLength: csvContent.length, hasHeaders: csvContent.includes('Shipment ID') },
        passed: csvPassed,
        details: {
          hasContent: csvContent.length > 0,
          hasHeaders: csvContent.includes('Shipment ID'),
          hasTotal: csvContent.includes('GRAND TOTAL')
        }
      });

      testResults.summary.totalTests += 2;
      if (passed) testResults.summary.passedTests++;
      else testResults.summary.failedTests++;
      
      if (csvPassed) testResults.summary.passedTests++;
      else testResults.summary.failedTests++;

    } catch (error) {
      testResults.tests.bulkCalculation.push({
        scenario: 'Bulk Calculation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      testResults.summary.totalTests++;
      testResults.summary.failedTests++;
    }

    // Calculate success rate
    testResults.summary.successRate = testResults.summary.totalTests > 0 ? 
      Math.round((testResults.summary.passedTests / testResults.summary.totalTests) * 100) : 0;

    console.log('✅ Shipment flow test completed:', {
      totalTests: testResults.summary.totalTests,
      passed: testResults.summary.passedTests,
      failed: testResults.summary.failedTests,
      successRate: `${testResults.summary.successRate}%`
    });

    return res.status(200).json({
      success: true,
      message: 'Shipment flow test completed',
      results: testResults
    });

  } catch (error) {
    console.error('❌ Shipment flow test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Shipment flow test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}