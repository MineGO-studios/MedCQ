// src/hooks/useFocusTrap.ts

import { useEffect, useRef } from 'react';

/**
 * Hook to trap focus within a container element
 * Useful for modals, dropdowns, and other focused UI elements
 * 
 * @param active - Whether the focus trap is active
 * @param returnFocusOnDeactivation - Whether to return focus to the previous element when deactivated
 * @returns A ref object to attach to the container element
 */
export function useFocusTrap(
  active = true, 
  returnFocusOnDeactivation = true
) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (!active) return;
    
    // Store the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    // Focus the container if it has no focusable elements
    if (containerRef.current) {
      containerRef.current.focus();
    }
    
    const container = containerRef.current;
    if (!container) return;
    
    // Get all focusable elements within the container
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (firstElement) {
      firstElement.focus();
    }
    
    // Handle Tab key to keep focus trapped within the container
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      // If there are no focusable elements, do nothing
      if (focusableElements.length === 0) return;
      
      // Handle Shift+Tab
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } 
      // Handle Tab
      else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Return focus to the previous element when deactivated
      if (returnFocusOnDeactivation && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, returnFocusOnDeactivation]);
  
  return containerRef;
}

export default useFocusTrap;