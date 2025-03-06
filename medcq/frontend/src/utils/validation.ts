// src/utils/validation.ts

/**
 * Validation rule types for form fields
 */
export type ValidationRule = {
    /** Validation test function */
    test: (value: any, formValues?: Record<string, any>) => boolean;
    /** Error message to display when validation fails */
    message: string;
  };
  
  /**
   * Validation schema mapping field names to validation rules
   */
  export type ValidationSchema = Record<string, ValidationRule[]>;
  
  /**
   * Validate a single value against an array of validation rules
   * 
   * @param value - The value to validate
   * @param rules - Array of validation rules to apply
   * @param formValues - Optional form values for cross-field validation
   * @returns First error message or null if valid
   */
  export function validateField(
    value: any,
    rules: ValidationRule[],
    formValues?: Record<string, any>
  ): string | null {
    if (!rules || !rules.length) return null;
    
    for (const rule of rules) {
      const isValid = rule.test(value, formValues);
      if (!isValid) {
        return rule.message;
      }
    }
    
    return null;
  }
  
  /**
   * Validate an entire form against a validation schema
   * 
   * @param values - Form values to validate
   * @param schema - Validation schema with rules for each field
   * @returns Object with error messages keyed by field name
   */
  export function validateForm(
    values: Record<string, any>,
    schema: ValidationSchema
  ): Record<string, string | null> {
    const errors: Record<string, string | null> = {};
    
    Object.keys(schema).forEach(fieldName => {
      const value = values[fieldName];
      const fieldRules = schema[fieldName];
      
      errors[fieldName] = validateField(value, fieldRules, values);
    });
    
    return errors;
  }
  
  /**
   * Commonly used validation rules
   */
  export const validationRules = {
    required: (message = 'This field is required'): ValidationRule => ({
      test: value => value !== undefined && value !== null && value !== '',
      message
    }),
    
    minLength: (length: number, message = `Must be at least ${length} characters`): ValidationRule => ({
      test: value => !value || value.length >= length,
      message
    }),
    
    maxLength: (length: number, message = `Must be no more than ${length} characters`): ValidationRule => ({
      test: value => !value || value.length <= length,
      message
    }),
    
    email: (message = 'Please enter a valid email address'): ValidationRule => ({
      test: value => !value || /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value),
      message
    }),
    
    match: (fieldName: string, message = 'Fields do not match'): ValidationRule => ({
      test: (value, formValues) => !value || !formValues || value === formValues[fieldName],
      message
    }),
    
    number: (message = 'Please enter a valid number'): ValidationRule => ({
      test: value => !value || !isNaN(Number(value)),
      message
    }),
    
    min: (min: number, message = `Must be at least ${min}`): ValidationRule => ({
      test: value => !value || Number(value) >= min,
      message
    }),
    
    max: (max: number, message = `Must be no more than ${max}`): ValidationRule => ({
      test: value => !value || Number(value) <= max,
      message
    }),
    
    pattern: (pattern: RegExp, message = 'Invalid format'): ValidationRule => ({
      test: value => !value || pattern.test(value),
      message
    }),
    
    custom: (testFn: (value: any, formValues?: Record<string, any>) => boolean, message: string): ValidationRule => ({
      test: testFn,
      message
    })
  };