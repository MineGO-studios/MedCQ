// src/components/forms/Field/Field.tsx

import React from 'react';
import { useFormContext } from '../Forms/Form';
import FormField, { FormFieldProps } from '../FormField/FormField';

export type FieldProps = Omit<FormFieldProps, 'value' | 'onChange' | 'onBlur' | 'error' | 'touched'> & {
  /**
   * Field name (used for form state)
   */
  name: string;
};

/**
 * Field component that automatically connects to Form context
 * Simplifies form field usage by handling value/onChange/error connections
 */
const Field: React.FC<FieldProps> = ({ name, ...props }) => {
  // Get form context
  const { getFieldProps } = useFormContext();
  
  // Get field-specific props from form context
  const fieldProps = getFieldProps(name);
  
  return (
    <FormField
      {...props}
      {...fieldProps}
    />
  );
};

export default Field;