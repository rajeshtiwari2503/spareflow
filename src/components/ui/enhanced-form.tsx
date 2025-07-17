import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Save, 
  RefreshCw, 
  AlertTriangle,
  Info,
  Clock,
  Shield
} from 'lucide-react';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: Array<(value: any) => string | null>;
  defaultValue?: any;
  disabled?: boolean;
  hidden?: boolean;
  dependsOn?: string;
  showWhen?: (formData: any) => boolean;
}

export interface FormSection {
  title: string;
  description?: string;
  fields: FormField[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface FormSubmissionResult {
  success: boolean;
  data?: any;
  error?: string;
  errors?: Record<string, string[]>;
  warnings?: string[];
  timestamp?: string;
}

export interface EnhancedFormProps {
  title?: string;
  description?: string;
  sections?: FormSection[];
  fields?: FormField[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<FormSubmissionResult>;
  onCancel?: () => void;
  onReset?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  resetLabel?: string;
  showProgress?: boolean;
  showValidationSummary?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  showLastSaved?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showRequiredIndicator?: boolean;
  allowPartialSubmit?: boolean;
  confirmBeforeSubmit?: boolean;
  maxRetries?: number;
}

export function EnhancedForm({
  title,
  description,
  sections = [],
  fields = [],
  initialData = {},
  onSubmit,
  onCancel,
  onReset,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  resetLabel = 'Reset',
  showProgress = true,
  showValidationSummary = true,
  autoSave = false,
  autoSaveInterval = 30000,
  className,
  disabled = false,
  loading = false,
  showLastSaved = false,
  validateOnChange = true,
  validateOnBlur = true,
  showRequiredIndicator = true,
  allowPartialSubmit = false,
  confirmBeforeSubmit = false,
  maxRetries = 3
}: EnhancedFormProps) {
  // Combine sections and standalone fields
  const allSections = sections.length > 0 ? sections : [{ title: '', fields }];
  const allFields = allSections.flatMap(section => section.fields);

  // Form state
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [fieldWarnings, setFieldWarnings] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(allSections.filter(s => s.defaultExpanded !== false).map(s => s.title))
  );
  const [submissionResult, setSubmissionResult] = useState<FormSubmissionResult | null>(null);

  // Validation state
  const [validationSummary, setValidationSummary] = useState<{
    totalFields: number;
    validFields: number;
    requiredFields: number;
    completedRequiredFields: number;
  }>({
    totalFields: 0,
    validFields: 0,
    requiredFields: 0,
    completedRequiredFields: 0
  });

  // Validate a single field
  const validateField = useCallback((field: FormField, value: any): string[] => {
    const errors: string[] = [];

    // Required validation
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field.label} is required`);
    }

    // Custom validation rules
    if (field.validation && value !== undefined && value !== null && value !== '') {
      field.validation.forEach(rule => {
        const error = rule(value);
        if (error) {
          errors.push(error);
        }
      });
    }

    return errors;
  }, []);

  // Validate all fields
  const validateForm = useCallback(() => {
    const errors: Record<string, string[]> = {};
    let totalFields = 0;
    let validFields = 0;
    let requiredFields = 0;
    let completedRequiredFields = 0;

    allFields.forEach(field => {
      // Skip hidden fields
      if (field.hidden || (field.showWhen && !field.showWhen(formData))) {
        return;
      }

      totalFields++;
      if (field.required) {
        requiredFields++;
      }

      const value = formData[field.name];
      const fieldErrors = validateField(field, value);

      if (fieldErrors.length > 0) {
        errors[field.name] = fieldErrors;
      } else {
        validFields++;
        if (field.required && value !== undefined && value !== null && value !== '') {
          completedRequiredFields++;
        }
      }
    });

    setFieldErrors(errors);
    setValidationSummary({
      totalFields,
      validFields,
      requiredFields,
      completedRequiredFields
    });

    return Object.keys(errors).length === 0;
  }, [allFields, formData, validateField]);

  // Handle field change
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    if (validateOnChange) {
      const field = allFields.find(f => f.name === fieldName);
      if (field) {
        const errors = validateField(field, value);
        setFieldErrors(prev => ({
          ...prev,
          [fieldName]: errors
        }));
      }
    }
  }, [allFields, validateField, validateOnChange]);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouchedFields(prev => new Set([...prev, fieldName]));
    
    if (validateOnBlur) {
      const field = allFields.find(f => f.name === fieldName);
      if (field) {
        const value = formData[fieldName];
        const errors = validateField(field, value);
        setFieldErrors(prev => ({
          ...prev,
          [fieldName]: errors
        }));
      }
    }
  }, [allFields, formData, validateField, validateOnBlur]);

  // Auto-save functionality
  const performAutoSave = useCallback(async () => {
    if (!autoSave || isSubmitting) return;

    setAutoSaveStatus('saving');
    try {
      // Implement auto-save logic here
      // This could save to localStorage, send to server, etc.
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate save
      setAutoSaveStatus('saved');
      setLastSaved(new Date());
      
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  }, [autoSave, isSubmitting]);

  // Auto-save timer
  useEffect(() => {
    if (!autoSave) return;

    const timer = setInterval(performAutoSave, autoSaveInterval);
    return () => clearInterval(timer);
  }, [autoSave, autoSaveInterval, performAutoSave]);

  // Validate form on data change
  useEffect(() => {
    validateForm();
  }, [formData, validateForm]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || disabled) return;

    // Validate form
    const isValid = validateForm();
    
    if (!isValid && !allowPartialSubmit) {
      setSubmissionResult({
        success: false,
        error: 'Please fix the validation errors before submitting',
        errors: fieldErrors
      });
      return;
    }

    // Confirm before submit if required
    if (confirmBeforeSubmit) {
      const confirmed = window.confirm('Are you sure you want to submit this form?');
      if (!confirmed) return;
    }

    setIsSubmitting(true);
    setSubmitAttempts(prev => prev + 1);

    try {
      const result = await onSubmit(formData);
      setSubmissionResult(result);
      
      if (result.success) {
        setLastSaved(new Date());
        // Reset form if successful
        if (onReset) {
          setFormData(initialData);
          setFieldErrors({});
          setTouchedFields(new Set());
        }
      }
    } catch (error) {
      setSubmissionResult({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    setFormData(initialData);
    setFieldErrors({});
    setFieldWarnings({});
    setTouchedFields(new Set());
    setSubmissionResult(null);
    setSubmitAttempts(0);
    onReset?.();
  };

  // Calculate form progress
  const progressPercentage = validationSummary.totalFields > 0 
    ? Math.round((validationSummary.validFields / validationSummary.totalFields) * 100)
    : 0;

  const requiredProgressPercentage = validationSummary.requiredFields > 0
    ? Math.round((validationSummary.completedRequiredFields / validationSummary.requiredFields) * 100)
    : 100;

  // Render field based on type
  const renderField = (field: FormField) => {
    if (field.hidden || (field.showWhen && !field.showWhen(formData))) {
      return null;
    }

    const value = formData[field.name] || field.defaultValue || '';
    const errors = fieldErrors[field.name] || [];
    const warning = fieldWarnings[field.name];
    const isTouched = touchedFields.has(field.name);
    const hasErrors = errors.length > 0;

    const commonProps = {
      id: field.name,
      name: field.name,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => 
        handleFieldChange(field.name, e.target.value),
      onBlur: () => handleFieldBlur(field.name),
      disabled: field.disabled || disabled || isSubmitting,
      placeholder: field.placeholder,
      className: cn(
        hasErrors && isTouched && "border-red-500 focus:border-red-500",
        "transition-colors"
      )
    };

    return (
      <motion.div
        key={field.name}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between">
          <label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
            {field.required && showRequiredIndicator && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
        </div>

        {field.description && (
          <p className="text-sm text-gray-600">{field.description}</p>
        )}

        {/* Render different input types */}
        {field.type === 'textarea' ? (
          <textarea
            {...commonProps}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        ) : field.type === 'select' ? (
          <select
            {...commonProps}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...commonProps}
            type={field.type}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )}

        {/* Field errors */}
        <AnimatePresence>
          {hasErrors && isTouched && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1"
            >
              {errors.map((error, index) => (
                <Alert key={index} variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Field warning */}
        {warning && !hasErrors && (
          <Alert className="py-2 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-800">{warning}</AlertDescription>
          </Alert>
        )}
      </motion.div>
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}

      <CardContent className="space-y-6">
        {/* Form Progress */}
        {showProgress && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Form Progress</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {validationSummary.validFields}/{validationSummary.totalFields} fields
                </Badge>
                <Badge variant={requiredProgressPercentage === 100 ? "default" : "secondary"}>
                  {validationSummary.completedRequiredFields}/{validationSummary.requiredFields} required
                </Badge>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Auto-save status */}
        {autoSave && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              {autoSaveStatus === 'saving' && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Auto-saved</span>
                </>
              )}
              {autoSaveStatus === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Auto-save failed</span>
                </>
              )}
            </div>
            {showLastSaved && lastSaved && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Validation Summary */}
        {showValidationSummary && Object.keys(fieldErrors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Please fix the following errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(fieldErrors).map(([fieldName, errors]) => (
                    <li key={fieldName} className="text-sm">
                      {allFields.find(f => f.name === fieldName)?.label}: {errors[0]}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Submission Result */}
        <AnimatePresence>
          {submissionResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant={submissionResult.success ? "default" : "destructive"}>
                {submissionResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {submissionResult.success ? (
                    <div className="space-y-1">
                      <p className="font-medium">Form submitted successfully!</p>
                      {submissionResult.timestamp && (
                        <p className="text-sm">Submitted at {new Date(submissionResult.timestamp).toLocaleString()}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-medium">Submission failed</p>
                      <p className="text-sm">{submissionResult.error}</p>
                      {submitAttempts < maxRetries && (
                        <p className="text-sm">Attempt {submitAttempts} of {maxRetries}</p>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Sections */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {allSections.map((section, sectionIndex) => (
            <div key={section.title || sectionIndex} className="space-y-4">
              {section.title && (
                <div>
                  <h3 className="text-lg font-medium">{section.title}</h3>
                  {section.description && (
                    <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                  )}
                  <Separator className="mt-2" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {section.fields.map(renderField)}
                </AnimatePresence>
              </div>
            </div>
          ))}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center gap-2">
              {onReset && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSubmitting}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {resetLabel}
                </Button>
              )}
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  {cancelLabel}
                </Button>
              )}
            </div>

            <Button
              type="submit"
              disabled={
                isSubmitting || 
                disabled || 
                (!allowPartialSubmit && Object.keys(fieldErrors).length > 0) ||
                (submitAttempts >= maxRetries && !submissionResult?.success)
              }
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {submitLabel}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}