// Enhanced DTDC Service with Wallet Integration
// Combines DTDC API calls with wallet management and transaction logging

import {
  DTDCShipmentRequest,
  DTDCShipmentResponse,
  DTDCTrackingResponse,
  DTDCPincodeCheckRequest,
  DTDCPincodeCheckResponse,
  DTDCCancellationRequest,
  DTDCCancellationResponse,
  generateAWB as dtdcGenerateAWB,
  generateAWBWithLabel as dtdcGenerateAWBWithLabel,
  trackShipment as dtdcTrackShipment,
  trackMultipleShipments as dtdcTrackMultipleShipments,
  checkPincodeServiceability as dtdcCheckPincodeServiceability,
  cancelShipment as dtdcCancelShipment,
  generateShippingLabel as dtdcGenerateShippingLabel
} from './dtdc';

import {
  estimateShipmentCost,
  checkWalletBalance,
  deductFromWallet,
  refundToWallet,
  getWalletBalance,
  ShipmentCostEstimate
} from './wallet';
import { calculateAdvancedPricing, PricingCalculationInput } from './advanced-pricing';
import { 
  extractDTDCCostFromResponse, 
  logBoxMargin, 
  logCustomerOrderMargin,
  MarginCalculationInput 
} from './margin-tracking';

export interface WalletIntegratedShipmentRequest extends DTDCShipmentRequest {
  brand_id: string;
  shipment_id?: string;
}

export interface WalletIntegratedShipmentResponse extends DTDCShipmentResponse {
  cost_estimate?: ShipmentCostEstimate;
  wallet_deducted?: boolean;
  wallet_transaction_id?: string;
  wallet_balance_after?: number;
  insufficient_balance?: boolean;
  wallet_shortfall?: number;
}

// Generate AWB with wallet integration
export async function generateAWBWithWallet(
  request: WalletIntegratedShipmentRequest
): Promise<WalletIntegratedShipmentResponse> {
  const { brand_id, shipment_id, ...dtdcRequest } = request;
  
  try {
    // Step 1: Estimate shipment cost
    const costEstimate = await estimateShipmentCost(
      brand_id,
      request.weight,
      request.pieces
    );
    
    // Step 2: Check wallet balance
    const balanceCheck = await checkWalletBalance(brand_id, costEstimate.total_cost);
    
    if (!balanceCheck.sufficient) {
      return {
        success: false,
        awb_number: '',
        tracking_url: '',
        error: 'Insufficient wallet balance',
        cost_estimate: costEstimate,
        wallet_deducted: false,
        insufficient_balance: true,
        wallet_shortfall: balanceCheck.shortfall,
        label_generated: false
      };
    }
    
    // Step 3: Deduct amount from wallet before API call
    const deductionResult = await deductFromWallet(
      brand_id,
      costEstimate.total_cost,
      `DTDC Shipment - ${request.reference_number || 'Unknown'}`,
      request.reference_number,
      shipment_id
    );
    
    if (!deductionResult.success) {
      return {
        success: false,
        awb_number: '',
        tracking_url: '',
        error: deductionResult.error || 'Wallet deduction failed',
        cost_estimate: costEstimate,
        wallet_deducted: false,
        label_generated: false
      };
    }
    
    // Step 4: Call DTDC API
    const dtdcResponse = await dtdcGenerateAWB(dtdcRequest);
    
    // Step 5: Handle API response
    if (dtdcResponse.success) {
      // Success - keep the deduction
      return {
        ...dtdcResponse,
        cost_estimate: costEstimate,
        wallet_deducted: true,
        wallet_transaction_id: deductionResult.transactionId,
        wallet_balance_after: deductionResult.newBalance
      };
    } else {
      // API failed - refund the amount
      const refundResult = await refundToWallet(
        brand_id,
        costEstimate.total_cost,
        `DTDC API Failed - ${request.reference_number || 'Unknown'}`,
        request.reference_number,
        shipment_id
      );
      
      return {
        ...dtdcResponse,
        cost_estimate: costEstimate,
        wallet_deducted: false,
        wallet_transaction_id: refundResult.transactionId,
        wallet_balance_after: refundResult.newBalance
      };
    }
    
  } catch (error) {
    console.error('Error in generateAWBWithWallet:', error);
    
    return {
      success: false,
      awb_number: '',
      tracking_url: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      label_generated: false
    };
  }
}

