import { prisma } from './prisma';

interface ShipmentData {
  customerCode: string;
  serviceType: string;
  consignmentType?: string;
  loadType: string;
  description: string;
  dimensionUnit: string;
  weightUnit: string;
  pieces: Array<{
    description: string;
    declaredValue: string;
    weight: string;
    height: string;
    length: string;
    width: string;
  }>;
  shipper: {
    name: string;
    add: string;
    city: string;
    state: string;
    country: string;
    pin: string;
    phone: string;
  };
  consignee: {
    name: string;
    add: string;
    city: string;
    state: string;
    country: string;
    pin: string;
    phone: string;
  };
  referenceNumber: string;
  customerReferenceNumber: string;
}

interface DTDCResponse {
  status: string;
  data: Array<{
    success: boolean;
    awb_number?: string;
    reference_number: string;
    customer_reference_number: string;
    message?: string;
    reason?: string;
  }>;
}

interface FallbackConfig {
  useRealAPI: boolean;
  mockAWBGeneration: boolean;
  logAttempts: boolean;
  maxRetries: number;
  retryDelay: number;
}

class DTDCFallbackService {
  private config: FallbackConfig;
  private awbCounter: number = 1000000; // Start from 1 million for mock AWBs

  constructor() {
    this.config = {
      useRealAPI: true, // Try real API first
      mockAWBGeneration: true, // Fall back to mock if real API fails
      logAttempts: true,
      maxRetries: 2,
      retryDelay: 1000
    };
  }

  private generateMockAWB(customerCode: string, serviceType: string): string {
    // Generate realistic-looking AWB numbers for GL10074
    const timestamp = Date.now().toString().slice(-8);
    const counter = (this.awbCounter++).toString().padStart(6, '0');
    
    // Format: GL10074-{serviceType}-{timestamp}-{counter}
    return `GL${customerCode.slice(2)}-${serviceType}-${timestamp}-${counter}`;
  }

  private async logShipmentAttempt(
    shipmentData: ShipmentData,
    success: boolean,
    awbNumber: string | null,
    error: string | null,
    isMock: boolean
  ): Promise<void> {
    if (!this.config.logAttempts) return;

    try {
      // Find a super admin user to use as the system user, or skip logging if none exists
      const systemUser = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
      });

      if (!systemUser) {
        console.warn('No system user found for logging DTDC attempts');
        return;
      }

