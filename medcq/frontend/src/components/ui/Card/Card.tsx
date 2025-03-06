// src/components/ui/Card/Card.tsx

import React, { forwardRef, HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Card content
   */
  children: React.ReactNode;
  
  /**
   * Controls the padding inside the card
   * @default 'md'
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  
  /**
   * Adds a hover effect to the card
   * @default false
   */
  hoverable?: boolean;
  
  /**
   * Makes the card take up the full height of its container
   * @default false
   */
  fullHeight?: boolean;
  
  /**
   * Adds a border to the card
   * @default true
   */
  bordered?: boolean;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Card header content
   */
  children: React.ReactNode;
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Card body content
   */
  children: React.ReactNode;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Card footer content
   */
  children: React.ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      padding = 'md',
      hoverable = false,
      fullHeight = false,
      bordered = true,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClasses = 'bg-white rounded-lg overflow-hidden';
    
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6'
    };
    
    const hoverClasses = hoverable 
      ? 'transform transition duration-200 hover:shadow-lg hover:-translate-y-1' 
      : '';
    
    const heightClasses = fullHeight ? 'h-full' : '';
    
    const borderClasses = bordered ? 'border border-gray-200' : '';
    
    const cardClasses = [
      baseClasses,
      paddingClasses[padding],
      hoverClasses,
      heightClasses,
      borderClasses,
      className
    ].join(' ');
    
    return (
      <div
        ref={ref}
        className={cardClasses}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-4 py-3 border-b border-gray-200 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`p-4 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-4 py-3 border-t border-gray-200 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardBody.displayName = 'CardBody';
CardFooter.displayName = 'CardFooter';

export { CardHeader, CardBody, CardFooter };
export default Card;