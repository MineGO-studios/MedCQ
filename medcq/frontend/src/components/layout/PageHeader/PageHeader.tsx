// src/components/layout/PageHeader/PageHeader.tsx

import React from 'react';
import Container from '../Container/Container';

export interface PageHeaderProps {
  /**
   * Main title of the page
   */
  title: string;
  
  /**
   * Subtitle or description of the page
   */
  subtitle?: string;
  
  /**
   * Optional action buttons or elements to display in the header
   */
  actions?: React.ReactNode;
  
  /**
   * Background color class
   * @default 'bg-white'
   */
  bgColor?: string;
  
  /**
   * When true, add a bottom border
   * @default true
   */
  bordered?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Page header component with title, subtitle, and optional action buttons
 * Provides consistent styling for main page headings
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  bgColor = 'bg-white',
  bordered = true,
  className = '',
}) => {
  return (
    <div className={`${bgColor} ${bordered ? 'border-b border-gray-200' : ''} ${className}`}>
      <Container>
        <div className="py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="mt-4 flex md:mt-0 md:ml-4">
                {actions}
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default PageHeader;