// src/pages/QuizAttemptPage.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Container, Section } from '../components/layout';
import { Button, Card, CardBody } from '../components/ui';
import { LoadingState, ErrorState } from '../components/feedback';
import QuizTimer from '../components/quiz/QuizTimer';
import QuizProgress from '../components/quiz/QuizProgress';
import QuestionDisplay from '../components/quiz/QuestionDisplay';
import QuizResults from '../components/quiz/QuizResults';
import { useAuth } from '../context/AuthContext';
import { quizzesApi } from '../services/api';
import { Quiz, Question, QuizResult } from '../types';
import { getErrorMessage } from '../utils/errorHandling';

const QuizAttemptPage: React.FC = () => {
  // Get quiz ID from URL params
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { authState } = useAuth();

  // State management
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string | string[]>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [attemptStartTime, setAttemptStartTime] = useState<Date | null>(null);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  
  // Refs
  const timerIntervalRef = useRef<number | null>(null);
  const attemptIdRef = useRef<string | null>(null);

  // Fetch quiz data and start attempt
  const startQuizAttempt = useCallback(async () => {
    if (!quizId || !authState.user) return;

    try {
      setIsLoading(true);
      
      // Start quiz attempt and retrieve quiz data
      const response = await quizzesApi.startQuizAttempt(quizId);
      
      setQuiz(response.quiz);
      setAttemptStartTime(new Date());
      attemptIdRef.current = response.attemptId;
      
      // Initialize timer if there's a time limit
      if (response.timeLimit) {
        setTimeRemaining(response.timeLimit);
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to start quiz attempt:', err);
      setError(getErrorMessage(err, 'Unable to start quiz. Please try again later.'));
    } finally {
      setIsLoading(false);
    }
  }, [quizId, authState.user]);

  // Initialize quiz on component mount
  useEffect(() => {
    startQuizAttempt();
    
    // Cleanup function
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, [startQuizAttempt]);

  // Start timer when quiz loads and time limit exists
  useEffect(() => {
    if (timeRemaining !== null && !timerIntervalRef.current && !isQuizComplete) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime === null || prevTime <= 1) {
            // Time's up - submit the quiz automatically
            if (timerIntervalRef.current) {
              window.clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            
            // Auto-submit when timer ends
            handleSubmitQuiz();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [timeRemaining, isQuizComplete]);

  // Handlers for quiz navigation
  const handlePreviousQuestion = () => {
    setCurrentQuestionIndex(prevIndex => Math.max(0, prevIndex - 1));
  };

  const handleNextQuestion = () => {
    if (!quiz) return;
    
    setCurrentQuestionIndex(prevIndex => 
      Math.min(quiz.questions.length - 1, prevIndex + 1)
    );
  };

  // Handle answer selection
  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setUserAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: answer
    }));
  };

  // Calculate time taken in seconds
  const calculateTimeTaken = (): number => {
    if (!attemptStartTime) return 0;
    
    const now = new Date();
    const timeTakenMs = now.getTime() - attemptStartTime.getTime();
    return Math.floor(timeTakenMs / 1000);
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    if (!quiz || !attemptIdRef.current || isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      // Stop the timer
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // Calculate time taken
      const timeTakenSeconds = calculateTimeTaken();
      
      // Submit answers
      const result = await quizzesApi.submitQuizAttempt({
        attemptId: attemptIdRef.current,
        answers: userAnswers,
        timeTakenSeconds
      });
      
      // Show results
      setQuizResult(result);
      setIsQuizComplete(true);
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      setError(getErrorMessage(err, 'Unable to submit quiz. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation dialog for quiz submission
  const confirmSubmitQuiz = () => {
    if (!quiz) return;
    
    // Calculate unanswered questions
    const questionsCount = quiz.questions.length;
    const answeredCount = Object.keys(userAnswers).length;
    const unansweredCount = questionsCount - answeredCount;
    
    // Create confirmation message
    let confirmMessage = 'Are you sure you want to submit this quiz?';
    if (unansweredCount > 0) {
      confirmMessage = `You have ${unansweredCount} unanswered ${
        unansweredCount === 1 ? 'question' : 'questions'
      }. Are you sure you want to submit?`;
    }
    
    if (window.confirm(confirmMessage)) {
      handleSubmitQuiz();
    }
  };

  // Navigation to return to quiz details
  const handleBackToDetails = () => {
    navigate(`/quizzes/${quizId}`);
  };

  // Calculate the percentage of questions answered
  const calculateProgress = (): number => {
    if (!quiz) return 0;
    
    return (Object.keys(userAnswers).length / quiz.questions.length) * 100;
  };

  // Get the current question
  const currentQuestion: Question | null = quiz && quiz.questions.length > 0 
    ? quiz.questions[currentQuestionIndex] 
    : null;

  // Format time remaining in MM:SS
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Render functions
  const renderQuizContent = () => {
    if (!quiz || !currentQuestion) return null;
    
    return (
      <div className="flex flex-col space-y-6">
        {/* Quiz header with timer and progress */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <span className="text-lg font-medium mr-4">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </span>
            
            {/* Progress bar */}
            <QuizProgress 
              current={currentQuestionIndex + 1} 
              total={quiz.questions.length}
              percentage={calculateProgress()}
            />
          </div>
          
          {/* Timer */}
          {timeRemaining !== null && (
            <QuizTimer 
              timeRemaining={timeRemaining} 
              formatTime={formatTimeRemaining}
              isWarning={timeRemaining < 60} // Less than 1 minute
            />
          )}
        </div>
        
        {/* Question content */}
        <Card>
          <CardBody>
            <QuestionDisplay
              question={currentQuestion}
              selectedAnswer={userAnswers[currentQuestion.id] || []}
              onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
            />
          </CardBody>
        </Card>
        
        {/* Quiz navigation buttons */}
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          <div className="flex space-x-4">
            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <Button onClick={handleNextQuestion}>
                Next
              </Button>
            ) : (
              <Button 
                variant="primary"
                onClick={confirmSubmitQuiz}
                disabled={isSubmitting}
                isLoading={isSubmitting}
              >
                Submit Quiz
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderQuizResults = () => {
    if (!quiz || !quizResult) return null;
    
    return (
      <QuizResults
        quiz={quiz}
        result={quizResult}
        userAnswers={userAnswers}
        onViewDetails={handleBackToDetails}
        onRetryQuiz={startQuizAttempt}
      />
    );
  };

  return (
    <Layout 
      title={quiz ? `Quiz: ${quiz.title}` : 'Quiz Attempt'}
      hideHeader={!isQuizComplete} // Hide header during quiz
    >
      <Container>
        {/* Show page title only for results */}
        {isQuizComplete && quiz && (
          <Section title={`Results: ${quiz.title}`}>
            {renderQuizResults()}
          </Section>
        )}
        
        {/* Loading state */}
        {isLoading && (
          <LoadingState message="Loading quiz..." />
        )}
        
        {/* Error state */}
        {!isLoading && error && (
          <ErrorState
            title="Error Loading Quiz"
            description={error}
            buttonText="Try Again"
            onAction={startQuizAttempt}
          />
        )}
        
        {/* Quiz taking interface */}
        {!isLoading && !error && quiz && !isQuizComplete && (
          <Section>
            {renderQuizContent()}
          </Section>
        )}
      </Container>
    </Layout>
  );
};

export default QuizAttemptPage;