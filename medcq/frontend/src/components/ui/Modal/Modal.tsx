// src/components/ui/Modal/Modal.tsx

import React, { forwardRef, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  /**
   * Controls whether the modal is open
   */
  isOpen: boolean;
  
  /**
   * Callback when the modal is closed
   */
  onClose: () => void;
  
  /**
   * Modal title shown in the header
   */
  title?: string;
  
  /**
   * Modal content
   */
  children: React.ReactNode;
  
  /**
   * Modal footer content
   */
  footer?: React.ReactNode;
  
  /**
   * Size of the modal
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /**
   * When true, clicking outside the modal will not close it
   * @default false
   */
  static?: boolean;
  
  /**
   * When true, pressing ESC key will not close the modal
   * @default false
   */
  disableEscapeKey?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      footer,
      size = 'md',
      static: isStatic = false,
      disableEscapeKey = false,
      className = '',
    },
    ref
  ) => {
    const modalRef = useRef<HTMLDivElement | null>(null);
    const mergedRef = (node: HTMLDivElement) => {
      modalRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };
    
    // Handle ESC key to close modal
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !disableEscapeKey) {
          onClose();
        }
      };
      
      if (isOpen) {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
      }
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = ''; // Restore scrolling
      };
    }, [isOpen, disableEscapeKey, onClose]);
    
    // Handle click outside to close modal
    const handleBackdropClick = (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node) && !isStatic) {
        onClose();
      }
    };
    
    // Size classes
    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-full mx-4'
    };
    
    // Don't render if not open
    if (!isOpen) return null;
    
    // Create portal to render modal at the end of the document body
    return createPortal(
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
        <div 
          className="flex min-h-screen items-center justify-center p-4 text-center"
          onClick={handleBackdropClick}
        >
          <div
            ref={mergedRef}
            className={`bg-white rounded-lg shadow-xl transform transition-all ${sizeClasses[size]} w-full p-6 ${className}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
          >
            {/* Modal header */}
            {title && (
              <div className="mb-4 flex justify-between items-center">
                <h3 id="modal-title" className="text-lg font-medium text-gray-900">
                  {title}
                </h3>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            {/* Modal content */}
            <div className="mt-2">
              {children}
            </div>
            
            {/* Modal footer */}
            {footer && (
              <div className="mt-5 sm:mt-6">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }
);

Modal.displayName = 'Modal';

export default Modal;