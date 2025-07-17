import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { runNetworkDiagnostics } from '@/lib/dtdc-enhanced';
import { trackShipmentEnhanced } from '@/lib/dtdc-tracking';
import { generateSimplePDFLabel } from '@/lib/simple-pdf-label';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting comprehensive shipment system health check...');

    const healthCheck = {
      timestamp: new Date().toISOString(),
      overall_status: 'HEALTHY',
      issues: [] as string[],
      warnings: [] as string[],
      checks: {
        database: { status: 'UNKNOWN', details: {} },
        wallet_system: { status: 'UNKNOWN', details: {} },
        pdf_generation: { status: 'UNKNOWN', details: {} },
        tracking_system: { status: 'UNKNOWN', details: {} },
        dtdc_connectivity: { status: 'UNKNOWN', details: {} },
        shipment_flow: { status: 'UNKNOWN', details: {} }
      }
    };

    // 1. Database Health Check
    try {
      console.log('Checking database health...');
      
      const shipmentCount = await prisma.shipment.count();
      const boxCount = await prisma.box.count();
      const walletTransactionCount = await prisma.walletTransaction.count();
      
      // Check for orphaned records
      const orphanedBoxes = await prisma.box.count({
        where: {
          shipment: null
        }
      });

      // Check for boxes without AWB
      const boxesWithoutAWB = await prisma.box.count({
        where: {
          awbNumber: null
        }
      });

      healthCheck.checks.database = {
        status: 'HEALTHY',
        details: {
          shipments: shipmentCount,
          boxes: boxCount,
          wallet_transactions: walletTransactionCount,
          orphaned_boxes: orphanedBoxes,
          boxes_without_awb: boxesWithoutAWB
        }
      };

      if (orphanedBoxes > 0) {
        healthCheck.warnings.push(`Found ${orphanedBoxes} orphaned boxes`);
      }

      if (boxesWithoutAWB > 0) {
        healthCheck.warnings.push(`Found ${boxesWithoutAWB} boxes without AWB numbers`);
      }

    } catch (error) {
      healthCheck.checks.database.status = 'FAILED';
      healthCheck.checks.database.details = { error: error instanceof Error ? error.message : 'Unknown error' };
      healthCheck.issues.push('Database connectivity failed');
    }

    // 2. Wallet System Health Check
    try {
      console.log('Checking wallet system health...');
      
      // Check for wallet transactions without proper references
      const transactionsWithoutRef = await prisma.walletTransaction.count({
        where: {
          AND: [
            { reference: null },
            { purchaseOrderId: null }
          ]
        }
      });

      // Check for negative wallet balances
      const negativeBalances = await prisma.wallet.count({
        where: {
          balance: {
            lt: 0
          }
        }
      });

      // Sample wallet refund test
      const recentShipments = await prisma.shipment.findMany({
        where: {
          status: 'CANCELLED'
        },
        take: 5,
        include: {
          _count: {
            select: {
              boxes: true
            }
          }
        }
      });

      let refundIssues = 0;
      for (const shipment of recentShipments) {
        const walletTransactions = await prisma.walletTransaction.findMany({
          where: {
            OR: [
              { reference: `SHIPMENT_${shipment.id}` },
              { reference: shipment.id },
              { purchaseOrderId: shipment.id }
            ]
          }
        });

        const debits = walletTransactions.filter(t => t.type === 'DEBIT').length;
        const credits = walletTransactions.filter(t => t.type === 'CREDIT').length;

        if (debits > 0 && credits === 0) {
          refundIssues++;
        }
      }

      healthCheck.checks.wallet_system = {
        status: refundIssues === 0 && negativeBalances === 0 ? 'HEALTHY' : 'ISSUES',
        details: {
          transactions_without_reference: transactionsWithoutRef,
          negative_balances: negativeBalances,
          cancelled_shipments_without_refunds: refundIssues,
          sample_size: recentShipments.length
        }
      };

      if (refundIssues > 0) {
        healthCheck.issues.push(`Found ${refundIssues} cancelled shipments without proper refunds`);
      }

      if (negativeBalances > 0) {
        healthCheck.issues.push(`Found ${negativeBalances} wallets with negative balances`);
      }

    } catch (error) {
      healthCheck.checks.wallet_system.status = 'FAILED';
      healthCheck.checks.wallet_system.details = { error: error instanceof Error ? error.message : 'Unknown error' };
      healthCheck.issues.push('Wallet system check failed');
    }

    // 3. PDF Generation Health Check
    try {
      console.log('Checking PDF generation system...');
      
      const testLabelData = {
        awbNumber: 'TEST123456789',
        shipmentId: 'test-shipment-id',
        boxNumber: '1',
        brandName: 'Test Brand',
        totalWeight: 1.5,
        createdDate: new Date().toLocaleDateString(),
        destinationAddress: {
          name: 'Test Service Center',
          address: 'Test Address',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          phone: '9999999999'
        },
        partsSummary: [
          { code: 'TEST001', name: 'Test Part', quantity: 1 }
        ]
      };

      const pdfBuffer = await generateSimplePDFLabel(testLabelData);
      
      healthCheck.checks.pdf_generation = {
        status: pdfBuffer.length > 0 ? 'HEALTHY' : 'FAILED',
        details: {
          test_pdf_size: pdfBuffer.length,
          pdf_format: pdfBuffer.toString('utf8', 0, 8).includes('%PDF') ? 'Valid PDF' : 'Invalid PDF format'
        }
      };

      if (pdfBuffer.length === 0) {
        healthCheck.issues.push('PDF generation returned empty buffer');
      }

    } catch (error) {
      healthCheck.checks.pdf_generation.status = 'FAILED';
      healthCheck.checks.pdf_generation.details = { error: error instanceof Error ? error.message : 'Unknown error' };
      healthCheck.issues.push('PDF generation system failed');
    }

    // 4. Tracking System Health Check
    try {
      console.log('Checking tracking system health...');
      
      // Test with a mock AWB
      const trackingResult = await trackShipmentEnhanced('TEST123456789');
      
      // Check recent boxes for tracking issues
      const recentBoxes = await prisma.box.findMany({
        where: {
          awbNumber: { not: null },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        take: 10
      });

      let trackingIssues = 0;
      for (const box of recentBoxes) {
        try {
          const result = await trackShipmentEnhanced(box.awbNumber!);
          if (!result.success) {
            trackingIssues++;
          }
        } catch (error) {
          trackingIssues++;
        }
      }

      healthCheck.checks.tracking_system = {
        status: trackingResult.success && trackingIssues < recentBoxes.length / 2 ? 'HEALTHY' : 'ISSUES',
        details: {
          mock_tracking_test: trackingResult.success,
          recent_boxes_tested: recentBoxes.length,
          tracking_failures: trackingIssues,
          failure_rate: recentBoxes.length > 0 ? (trackingIssues / recentBoxes.length * 100).toFixed(2) + '%' : '0%'
        }
      };

      if (trackingIssues > recentBoxes.length / 2) {
        healthCheck.issues.push(`High tracking failure rate: ${trackingIssues}/${recentBoxes.length} boxes`);
      }

    } catch (error) {
      healthCheck.checks.tracking_system.status = 'FAILED';
      healthCheck.checks.tracking_system.details = { error: error instanceof Error ? error.message : 'Unknown error' };
      healthCheck.issues.push('Tracking system check failed');
    }

    // 5. DTDC Connectivity Health Check
    try {
      console.log('Checking DTDC connectivity...');
      
      const networkDiagnostics = await runNetworkDiagnostics();
      
      healthCheck.checks.dtdc_connectivity = {
        status: networkDiagnostics.networkConnectivity ? 'HEALTHY' : 'ISSUES',
        details: {
          network_connectivity: networkDiagnostics.networkConnectivity,
          dtdc_endpoints: networkDiagnostics.dtdcEndpoints,
          recommendation: networkDiagnostics.recommendation
        }
      };

      if (!networkDiagnostics.networkConnectivity) {
        healthCheck.issues.push('No network connectivity detected');
      }

      const reachableEndpoints = networkDiagnostics.dtdcEndpoints.filter(e => e.reachable).length;
      if (reachableEndpoints === 0) {
        healthCheck.warnings.push('No DTDC endpoints are reachable - system will use mock AWB generation');
      }

    } catch (error) {
      healthCheck.checks.dtdc_connectivity.status = 'FAILED';
      healthCheck.checks.dtdc_connectivity.details = { error: error instanceof Error ? error.message : 'Unknown error' };
      healthCheck.issues.push('DTDC connectivity check failed');
    }

    // 6. Overall Shipment Flow Health Check
    try {
      console.log('Checking overall shipment flow health...');
      
      // Check recent shipments for common issues
      const recentShipments = await prisma.shipment.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        include: {
          boxes: true,
          _count: {
            select: {
              boxes: true
            }
          }
        }
      });

      let shipmentsWithoutAWB = 0;
      let shipmentsWithPartialAWB = 0;
      let totalBoxes = 0;
      let boxesWithAWB = 0;

      recentShipments.forEach(shipment => {
        const boxesInShipment = shipment.boxes.length;
        const boxesWithAWBInShipment = shipment.boxes.filter(box => box.awbNumber).length;
        
        totalBoxes += boxesInShipment;
        boxesWithAWB += boxesWithAWBInShipment;

        if (boxesWithAWBInShipment === 0) {
          shipmentsWithoutAWB++;
        } else if (boxesWithAWBInShipment < boxesInShipment) {
          shipmentsWithPartialAWB++;
        }
      });

      const awbGenerationRate = totalBoxes > 0 ? (boxesWithAWB / totalBoxes * 100).toFixed(2) + '%' : '100%';

      healthCheck.checks.shipment_flow = {
        status: shipmentsWithoutAWB === 0 && shipmentsWithPartialAWB === 0 ? 'HEALTHY' : 'ISSUES',
        details: {
          recent_shipments: recentShipments.length,
          shipments_without_awb: shipmentsWithoutAWB,
          shipments_with_partial_awb: shipmentsWithPartialAWB,
          total_boxes: totalBoxes,
          boxes_with_awb: boxesWithAWB,
          awb_generation_rate: awbGenerationRate
        }
      };

      if (shipmentsWithoutAWB > 0) {
        healthCheck.issues.push(`${shipmentsWithoutAWB} recent shipments have no AWB numbers`);
      }

      if (shipmentsWithPartialAWB > 0) {
        healthCheck.warnings.push(`${shipmentsWithPartialAWB} recent shipments have partial AWB generation`);
      }

    } catch (error) {
      healthCheck.checks.shipment_flow.status = 'FAILED';
      healthCheck.checks.shipment_flow.details = { error: error instanceof Error ? error.message : 'Unknown error' };
      healthCheck.issues.push('Shipment flow check failed');
    }

    // Determine overall status
    const failedChecks = Object.values(healthCheck.checks).filter(check => check.status === 'FAILED').length;
    const issueChecks = Object.values(healthCheck.checks).filter(check => check.status === 'ISSUES').length;

    if (failedChecks > 0) {
      healthCheck.overall_status = 'CRITICAL';
    } else if (issueChecks > 0 || healthCheck.issues.length > 0) {
      healthCheck.overall_status = 'ISSUES';
    } else if (healthCheck.warnings.length > 0) {
      healthCheck.overall_status = 'WARNING';
    } else {
      healthCheck.overall_status = 'HEALTHY';
    }

    console.log(`Health check completed. Overall status: ${healthCheck.overall_status}`);

    return res.status(200).json({
      success: true,
      health_check: healthCheck
    });

  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}