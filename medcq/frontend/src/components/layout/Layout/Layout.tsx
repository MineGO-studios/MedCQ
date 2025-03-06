// src/components/layout/Layout/Layout.tsx
import React, { ReactNode } from 'react';
import Header from '../../Header';
import SkipToContent from '../../a11y/SkipToContent';
import { useAuth } from '../../../context/AuthContext';

interface LayoutProps {
  /**
   * Page title to be set in the document head
   */
  title?: string;

  /**
   * Main content of the page
   */
  children: ReactNode;

  /**
   * When true, the header will not be displayed
   * @default false
   */
  hideHeader?: boolean;

  /**
   * When true, the footer will not be displayed
   * @default false
   */
  hideFooter?: boolean;

  /**
   * Additional CSS classes for the main content container
   */
  className?: string;
}

/**
 * Primary layout component for all pages
 * Provides consistent header, footer, and main content areas
 */
const Layout: React.FC<LayoutProps> = ({
  title,
  children,
  hideHeader = false,
  hideFooter = false,
  className = '',
}) => {
  const { authState } = useAuth();

  // Update document title
  React.useEffect(() => {
    if (title) {
      document.title = `${title} | MedCQ`;
    } else {
      document.title = 'MedCQ - Medical MCQ Platform';
    }
  }, [title]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Accessibility skip link */}
      <SkipToContent />

      {/* Application header */}
      {!hideHeader && <Header />}

      {/* Main content area */}
      <main id="main-content" className={`flex-grow ${className}`} tabIndex={-1}>
        {children}
      </main>

      {/* Application footer */}
      {!hideFooter && (
        <footer className="bg-white border-t border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <p className="text-gray-500 text-sm">
                  &copy; {new Date().getFullYear()} MedCQ. All rights reserved.
                </p>
              </div>
              <div className="flex space-x-6">
                <a href="/terms" className="text-gray-500 hover:text-gray-700 text-sm">
                  Terms of Service
                </a>
                <a href="/privacy" className="text-gray-500 hover:text-gray-700 text-sm">
                  Privacy Policy
                </a>
                <a href="/contact" className="text-gray-500 hover:text-gray-700 text-sm">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;
