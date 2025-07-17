// Shipment validation utilities to prevent manual entry override

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ServiceCenter {
  id: string;
  name: string;
  address: string;
  pincode: string;
  phone: string;
  email: string;
}

export interface Part {
  id: string;
  name: string;
  code: string;
  price: number;
  weight: number;
}

export interface ShipmentItem {
  serviceCenterId: string;
  serviceCenterName?: string;
  serviceCenterPincode?: string;
  serviceCenterAddress?: string;
  serviceCenterPhone?: string;
  numBoxes: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  parts?: Array<{
    partId: string;
    quantity: number;
    boxNumber?: number;
  }>;
}

/**
 * Validates shipments against authorized service centers and parts
 * Prevents manual entry override by ensuring all selections are from authorized lists
 */
export function validateShipments(
  shipments: ShipmentItem[],
  authorizedServiceCenters: ServiceCenter[],
  availableParts: Part[]
): ValidationResult {
  const errors: string[] = [];

  if (shipments.length === 0) {
    errors.push('At least one shipment is required');
    return { isValid: false, errors };
  }

  // Create lookup sets for faster validation
  const authorizedServiceCenterIds = new Set(authorizedServiceCenters.map(sc => sc.id));
  const availablePartIds = new Set(availableParts.map(p => p.id));
  const validPriorities = new Set(['LOW', 'MEDIUM', 'HIGH']);

  shipments.forEach((shipment, index) => {
    const shipmentNumber = index + 1;

    // Validate service center selection against authorized list
    if (!shipment.serviceCenterId) {
      errors.push(`Shipment ${shipmentNumber}: Service Center is required`);
    } else if (!authorizedServiceCenterIds.has(shipment.serviceCenterId)) {
      errors.push(`Shipment ${shipmentNumber}: Selected service center is not in your authorized list. Only pre-approved service centers can be selected.`);
    }

    // Validate required fields
    if (!shipment.serviceCenterPincode) {
      errors.push(`Shipment ${shipmentNumber}: Service Center Pincode is required`);
    }
    if (!shipment.serviceCenterAddress) {
      errors.push(`Shipment ${shipmentNumber}: Service Center Address is required`);
    }
    if (!shipment.serviceCenterPhone) {
      errors.push(`Shipment ${shipmentNumber}: Service Center Phone is required`);
    }
    if (shipment.numBoxes < 1) {
      errors.push(`Shipment ${shipmentNumber}: Number of boxes must be at least 1`);
    }

    // Validate priority is from allowed values (prevent manual override)
    if (shipment.priority && !validPriorities.has(shipment.priority)) {
      errors.push(`Shipment ${shipmentNumber}: Invalid priority level. Only LOW, MEDIUM, or HIGH are allowed.`);
    }

    // Validate parts selection
    if (shipment.parts && shipment.parts.length > 0) {
      shipment.parts.forEach((part, partIndex) => {
        const partNumber = partIndex + 1;

        if (!part.partId) {
          errors.push(`Shipment ${shipmentNumber}, Part ${partNumber}: Part selection is required`);
        } else if (!availablePartIds.has(part.partId)) {
          errors.push(`Shipment ${shipmentNumber}, Part ${partNumber}: Selected part is not available in your catalog. Only authorized parts can be selected.`);
        }

        if (part.quantity < 1) {
          errors.push(`Shipment ${shipmentNumber}, Part ${partNumber}: Quantity must be at least 1`);
        }

        if (part.boxNumber && (part.boxNumber < 1 || part.boxNumber > shipment.numBoxes)) {
          errors.push(`Shipment ${shipmentNumber}, Part ${partNumber}: Box number must be between 1 and ${shipment.numBoxes}`);
        }
      });
    }
  });

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates a single service center selection
 */
export function validateServiceCenterSelection(
  serviceCenterId: string,
  authorizedServiceCenters: ServiceCenter[]
): boolean {
  return authorizedServiceCenters.some(sc => sc.id === serviceCenterId);
}

/**
 * Validates a single part selection
 */
export function validatePartSelection(
  partId: string,
  availableParts: Part[]
): boolean {
  return availableParts.some(p => p.id === partId);
}

/**
 * Validates priority level
 */
export function validatePriority(priority: string): boolean {
  return ['LOW', 'MEDIUM', 'HIGH'].includes(priority);
}

/**
 * Sanitizes and validates CSV import data to prevent manual override
 */
export function validateCSVImport(
  csvData: any[],
  authorizedServiceCenters: ServiceCenter[],
  availableParts: Part[]
): ValidationResult {
  const errors: string[] = [];
  const authorizedServiceCenterIds = new Set(authorizedServiceCenters.map(sc => sc.id));

  csvData.forEach((row, index) => {
    const rowNumber = index + 1;

    // Validate service center ID from CSV
    if (row.serviceCenterId && !authorizedServiceCenterIds.has(row.serviceCenterId)) {
      errors.push(`Row ${rowNumber}: Service Center ID '${row.serviceCenterId}' is not in your authorized list`);
    }

    // Validate priority from CSV
    if (row.priority && !validatePriority(row.priority)) {
      errors.push(`Row ${rowNumber}: Invalid priority '${row.priority}'. Only LOW, MEDIUM, or HIGH are allowed`);
    }
  });

  return { isValid: errors.length === 0, errors };
}