// src/components/quiz/QuizProgress.tsx

import React from 'react';

interface QuizProgressProps {
  /**
   * Current question number (1-based)
   */
  current: number;
  
  /**
   * Total number of questions
   */
  total: number;
  
  /**
   * Percentage of questions answered (0-100)
   */
  percentage: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Displays progress through a quiz with a progress bar
 * Shows both numeric progress (e.g., "5 of 10") and visual progress bar
 */
const QuizProgress: React.FC<QuizProgressProps> = ({
  current,
  total,
  percentage,
  className = '',
}) => {
  // Ensure percentage is within bounds
  const boundedPercentage = Math.max(0, Math.min(100, percentage));
  
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center mb-1">
        <span className="text-sm text-gray-600 mr-2">Progress:</span>
        <span className="text-sm font-medium text-gray-900">{current} of {total}</span>
      </div>
      
      <div className="h-2 w-64 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-600 rounded-full"
          style={{ width: `${boundedPercentage}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={boundedPercentage}
        />
      </div>
    </div>
  );
};

export default QuizProgress;