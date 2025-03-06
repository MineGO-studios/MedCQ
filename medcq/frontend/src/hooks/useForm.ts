// src/hooks/useForm.ts

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ValidationSchema, validateForm, validateField } from '../utils/validation';
export { useForm }

export interface FormOptions<T extends Record<string, any>> {
  /**
   * Initial form values
   */
  initialValues: T;
  
  /**
   * Validation schema
   */
  validationSchema?: ValidationSchema;
  
  /**
   * Callback when form is submitted with valid values
   */
  onSubmit?: (values: T) => void | Promise<void>;
  
  /**
   * When true, validate fields on change
   * @default false
   */
  validateOnChange?: boolean;
  
  /**
   * When true, validate fields on blur
   * @default true
   */
  validateOnBlur?: boolean;
}

export interface FieldState {
  /**
   * Whether the field has been touched (focused and blurred)
   */
  touched: boolean;
  
  /**
   * Error message for the field if validation fails
   */
  error: string | null;
}

export interface FormState<T extends Record<string, any>> {
  /**
   * Current form values
   */
  values: T;
  
  /**
   * Field states containing touched and error information
   */
  fieldState: Record<string, FieldState>;
  
  /**
   * Whether the form is currently being submitted
   */
  isSubmitting: boolean;
  
  /**
   * Whether the form has been submitted at least once
   */
  isSubmitted: boolean;
  
  /**
   * Whether the form is valid (no validation errors)
   */
  isValid: boolean;
}

export interface FormActions<T extends Record<string, any>> {
  /**
   * Set the value of a specific field
   */
  setFieldValue: (field: keyof T, value: any) => void;
  
  /**
   * Set a field as touched
   */
  setFieldTouched: (field: keyof T, touched?: boolean) => void;
  
  /**
   * Set an error message for a field
   */
  setFieldError: (field: keyof T, error: string | null) => void;
  
  /**
   * Reset form to initial values and clear errors
   */
  resetForm: () => void;
  
  /**
   * Submit the form programmatically
   */
  submitForm: () => Promise<void>;
  
  /**
   * Validate all form fields
   */
  validateForm: () => Record<string, string | null>;
  
  /**
   * Validate a specific field
   */
  validateField: (field: keyof T) => string | null;
}

export type FieldProps = {
  name: string;
  value: any;
  onChange: (e: React.ChangeEvent<any>) => void;
  onBlur: (e: React.FocusEvent<any>) => void;
  error: string | null;
  touched: boolean;
};

export interface UseFormResult<T extends Record<string, any>> {
  /**
   * Current form state
   */
  formState: FormState<T>;
  
  /**
   * Form actions to update state
   */
  formActions: FormActions<T>;
  
  /**
   * Get props for a form field
   */
  getFieldProps: (field: keyof T) => FieldProps;
  
  /**
   * Get props for the form element
   */
  getFormProps: () => {
    onSubmit: (e: React.FormEvent) => void;
  };
}

/**
 * Hook for managing form state, validation, and submission
 */
