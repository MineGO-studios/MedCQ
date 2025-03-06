// src/components/forms/Form/Form.tsx (updated)

import React, { FormHTMLAttributes, createContext, useContext, ReactNode } from 'react';
import { FormState, FormActions, useForm, UseFormResult } from '../../../hooks/useForm';



interface FormContextValue<T extends Record<string, unknown>> {
  /**
   * Form state including values, errors, and metadata
   */
  formState: FormState<T>;
  
  /**
   * Form actions for updating state
   */
  formActions: FormActions<T>;
  
  /**
   * Get props for a form field
   */
  getFieldProps: UseFormResult<T>['getFieldProps'];
}

// Create context with a generic parameter
const FormContext = createContext<FormContextValue<Record<string, unknown>> | undefined>(undefined);

// Helper hook to use form context with type safety
export function useFormContext<T extends Record<string, unknown>>() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a Form component');
  }
  return context as FormContextValue<T>;
}

export interface FormProps<T extends Record<string, unknown>> extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  /**
   * Initial form values
   */
  initialValues: T;
  
  /**
   * Validation schema
   */
  validationSchema?: Record<string, unknown[]>;
  
  /**
   * Callback when form is submitted and validation passes
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
  
  /**
   * Form content
   */
  children: ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Enhanced Form component with built-in validation and state management
 * Uses the useForm hook internally and provides context for child components
 */
function Form<T extends Record<string, unknown>>({
  initialValues,
  validationSchema,
  onSubmit,
  validateOnChange,
  validateOnBlur,
  children,
  className = '',
  ...props
}: FormProps<T>) {
  // Use the form hook internally
  const form = useForm<T>({
    initialValues,
    validationSchema,
    onSubmit,
    validateOnChange,
    validateOnBlur
  });
  
  const { formState, formActions, getFieldProps, getFormProps } = form;
  const { onSubmit: handleSubmit } = getFormProps();
  
  // Provide form context to children
  return (
    <FormContext.Provider value={{ formState, formActions, getFieldProps }}>
      <form
        className={className}
        onSubmit={handleSubmit}
        noValidate
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

export default Form;