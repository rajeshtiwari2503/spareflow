import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import {
  getUnifiedPricingConfig,
  updateUnifiedPricingConfig,
  getBrandsWithPricingOverrides,
  setBrandPricingOverride,
  removeBrandPricingOverride,
  calculateUnifiedPricing,
  migratePricingData,
  createCourierTransaction,
  deductWalletAmount,
  checkWalletBalance,
  getCourierTransactions,
  UnifiedPricingConfig
} from '@/lib/unified-pricing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const user = await verifyToken(req);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(401).json({ error: 'Access denied' });
    }

    if (req.method === 'GET') {
      const { action } = req.query;

      switch (action) {
        case 'config':
          const config = await getUnifiedPricingConfig();
          return res.status(200).json({ success: true, config });

        case 'brand-overrides':
          const overrides = await getBrandsWithPricingOverrides();
          return res.status(200).json({ success: true, overrides });

        case 'transactions':
          const { 
            userId, 
            courierType, 
            status, 
            dateFrom, 
            dateTo, 
            limit, 
            offset 
          } = req.query;
          
          const transactionFilters = {
            userId: userId as string,
            courierType: courierType as 'FORWARD' | 'REVERSE',
            status: status as string,
            dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
            dateTo: dateTo ? new Date(dateTo as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
            offset: offset ? parseInt(offset as string) : undefined
          };

          const transactionResult = await getCourierTransactions(transactionFilters);
          return res.status(200).json(transactionResult);

        case 'calculate':
          const { 
            brandId, 
            weight, 
            pieces, 
            pincode, 
            serviceType, 
            courierType: calcCourierType,
            returnReason,
            direction 
          } = req.query;
          
          if (!brandId || !weight || !pieces) {
            return res.status(400).json({ error: 'brandId, weight, and pieces are required' });
          }

          const calculation = await calculateUnifiedPricing({
            brandId: brandId as string,
            weight: parseFloat(weight as string),
            pieces: parseInt(pieces as string),
            pincode: pincode as string,
            serviceType: (serviceType as 'STANDARD' | 'EXPRESS') || 'STANDARD',
            courierType: (calcCourierType as 'FORWARD' | 'REVERSE') || 'FORWARD',
            returnReason: returnReason as 'DEFECTIVE' | 'WRONG_PART' | 'EXCESS_STOCK' | 'CUSTOMER_RETURN',
            direction: direction as string
          });

          return res.status(200).json(calculation);

        case 'wallet-balance':
          const { checkUserId, estimatedCost } = req.query;
          
          if (!checkUserId || !estimatedCost) {
            return res.status(400).json({ error: 'userId and estimatedCost are required' });
          }

          const balanceCheck = await checkWalletBalance(
            checkUserId as string, 
            parseFloat(estimatedCost as string)
          );
          
          return res.status(200).json({ success: true, ...balanceCheck });

        default:
          // Return overview data
          const [configData, overridesData] = await Promise.all([
            getUnifiedPricingConfig(),
            getBrandsWithPricingOverrides()
          ]);

          return res.status(200).json({
            success: true,
            config: configData,
            overrides: overridesData,
            summary: {
              totalBrandsWithOverrides: overridesData.length,
              activeBrandsWithOverrides: overridesData.filter(o => o.isActive).length,
              forwardDefaultRate: configData.defaultRate,
              reverseDefaultRate: configData.reverseDefaultRate,
              defectivePartRate: configData.defectivePartRate,
              excessStockRate: configData.excessStockRate
            }
          });
      }

    } else if (req.method === 'POST') {
      const { action, ...data } = req.body;

      switch (action) {
        case 'updateConfig':
          const { config } = data;
          if (!config) {
            return res.status(400).json({ error: 'Config data is required' });
          }

          const updateResult = await updateUnifiedPricingConfig(config);
          if (updateResult.success) {
            return res.status(200).json({
              success: true,
              message: 'Unified pricing configuration updated successfully'
            });
          } else {
            return res.status(500).json({
              success: false,
              error: updateResult.error
            });
          }

        case 'setBrandOverride':
          const { brandId, perBoxRate, isActive } = data;
          
          if (!brandId || !perBoxRate) {
            return res.status(400).json({ error: 'brandId and perBoxRate are required' });
          }

          const setResult = await setBrandPricingOverride(
            brandId,
            parseFloat(perBoxRate),
            isActive !== undefined ? isActive : true
          );

          if (setResult.success) {
            return res.status(200).json({
              success: true,
              message: 'Brand pricing override set successfully'
            });
          } else {
            return res.status(500).json({
              success: false,
              error: setResult.error
            });
          }

        case 'removeBrandOverride':
          const { brandId: removeBrandId } = data;
          
          if (!removeBrandId) {
            return res.status(400).json({ error: 'brandId is required' });
          }

          const removeResult = await removeBrandPricingOverride(removeBrandId);
          
          if (removeResult.success) {
            return res.status(200).json({
              success: true,
              message: 'Brand pricing override removed successfully'
            });
          } else {
            return res.status(500).json({
              success: false,
              error: removeResult.error
            });
          }

        case 'migrate':
          const migrationResult = await migratePricingData();
          
          if (migrationResult.success) {
            return res.status(200).json({
              success: true,
              message: `Migration completed successfully. ${migrationResult.migrated} settings migrated.`,
              migrated: migrationResult.migrated
            });
          } else {
            return res.status(500).json({
              success: false,
              error: migrationResult.error
            });
          }

        case 'calculate':
          const calcData = data;
          
          if (!calcData.brandId || !calcData.weight || !calcData.pieces) {
            return res.status(400).json({ error: 'brandId, weight, and pieces are required' });
          }

          const calcResult = await calculateUnifiedPricing({
            brandId: calcData.brandId,
            weight: parseFloat(calcData.weight),
            pieces: parseInt(calcData.pieces),
            pincode: calcData.pincode,
            serviceType: calcData.serviceType || 'STANDARD',
            courierType: calcData.courierType || 'FORWARD',
            returnReason: calcData.returnReason,
            direction: calcData.direction
          });

          return res.status(200).json(calcResult);

        case 'createTransaction':
          const transactionData = data;
          
          if (!transactionData.userId || !transactionData.totalCost) {
            return res.status(400).json({ error: 'userId and totalCost are required' });
          }

          const transactionResult = await createCourierTransaction(transactionData);
          
          if (transactionResult.success) {
            return res.status(200).json({
              success: true,
              message: 'Courier transaction created successfully',
              transactionId: transactionResult.transactionId
            });
          } else {
            return res.status(500).json({
              success: false,
              error: transactionResult.error
            });
          }

        case 'deductWallet':
          const { userId, amount, reason, assignedBy, reference } = data;
          
          if (!userId || !amount || !reason) {
            return res.status(400).json({ error: 'userId, amount, and reason are required' });
          }

          const deductionResult = await deductWalletAmount(
            userId,
            parseFloat(amount),
            reason,
            assignedBy || 'system',
            reference
          );
          
          if (deductionResult.success) {
            return res.status(200).json({
              success: true,
              message: 'Wallet amount deducted successfully',
              newBalance: deductionResult.newBalance
            });
          } else {
            return res.status(500).json({
              success: false,
              error: deductionResult.error
            });
          }

        case 'processReverseShipment':
          const { 
            serviceCenterId, 
            brandId: reverseBrandId, 
            partId, 
            quantity, 
            returnReason: processReturnReason,
            weight: reverseWeight,
            originPincode,
            destinationPincode,
            originAddress,
            destinationAddress
          } = data;

          if (!serviceCenterId || !reverseBrandId || !partId || !quantity || !processReturnReason) {
            return res.status(400).json({ 
              error: 'serviceCenterId, brandId, partId, quantity, and returnReason are required' 
            });
          }

          // Calculate reverse courier cost
          const reversePricing = await calculateUnifiedPricing({
            brandId: reverseBrandId,
            weight: parseFloat(reverseWeight) || 1.0,
            pieces: parseInt(quantity),
            pincode: destinationPincode,
            serviceType: 'STANDARD',
            courierType: 'REVERSE',
            returnReason: processReturnReason,
            direction: 'SERVICE_CENTER_TO_BRAND'
          });

          if (!reversePricing.success) {
            return res.status(500).json({
              success: false,
              error: 'Failed to calculate reverse courier cost'
            });
          }

          // Determine who pays based on cost responsibility
          let payerId = serviceCenterId; // Default to service center
          if (reversePricing.costResponsibility === 'BRAND') {
            payerId = reverseBrandId;
          }

          // Check wallet balance
          const walletCheck = await checkWalletBalance(payerId, reversePricing.totalCost);
          if (!walletCheck.sufficient) {
            return res.status(400).json({
              success: false,
              error: `Insufficient wallet balance. Required: ₹${reversePricing.totalCost}, Available: ₹${walletCheck.currentBalance}`
            });
          }

          // Create courier transaction
          const reverseTransactionResult = await createCourierTransaction({
            userId: serviceCenterId,
            payerId: payerId,
            courierType: 'REVERSE',
            serviceType: 'STANDARD',
            direction: 'SERVICE_CENTER_TO_BRAND',
            weight: parseFloat(reverseWeight) || 1.0,
            pieces: parseInt(quantity),
            originPincode,
            destinationPincode,
            originAddress,
            destinationAddress,
            baseRate: reversePricing.breakdown.baseRate,
            weightCharges: reversePricing.breakdown.weightCharges,
            serviceCharges: reversePricing.breakdown.serviceCharges,
            remoteAreaSurcharge: reversePricing.breakdown.remoteAreaSurcharge,
            platformMarkup: reversePricing.breakdown.platformMarkup,
            totalCost: reversePricing.totalCost,
            costResponsibility: reversePricing.costResponsibility,
            returnReason: processReturnReason,
            referenceType: 'RETURN_REQUEST',
            referenceId: partId,
            notes: `Reverse shipment for ${processReturnReason} - ${quantity} pieces`
          });

          if (!reverseTransactionResult.success) {
            return res.status(500).json({
              success: false,
              error: 'Failed to create courier transaction'
            });
          }

          // Deduct from wallet
          const walletDeductionResult = await deductWalletAmount(
            payerId,
            reversePricing.totalCost,
            `Reverse courier cost - ${processReturnReason}`,
            'system',
            reverseTransactionResult.transactionId
          );

          if (!walletDeductionResult.success) {
            return res.status(500).json({
              success: false,
              error: 'Failed to deduct wallet amount'
            });
          }

          return res.status(200).json({
            success: true,
            message: 'Reverse shipment processed successfully',
            transactionId: reverseTransactionResult.transactionId,
            totalCost: reversePricing.totalCost,
            costResponsibility: reversePricing.costResponsibility,
            newBalance: walletDeductionResult.newBalance
          });

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }

  } catch (error) {
    console.error('Error in unified pricing API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}