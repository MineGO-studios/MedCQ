// src/components/feedback/EmptyState/EmptyState.tsx

import React from 'react';
import { Button } from '../../ui';

export interface EmptyStateProps {
  /**
   * Empty state title
   * @default 'No items found'
   */
  title?: string;
  
  /**
   * Empty state description
   */
  description?: string;
  
  /**
   * Icon component to display
   */
  icon?: React.ReactNode;
  
  /**
   * Button text for action
   */
  buttonText?: string;
  
  /**
   * Callback when button is clicked
   */
  onAction?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Component for displaying empty states with optional action button
 * Used when a list or collection has no items to display
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No items found',
  description,
  icon,
  buttonText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`py-12 text-center ${className}`}>
      {icon && (
        <div className="inline-flex items-center justify-center rounded-full bg-gray-100 p-3 mb-4">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-medium text-gray-900">
        {title}
      </h3>
      
      {description && (
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          {description}
        </p>
      )}
      
      {buttonText && onAction && (
        <div className="mt-6">
          <Button variant="primary" onClick={onAction}>
            {buttonText}
          </Button>
        </div>
      )}
    </div>
  );
};



export interface ErrorStateProps {
  /**
   * Error title
   * @default 'Something went wrong'
   */
  title?: string;
  
  /**
   * Error description
   */
  description?: string;
  
  /**
   * Icon component to display
   */
  icon?: React.ReactNode;
  
  /**
   * Button text for action
   */
  buttonText?: string;
  
  /**
   * Callback when button is clicked
   */
  onAction?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description,
  icon,
  buttonText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`py-12 text-center ${className}`}>
      {icon || (
        <div className="inline-flex items-center justify-center rounded-full bg-red-100 p-3 mb-4">
          <svg 
            className="h-6 w-6 text-red-600" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </div>
      )}
      
      <h3 className="text-lg font-medium text-gray-900">
        {title}
      </h3>
      
      {description && (
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          {description}
        </p>
      )}
      
      {buttonText && onAction && (
        <div className="mt-6">
          <Button variant="primary" onClick={onAction}>
            {buttonText}
          </Button>
        </div>
      )}
    </div>
  );
};

export { EmptyState };
export default ErrorState;
