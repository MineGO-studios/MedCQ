// src/utils/performanceMonitoring.ts
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;
  
  /**
   * Record a performance metric
   */
  record(name: string, value: number): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date().toISOString()
    };
    
    this.metrics.push(metric);
    
    // Trim if needed
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Performance metric: ${name} = ${value.toFixed(2)}ms`);
    }
    
    // In production, send to backend periodically
    if (process.env.NODE_ENV === 'production') {
      this.queueMetricForUpload(metric);
    }
  }
  
  /**
   * Get metrics by name
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name === name);
  }
  
  /**
   * Get average value for a metric
   */
  getAverage(name: string): number {
    const metrics = this.getMetrics(name);
    if (!metrics.length) return 0;
    
    const sum = metrics.reduce((total, metric) => total + metric.value, 0);
    return sum / metrics.length;
  }
  
  /**
   * Queue metric for batch upload
   */
  private queueMetricForUpload(metric: PerformanceMetric): void {
    // Add to batch queue
    // Implementation details depend on your backend API
  }
  
  /**
   * Upload metrics in batch
   */
  private uploadMetrics(): void {
    // Implementation details for batch upload
  }
}

export const performance = new PerformanceMonitor();

// High-order component for measuring component render times
export const withPerformanceTracking = (
  Component: React.ComponentType<any>,
  metricName: string
): React.FC<any> => {
  const WrappedComponent: React.FC<any> = (props) => {
    const renderStart = performance.now();
    
    useEffect(() => {
      const renderTime = performance.now() - renderStart;
      performanceMonitor.record(`${metricName}-render`, renderTime);
      
      return () => {
        const unmountStart = performance.now();
        performanceMonitor.record(`${metricName}-unmount`, performance.now() - unmountStart);
      };
    }, []);
    
    return <Component {...props} />;
  };
  
  WrappedComponent.displayName = `withPerformanceTracking(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
};