// frontend/src/services/quizAttemptService.ts

import { Quiz, QuizAttempt, QuizResult } from '../types/domain';
import { 
  StartQuizAttemptResponse, 
  SubmitQuizAttemptRequest,
  QuizResultResponse 
} from '../types/api';
import { quizAttemptRepository } from './repositories/supabaseQuizAttemptRepository';
import { quizRepository } from './repositories/supabaseQuizRepository';
import { useAuth } from '../context/AuthContext';

/**
 * Service for quiz attempt management
 */
export const quizAttemptService = {
  /**
   * Start a new quiz attempt
   * @param quizId Quiz identifier
   * @returns Quiz attempt with quiz data
   */
  async startQuizAttempt(quizId: string): Promise<StartQuizAttemptResponse> {
    // Get current user ID from auth context
    const { authState } = useAuth();
    if (!authState.user) {
      throw new Error('User not authenticated');
    }
    
    const userId = authState.user.id;
    
    // Create new attempt
    const attempt = await quizAttemptRepository.startQuizAttempt(quizId, userId);
    
    // Get quiz details
    const quiz = await quizRepository.getQuizById(quizId);
    
    // Apply randomization if specified
    if (quiz.randomizeQuestions) {
      quiz.questions = this.shuffleArray([...quiz.questions]);
    }
    
    if (quiz.randomizeOptions) {
      quiz.questions = quiz.questions.map(q => ({
        ...q,
        options: this.shuffleArray([...q.options])
      }));
    }
    
    return {
      attemptId: attempt.id,
      quiz,
      startedAt: attempt.startedAt,
      timeLimit: quiz.timeLimit ? quiz.timeLimit * 60 : undefined // Convert to seconds
    };
  },
  
  /**
   * Submit a quiz attempt with answers
   * @param request Submission data with answers
   * @returns Quiz result with detailed feedback
   */
  async submitQuizAttempt(request: SubmitQuizAttemptRequest): Promise<QuizResultResponse> {
    // Get current user ID from auth context
    const { authState } = useAuth();
    if (!authState.user) {
      throw new Error('User not authenticated');
    }
    
    const userId = authState.user.id;
    
    // Submit answers and get basic result
    const result = await quizAttemptRepository.submitQuizAttempt(
      request.attemptId,
      request.answers,
      request.timeTakenSeconds
    );
    
    // Get quiz details
    const attempt = await quizAttemptRepository.getQuizAttempt(request.attemptId);
    const quiz = await quizRepository.getQuizById(attempt.quizId);
    
    // Prepare correct answers map
    const correctAnswers: Record<string, string | string[]> = {};
    
    // Build correct answers for each question
    quiz.questions.forEach(question => {
      if (question.type === 'multiple_choice') {
        correctAnswers[question.id] = question.options
          .filter(opt => opt.isCorrect)
          .map(opt => opt.id);
      } else {
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption) {
          correctAnswers[question.id] = correctOption.id;
        }
      }
    });
    
    return {
      ...result,
      quiz,
      correctAnswers,
      userAnswers: request.answers
    };
  },
  
  /**
   * Get a quiz result by attempt ID
   * @param attemptId Quiz attempt identifier
   * @returns Quiz result with detailed feedback
   */
  async getQuizResult(attemptId: string): Promise<QuizResultResponse> {
    // Get current user ID from auth context
    const { authState } = useAuth();
    if (!authState.user) {
      throw new Error('User not authenticated');
    }
    
    // Get the attempt
    const attempt = await quizAttemptRepository.getQuizAttempt(attemptId);
    
    // Get the quiz
    const quiz = await quizRepository.getQuizById(attempt.quizId);
    
    // Get results from repository
    // In a real implementation, we would get this from an API endpoint
    // For now, we'll simulate by getting question results from the repository
    
    // This is a simplified implementation - in a real app, we would have a dedicated endpoint
    const resultsPage = await quizAttemptRepository.getUserResults(authState.user.id, { page: 1, limit: 100 });
    const result = resultsPage.items.find(r => r.attemptId === attemptId);
    
    if (!result) {
      throw new Error(`Result not found for attempt: ${attemptId}`);
    }
    
    // Build correct answers map
    const correctAnswers: Record<string, string | string[]> = {};
    const userAnswers: Record<string, string | string[]> = {};
    
    // This is a simplified implementation - in a real app, we would get actual user answers
    // from the backend
    quiz.questions.forEach(question => {
      if (question.type === 'multiple_choice') {
        correctAnswers[question.id] = question.options
          .filter(opt => opt.isCorrect)
          .map(opt => opt.id);
      } else {
        const correctOption = question.options.find(opt => opt.isCorrect);
        if (correctOption) {
          correctAnswers[question.id] = correctOption.id;
        }
      }
      
      // Simulate user answers based on correctness
      if (result.questionResults[question.id]) {
        // If correct, use correct answer
        userAnswers[question.id] = correctAnswers[question.id];
      } else {
        // If incorrect, use first incorrect option
        const incorrectOption = question.options.find(opt => !opt.isCorrect);
        if (incorrectOption) {
          userAnswers[question.id] = incorrectOption.id;
        }
      }
    });
    
    return {
      ...result,
      quiz,
      correctAnswers,
      userAnswers
    };
  },
  
  /**
   * Utility to randomly shuffle an array
   * @private
   */
  private shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
};