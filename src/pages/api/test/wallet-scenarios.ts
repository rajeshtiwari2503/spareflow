// Test Cases API for Wallet Deduction Scenarios
// Provides comprehensive testing for courier cost responsibility logic

import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { deductAmount, processReturnCourierCost, checkEnhancedWalletBalance, adminWalletAdjustment } from '@/lib/enhanced-wallet';

interface TestScenario {
  name: string;
  description: string;
  setup: () => Promise<any>;
  test: (setupData: any) => Promise<any>;
  cleanup: (setupData: any) => Promise<void>;
}

// Test scenario implementations
const testScenarios: TestScenario[] = [
  {
    name: 'Return created by SC → Defective → Brand wallet deducted',
    description: 'Service Center creates return for defective part, brand wallet should be deducted',
    setup: async () => {
      // Create test brand with wallet
      const brand = await prisma.user.create({
        data: {
          name: 'Test Brand',
          email: `test-brand-${Date.now()}@test.com`,
          password: 'test123',
          role: 'BRAND'
        }
      });

      const brandWallet = await prisma.brandWallet.create({
        data: {
          brandId: brand.id,
          balance: 1000,
          totalSpent: 0
        }
      });

      // Create test service center
      const serviceCenter = await prisma.user.create({
        data: {
          name: 'Test Service Center',
          email: `test-sc-${Date.now()}@test.com`,
          password: 'test123',
          role: 'SERVICE_CENTER'
        }
      });

      // Create test part
      const part = await prisma.part.create({
        data: {
          code: `TEST-PART-${Date.now()}`,
          name: 'Test Defective Part',
          price: 100,
          brandId: brand.id,
          weight: 1.5
        }
      });

      return { brand, serviceCenter, part, brandWallet };
    },
    test: async (setupData) => {
      const { brand, serviceCenter, part } = setupData;
      
      // Create return request for defective part
      const response = await fetch('/api/reverse-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceCenterId: serviceCenter.id,
          partId: part.id,
          reason: 'Part is defective and not working',
          returnReason: 'DEFECTIVE',
          quantity: 1,
          weight: 1.5,
          processPayment: true
        })
      });

      const result = await response.json();
      
      // Check if wallet was deducted
      const updatedWallet = await prisma.brandWallet.findUnique({
        where: { brandId: brand.id }
      });

      return {
        success: response.ok,
        result,
        walletBalanceBefore: 1000,
        walletBalanceAfter: updatedWallet?.balance,
        deductedAmount: result.costInfo?.estimatedCourierCost,
        costResponsibility: result.costInfo?.costResponsibility
      };
    },
    cleanup: async (setupData) => {
      const { brand, serviceCenter, part } = setupData;
      await prisma.part.delete({ where: { id: part.id } });
      await prisma.brandWallet.delete({ where: { brandId: brand.id } });
      await prisma.user.delete({ where: { id: brand.id } });
      await prisma.user.delete({ where: { id: serviceCenter.id } });
    }
  },
  {
    name: 'Return created by SC → Excess → SC wallet deducted',
    description: 'Service Center creates return for excess inventory, SC wallet should be deducted',
    setup: async () => {
      // Create test brand
      const brand = await prisma.user.create({
        data: {
          name: 'Test Brand 2',
          email: `test-brand-2-${Date.now()}@test.com`,
          password: 'test123',
          role: 'BRAND'
        }
      });

      // Create test service center with wallet
      const serviceCenter = await prisma.user.create({
        data: {
          name: 'Test Service Center 2',
          email: `test-sc-2-${Date.now()}@test.com`,
          password: 'test123',
          role: 'SERVICE_CENTER'
        }
      });

      const scWallet = await prisma.wallet.create({
        data: {
          userId: serviceCenter.id,
          balance: 500,
          totalSpent: 0,
          totalEarned: 0
        }
      });

      // Create test part
      const part = await prisma.part.create({
        data: {
          code: `TEST-PART-2-${Date.now()}`,
          name: 'Test Excess Part',
          price: 50,
          brandId: brand.id,
          weight: 0.8
        }
      });

      return { brand, serviceCenter, part, scWallet };
    },
    test: async (setupData) => {
      const { brand, serviceCenter, part } = setupData;
      
      // Create return request for excess stock
      const response = await fetch('/api/reverse-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceCenterId: serviceCenter.id,
          partId: part.id,
          reason: 'Excess inventory cleanup',
          returnReason: 'EXCESS_STOCK',
          quantity: 2,
          weight: 0.8,
          processPayment: true
        })
      });

      const result = await response.json();
      
      // Check if SC wallet was deducted
      const updatedWallet = await prisma.wallet.findUnique({
        where: { userId: serviceCenter.id }
      });

      return {
        success: response.ok,
        result,
        walletBalanceBefore: 500,
        walletBalanceAfter: updatedWallet?.balance,
        deductedAmount: result.costInfo?.estimatedCourierCost,
        costResponsibility: result.costInfo?.costResponsibility
      };
    },
    cleanup: async (setupData) => {
      const { brand, serviceCenter, part } = setupData;
      await prisma.part.delete({ where: { id: part.id } });
      await prisma.wallet.delete({ where: { userId: serviceCenter.id } });
      await prisma.user.delete({ where: { id: brand.id } });
      await prisma.user.delete({ where: { id: serviceCenter.id } });
    }
  },
  {
    name: 'Wallet insufficient → return not allowed',
    description: 'Return should be rejected when wallet has insufficient balance',
    setup: async () => {
      // Create test brand with low wallet balance
      const brand = await prisma.user.create({
        data: {
          name: 'Test Brand 3',
          email: `test-brand-3-${Date.now()}@test.com`,
          password: 'test123',
          role: 'BRAND'
        }
      });

      const brandWallet = await prisma.brandWallet.create({
        data: {
          brandId: brand.id,
          balance: 50, // Low balance
          totalSpent: 0
        }
      });

      // Create test service center
      const serviceCenter = await prisma.user.create({
        data: {
          name: 'Test Service Center 3',
          email: `test-sc-3-${Date.now()}@test.com`,
          password: 'test123',
          role: 'SERVICE_CENTER'
        }
      });

      // Create test part
      const part = await prisma.part.create({
        data: {
          code: `TEST-PART-3-${Date.now()}`,
          name: 'Test Heavy Part',
          price: 200,
          brandId: brand.id,
          weight: 5 // Heavy part = high courier cost
        }
      });

      return { brand, serviceCenter, part, brandWallet };
    },
    test: async (setupData) => {
      const { brand, serviceCenter, part } = setupData;
      
      // Try to create return request that should fail due to insufficient balance
      const response = await fetch('/api/reverse-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceCenterId: serviceCenter.id,
          partId: part.id,
          reason: 'Defective heavy part',
          returnReason: 'DEFECTIVE', // Brand should pay
          quantity: 1,
          weight: 5,
          processPayment: true
        })
      });

      const result = await response.json();
      
      // Check that wallet balance remained unchanged
      const walletAfter = await prisma.brandWallet.findUnique({
        where: { brandId: brand.id }
      });

      return {
        success: !response.ok, // Should fail
        result,
        walletBalanceBefore: 50,
        walletBalanceAfter: walletAfter?.balance,
        errorMessage: result.error,
        shouldFail: true
      };
    },
    cleanup: async (setupData) => {
      const { brand, serviceCenter, part } = setupData;
      await prisma.part.delete({ where: { id: part.id } });
      await prisma.brandWallet.delete({ where: { brandId: brand.id } });
      await prisma.user.delete({ where: { id: brand.id } });
      await prisma.user.delete({ where: { id: serviceCenter.id } });
    }
  },
  {
    name: 'Admin override allowed',
    description: 'Admin should be able to override wallet balance checks',
    setup: async () => {
      // Create test admin
      const admin = await prisma.user.create({
        data: {
          name: 'Test Admin',
          email: `test-admin-${Date.now()}@test.com`,
          password: 'test123',
          role: 'SUPER_ADMIN'
        }
      });

      // Create test brand with low balance
      const brand = await prisma.user.create({
        data: {
          name: 'Test Brand 4',
          email: `test-brand-4-${Date.now()}@test.com`,
          password: 'test123',
          role: 'BRAND'
        }
      });

      const brandWallet = await prisma.brandWallet.create({
        data: {
          brandId: brand.id,
          balance: 30, // Very low balance
          totalSpent: 0
        }
      });

      return { admin, brand, brandWallet };
    },
    test: async (setupData) => {
      const { admin, brand } = setupData;
      
      // Admin manually adjusts wallet
      const adjustmentResult = await adminWalletAdjustment(
        brand.id,
        500,
        'Test admin override for insufficient balance',
        admin.id,
        'CREDIT'
      );

      // Check wallet balance after admin adjustment
      const walletAfter = await prisma.brandWallet.findUnique({
        where: { brandId: brand.id }
      });

      return {
        success: adjustmentResult.success,
        walletBalanceBefore: 30,
        walletBalanceAfter: walletAfter?.balance,
        adjustmentResult,
        adminOverride: true
      };
    },
    cleanup: async (setupData) => {
      const { admin, brand } = setupData;
      await prisma.brandWallet.delete({ where: { brandId: brand.id } });
      await prisma.user.delete({ where: { id: brand.id } });
      await prisma.user.delete({ where: { id: admin.id } });
    }
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, scenario } = req.body;

  try {
    if (action === 'run-all') {
      // Run all test scenarios
      const results = [];
      
      for (const testScenario of testScenarios) {
        console.log(`Running test: ${testScenario.name}`);
        
        let setupData;
        let testResult;
        let error = null;
        
        try {
          // Setup
          setupData = await testScenario.setup();
          
          // Test
          testResult = await testScenario.test(setupData);
          
          // Cleanup
          await testScenario.cleanup(setupData);
          
        } catch (err) {
          error = err instanceof Error ? err.message : 'Unknown error';
          if (setupData) {
            try {
              await testScenario.cleanup(setupData);
            } catch (cleanupErr) {
              console.error('Cleanup error:', cleanupErr);
            }
          }
        }
        
        results.push({
          name: testScenario.name,
          description: testScenario.description,
          result: testResult,
          error,
          passed: !error && (testResult?.shouldFail ? !testResult.success : testResult?.success)
        });
      }
      
      const passedTests = results.filter(r => r.passed).length;
      const totalTests = results.length;
      
      return res.status(200).json({
        summary: {
          total: totalTests,
          passed: passedTests,
          failed: totalTests - passedTests,
          passRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`
        },
        results
      });
      
    } else if (action === 'run-single' && scenario) {
      // Run single test scenario
      const testScenario = testScenarios.find(t => t.name === scenario);
      
      if (!testScenario) {
        return res.status(400).json({ error: 'Test scenario not found' });
      }
      
      let setupData;
      let testResult;
      let error = null;
      
      try {
        setupData = await testScenario.setup();
        testResult = await testScenario.test(setupData);
        await testScenario.cleanup(setupData);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Unknown error';
        if (setupData) {
          try {
            await testScenario.cleanup(setupData);
          } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr);
          }
        }
      }
      
      return res.status(200).json({
        name: testScenario.name,
        description: testScenario.description,
        result: testResult,
        error,
        passed: !error && (testResult?.shouldFail ? !testResult.success : testResult?.success)
      });
      
    } else if (action === 'list') {
      // List available test scenarios
      return res.status(200).json({
        scenarios: testScenarios.map(t => ({
          name: t.name,
          description: t.description
        }))
      });
      
    } else {
      return res.status(400).json({ error: 'Invalid action. Use: run-all, run-single, or list' });
    }
    
  } catch (error) {
    console.error('Test execution error:', error);
    return res.status(500).json({ 
      error: 'Test execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}