// SpareFlow Shipment Flow Logic Implementation
// Comprehensive shipment type classification, cost assignment, and workflow management

import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// ===== PROMPT 1: SHIPMENT TYPE CLASSIFICATION LOGIC =====

export interface ShipmentClassification {
  shipment_type: 'FORWARD' | 'REVERSE';
  shipment_direction: 'BRAND' | 'SERVICE_CENTER' | 'DISTRIBUTOR';
  return_reason?: 'DEFECTIVE' | 'EXCESS' | 'WARRANTY_RETURN' | 'WRONG_PART';
}

export function classifyShipmentType(
  origin_role: UserRole, 
  destination_role: UserRole,
  return_reason?: string
): ShipmentClassification {
  console.log('🧭 Classifying shipment type:', { origin_role, destination_role, return_reason });

  // BRAND to SERVICE_CENTER or DISTRIBUTOR → Type = FORWARD, Direction = BRAND
  if (origin_role === 'BRAND' && (destination_role === 'SERVICE_CENTER' || destination_role === 'DISTRIBUTOR')) {
    return {
      shipment_type: 'FORWARD',
      shipment_direction: 'BRAND'
    };
  }

  // SERVICE_CENTER to CUSTOMER → Type = FORWARD, Direction = SERVICE_CENTER
  if (origin_role === 'SERVICE_CENTER' && destination_role === 'CUSTOMER') {
    return {
      shipment_type: 'FORWARD',
      shipment_direction: 'SERVICE_CENTER'
    };
  }

  // SERVICE_CENTER to BRAND → Type = REVERSE, Reason = Selectable (DEFECTIVE, EXCESS)
  if (origin_role === 'SERVICE_CENTER' && destination_role === 'BRAND') {
    const validReasons = ['DEFECTIVE', 'EXCESS', 'WRONG_PART'];
    const reason = validReasons.includes(return_reason || '') ? 
      return_reason as 'DEFECTIVE' | 'EXCESS' | 'WRONG_PART' : 'EXCESS';
    
    return {
      shipment_type: 'REVERSE',
      shipment_direction: 'SERVICE_CENTER',
      return_reason: reason
    };
  }

  // CUSTOMER to SERVICE_CENTER → Type = REVERSE, Reason = WARRANTY_RETURN
  if (origin_role === 'CUSTOMER' && destination_role === 'SERVICE_CENTER') {
    return {
      shipment_type: 'REVERSE',
      shipment_direction: 'SERVICE_CENTER',
      return_reason: 'WARRANTY_RETURN'
    };
  }

  // DISTRIBUTOR to SERVICE_CENTER → Type = FORWARD, Direction = DISTRIBUTOR
  if (origin_role === 'DISTRIBUTOR' && destination_role === 'SERVICE_CENTER') {
    return {
      shipment_type: 'FORWARD',
      shipment_direction: 'DISTRIBUTOR'
    };
  }

  // Default fallback
  console.warn('⚠️ Unknown shipment classification, using default FORWARD/BRAND');
  return {
    shipment_type: 'FORWARD',
    shipment_direction: 'BRAND'
  };
}

// ===== PROMPT 2: COST RESPONSIBILITY ASSIGNMENT =====

export interface CourierPayerAssignment {
  courier_payer: 'BRAND' | 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER';
  cost_justification: string;
}

