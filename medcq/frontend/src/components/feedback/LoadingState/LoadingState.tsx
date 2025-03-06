// src/components/feedback/LoadingState/LoadingState.tsx

import React from 'react';

export interface LoadingStateProps {
  /**
   * Loading message to display
   * @default 'Loading...'
   */
  message?: string;
  
  /**
   * Size of the loading spinner
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * When true, renders a full-page loading state
   * @default false
   */
  fullPage?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Component for displaying loading states with customizable appearance
 * Can be used for both inline and full-page loading indicators
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  fullPage = false,
  className = '',
}) => {
  // Size classes mapping
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  
  // Base container classes
  const containerClasses = [
    'flex flex-col items-center justify-center',
    fullPage ? 'fixed inset-0 bg-white bg-opacity-80 z-50' : 'py-8',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <svg 
        className={`animate-spin text-blue-600 ${sizeClasses[size]}`} 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {message && (
        <p className="mt-3 text-gray-700 text-sm font-medium">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingState;