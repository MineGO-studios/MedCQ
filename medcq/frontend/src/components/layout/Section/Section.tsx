// src/components/layout/Section/Section.tsx

import React, { forwardRef, HTMLAttributes } from 'react';
import Container from '../Container/Container';

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  /**
   * Section content
   */
  children: React.ReactNode;
  
  /**
   * Section title
   */
  title?: string;
  
  /**
   * Section subtitle or description
   */
  subtitle?: string;
  
  /**
   * Background color for the section
   * @default 'bg-white'
   */
  bgColor?: string;
  
  /**
   * Vertical padding for the section
   * @default 'py-12'
   */
  padding?: string;
  
  /**
   * When true, wrap content in a Container component
   * @default true
   */
  withContainer?: boolean;
  
  /**
   * Container props when withContainer is true
   */
  containerProps?: Omit<React.ComponentProps<typeof Container>, 'children'>;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Section component for dividing page content into logical segments
 * Provides consistent spacing and optional container wrapping
 */
const Section = forwardRef<HTMLElement, SectionProps>(
  (
    {
      children,
      title,
      subtitle,
      bgColor = 'bg-white',
      padding = 'py-12',
      withContainer = true,
      containerProps,
      className = '',
      ...props
    },
    ref
  ) => {
    const sectionClasses = [
      bgColor,
      padding,
      className
    ].filter(Boolean).join(' ');
    
    const sectionContent = (
      <>
        {(title || subtitle) && (
          <div className="text-center mb-10">
            {title && (
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </>
    );
    
    return (
      <section
        ref={ref}
        className={sectionClasses}
        {...props}
      >
        {withContainer ? (
          <Container {...containerProps}>
            {sectionContent}
          </Container>
        ) : (
          sectionContent
        )}
      </section>
    );
  }
);

Section.displayName = 'Section';

export default Section;