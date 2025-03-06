// src/components/ui/Input/Input.tsx

import React, { forwardRef, InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Input label text
   */
  label?: string;
  
  /**
   * Helper text displayed below the input
   */
  helperText?: string;
  
  /**
   * Error message displayed when the input is invalid
   */
  error?: string;
  
  /**
   * ID for the input element, auto-generated if not provided
   */
  id?: string;
  
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
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      id,
      className = '',
      leftIcon,
      rightIcon,
      onRightIconClick,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    // Generate a unique ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    const inputBaseClasses = 'block w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
    
    const inputErrorClasses = error 
      ? 'border-red-500 text-red-500 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300';
    
    const inputDisabledClasses = disabled 
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
      : '';
    
    const inputClasses = [
      inputBaseClasses,
      inputErrorClasses,
      inputDisabledClasses,
      leftIcon ? 'pl-10' : '',
      rightIcon ? 'pr-10' : '',
      className
    ].join(' ');
    
    return (
      <div className="mb-4">
        {label && (
          <label 
            htmlFor={inputId}
            className={`block text-sm font-medium mb-1 ${error ? 'text-red-500' : 'text-gray-700'}`}
          >
            {label}{required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            disabled={disabled}
            required={required}
            {...props}
          />
          
          {rightIcon && (
            <div 
              className={`absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 ${onRightIconClick ? 'cursor-pointer' : 'pointer-events-none'}`}
              onClick={onRightIconClick}
            >
              {rightIcon}
            </div>
          )}
        </div>
        
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
        
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;