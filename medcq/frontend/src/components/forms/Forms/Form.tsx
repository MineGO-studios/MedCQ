// src/components/forms/Form/Form.tsx

import React, { forwardRef, FormHTMLAttributes, createContext, useContext } from 'react';

interface FormContextValue {
  /**
   * Indicates if the form is in the process of submitting
   */
  isSubmitting?: boolean;
}

const FormContext = createContext<FormContextValue>({
  isSubmitting: false,
});

export const useFormContext = () => useContext(FormContext);

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  /**
   * Form content
   */
  children: React.ReactNode;
  
  /**
   * Callback when form is submitted with validation passed
   */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  
  /**
   * Indicates if the form is in the process of submitting
   * @default false
   */
  isSubmitting?: boolean;
}

const Form = forwardRef<HTMLFormElement, FormProps>(
  (
    {
      children,
      onSubmit,
      isSubmitting = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      if (onSubmit) {
        e.preventDefault();
        onSubmit(e);
      }
    };
    
    return (
      <FormContext.Provider value={{ isSubmitting }}>
        <form
          ref={ref}
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
);

Form.displayName = 'Form';

export default Form;