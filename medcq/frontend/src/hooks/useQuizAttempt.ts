// src/hooks/useQuizAttempt.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { QuizResult } from '../types';
import { Quiz } from '../types/domain';
import { quizzesApi } from '../services/api';

interface UseQuizAttemptProps {
  quizId: string;
  onComplete?: (result: QuizResult) => void;
}

interface UseQuizAttemptResult {
  quiz: Quiz | null;
  isLoading: boolean;
  error: string | null;
  currentQuestionIndex: number;
  userAnswers: Record<string, string | string[]>;
  timeRemaining: number | null;
  isSubmitting: boolean;
  quizResult: QuizResult | null;
  isQuizComplete: boolean;
  attemptId: string | null;
  timeTakenSeconds: number;
  
  // Methods
  startQuizAttempt: () => Promise<void>;
  submitQuiz: () => Promise<void>;
  handleAnswerChange: (questionId: string, answer: string | string[]) => void;
  goToNextQuestion: () => void;
  goToPreviousQuestion: () => void;
  goToQuestion: (index: number) => void;
}

/**
 * Hook for managing quiz attempt state and logic
 */
const useQuizAttempt = ({ quizId, onComplete }: UseQuizAttemptProps): UseQuizAttemptResult => {
  // State management
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string | string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [timeTakenSeconds, setTimeTakenSeconds] = useState(0);
  
  // Refs
  const timerIntervalRef = useRef<number | null>(null);
  const attemptIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, []);
  
  // Start timer for counting elapsed time
  useEffect(() => {
    if (quiz && !isQuizComplete && !timerIntervalRef.current) {
      // Start time tracking
      startTimeRef.current = new Date();
      
      // Set up interval to update time taken
      timerIntervalRef.current = window.setInterval(() => {
        if (startTimeRef.current) {
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
          setTimeTakenSeconds(elapsed);
          
          // If there's a time limit, also update remaining time
          if (timeRemaining !== null) {
            setTimeRemaining(prevTime => {
              if (prevTime !== null && prevTime <= 1) {
                // Time's up - submit the quiz automatically
                if (timerIntervalRef.current) {
                  window.clearInterval(timerIntervalRef.current);
                  timerIntervalRef.current = null;
                }
                
                // Auto-submit when timer ends
                submitQuiz();
                return 0;
              }
              return prevTime !== null ? prevTime - 1 : null;
            });
          }
        }
      }, 1000);
    }
    
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [quiz, isQuizComplete, timeRemaining]);
  
  // Navigate to next question
  const goToNextQuestion = useCallback(() => {
    if (!quiz) return;
    
    setCurrentQuestionIndex(prevIndex => 
      Math.min(quiz.questions.length - 1, prevIndex + 1)
    );
  }, [quiz]);
  
  // Navigate to previous question
  const goToPreviousQuestion = useCallback(() => {
    setCurrentQuestionIndex(prevIndex => Math.max(0, prevIndex - 1));
  }, []);
  
  // Navigate to specific question
  const goToQuestion = useCallback((index: number) => {
    if (!quiz) return;
    
    const targetIndex = Math.max(0, Math.min(quiz.questions.length - 1, index));
    setCurrentQuestionIndex(targetIndex);
  }, [quiz]);
  
  // Handle answer change
  const handleAnswerChange = useCallback((questionId: string, answer: string | string[]) => {
    setUserAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: answer
    }));
  }, []);
  
  // Start quiz attempt
  const startQuizAttempt = useCallback(async () => {
    if (!quizId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setUserAnswers({});
      setCurrentQuestionIndex(0);
      setIsQuizComplete(false);
      setQuizResult(null);
      setTimeTakenSeconds(0);
      
      // Clear any existing timer
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // Start the attempt
      const response = await quizzesApi.startQuizAttempt(quizId);
      
      setQuiz(response.quiz);
      attemptIdRef.current = response.attemptId;
      startTimeRef.current = new Date();
      
      // Set time limit if one exists
      if (response.timeLimit) {
        setTimeRemaining(response.timeLimit);
      } else {
        setTimeRemaining(null);
      }
    } catch (err) {
      console.error('Failed to start quiz attempt:', err);
      setError(err instanceof Error ? err.message : 'Failed to start quiz attempt');
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);
  
  // Submit quiz
  const submitQuiz = useCallback(async () => {
    if (!quiz || !attemptIdRef.current || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      // Stop timer
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // Submit the answers
      const result = await quizzesApi.submitQuizAttempt({
        attemptId: attemptIdRef.current,
        answers: userAnswers,
        timeTakenSeconds
      });
      
      setQuizResult(result);
      setIsQuizComplete(true);
      
      // Call completion callback if provided
      if (onComplete) {
        onComplete(result);
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  }, [quiz, isSubmitting, userAnswers, timeTakenSeconds, onComplete]);
  
  // Auto-start the quiz when the component mounts
  useEffect(() => {
    startQuizAttempt();
  }, [startQuizAttempt]);
  
  return {
    quiz,
    isLoading,
    error,
    currentQuestionIndex,
    userAnswers,
    timeRemaining,
    isSubmitting,
    quizResult,
    isQuizComplete,
    attemptId: attemptIdRef.current,
    timeTakenSeconds,
    
    startQuizAttempt,
    submitQuiz,
    handleAnswerChange,
    goToNextQuestion,
    goToPreviousQuestion,
    goToQuestion
  };
};

export default useQuizAttempt;