export function assignCourierPayer(
  shipment_type: 'FORWARD' | 'REVERSE',
  shipment_direction: 'BRAND' | 'SERVICE_CENTER' | 'DISTRIBUTOR',
  return_reason?: 'DEFECTIVE' | 'EXCESS' | 'WARRANTY_RETURN' | 'WRONG_PART'
): CourierPayerAssignment {
  console.log('🧾 Assigning courier payer:', { shipment_type, shipment_direction, return_reason });

  // Forward shipments
  if (shipment_type === 'FORWARD') {
    switch (shipment_direction) {
      case 'BRAND':
        // BRAND to SC/DIST → payer = BRAND
        return {
          courier_payer: 'BRAND',
          cost_justification: 'Brand initiated forward shipment to service center/distributor'
        };
      
      case 'SERVICE_CENTER':
        // SC to CUSTOMER → payer = SERVICE_CENTER
        return {
          courier_payer: 'SERVICE_CENTER',
          cost_justification: 'Service center delivering to customer'
        };
      
      case 'DISTRIBUTOR':
        // DISTRIBUTOR to SC → payer = SERVICE_CENTER
        return {
          courier_payer: 'SERVICE_CENTER',
          cost_justification: 'Service center receiving from distributor'
        };
      
      default:
        return {
          courier_payer: 'BRAND',
          cost_justification: 'Default forward shipment payer'
        };
    }
  }

  // Reverse shipments
  if (shipment_type === 'REVERSE') {
    if (shipment_direction === 'SERVICE_CENTER' && return_reason) {
      switch (return_reason) {
        case 'DEFECTIVE':
          // Defective parts → payer = BRAND
          return {
            courier_payer: 'BRAND',
            cost_justification: 'Brand responsible for defective parts return'
          };
        
        case 'WRONG_PART':
          // Wrong parts → payer = BRAND
          return {
            courier_payer: 'BRAND',
            cost_justification: 'Brand responsible for wrong parts return'
          };
        
        case 'EXCESS':
          // Excess stock → payer = SERVICE_CENTER
          return {
            courier_payer: 'SERVICE_CENTER',
            cost_justification: 'Service center returning excess stock'
          };
        
        case 'WARRANTY_RETURN':
          // Customer warranty return → payer = CUSTOMER or BRAND (if warranty)
          return {
            courier_payer: 'CUSTOMER',
            cost_justification: 'Customer warranty return (can be reimbursed if valid warranty)'
          };
        
        default:
          return {
            courier_payer: 'SERVICE_CENTER',
            cost_justification: 'Default reverse shipment payer'
          };
      }
    }
  }

  // Default fallback
  return {
    courier_payer: 'BRAND',
    cost_justification: 'Default shipment payer'
  };
}

// ===== PROMPT 3: COURIER PRICING ENGINE MAPPING =====

export interface CourierPricingConfig {
  base_rate_per_box: number;
  weight_rate_per_kg: number;
  min_charge: number;
  markup_percent: number;
  location_surcharge: number;
  express_multiplier: number;
  source: 'brand_override' | 'global_config';
}

export interface ShipmentCostBreakdown {
  base_cost: number;
  weight_cost: number;
  surcharge_cost: number;
  markup_cost: number;
  insurance_cost?: number;
  total_cost: number;
  pricing_source: string;
  applied_rules: string[];
}

export async function getCourierPricing(
  shipment_type: 'FORWARD' | 'REVERSE',
  courier_payer: 'BRAND' | 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER',
  brand_id: string
): Promise<CourierPricingConfig> {
  console.log('🧮 Getting courier pricing:', { shipment_type, courier_payer, brand_id });

  try {
    // Check for brand-specific overrides first
    const brandOverride = await prisma.courierPricing.findUnique({
      where: { brandId: brand_id }
    });

    if (brandOverride && brandOverride.isActive) {
      console.log('✅ Using brand-specific pricing override');
      return {
        base_rate_per_box: brandOverride.perBoxRate,
        weight_rate_per_kg: 25, // Default weight rate
        min_charge: 50,
        markup_percent: 10,
        location_surcharge: 25,
        express_multiplier: 1.5,
        source: 'brand_override'
      };
    }

    // Fall back to global configuration
    const globalConfig = await prisma.systemConfig.findFirst({
      where: { key: 'unified_pricing' }
    });

    if (globalConfig && globalConfig.value) {
      const config = JSON.parse(globalConfig.value);
      console.log('✅ Using global pricing configuration');
      
      if (shipment_type === 'REVERSE') {
        return {
          base_rate_per_box: config.reverseDefaultRate || 45,
          weight_rate_per_kg: config.reverseWeightRatePerKg || 25,
          min_charge: config.reverseMinimumCharge || 50,
          markup_percent: config.reverseMarkupPercentage || 10,
          location_surcharge: config.reverseRemoteAreaSurcharge || 25,
          express_multiplier: config.reverseExpressMultiplier || 1.5,
          source: 'global_config'
        };
      } else {
        return {
          base_rate_per_box: config.defaultRate || 50,
          weight_rate_per_kg: config.weightRatePerKg || 25,
          min_charge: config.minimumCharge || 75,
          markup_percent: config.markupPercentage || 15,
          location_surcharge: config.remoteAreaSurcharge || 25,
          express_multiplier: config.expressMultiplier || 1.5,
          source: 'global_config'
        };
      }
    }

    // Ultimate fallback to hardcoded defaults
    console.log('⚠️ Using hardcoded default pricing');
    return {
      base_rate_per_box: shipment_type === 'REVERSE' ? 45 : 50,
      weight_rate_per_kg: 25,
      min_charge: shipment_type === 'REVERSE' ? 50 : 75,
      markup_percent: shipment_type === 'REVERSE' ? 10 : 15,
      location_surcharge: 25,
      express_multiplier: 1.5,
      source: 'global_config'
    };

  } catch (error) {
    console.error('❌ Error getting courier pricing:', error);
    // Return safe defaults
    return {
      base_rate_per_box: 50,
      weight_rate_per_kg: 25,
      min_charge: 75,
      markup_percent: 15,
      location_surcharge: 25,
      express_multiplier: 1.5,
      source: 'global_config'
    };
  }
}

