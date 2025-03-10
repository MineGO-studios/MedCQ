// src/components/quiz/QuizTimer.tsx

import React from 'react';

interface QuizTimerProps {
  /**
   * Time remaining in seconds
   */
  timeRemaining: number;
  
  /**
   * Function to format the time (optional)
   */
  formatTime?: (seconds: number) => string;
  
  /**
   * Whether to show the timer in warning state (usually when time is running low)
   */
  isWarning?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Displays a timer for quiz attempts
 * Changes appearance when time is running low
 */
const QuizTimer: React.FC<QuizTimerProps> = ({
  timeRemaining,
  formatTime,
  isWarning = false,
  className = '',
}) => {
  // Default time formatter (MM:SS)
  const defaultFormatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Use provided formatter or default
  const formattedTime = formatTime ? formatTime(timeRemaining) : defaultFormatTime(timeRemaining);
  
  // Timer classes based on state
  const timerClasses = [
    'flex items-center px-3 py-1 rounded-md font-mono text-lg',
    isWarning ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700',
    className
  ].join(' ');

  return (
    <div className={timerClasses} role="timer" aria-live="polite">
      <svg 
        className="h-5 w-5 mr-2" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      <span>{formattedTime}</span>
    </div>
  );
};

export default QuizTimer;