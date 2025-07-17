// Simple DTDC integration for distributor dashboard
export interface DTDCShipmentRequest {
  consignments: Array<{
    customer_code: string;
    service_type_id: string;
    load_type: string;
    description: string;
    dimension_unit: string;
    length: number;
    width: number;
    height: number;
    weight_unit: string;
    weight: number;
    declared_value: number;
    cod_amount: number;
    reference_number: string;
    consignee: {
      name: string;
      address1: string;
      address2: string;
      address3: string;
      pincode: string;
      mobile: string;
      telephone: string;
    };
    consigner: {
      name: string;
      address1: string;
      address2: string;
      address3: string;
      pincode: string;
      mobile: string;
      telephone: string;
    };
    return_address: {
      name: string;
      address1: string;
      address2: string;
      address3: string;
      pincode: string;
      mobile: string;
      telephone: string;
    };
  }>;
}

export interface DTDCResponse {
  success: boolean;
  data?: {
    awb_number: string;
    tracking_url?: string;
    label_url?: string;
  };
  error?: string;
}

export async function generateDTDCAWB(request: DTDCShipmentRequest): Promise<DTDCResponse> {
  try {
    // For now, return a mock response since we don't have the actual DTDC API setup
    // In production, this would make an actual API call to DTDC
    
    const mockAwbNumber = `DTDC${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    return {
      success: true,
      data: {
        awb_number: mockAwbNumber,
        tracking_url: `https://www.dtdc.in/tracking/tracking_results.asp?strCnno=${mockAwbNumber}`,
        label_url: `https://api.dtdc.in/labels/${mockAwbNumber}.pdf`
      }
    };
  } catch (error) {
    console.error('DTDC API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown DTDC error'
    };
  }
}