// Generate AWB with label and wallet integration
export async function generateAWBWithLabelAndWallet(
  request: WalletIntegratedShipmentRequest
): Promise<WalletIntegratedShipmentResponse> {
  const { brand_id, shipment_id, ...dtdcRequest } = request;
  
  try {
    // Step 1: Estimate shipment cost (including label generation cost)
    const costEstimate = await estimateShipmentCost(
      brand_id,
      request.weight,
      request.pieces
    );
    
    // Add label generation cost (₹10 per label)
    const labelCost = 10;
    const totalCost = costEstimate.total_cost + labelCost;
    
    // Step 2: Check wallet balance
    const balanceCheck = await checkWalletBalance(brand_id, totalCost);
    
    if (!balanceCheck.sufficient) {
      return {
        success: false,
        awb_number: '',
        tracking_url: '',
        error: 'Insufficient wallet balance',
        cost_estimate: {
          ...costEstimate,
          total_cost: totalCost
        },
        wallet_deducted: false,
        insufficient_balance: true,
        wallet_shortfall: balanceCheck.shortfall,
        label_generated: false
      };
    }
    
    // Step 3: Deduct amount from wallet before API call
    const deductionResult = await deductFromWallet(
      brand_id,
      totalCost,
      `DTDC Shipment + Label - ${request.reference_number || 'Unknown'}`,
      request.reference_number,
      shipment_id
    );
    
    if (!deductionResult.success) {
      return {
        success: false,
        awb_number: '',
        tracking_url: '',
        error: deductionResult.error || 'Wallet deduction failed',
        cost_estimate: {
          ...costEstimate,
          total_cost: totalCost
        },
        wallet_deducted: false,
        label_generated: false
      };
    }
    
    // Step 4: Call DTDC API with label generation
    const dtdcResponse = await dtdcGenerateAWBWithLabel(dtdcRequest);
    
    // Step 5: Handle API response
    if (dtdcResponse.success) {
      // Success - keep the deduction
      return {
        ...dtdcResponse,
        cost_estimate: {
          ...costEstimate,
          total_cost: totalCost
        },
        wallet_deducted: true,
        wallet_transaction_id: deductionResult.transactionId,
        wallet_balance_after: deductionResult.newBalance
      };
    } else {
      // API failed - refund the amount
      const refundResult = await refundToWallet(
        brand_id,
        totalCost,
        `DTDC API Failed - ${request.reference_number || 'Unknown'}`,
        request.reference_number,
        shipment_id
      );
      
      return {
        ...dtdcResponse,
        cost_estimate: {
          ...costEstimate,
          total_cost: totalCost
        },
        wallet_deducted: false,
        wallet_transaction_id: refundResult.transactionId,
        wallet_balance_after: refundResult.newBalance
      };
    }
    
  } catch (error) {
    console.error('Error in generateAWBWithLabelAndWallet:', error);
    
    return {
      success: false,
      awb_number: '',
      tracking_url: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      label_generated: false
    };
  }
}

