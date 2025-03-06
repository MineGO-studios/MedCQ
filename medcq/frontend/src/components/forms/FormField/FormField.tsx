// src/components/forms/FormField/FormField.tsx

import React, { ReactNode } from 'react';
import { Input } from '../../ui';

export interface FormFieldProps {
  /**
   * Field label text
   */
  label?: string;
  
  /**
   * Field name (used for form state)
   */
  name: string;
  
  /**
   * Field value
   */
  value: any;
  
  /**
   * Change event handler
   */
  onChange: (e: React.ChangeEvent<any>) => void;
  
  /**
   * Blur event handler
   */
  onBlur: (e: React.FocusEvent<any>) => void;
  
  /**
   * Error message to display
   */
  error?: string | null;
  
  /**
   * Whether the field has been touched
   */
  touched?: boolean;
  
  /**
   * Helper text displayed below the input
   */
  helperText?: string;
  
  /**
   * If true, only show error when field is touched
   * @default true
   */
  showErrorOnTouched?: boolean;
  
  /**
   * Input type
   * @default 'text'
   */
  type?: string;
  
  /**
   * Icon component to show at the beginning of the input
   */
  leftIcon?: React.ReactNode;
  
  /**
   * Icon component to show at the end of the input
   */
  rightIcon?: React.ReactNode;
  
  /**
   * Callback when right icon is clicked
   */
  onRightIconClick?: () => void;
  
  /**
   * Custom input component to render instead of default Input
   */
  component?: React.ComponentType<any>;
  
  /**
   * Additional props to pass to the input component
   */
  inputProps?: Record<string, any>;
  
  /**
   * When true, the field is required
   * @default false
   */
  required?: boolean;
  
  /**
   * When true, the field is disabled
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * FormField component integrates with useForm hook to provide validated form controls
 * Handles displaying labels, errors, and integrating with input components
 */
const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  touched = false,
  helperText,
  showErrorOnTouched = true,
  type = 'text',
  leftIcon,
  rightIcon,
  onRightIconClick,
  component: Component,
  inputProps = {},
  required = false,
  disabled = false,
  className = '',
}) => {
  // Only show error if field is touched (when showErrorOnTouched is true)
  const displayError = showErrorOnTouched ? touched && error : error;
  
  // If a custom component is provided, use it instead of Input
  if (Component) {
    return (
      <Component
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        error={displayError}
        helperText={helperText}
        label={label}
        required={required}
        disabled={disabled}
        {...inputProps}
      />
    );
  }
  
  // Otherwise use our Input component
  return (
    <Input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      label={label}
      error={displayError}
      helperText={helperText}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      onRightIconClick={onRightIconClick}
      required={required}
      disabled={disabled}
      className={className}
      {...inputProps}
    />
  );
};

export default FormField;