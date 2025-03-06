// src/components/layout/Container/Container.tsx

import React, { forwardRef, HTMLAttributes } from 'react';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Container content
   */
  children: React.ReactNode;
  
  /**
   * Container max width
   * @default 'max-w-7xl'
   */
  maxWidth?: 'max-w-screen-sm' | 'max-w-screen-md' | 'max-w-screen-lg' | 'max-w-screen-xl' | 'max-w-7xl' | 'max-w-full' | 'max-w-none';
  
  /**
   * Container padding
   * @default 'px-4 sm:px-6 lg:px-8'
   */
  padding?: string;
  
  /**
   * Centers the container horizontally
   * @default true
   */
  centered?: boolean;
}

/**
 * Container component for controlling content width and padding consistently
 * Implements responsive padding and max-width constraints
 */
const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      maxWidth = 'max-w-7xl',
      padding = 'px-4 sm:px-6 lg:px-8',
      centered = true,
      className = '',
      ...props
    },
    ref
  ) => {
    const containerClasses = [
      maxWidth,
      padding,
      centered ? 'mx-auto' : '',
      className
    ].filter(Boolean).join(' ');
    
    return (
      <div
        ref={ref}
        className={containerClasses}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';

export default Container;