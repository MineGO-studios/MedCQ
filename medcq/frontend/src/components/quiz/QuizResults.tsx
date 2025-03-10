// src/components/quiz/QuizResults.tsx

import React, { useMemo } from 'react';
import { Card, CardBody, CardHeader, Button } from '../../components/ui';
import { Quiz, QuizResult } from '../../types';

interface QuizResultsProps {
  /**
   * Quiz data
   */
  quiz: Quiz;
  
  /**
   * Quiz result data
   */
  result: QuizResult;
  
  /**
   * User's answers
   */
  userAnswers: Record<string, string | string[]>;
  
  /**
   * Callback when "View Details" button is clicked
   */
  onViewDetails: () => void;
  
  /**
   * Callback when "Try Again" button is clicked
   */
  onRetryQuiz: () => void;
  
  /**
   * Whether to show detailed question breakdown
   * @default true
   */
  showDetails?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Displays quiz results after submission
 * Shows score, time taken, and optionally detailed question breakdown
 */
const QuizResults: React.FC<QuizResultsProps> = ({
  quiz,
  result,
  userAnswers,
  onViewDetails,
  onRetryQuiz,
  showDetails = true,
  className = '',
}) => {
  // Format time taken in MM:SS
  const formatTimeTaken = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`;
    }
    
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  };

  // Calculate pass/fail status
  const isPassed = useMemo(() => {
    if (quiz.passScore) {
      return result.score >= quiz.passScore;
    }
    return result.score >= 70; // Default passing threshold if not specified
  }, [quiz.passScore, result.score]);

  // Get color classes based on score
  const getScoreColorClasses = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get color classes for correct/incorrect
  const getAnswerColorClasses = (isCorrect: boolean): string => {
    return isCorrect ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Results summary card */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold text-gray-900">Quiz Results</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score */}
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-500 uppercase mb-1">Your Score</div>
              <div className={`text-4xl font-bold ${getScoreColorClasses(result.score)}`}>
                {result.score.toFixed(1)}%
              </div>
              <div className={`mt-2 px-3 py-1 rounded-full text-sm font-medium
                ${isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isPassed ? 'Passed' : 'Failed'}
              </div>
            </div>
            
            {/* Statistics */}
            <div className="flex flex-col justify-center space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Questions</h4>
                <p className="mt-1 text-lg font-medium text-gray-900">
                  {result.correctCount} / {result.totalCount} correct
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Time Taken</h4>
                <p className="mt-1 text-lg font-medium text-gray-900">
                  {formatTimeTaken(result.timeTakenSeconds)}
                </p>
              </div>
              
              {quiz.passScore && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Pass Score</h4>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {quiz.passScore}%
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <Button 
              variant="outline" 
              onClick={onViewDetails}
            >
              Back to Quiz Details
            </Button>
            <Button 
              onClick={onRetryQuiz}
            >
              Try Again
            </Button>
          </div>
        </CardBody>
      </Card>
      
      {/* Detailed question breakdown */}
      {showDetails && (
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-gray-900">Question Details</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {quiz.questions.map((question, index) => {
                const questionId = question.id;
                const isCorrect = result.questionResults[questionId] === true;
                const userAnswer = userAnswers[questionId] || [];
                const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
                
                // Create a map of option ID to option text for easier lookup
                const optionMap = question.options.reduce((acc, option) => {
                  acc[option.id] = option.text;
                  return acc;
                }, {} as Record<string, string>);
                
                // Get correctly answered labels
                const correctAnswers = question.options
                  .filter(option => option.isCorrect)
                  .map(option => option.text);
                
                // Get user answered labels
                const userAnsweredLabels = userAnswerArray
                  .map(optionId => optionMap[optionId])
                  .filter(Boolean);
                
                return (
                  <div key={questionId} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                    <div className="flex items-start">
                      <div className={`mr-3 font-medium ${getAnswerColorClasses(isCorrect)}`}>
                        {isCorrect ? (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-1">
                          Question {index + 1}: {question.text}
                        </h4>
                        
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Your Answer:</p>
                            {userAnsweredLabels.length > 0 ? (
                              <ul className="mt-1 list-disc pl-5 text-gray-700">
                                {userAnsweredLabels.map((label, i) => (
                                  <li key={i}>{label}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 text-gray-500 italic">No answer provided</p>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-gray-500">Correct Answer:</p>
                            <ul className="mt-1 list-disc pl-5 text-gray-700">
                              {correctAnswers.map((answer, i) => (
                                <li key={i}>{answer}</li>
                              ))}
                            </ul>
                          </div>
                          
                          {question.explanation && (
                            <div>
                              <p className="text-sm font-medium text-gray-500">Explanation:</p>
                              <p className="mt-1 text-gray-700">{question.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default QuizResults;