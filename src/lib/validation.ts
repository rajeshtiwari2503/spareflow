// Comprehensive validation utilities for SpareFlow

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationRule<T = any> {
  field: string;
  validator: (value: T, data?: any) => string | null;
  required?: boolean;
}

// Common validation functions
export const validators = {
  required: (value: any): string | null => {
    if (value === undefined || value === null || value === '') {
      return 'This field is required';
    }
    return null;
  },

  email: (value: string): string | null => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Please enter a valid email address';
  },

  minLength: (min: number) => (value: string): string | null => {
    if (!value) return null;
    return value.length >= min ? null : `Must be at least ${min} characters long`;
  },

  maxLength: (max: number) => (value: string): string | null => {
    if (!value) return null;
    return value.length <= max ? null : `Must be no more than ${max} characters long`;
  },

  positiveNumber: (value: any): string | null => {
    if (value === undefined || value === null || value === '') return null;
    const num = parseFloat(value);
    if (isNaN(num)) return 'Must be a valid number';
    return num > 0 ? null : 'Must be a positive number';
  },

  nonNegativeNumber: (value: any): string | null => {
    if (value === undefined || value === null || value === '') return null;
    const num = parseFloat(value);
    if (isNaN(num)) return 'Must be a valid number';
    return num >= 0 ? null : 'Must be a non-negative number';
  },

  positiveInteger: (value: any): string | null => {
    if (value === undefined || value === null || value === '') return null;
    const num = parseInt(value);
    if (isNaN(num)) return 'Must be a valid integer';
    return num > 0 && Number.isInteger(num) ? null : 'Must be a positive integer';
  },

  url: (value: string): string | null => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Must be a valid URL';
    }
  },

  phoneNumber: (value: string): string | null => {
    if (!value) return null;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(value.replace(/[\s\-\(\)]/g, '')) ? null : 'Please enter a valid phone number';
  },

  alphanumeric: (value: string): string | null => {
    if (!value) return null;
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(value) ? null : 'Must contain only letters and numbers';
  },

  partCode: (value: string): string | null => {
    if (!value) return null;
    const partCodeRegex = /^[A-Z0-9\-_]{2,20}$/;
    return partCodeRegex.test(value) ? null : 'Part code must be 2-20 characters, uppercase letters, numbers, hyphens, and underscores only';
  },

  oneOf: (options: any[]) => (value: any): string | null => {
    if (value === undefined || value === null || value === '') return null;
    return options.includes(value) ? null : `Must be one of: ${options.join(', ')}`;
  },

  passwordStrength: (value: string): string | null => {
    if (!value) return null;
    
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    
    if (value.length < minLength) {
      return `Password must be at least ${minLength} characters long`;
    }
    
    const strengthChecks = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar];
    const passedChecks = strengthChecks.filter(Boolean).length;
    
    if (passedChecks < 3) {
      return 'Password must contain at least 3 of: uppercase letter, lowercase letter, number, special character';
    }
    
    return null;
  },

  matchField: (fieldName: string, fieldLabel?: string) => (value: any, data: any): string | null => {
    if (!value || !data) return null;
    return value === data[fieldName] ? null : `Must match ${fieldLabel || fieldName}`;
  }
};

// Validation schema builder
export class ValidationSchema<T = any> {
  private rules: ValidationRule<any>[] = [];

  field(fieldName: keyof T, ...validators: Array<(value: any, data?: any) => string | null>): this {
    validators.forEach(validator => {
      this.rules.push({
        field: fieldName as string,
        validator
      });
    });
    return this;
  }