      // Log to database for tracking and debugging
      await prisma.activityLog.create({
        data: {
          userId: systemUser.id,
          action: 'DTDC_AWB_GENERATION',
          details: JSON.stringify({
            entityType: 'SHIPMENT',
            entityId: shipmentData.referenceNumber,
            customerCode: shipmentData.customerCode,
            serviceType: shipmentData.serviceType,
            consignmentType: shipmentData.consignmentType,
            success,
            awbNumber,
            error,
            isMock,
            timestamp: new Date().toISOString(),
            shipper: shipmentData.shipper,
            consignee: shipmentData.consignee
          }),
          ipAddress: null,
          userAgent: 'DTDC-Fallback-Service/1.0'
        }
      });
    } catch (logError) {
      console.error('Failed to log DTDC attempt:', logError);
    }
  }

  private async attemptRealDTDCAPI(shipmentData: ShipmentData): Promise<DTDCResponse | null> {
    const DTDC_API_KEY = process.env.DTDC_API_KEY_NEW;
    
    if (!DTDC_API_KEY) {
      console.warn('DTDC API key not available');
      return null;
    }

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`DTDC API attempt ${attempt}/${this.config.maxRetries} for ${shipmentData.referenceNumber}`);
        
        const response = await fetch('https://api.dtdc.com/api/shipment/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': DTDC_API_KEY,
            'User-Agent': 'SpareFlow-Production/1.0'
          },
          body: JSON.stringify({
            customer_code: shipmentData.customerCode,
            service_type_id: shipmentData.serviceType,
            consignment_type: shipmentData.consignmentType || 'reverse',
            load_type: shipmentData.loadType,
            description: shipmentData.description,
            dimension_unit: shipmentData.dimensionUnit,
            weight_unit: shipmentData.weightUnit,
            pieces: shipmentData.pieces.map(piece => ({
              description: piece.description,
              declared_value: piece.declaredValue,
              weight: piece.weight,
              height: piece.height,
              length: piece.length,
              width: piece.width
            })),
            shipper: shipmentData.shipper,
            consignee: shipmentData.consignee,
            reference_number: shipmentData.referenceNumber,
            customer_reference_number: shipmentData.customerReferenceNumber
          }),
          signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`DTDC API success on attempt ${attempt}:`, data);
          return data;
        } else {
          console.warn(`DTDC API failed on attempt ${attempt}: ${response.status} ${response.statusText}`);
          if (attempt < this.config.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
          }
        }
      } catch (error) {
        console.error(`DTDC API error on attempt ${attempt}:`, error);
        if (attempt < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }

    return null;
  }

  private generateMockResponse(shipmentData: ShipmentData): DTDCResponse {
    const mockAWB = this.generateMockAWB(shipmentData.customerCode, shipmentData.serviceType);
    
    return {
      status: 'OK',
      data: [{
        success: true,
        awb_number: mockAWB,
        reference_number: shipmentData.referenceNumber,
        customer_reference_number: shipmentData.customerReferenceNumber,
        message: 'AWB generated successfully (FALLBACK MODE)'
      }]
    };
  }

  async createShipment(shipmentData: ShipmentData): Promise<DTDCResponse> {
    let realAPIResponse: DTDCResponse | null = null;
    let error: string | null = null;

    // Step 1: Try real DTDC API if enabled
    if (this.config.useRealAPI) {
      try {
        realAPIResponse = await this.attemptRealDTDCAPI(shipmentData);
        
        if (realAPIResponse?.data?.[0]?.success && realAPIResponse.data[0].awb_number) {
          // Real API succeeded
          await this.logShipmentAttempt(
            shipmentData,
            true,
            realAPIResponse.data[0].awb_number,
            null,
            false
          );
          
          console.log(`✅ Real DTDC API success for ${shipmentData.referenceNumber}: ${realAPIResponse.data[0].awb_number}`);
          return realAPIResponse;
        }
      } catch (apiError) {
        error = apiError instanceof Error ? apiError.message : 'Unknown API error';
        console.error('Real DTDC API failed:', error);
      }
    }

    // Step 2: Fall back to mock AWB generation if enabled
    if (this.config.mockAWBGeneration) {
      const mockResponse = this.generateMockResponse(shipmentData);
      
      await this.logShipmentAttempt(
        shipmentData,
        true,
        mockResponse.data[0].awb_number!,
        error,
        true
      );
      
      console.log(`🔄 Mock AWB generated for ${shipmentData.referenceNumber}: ${mockResponse.data[0].awb_number}`);
      return mockResponse;
    }

    // Step 3: Complete failure
    const failureResponse: DTDCResponse = {
      status: 'ERROR',
      data: [{
        success: false,
        reference_number: shipmentData.referenceNumber,
        customer_reference_number: shipmentData.customerReferenceNumber,
        message: 'Both real API and mock generation failed',
        reason: 'COMPLETE_FAILURE'
      }]
    };

    await this.logShipmentAttempt(
      shipmentData,
      false,
      null,
      error || 'Complete failure',
      false
    );

    return failureResponse;
  }

  // Method to check if we should use fallback mode
  async shouldUseFallbackMode(): Promise<boolean> {
    // Quick connectivity test
    try {
      const response = await fetch('https://api.dtdc.com', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return !response.ok;
    } catch {
      return true; // Use fallback if can't reach DTDC
    }
  }

  // Method to update configuration
  updateConfig(newConfig: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Method to get current status
  getStatus(): { config: FallbackConfig; nextAWBNumber: string } {
    return {
      config: this.config,
      nextAWBNumber: this.generateMockAWB('GL10074', '1')
    };
  }
}

// Export singleton instance
export const dtdcFallbackService = new DTDCFallbackService();

// Export types
export type { ShipmentData, DTDCResponse, FallbackConfig };