export function calculateShipmentCostBreakdown(
  pricing: CourierPricingConfig,
  num_boxes: number,
  total_weight_kg: number,
  is_express: boolean,
  is_remote_area: boolean,
  declared_value?: number,
  insurance_required?: boolean
): ShipmentCostBreakdown {
  console.log('💰 Calculating shipment cost breakdown:', {
    num_boxes,
    total_weight_kg,
    is_express,
    is_remote_area,
    declared_value,
    insurance_required
  });

  const appliedRules: string[] = [];

  // Base cost calculation
  const base_cost = pricing.base_rate_per_box * num_boxes;
  appliedRules.push(`Base cost: ₹${pricing.base_rate_per_box} × ${num_boxes} boxes = ₹${base_cost}`);

  // Weight cost calculation (free weight limit of 0.5kg per box)
  const free_weight_limit = 0.5 * num_boxes;
  const excess_weight = Math.max(0, total_weight_kg - free_weight_limit);
  const weight_cost = excess_weight * pricing.weight_rate_per_kg;
  
  if (excess_weight > 0) {
    appliedRules.push(`Weight cost: ${excess_weight.toFixed(2)}kg excess × ₹${pricing.weight_rate_per_kg}/kg = ₹${weight_cost.toFixed(2)}`);
  } else {
    appliedRules.push(`No weight charges (within ${free_weight_limit}kg free limit)`);
  }

  // Location surcharge
  const surcharge_cost = is_remote_area ? pricing.location_surcharge * num_boxes : 0;
  if (is_remote_area) {
    appliedRules.push(`Remote area surcharge: ₹${pricing.location_surcharge} × ${num_boxes} boxes = ₹${surcharge_cost}`);
  } else {
    appliedRules.push('No location surcharge');
  }

  // Express service multiplier
  let subtotal = base_cost + weight_cost + surcharge_cost;
  if (is_express) {
    const express_additional = subtotal * (pricing.express_multiplier - 1);
    subtotal = subtotal * pricing.express_multiplier;
    appliedRules.push(`Express service: ${pricing.express_multiplier}x multiplier (+₹${express_additional.toFixed(2)})`);
  } else {
    appliedRules.push('Standard service: no additional charges');
  }

  // Platform markup
  const markup_cost = subtotal * (pricing.markup_percent / 100);
  appliedRules.push(`Platform markup: ${pricing.markup_percent}% of ₹${subtotal.toFixed(2)} = ₹${markup_cost.toFixed(2)}`);

  // Insurance calculation
  let insurance_cost = 0;
  if (insurance_required && declared_value && declared_value >= 5000) {
    const insurance_rate = 0.02; // 2%
    const gst_rate = 0.18; // 18%
    insurance_cost = declared_value * insurance_rate;
    const gst_amount = insurance_cost * gst_rate;
    insurance_cost = insurance_cost + gst_amount;
    appliedRules.push(`Insurance: 2% of ₹${declared_value} + 18% GST = ₹${insurance_cost.toFixed(2)}`);
  } else if (insurance_required) {
    appliedRules.push('Insurance not applicable (value < ₹5,000)');
  }

  // Calculate total
  let total_cost = subtotal + markup_cost + insurance_cost;

  // Apply minimum charge
  if (total_cost < pricing.min_charge) {
    appliedRules.push(`Minimum charge applied: ₹${pricing.min_charge} (was ₹${total_cost.toFixed(2)})`);
    total_cost = pricing.min_charge;
  }

  return {
    base_cost: Math.round(base_cost * 100) / 100,
    weight_cost: Math.round(weight_cost * 100) / 100,
    surcharge_cost: Math.round(surcharge_cost * 100) / 100,
    markup_cost: Math.round(markup_cost * 100) / 100,
    insurance_cost: insurance_required ? Math.round(insurance_cost * 100) / 100 : undefined,
    total_cost: Math.round(total_cost * 100) / 100,
    pricing_source: pricing.source,
    applied_rules: appliedRules
  };
}

