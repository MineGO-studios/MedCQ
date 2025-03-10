// src/utils/errorTracking.ts
export interface ErrorContext {
    user?: {
      id: string;
      email?: string;
    };
    component?: string;
    action?: string;
    additionalData?: Record<string, any>;
  }
  
  export class ErrorTracker {
    private static instance: ErrorTracker;
    private isInitialized = false;
    private errorQueue: Array<{error: Error; context: ErrorContext}> = [];
    
    private constructor() {}
    
    /**
     * Get singleton instance
     */
    public static getInstance(): ErrorTracker {
      if (!ErrorTracker.instance) {
        ErrorTracker.instance = new ErrorTracker();
      }
      return ErrorTracker.instance;
    }
    
    /**
     * Initialize error tracking
     */
    public init(): void {
      if (this.isInitialized) return;
      
      // Set up global error handler
      window.addEventListener('error', (event) => {
        this.captureError(event.error, {
          action: 'global-error',
        });
      });
      
      // Set up unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error 
          ? event.reason 
          : new Error(String(event.reason));
        
        this.captureError(error, {
          action: 'unhandled-rejection',
        });
      });
      
      // Process any queued errors
      this.processErrorQueue();
      
      this.isInitialized = true;
    }
    
    /**
     * Capture and report an error
     */
    public captureError(error: Error, context: ErrorContext = {}): void {
      // Add current user info if available
      const user = window.currentUser || {};
      const enrichedContext = {
        ...context,
        user: context.user || user,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };
      
      if (this.isInitialized) {
        this.sendErrorToBackend(error, enrichedContext);
      } else {
        // Queue error for later processing
        this.errorQueue.push({ error, context: enrichedContext });
      }
      
      // Always log to console for development
      console.error('Error captured:', error, enrichedContext);
    }
    
    /**
     * Process queued errors after initialization
     */
    private processErrorQueue(): void {
      if (!this.errorQueue.length) return;
      
      // Process and send all queued errors
      for (const { error, context } of this.errorQueue) {
        this.sendErrorToBackend(error, context);
      }
      
      // Clear the queue
      this.errorQueue = [];
    }
    
    /**
     * Send error to backend API
     */
    private sendErrorToBackend(error: Error, context: ErrorContext): void {
      // Prepare error data
      const errorData = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        context,
      };
      
      // Send to backend API
      fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
        // Use keepalive to ensure the request completes even on page unload
        keepalive: true,
      }).catch(e => {
        // Silently fail - we don't want error reporting to cause more errors
        console.error('Failed to send error report:', e);
      });
    }
  }
  
  // Create and export singleton instance
  export const errorTracker = ErrorTracker.getInstance();
  
  // Initialize in the application entry point
  // src/main.tsx
  import { errorTracker } from './utils/errorTracking';
  
  // Initialize error tracking
  errorTracker.init();
  
  // Usage example in components
  import { errorTracker } from '../../utils/errorTracking';
  
  try {
    // Risky operation
    const result = await quizzesApi.submitQuizAttempt(request);
    // Success handling
  } catch (error) {
    // Capture error with context
    errorTracker.captureError(error as Error, {
      component: 'QuizAttemptPage',
      action: 'submitQuiz',
      additionalData: {
        quizId: quiz?.id,
        attemptId: attemptIdRef.current,
        timeSpent: calculateTimeTaken(),
      }
    });
    
    // Show user-friendly error
    setError('Failed to submit quiz. Please try again.');
  }