// Batch AWB generation with wallet integration
export async function generateMultipleAWBsWithWallet(
  requests: WalletIntegratedShipmentRequest[]
): Promise<WalletIntegratedShipmentResponse[]> {
  const results: WalletIntegratedShipmentResponse[] = [];
  
  // Group requests by brand_id for efficient wallet operations
  const requestsByBrand = requests.reduce((acc, request) => {
    if (!acc[request.brand_id]) {
      acc[request.brand_id] = [];
    }
    acc[request.brand_id].push(request);
    return acc;
  }, {} as Record<string, WalletIntegratedShipmentRequest[]>);
  
  // Process each brand's requests
  for (const [brandId, brandRequests] of Object.entries(requestsByBrand)) {
    // Calculate total cost for all requests from this brand
    let totalCost = 0;
    const costEstimates: ShipmentCostEstimate[] = [];
    
    for (const request of brandRequests) {
      const estimate = await estimateShipmentCost(brandId, request.weight, request.pieces);
      costEstimates.push(estimate);
      totalCost += estimate.total_cost;
    }
    
    // Check wallet balance for total cost
    const balanceCheck = await checkWalletBalance(brandId, totalCost);
    
    if (!balanceCheck.sufficient) {
      // Add failed responses for all requests from this brand
      brandRequests.forEach((request, index) => {
        results.push({
          success: false,
          awb_number: '',
          tracking_url: '',
          error: 'Insufficient wallet balance',
          cost_estimate: costEstimates[index],
          wallet_deducted: false,
          insufficient_balance: true,
          wallet_shortfall: balanceCheck.shortfall,
          label_generated: false
        });
      });
      continue;
    }
    
    // Deduct total amount from wallet
    const deductionResult = await deductFromWallet(
      brandId,
      totalCost,
      `Batch DTDC Shipments (${brandRequests.length} shipments)`,
      `BATCH-${Date.now()}`,
      undefined
    );
    
    if (!deductionResult.success) {
      // Add failed responses for all requests from this brand
      brandRequests.forEach((request, index) => {
        results.push({
          success: false,
          awb_number: '',
          tracking_url: '',
          error: deductionResult.error || 'Wallet deduction failed',
          cost_estimate: costEstimates[index],
          wallet_deducted: false,
          label_generated: false
        });
      });
      continue;
    }
    
    // Process individual requests
    let successfulCost = 0;
    let failedCost = 0;
    
    for (let i = 0; i < brandRequests.length; i++) {
      const request = brandRequests[i];
      const { brand_id, shipment_id, ...dtdcRequest } = request;
      
      try {
        const dtdcResponse = await dtdcGenerateAWB(dtdcRequest);
        
        if (dtdcResponse.success) {
          successfulCost += costEstimates[i].total_cost;
          results.push({
            ...dtdcResponse,
            cost_estimate: costEstimates[i],
            wallet_deducted: true,
            wallet_transaction_id: deductionResult.transactionId,
            wallet_balance_after: deductionResult.newBalance
          });
        } else {
          failedCost += costEstimates[i].total_cost;
          results.push({
            ...dtdcResponse,
            cost_estimate: costEstimates[i],
            wallet_deducted: false
          });
        }
        
        // Add delay between requests to respect rate limits
        if (i < brandRequests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        failedCost += costEstimates[i].total_cost;
        results.push({
          success: false,
          awb_number: '',
          tracking_url: '',
          error: error instanceof Error ? error.message : 'Unknown error',
          cost_estimate: costEstimates[i],
          wallet_deducted: false,
          label_generated: false
        });
      }
    }
    
    // Refund failed costs
    if (failedCost > 0) {
      await refundToWallet(
        brandId,
        failedCost,
        `Batch DTDC Refund - Failed shipments`,
        `BATCH-REFUND-${Date.now()}`,
        undefined
      );
    }
  }
  
  return results;
}

// Wrapper functions that maintain the original API but add wallet integration
export async function trackShipment(awbNumber: string): Promise<DTDCTrackingResponse> {
  return dtdcTrackShipment(awbNumber);
}

export async function trackMultipleShipments(awbNumbers: string[]): Promise<DTDCTrackingResponse[]> {
  return dtdcTrackMultipleShipments(awbNumbers);
}

export async function checkPincodeServiceability(request: DTDCPincodeCheckRequest): Promise<DTDCPincodeCheckResponse> {
  return dtdcCheckPincodeServiceability(request);
}

export async function cancelShipment(request: DTDCCancellationRequest): Promise<DTDCCancellationResponse> {
  return dtdcCancelShipment(request);
}

export async function generateShippingLabel(awbNumber: string): Promise<{
  success: boolean;
  label_url?: string;
  error?: string;
}> {
  return dtdcGenerateShippingLabel(awbNumber);
}

// Utility function to get shipment cost estimate
export async function getShipmentCostEstimate(
  brandId: string,
  weight: number,
  pieces: number = 1
): Promise<ShipmentCostEstimate> {
  return estimateShipmentCost(brandId, weight, pieces);
}

// Utility function to check if brand can afford shipment
export async function canAffordShipment(
  brandId: string,
  weight: number,
  pieces: number = 1
): Promise<{
  canAfford: boolean;
  currentBalance: number;
  estimatedCost: number;
  shortfall?: number;
}> {
  const costEstimate = await estimateShipmentCost(brandId, weight, pieces);
  const balanceCheck = await checkWalletBalance(brandId, costEstimate.total_cost);
  
  return {
    canAfford: balanceCheck.sufficient,
    currentBalance: balanceCheck.currentBalance,
    estimatedCost: costEstimate.total_cost,
    shortfall: balanceCheck.shortfall
  };
}

// Advanced pricing functions

// Generate AWB with advanced pricing and wallet integration
export async function generateAWBWithAdvancedPricing(
  request: WalletIntegratedShipmentRequest & {
    role: string;
    pincode: string;
    serviceType?: string;
  }
): Promise<WalletIntegratedShipmentResponse & {
  pricing_breakdown?: any;
  applied_rules?: string[];
}> {
  const { brand_id, shipment_id, role, pincode, serviceType, ...dtdcRequest } = request;
  
  try {
    // Step 1: Calculate advanced pricing
    const pricingResult = await calculateAdvancedPricing({
      brandId: brand_id,
      role,
      weight: request.weight,
      pincode,
      numBoxes: request.pieces || 1,
      serviceType
    });
    
    if (!pricingResult.success) {
      return {
        success: false,
        awb_number: '',
        tracking_url: '',
        error: pricingResult.error || 'Pricing calculation failed',
        label_generated: false
      };
    }
    
    const totalCost = pricingResult.price;
    
    // Step 2: Check wallet balance
    const balanceCheck = await checkWalletBalance(brand_id, totalCost);
    
    if (!balanceCheck.sufficient) {
      return {
        success: false,
        awb_number: '',
        tracking_url: '',
        error: 'Insufficient wallet balance',
        wallet_deducted: false,
        insufficient_balance: true,
        wallet_shortfall: balanceCheck.shortfall,
        label_generated: false,
        pricing_breakdown: pricingResult.breakdown,
        applied_rules: pricingResult.breakdown.appliedRules
      };
    }
    
    // Step 3: Deduct amount from wallet before API call
    const deductionResult = await deductFromWallet(
      brand_id,
      totalCost,
      `DTDC Shipment (Advanced Pricing) - ${request.reference_number || 'Unknown'}`,
      request.reference_number,
      shipment_id
    );
    
    if (!deductionResult.success) {
      return {
        success: false,
        awb_number: '',
        tracking_url: '',
        error: deductionResult.error || 'Wallet deduction failed',
        wallet_deducted: false,
        label_generated: false,
        pricing_breakdown: pricingResult.breakdown,
        applied_rules: pricingResult.breakdown.appliedRules
      };
    }
    
    // Step 4: Call DTDC API
    const dtdcResponse = await dtdcGenerateAWB(dtdcRequest);
    
    // Step 5: Handle API response
    if (dtdcResponse.success) {
      // Success - keep the deduction
      return {
        ...dtdcResponse,
        wallet_deducted: true,
        wallet_transaction_id: deductionResult.transactionId,
        wallet_balance_after: deductionResult.newBalance,
        pricing_breakdown: pricingResult.breakdown,
        applied_rules: pricingResult.breakdown.appliedRules
      };
    } else {
      // API failed - refund the amount
      const refundResult = await refundToWallet(
        brand_id,
        totalCost,
        `DTDC API Failed (Advanced Pricing) - ${request.reference_number || 'Unknown'}`,
        request.reference_number,
        shipment_id
      );
      
      return {
        ...dtdcResponse,
        wallet_deducted: false,
        wallet_transaction_id: refundResult.transactionId,
        wallet_balance_after: refundResult.newBalance,
        pricing_breakdown: pricingResult.breakdown,
        applied_rules: pricingResult.breakdown.appliedRules
      };
    }
    
  } catch (error) {
    console.error('Error in generateAWBWithAdvancedPricing:', error);
    
    return {
      success: false,
      awb_number: '',
      tracking_url: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      label_generated: false
    };
  }
}

// Get advanced pricing estimate
export async function getAdvancedPricingEstimate(
  brandId: string,
  role: string,
  weight: number,
  pincode: string,
  numBoxes: number = 1,
  serviceType?: string
): Promise<{
  success: boolean;
  price?: number;
  breakdown?: any;
  appliedRules?: string[];
  error?: string;
}> {
  try {
    const result = await calculateAdvancedPricing({
      brandId,
      role,
      weight,
      pincode,
      numBoxes,
      serviceType
    });
    
    return {
      success: result.success,
      price: result.price,
      breakdown: result.breakdown,
      appliedRules: result.breakdown.appliedRules,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Check affordability with advanced pricing
export async function canAffordAdvancedPricing(
  brandId: string,
  role: string,
  weight: number,
  pincode: string,
  numBoxes: number = 1,
  serviceType?: string
): Promise<{
  canAfford: boolean;
  currentBalance: number;
  estimatedCost: number;
  shortfall?: number;
  breakdown?: any;
  appliedRules?: string[];
}> {
  try {
    const pricingResult = await calculateAdvancedPricing({
      brandId,
      role,
      weight,
      pincode,
      numBoxes,
      serviceType
    });
    
    if (!pricingResult.success) {
      return {
        canAfford: false,
        currentBalance: 0,
        estimatedCost: 0,
        breakdown: pricingResult.breakdown,
        appliedRules: pricingResult.breakdown.appliedRules
      };
    }
    
    const balanceCheck = await checkWalletBalance(brandId, pricingResult.price);
    
    return {
      canAfford: balanceCheck.sufficient,
      currentBalance: balanceCheck.currentBalance,
      estimatedCost: pricingResult.price,
      shortfall: balanceCheck.shortfall,
      breakdown: pricingResult.breakdown,
      appliedRules: pricingResult.breakdown.appliedRules
    };
  } catch (error) {
    return {
      canAfford: false,
      currentBalance: 0,
      estimatedCost: 0
    };
  }
}

// Get wallet balance (re-export for convenience)
export { getWalletBalance } from './wallet';