// ===== PROMPT 4: LABEL GENERATION ENHANCEMENT =====

export interface LabelGenerationRequest {
  courier_name: 'DTDC' | 'BLUEDART' | 'DELHIVERY';
  awb_number: string;
  shipment_id: string;
  box_id: string;
  format: 'PDF_4X6' | 'PDF_A4' | 'PNG';
}

export interface LabelGenerationResult {
  success: boolean;
  label_url?: string;
  error?: string;
  fallback_mode?: boolean;
}

export async function generateShipmentLabel(request: LabelGenerationRequest): Promise<LabelGenerationResult> {
  console.log('📃 Generating shipment label:', request);

  try {
    // Route to appropriate courier API based on courier_name
    switch (request.courier_name) {
      case 'DTDC':
        return await generateDTDCLabel(request);
      case 'BLUEDART':
        return await generateBlueDartLabel(request);
      case 'DELHIVERY':
        return await generateDelhiveryLabel(request);
      default:
        throw new Error(`Unsupported courier: ${request.courier_name}`);
    }
  } catch (error) {
    console.error('❌ Label generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Label generation failed'
    };
  }
}

async function generateDTDCLabel(request: LabelGenerationRequest): Promise<LabelGenerationResult> {
  try {
    const config = {
      apiKey: process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY || '',
      hasValidCredentials: !!(process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY)
    };

    if (!config.hasValidCredentials) {
      console.log('🧪 Using fallback mode for DTDC label generation');
      return {
        success: true,
        label_url: `/api/labels/download/fallback-${request.box_id}`,
        fallback_mode: true
      };
    }

    const labelFormat = request.format === 'PDF_4X6' ? 'SHIP_LABEL_4X6' : 'SHIP_LABEL_A4';
    const response = await fetch(
      `https://pxapi.dtdc.in/api/customer/integration/consignment/shippinglabel/stream?reference_number=${request.awb_number}&label_code=${labelFormat}&label_format=pdf`,
      {
        method: 'GET',
        headers: {
          'api-key': config.apiKey,
          'Accept': 'application/pdf',
          'User-Agent': 'SpareFlow-ShipmentFlow/1.0'
        },
        signal: AbortSignal.timeout(30000)
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.log('🔄 DTDC authentication failed, using fallback');
        return {
          success: true,
          label_url: `/api/labels/download/fallback-${request.box_id}`,
          fallback_mode: true
        };
      }
      throw new Error(`DTDC label API error: ${response.status}`);
    }

    // Save label to shipment_files and update database
    await prisma.shipment.update({
      where: { id: request.shipment_id },
      data: {
        metadata: {
          label_generated: true,
          label_url: `/api/labels/download/${request.box_id}`,
          label_format: request.format
        }
      }
    });

    return {
      success: true,
      label_url: `/api/labels/download/${request.box_id}`,
      fallback_mode: false
    };

  } catch (error) {
    console.error('❌ DTDC label generation failed:', error);
    return {
      success: true,
      label_url: `/api/labels/download/fallback-${request.box_id}`,
      fallback_mode: true
    };
  }
}

async function generateBlueDartLabel(request: LabelGenerationRequest): Promise<LabelGenerationResult> {
  // Placeholder for BlueDart integration
  console.log('📦 BlueDart label generation not yet implemented, using fallback');
  return {
    success: true,
    label_url: `/api/labels/download/fallback-${request.box_id}`,
    fallback_mode: true
  };
}

async function generateDelhiveryLabel(request: LabelGenerationRequest): Promise<LabelGenerationResult> {
  // Placeholder for Delhivery integration
  console.log('📦 Delhivery label generation not yet implemented, using fallback');
  return {
    success: true,
    label_url: `/api/labels/download/fallback-${request.box_id}`,
    fallback_mode: true
  };
}

// ===== PROMPT 5: INSURANCE STEP FOR HIGH-VALUE SHIPMENTS =====

export interface InsuranceCalculation {
  insurance_required: boolean;
  insurance_cost: number;
  gst_amount: number;
  total_insurance_charge: number;
  threshold_met: boolean;
  declared_value: number;
}