  validate(data: Partial<T>): ValidationResult {
    const errors: string[] = [];
    const fieldErrors: Record<string, string[]> = {};

    this.rules.forEach(rule => {
      const value = data[rule.field as keyof T];
      const error = rule.validator(value, data);
      
      if (error) {
        errors.push(`${rule.field}: ${error}`);
        
        if (!fieldErrors[rule.field]) {
          fieldErrors[rule.field] = [];
        }
        fieldErrors[rule.field].push(error);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors
    } as ValidationResult & { fieldErrors: Record<string, string[]> };
  }
}

// Pre-built validation schemas for common entities
export const schemas = {
  user: new ValidationSchema()
    .field('name', validators.required, validators.minLength(2), validators.maxLength(100))
    .field('email', validators.required, validators.email)
    .field('password', validators.required, validators.passwordStrength)
    .field('role', validators.required, validators.oneOf(['BRAND', 'DISTRIBUTOR', 'SERVICE_CENTER', 'CUSTOMER'])),

  userRegistration: new ValidationSchema()
    .field('name', validators.required, validators.minLength(2), validators.maxLength(100))
    .field('email', validators.required, validators.email)
    .field('password', validators.required, validators.passwordStrength)
    .field('confirmPassword', validators.required, validators.matchField('password', 'password'))
    .field('role', validators.required, validators.oneOf(['BRAND', 'DISTRIBUTOR', 'SERVICE_CENTER', 'CUSTOMER'])),

  part: new ValidationSchema()
    .field('code', validators.required, validators.partCode)
    .field('name', validators.required, validators.minLength(2), validators.maxLength(200))
    .field('description', validators.maxLength(1000))
    .field('price', validators.required, validators.positiveNumber)
    .field('weight', validators.nonNegativeNumber)
    .field('msl', validators.positiveInteger)
    .field('brandId', validators.required)
    .field('diyVideoUrl', validators.url),

  shipment: new ValidationSchema()
    .field('brandId', validators.required)
    .field('serviceCenterId', validators.required)
    .field('numBoxes', validators.required, validators.positiveInteger)
    .field('estimatedWeight', validators.positiveNumber)
    .field('serviceCenterPincode', validators.required, validators.minLength(6), validators.maxLength(6)),

  customerOrder: new ValidationSchema()
    .field('customerId', validators.required)
    .field('partId', validators.required)
    .field('quantity', validators.required, validators.positiveInteger)
    .field('customerName', validators.required, validators.minLength(2), validators.maxLength(100))
    .field('customerPhone', validators.required, validators.phoneNumber)
    .field('customerAddress', validators.required, validators.minLength(10), validators.maxLength(500))
    .field('customerPincode', validators.required, validators.minLength(6), validators.maxLength(6)),

  reverseRequest: new ValidationSchema()
    .field('serviceCenterId', validators.required)
    .field('partId', validators.required)
    .field('quantity', validators.required, validators.positiveInteger)
    .field('reason', validators.required, validators.oneOf(['DEFECTIVE', 'WRONG_PART', 'EXCESS_STOCK', 'DAMAGED', 'OTHER']))
    .field('description', validators.maxLength(500)),

  aiDiagnosis: new ValidationSchema()
    .field('issue', validators.required, validators.minLength(10), validators.maxLength(1000))
    .field('appliance', validators.maxLength(100))
    .field('userId', validators.required)
    .field('userRole', validators.required, validators.oneOf(['CUSTOMER', 'SERVICE_CENTER']))
};

// Utility function to validate API request body
export function validateRequestBody<T>(
  schema: ValidationSchema<T>,
  data: any,
  customRules?: ValidationRule<any>[]
): ValidationResult {
  // Create a new schema with custom rules if provided
  let validationSchema = schema;
  
  if (customRules && customRules.length > 0) {
    validationSchema = new ValidationSchema<T>();
    // Copy existing rules (this is a simplified approach)
    customRules.forEach(rule => {
      validationSchema.field(rule.field as keyof T, rule.validator);
    });
  }

  return validationSchema.validate(data);
}

// Client-side form validation hook helper
export function createFormValidator<T>(schema: ValidationSchema<T>) {
  return {
    validate: (data: Partial<T>) => schema.validate(data),
    validateField: (fieldName: keyof T, value: any, data?: Partial<T>) => {
      const fieldData = { ...data, [fieldName]: value };
      const result = schema.validate(fieldData);
      
      const fieldErrors = (result as any).fieldErrors?.[fieldName as string] || [];
      return {
        isValid: fieldErrors.length === 0,
        errors: fieldErrors
      };
    }
  };
}

// Error formatting utilities
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  
  return `Multiple validation errors:\n${errors.map(error => `• ${error}`).join('\n')}`;
}

export function getFieldError(result: ValidationResult & { fieldErrors?: Record<string, string[]> }, fieldName: string): string | null {
  if (!result.fieldErrors || !result.fieldErrors[fieldName]) return null;
  return result.fieldErrors[fieldName][0] || null;
}

// Loading state management utilities
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function createLoadingState(): LoadingState {
  return {
    isLoading: false,
    error: null,
    lastUpdated: null
  };
}

export function setLoading(state: LoadingState, loading: boolean): LoadingState {
  return {
    ...state,
    isLoading: loading,
    error: loading ? null : state.error // Clear error when starting new operation
  };
}

export function setError(state: LoadingState, error: string | null): LoadingState {
  return {
    ...state,
    isLoading: false,
    error,
    lastUpdated: error ? null : new Date()
  };
}

export function setSuccess(state: LoadingState): LoadingState {
  return {
    isLoading: false,
    error: null,
    lastUpdated: new Date()
  };
}