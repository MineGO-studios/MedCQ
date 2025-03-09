// src/utils/errorHandling.ts

/**
 * Standardized error handling function
 * @param error The error object
 * @param fallbackMessage Default message if error doesn't contain useful information
 * @returns User-friendly error message
 */
export const getErrorMessage = (
    error: unknown, 
    fallbackMessage = 'An unexpected error occurred. Please try again later.'
  ): string => {
    // Handle Error instances
    if (error instanceof Error) {
      return error.message || fallbackMessage;
    }
    
    // Handle API error responses
    if (typeof error === 'object' && error !== null) {
      // Handle Axios error response
      if ('response' in error && error.response && typeof error.response === 'object') {
        const response = error.response as any;
        
        // Extract error message from response
        if (response.data && typeof response.data === 'object' && 'message' in response.data) {
          return response.data.message;
        }
        
        if (response.data && typeof response.data === 'object' && 'error' in response.data) {
          return response.data.error;
        }
        
        // Use status text if available
        if (response.statusText) {
          return `Error: ${response.statusText}`;
        }
      }
      
      // Handle error with message property
      if ('message' in error && typeof error.message === 'string') {
        return error.message;
      }
    }
    
    // Handle string errors
    if (typeof error === 'string') {
      return error;
    }
    
    // Default fallback
    return fallbackMessage;
  };