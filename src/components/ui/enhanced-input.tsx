import React, { useState, useEffect } from 'react';
import { Input, InputProps } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export interface EnhancedInputProps extends Omit<InputProps, 'onChange'> {
  label?: string;
  description?: string;
  error?: string | string[];
  warning?: string;
  success?: string;
  loading?: boolean;
  showValidation?: boolean;
  validationRules?: Array<(value: string) => string | null>;
  debounceMs?: number;
  onChange?: (value: string, isValid: boolean) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  showPasswordToggle?: boolean;
  characterLimit?: number;
  showCharacterCount?: boolean;
  helpText?: string;
  required?: boolean;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export function EnhancedInput({
  label,
  description,
  error,
  warning,
  success,
  loading = false,
  showValidation = true,
  validationRules = [],
  debounceMs = 300,
  onChange,
  onValidationChange,
  showPasswordToggle = false,
  characterLimit,
  showCharacterCount = false,
  helpText,
  required = false,
  validateOnBlur = true,
  validateOnChange = true,
  className,
  type = 'text',
  ...props
}: EnhancedInputProps) {
  const [internalValue, setInternalValue] = useState(props.value || '');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasBeenBlurred, setHasBeenBlurred] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const inputType = showPasswordToggle && type === 'password' 
    ? (showPassword ? 'text' : 'password') 
    : type;

  // Convert error prop to array
  const errorArray = Array.isArray(error) ? error : error ? [error] : [];
  const allErrors = [...errorArray, ...validationErrors];
  const hasErrors = allErrors.length > 0;
  const isValid = !hasErrors && !loading;
  const showSuccess = success && isValid && hasBeenBlurred;

  // Validate input value
  const validateValue = async (value: string) => {
    if (!showValidation || validationRules.length === 0) return [];

    setIsValidating(true);
    const errors: string[] = [];

    for (const rule of validationRules) {
      const error = rule(value);
      if (error) {
        errors.push(error);
      }
    }

    setIsValidating(false);
    return errors;
  };

  // Handle value change with debouncing
  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue);

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for validation
    if (validateOnChange) {
      const timer = setTimeout(async () => {
        const errors = await validateValue(newValue);
        setValidationErrors(errors);
        
        const finalIsValid = errors.length === 0 && !hasErrors;
        onChange?.(newValue, finalIsValid);
        onValidationChange?.(finalIsValid, errors);
      }, debounceMs);

      setDebounceTimer(timer);
    } else {
      onChange?.(newValue, true);
    }
  };

  // Handle blur event
  const handleBlur = async () => {
    setHasBeenBlurred(true);
    
    if (validateOnBlur) {
      const errors = await validateValue(internalValue);
      setValidationErrors(errors);
      
      const finalIsValid = errors.length === 0 && !hasErrors;
      onValidationChange?.(finalIsValid, errors);
    }
  };

  // Character count
  const characterCount = internalValue.length;
  const isOverLimit = characterLimit ? characterCount > characterLimit : false;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between">
          <Label htmlFor={props.id} className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {showCharacterCount && characterLimit && (
            <Badge 
              variant={isOverLimit ? "destructive" : "secondary"}
              className="text-xs"
            >
              {characterCount}/{characterLimit}
            </Badge>
          )}
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}

      {/* Input Container */}
      <div className="relative">
        <Input
          {...props}
          type={inputType}
          value={internalValue}
          onChange={(e) => handleValueChange(e.target.value)}
          onBlur={handleBlur}
          className={cn(
            className,
            hasErrors && "border-red-500 focus:border-red-500 focus:ring-red-500",
            showSuccess && "border-green-500 focus:border-green-500 focus:ring-green-500",
            warning && !hasErrors && "border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500",
            (loading || isValidating) && "pr-10"
          )}
          disabled={loading || props.disabled}
        />

        {/* Right side icons */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {/* Loading spinner */}
          {(loading || isValidating) && (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          )}

          {/* Validation status icons */}
          {!loading && !isValidating && showValidation && hasBeenBlurred && (
            <>
              {hasErrors && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              {showSuccess && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
            </>
          )}

          {/* Password toggle */}
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Help text */}
      {helpText && !hasErrors && !warning && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}

      {/* Error messages */}
      {hasErrors && (
        <div className="space-y-1">
          {allErrors.map((errorMsg, index) => (
            <Alert key={index} variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{errorMsg}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Warning message */}
      {warning && !hasErrors && (
        <Alert className="py-2 border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm text-yellow-800">{warning}</AlertDescription>
        </Alert>
      )}

      {/* Success message */}
      {showSuccess && (
        <Alert className="py-2 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Character limit warning */}
      {isOverLimit && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Character limit exceeded ({characterCount}/{characterLimit})
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}