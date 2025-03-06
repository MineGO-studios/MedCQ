// src/components/examples/LoginForm/LoginForm.tsx

import React, { useState } from 'react';
import { Button } from '../../ui';
import { Form, Field } from '../../forms';
import { validationRules } from '../../../utils/validation';

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  /**
   * Callback when login form is submitted and valid
   */
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
  
  /**
   * Whether the form is currently submitting
   */
  isSubmitting?: boolean;
  
  /**
   * Error message to display (e.g., from failed API request)
   */
  error?: string | null;
}

/**
 * Login form with email, password, and remember me fields
 * Implements form validation and submission handling
 */
const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  isSubmitting = false,
  error
}) => {
  const [showPassword, setShowPassword] = useState(false);
  
  // Initial form values
  const initialValues: LoginFormValues = {
    email: '',
    password: '',
    rememberMe: false
  };
  
  // Validation schema
  const validationSchema = {
    email: [
      validationRules.required('Email is required'),
      validationRules.email('Please enter a valid email address')
    ],
    password: [
      validationRules.required('Password is required'),
      validationRules.minLength(8, 'Password must be at least 8 characters')
    ]
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };
  
  const passwordRightIcon = (
    <button
      type="button"
      onClick={togglePasswordVisibility}
      tabIndex={-1}
      className="focus:outline-none"
    >
      {showPassword ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
        </svg>
      )}
    </button>
  );
  
  return (
    <Form
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
      className="space-y-6"
    >
      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <Field
        name="email"
        label="Email Address"
        type="email"
        autoComplete="email"
        required
      />
      
      <Field
        name="password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        rightIcon={passwordRightIcon}
        required
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Field
            name="rememberMe"
            type="checkbox"
            component={({ value, onChange, ...props }) => (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={onChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  {...props}
                />
                <span className="ml-2 text-sm text-gray-700">Remember me</span>
              </label>
            )}
          />
        </div>
        
        <div className="text-sm">
          <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
            Forgot your password?
          </a>
        </div>
      </div>
      
      <div>
        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
        >
          Sign in
        </Button>
      </div>
    </Form>
  );
};

export default LoginForm;