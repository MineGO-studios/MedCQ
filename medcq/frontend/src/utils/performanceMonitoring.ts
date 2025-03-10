// src/utils/performanceMonitoring.ts
export const measurePagePerformance = (pageName: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = Math.round(endTime - startTime);
      
      // Log to console during development
      console.log(`${pageName} render time: ${loadTime}ms`);
      
      // In production, send to analytics
      if (process.env.NODE_ENV === 'production') {
        try {
          // Replace with your actual analytics implementation
          window.analytics?.track('Page Performance', {
            page: pageName,
            loadTimeMs: loadTime,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Failed to track performance metric:', error);
        }
      }
      
      return loadTime;
    };
  };
  
  // Usage in a component:
  // src/pages/QuizDetailPage.tsx
  useEffect(() => {
    const endMeasurement = measurePagePerformance('QuizDetailPage');
    
    return endMeasurement;
  }, []);