function useForm<T extends Record<string, any>>(
  options: FormOptions<T>
): UseFormResult<T> {
  const {
    initialValues,
    validationSchema = {},
    onSubmit,
    validateOnChange = false,
    validateOnBlur = true
  } = options;
  
  // Store options in refs to prevent unnecessary rerenders
  const onSubmitRef = useRef(onSubmit);
  const validationSchemaRef = useRef(validationSchema);
  
  // Update refs when options change
  useEffect(() => {
    onSubmitRef.current = onSubmit;
    validationSchemaRef.current = validationSchema;
  }, [onSubmit, validationSchema]);
  
  // Form state
  const [values, setValues] = useState<T>(initialValues);
  const [fieldState, setFieldState] = useState<Record<string, FieldState>>(() => {
    // Initialize field state with untouched fields and no errors
    const initialFieldState: Record<string, FieldState> = {};
    Object.keys(initialValues).forEach(field => {
      initialFieldState[field] = { touched: false, error: null };
    });
    return initialFieldState;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Memoized calculation of form validity
  const isValid = useMemo(() => {
    return Object.values(fieldState).every(field => field.error === null);
  }, [fieldState]);
  
  // Combined form state object
  const formState: FormState<T> = useMemo(() => ({
    values,
    fieldState,
    isSubmitting,
    isSubmitted,
    isValid
  }), [values, fieldState, isSubmitting, isSubmitted, isValid]);
  
  // Set field value and optionally validate
  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues(prevValues => ({
      ...prevValues,
      [field]: value
    }));
    
    // Validate on change if enabled
    if (validateOnChange) {
      const schema = validationSchemaRef.current;
      const fieldRules = schema[field as string];
      
      if (fieldRules) {
        const error = validateField(value, fieldRules, values);
        
        setFieldState(prevState => ({
          ...prevState,
          [field]: {
            ...prevState[field as string],
            error
          }
        }));
      }
    }
  }, [values, validateOnChange]);
  
  // Set field as touched and optionally validate
  const setFieldTouched = useCallback((field: keyof T, touched = true) => {
    setFieldState(prevState => ({
      ...prevState,
      [field]: {
        ...prevState[field as string],
        touched
      }
    }));
    
    // Validate on blur if enabled
    if (validateOnBlur && touched) {
      const schema = validationSchemaRef.current;
      const fieldRules = schema[field as string];
      
      if (fieldRules) {
        const value = values[field];
        const error = validateField(value, fieldRules, values);
        
        setFieldState(prevState => ({
          ...prevState,
          [field]: {
            ...prevState[field as string],
            error
          }
        }));
      }
    }
  }, [values, validateOnBlur]);
  
  // Set field error directly
  const setFieldError = useCallback((field: keyof T, error: string | null) => {
    setFieldState(prevState => ({
      ...prevState,
      [field]: {
        ...prevState[field as string],
        error
      }
    }));
  }, []);
  
  // Validate all form fields
  const validateFormFields = useCallback(() => {
    const schema = validationSchemaRef.current;
    const errors = validateForm(values, schema);
    
    // Update field state with errors
    const newFieldState = { ...fieldState };
    
    Object.keys(errors).forEach(field => {
      newFieldState[field] = {
        ...newFieldState[field],
        error: errors[field]
      };
    });
    
    setFieldState(newFieldState);
    
    return errors;
  }, [values, fieldState]);
  
  // Validate a single field
  const validateSingleField = useCallback((field: keyof T) => {
    const schema = validationSchemaRef.current;
    const fieldRules = schema[field as string];
    
    if (!fieldRules) return null;
    
    const value = values[field];
    const error = validateField(value, fieldRules, values);
    
    setFieldState(prevState => ({
      ...prevState,
      [field]: {
        ...prevState[field as string],
        error
      }
    }));
    
    return error;
  }, [values]);
  
  // Reset form to initial state
  const resetForm = useCallback(() => {
    setValues(initialValues);
    
    const resetFieldState: Record<string, FieldState> = {};
    Object.keys(initialValues).forEach(field => {
      resetFieldState[field] = { touched: false, error: null };
    });
    
    setFieldState(resetFieldState);
    setIsSubmitted(false);
    setIsSubmitting(false);
  }, [initialValues]);
  
  // Submit form
  const submitForm = useCallback(async () => {
    setIsSubmitting(true);
    setIsSubmitted(true);
    
    // Mark all fields as touched
    const touchedFieldState = { ...fieldState };
    Object.keys(touchedFieldState).forEach(field => {
      touchedFieldState[field] = {
        ...touchedFieldState[field],
        touched: true
      };
    });
    setFieldState(touchedFieldState);
    
    // Validate all fields
    const errors = validateFormFields();
    const hasErrors = Object.values(errors).some(error => error !== null);
    
    if (!hasErrors && onSubmitRef.current) {
      try {
        await onSubmitRef.current(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
    
    setIsSubmitting(false);
    return !hasErrors;
  }, [values, fieldState, validateFormFields]);
  
  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  }, [submitForm]);
  
  // Get props for a form field
  const getFieldProps = useCallback((field: keyof T): FieldProps => {
    const fieldValue = values[field];
    const fieldData = fieldState[field as string] || { touched: false, error: null };
    
    return {
      name: field as string,
      value: fieldValue,
      onChange: (e: React.ChangeEvent<any>) => {
        const target = e.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        setFieldValue(field, value);
      },
      onBlur: () => setFieldTouched(field),
      error: fieldData.error,
      touched: fieldData.touched
    };
  }, [values, fieldState, setFieldValue, setFieldTouched]);
  
  // Get props for the form element
  const getFormProps = useCallback(() => ({
    onSubmit: handleSubmit
  }), [handleSubmit]);
  
  // Form actions
  const formActions: FormActions<T> = useMemo(() => ({
    setFieldValue,
    setFieldTouched,
    setFieldError,
    resetForm,
    submitForm,
    validateForm: validateFormFields,
    validateField: validateSingleField
  }), [
    setFieldValue,
    setFieldTouched,
    setFieldError,
    resetForm,
    submitForm,
    validateFormFields,
    validateSingleField
  ]);
  
  return {
    formState,
    formActions,
    getFieldProps,
    getFormProps
  };
}

export default useForm;