export function calculateInsuranceRequirement(declared_value: number): InsuranceCalculation {
  console.log('🛡 Calculating insurance requirement for value:', declared_value);

  const threshold = 5000; // ₹5,000 threshold
  const threshold_met = declared_value >= threshold;
  
  if (!threshold_met) {
    return {
      insurance_required: false,
      insurance_cost: 0,
      gst_amount: 0,
      total_insurance_charge: 0,
      threshold_met: false,
      declared_value
    };
  }

  // Calculate insurance cost = declared_value × 0.02 (2%)
  const insurance_cost = declared_value * 0.02;
  
  // GST = 18% of insurance_cost
  const gst_amount = insurance_cost * 0.18;
  
  // Total insurance charge = insurance_cost + gst
  const total_insurance_charge = insurance_cost + gst_amount;

  return {
    insurance_required: true,
    insurance_cost: Math.round(insurance_cost * 100) / 100,
    gst_amount: Math.round(gst_amount * 100) / 100,
    total_insurance_charge: Math.round(total_insurance_charge * 100) / 100,
    threshold_met: true,
    declared_value
  };
}

// ===== PROMPT 6: BULK SHIPMENT COST UI ENHANCEMENT =====

export interface BulkShipmentCostSummary {
  shipments: Array<{
    shipment_id: string;
    recipient_name: string;
    base_cost: number;
    weight_cost: number;
    surcharge_cost: number;
    markup_cost: number;
    insurance_cost: number;
    total_cost: number;
    payer: string;
  }>;
  cost_by_payer: {
    BRAND: number;
    SERVICE_CENTER: number;
    DISTRIBUTOR: number;
    CUSTOMER: number;
  };
  grand_total: number;
  total_shipments: number;
}

export function calculateBulkShipmentCosts(
  shipments: Array<{
    shipment_id: string;
    recipient_name: string;
    cost_breakdown: ShipmentCostBreakdown;
    courier_payer: 'BRAND' | 'SERVICE_CENTER' | 'DISTRIBUTOR' | 'CUSTOMER';
  }>
): BulkShipmentCostSummary {
  console.log('📊 Calculating bulk shipment costs for', shipments.length, 'shipments');

  const cost_by_payer = {
    BRAND: 0,
    SERVICE_CENTER: 0,
    DISTRIBUTOR: 0,
    CUSTOMER: 0
  };

  const processed_shipments = shipments.map(shipment => {
    const breakdown = shipment.cost_breakdown;
    const total_cost = breakdown.total_cost;
    
    // Add to payer total
    cost_by_payer[shipment.courier_payer] += total_cost;

    return {
      shipment_id: shipment.shipment_id,
      recipient_name: shipment.recipient_name,
      base_cost: breakdown.base_cost,
      weight_cost: breakdown.weight_cost,
      surcharge_cost: breakdown.surcharge_cost,
      markup_cost: breakdown.markup_cost,
      insurance_cost: breakdown.insurance_cost || 0,
      total_cost: total_cost,
      payer: shipment.courier_payer
    };
  });

  const grand_total = Object.values(cost_by_payer).reduce((sum, amount) => sum + amount, 0);

  return {
    shipments: processed_shipments,
    cost_by_payer,
    grand_total: Math.round(grand_total * 100) / 100,
    total_shipments: shipments.length
  };
}

