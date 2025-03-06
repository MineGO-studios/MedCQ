// src/components/layout/Grid/Grid.tsx

import React, { forwardRef, HTMLAttributes } from 'react';

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Grid content (typically GridItem components)
   */
  children: React.ReactNode;
  
  /**
   * Number of columns at different breakpoints
   * @default { sm: 1, md: 2, lg: 3, xl: 4 }
   */
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  
  /**
   * Gap between grid items
   * @default 'gap-6'
   */
  gap?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export interface GridItemProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * GridItem content
   */
  children: React.ReactNode;
  
  /**
   * Number of columns to span at different breakpoints
   */
  span?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Responsive grid layout component
 * Provides customizable columns and gap settings based on screen sizes
 */
const Grid = forwardRef<HTMLDivElement, GridProps>(
  (
    {
      children,
      columns = { sm: 1, md: 2, lg: 3, xl: 4 },
      gap = 'gap-6',
      className = '',
      ...props
    },
    ref
  ) => {
    // Generate column classes for each breakpoint
    const columnClasses = [
      'grid',
      gap,
      columns.sm && `grid-cols-${columns.sm}`,
      columns.md && `md:grid-cols-${columns.md}`,
      columns.lg && `lg:grid-cols-${columns.lg}`,
      columns.xl && `xl:grid-cols-${columns.xl}`,
      className
    ].filter(Boolean).join(' ');
    
    return (
      <div
        ref={ref}
        className={columnClasses}
        {...props}
      >
        {children}
      </div>
    );
  }
);

/**
 * Grid Item component to be used within Grid
 * Supports column span configuration at different breakpoints
 */
const GridItem = forwardRef<HTMLDivElement, GridItemProps>(
  (
    {
      children,
      span,
      className = '',
      ...props
    },
    ref
  ) => {
    // Generate span classes for each breakpoint
    const spanClasses = [
      span?.sm && `col-span-${span.sm}`,
      span?.md && `md:col-span-${span.md}`,
      span?.lg && `lg:col-span-${span.lg}`,
      span?.xl && `xl:col-span-${span.xl}`,
      className
    ].filter(Boolean).join(' ');
    
    return (
      <div
        ref={ref}
        className={spanClasses}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';
GridItem.displayName = 'GridItem';

export { GridItem };
export default Grid;