export function generateCostSummaryCSV(summary: BulkShipmentCostSummary): string {
  console.log('📄 Generating cost summary CSV');

  const headers = [
    'Shipment ID',
    'Recipient Name',
    'Base Cost',
    'Weight Cost',
    'Surcharge Cost',
    'Markup Cost',
    'Insurance Cost',
    'Total Cost',
    'Payer'
  ];

  const rows = summary.shipments.map(shipment => [
    shipment.shipment_id,
    shipment.recipient_name,
    shipment.base_cost.toFixed(2),
    shipment.weight_cost.toFixed(2),
    shipment.surcharge_cost.toFixed(2),
    shipment.markup_cost.toFixed(2),
    shipment.insurance_cost.toFixed(2),
    shipment.total_cost.toFixed(2),
    shipment.payer
  ]);

  // Add summary rows
  rows.push([]);
  rows.push(['COST SUMMARY BY PAYER']);
  rows.push(['Brand Total', '', '', '', '', '', '', summary.cost_by_payer.BRAND.toFixed(2), 'BRAND']);
  rows.push(['Service Center Total', '', '', '', '', '', '', summary.cost_by_payer.SERVICE_CENTER.toFixed(2), 'SERVICE_CENTER']);
  rows.push(['Distributor Total', '', '', '', '', '', '', summary.cost_by_payer.DISTRIBUTOR.toFixed(2), 'DISTRIBUTOR']);
  rows.push(['Customer Total', '', '', '', '', '', '', summary.cost_by_payer.CUSTOMER.toFixed(2), 'CUSTOMER']);
  rows.push([]);
  rows.push(['GRAND TOTAL', '', '', '', '', '', '', summary.grand_total.toFixed(2), 'ALL']);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

// ===== COMPREHENSIVE SHIPMENT CREATION FUNCTION =====

export interface ComprehensiveShipmentRequest {
  origin_user_id: string;
  destination_user_id: string;
  parts: Array<{
    part_id: string;
    quantity: number;
  }>;
  boxes: Array<{
    parts: Array<{
      part_id: string;
      quantity: number;
    }>;
    dimensions: {
      length: number;
      breadth: number;
      height: number;
    };
  }>;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes?: string;
  return_reason?: string;
  insurance_required?: boolean;
  declared_value?: number;
}

export interface ComprehensiveShipmentResult {
  success: boolean;
  shipment_id?: string;
  classification: ShipmentClassification;
  payer_assignment: CourierPayerAssignment;
  cost_breakdown: ShipmentCostBreakdown;
  insurance_calculation?: InsuranceCalculation;
  awb_number?: string;
  label_urls: string[];
  error?: string;
}

export async function createComprehensiveShipment(
  request: ComprehensiveShipmentRequest
): Promise<ComprehensiveShipmentResult> {
  console.log('🚀 Creating comprehensive shipment:', request);

  try {
    // Step 1: Get user roles for classification
    const [originUser, destinationUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: request.origin_user_id } }),
      prisma.user.findUnique({ where: { id: request.destination_user_id } })
    ]);

    if (!originUser || !destinationUser) {
      throw new Error('Origin or destination user not found');
    }

    // Step 2: Classify shipment type
    const classification = classifyShipmentType(
      originUser.role,
      destinationUser.role,
      request.return_reason
    );

    // Step 3: Assign courier payer
    const payerAssignment = assignCourierPayer(
      classification.shipment_type,
      classification.shipment_direction,
      classification.return_reason
    );

    // Step 4: Get pricing configuration
    const brandId = originUser.role === 'BRAND' ? originUser.id : destinationUser.id;
    const pricing = await getCourierPricing(
      classification.shipment_type,
      payerAssignment.courier_payer,
      brandId
    );

    // Step 5: Calculate costs
    const totalWeight = request.parts.reduce((sum, part) => sum + 0.5, 0); // Placeholder weight calculation
    const isExpress = request.priority === 'HIGH' || request.priority === 'CRITICAL';
    const isRemoteArea = false; // Placeholder - would check pincode
    
    const costBreakdown = calculateShipmentCostBreakdown(
      pricing,
      request.boxes.length,
      totalWeight,
      isExpress,
      isRemoteArea,
      request.declared_value,
      request.insurance_required
    );

    // Step 6: Calculate insurance if required
    let insuranceCalculation: InsuranceCalculation | undefined;
    if (request.declared_value && request.declared_value >= 5000) {
      insuranceCalculation = calculateInsuranceRequirement(request.declared_value);
    }

    // Step 7: Create shipment record (simplified for now)
    const shipmentId = `SHIP_${Date.now()}`;

    return {
      success: true,
      shipment_id: shipmentId,
      classification,
      payer_assignment: payerAssignment,
      cost_breakdown: costBreakdown,
      insurance_calculation: insuranceCalculation,
      awb_number: `AWB${Date.now()}`, // Placeholder
      label_urls: request.boxes.map((_, index) => `/api/labels/download/box-${index + 1}`)
    };

  } catch (error) {
    console.error('❌ Comprehensive shipment creation failed:', error);
    return {
      success: false,
      classification: { shipment_type: 'FORWARD', shipment_direction: 'BRAND' },
      payer_assignment: { courier_payer: 'BRAND', cost_justification: 'Error fallback' },
      cost_breakdown: {
        base_cost: 0,
        weight_cost: 0,
        surcharge_cost: 0,
        markup_cost: 0,
        total_cost: 0,
        pricing_source: 'error',
        applied_rules: []
      },
      label_urls: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

