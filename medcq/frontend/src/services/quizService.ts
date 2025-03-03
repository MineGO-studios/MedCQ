// frontend/src/services/quizService.ts

import { Quiz, QuizAttempt, QuizResult } from '../types/domain';
import { 
  CreateQuizRequest, 
  UpdateQuizRequest, 
  QuizListParams,
  PaginatedResponse,
  StartQuizAttemptResponse,
  SubmitQuizAttemptRequest,
  QuizResultResponse 
} from '../types/api';
import { QuizRepository, QuizAttemptRepository } from './repositories/interfaces';

/**
 * Service factory for quiz-related business logic
 */
export const createQuizService = (
  quizRepository: QuizRepository,
  quizAttemptRepository: QuizAttemptRepository
) => {
  return {
    /**
     * Get a list of quizzes with optional filtering and pagination
     * @param params Filter and pagination parameters
     * @returns Paginated list of quizzes
     */
    async getQuizzes(params: QuizListParams): Promise<PaginatedResponse<Quiz>> {
      return quizRepository.getQuizzes(params);
    },

    /**
     * Get a specific quiz by ID with all questions and options
     * @param quizId Quiz identifier
     * @returns Complete quiz data
     * @throws Error if quiz not found
     */
    async getQuizById(quizId: string): Promise<Quiz> {
      const quiz = await quizRepository.getQuizById(quizId);
      if (!quiz) {
        throw new Error(`Quiz not found: ${quizId}`);
      }
      return quiz;
    },

    /**
     * Create a new quiz with questions and options
     * @param quizData Quiz data including questions and options
     * @returns The created quiz
     */
    async createQuiz(quizData: CreateQuizRequest): Promise<Quiz> {
      // Transform API request to domain model
      const quizToCreate: any = {
        ...quizData,
        randomizeQuestions: quizData.randomizeQuestions ?? false,
        randomizeOptions: quizData.randomizeOptions ?? false,
        questionCount: quizData.questions.length,
        questions: quizData.questions.map((q, index) => ({
          ...q,
          orderIndex: index,
          options: q.options.map((o, optIndex) => ({
            ...o,
            orderIndex: optIndex
          }))
        }))
      };

      return quizRepository.createQuiz(quizToCreate);
    },

    /**
     * Update an existing quiz
     * @param quizId Quiz identifier
     * @param quizData Quiz data to update
     * @returns The updated quiz
     * @throws Error if quiz not found or user doesn't have permission
     */
    async updateQuiz(quizId: string, quizData: UpdateQuizRequest): Promise<Quiz> {
      // Transform API request to domain model
      const quizToUpdate: any = {
        ...quizData,
        updatedAt: new Date().toISOString()
      };

      return quizRepository.updateQuiz(quizId, quizToUpdate);
    },

    /**
     * Delete a quiz and all associated data
     * @param quizId Quiz identifier
     * @returns Success status
     * @throws Error if quiz not found or user doesn't have permission
     */
    async deleteQuiz(quizId: string): Promise<boolean> {
      return quizRepository.deleteQuiz(quizId);
    },

    /**
     * Start a new quiz attempt
     * @param quizId Quiz identifier
     * @returns Quiz attempt with quiz data
     */
    async startQuizAttempt(quizId: string): Promise<StartQuizAttemptResponse> {
      // Get current user ID from auth context
      const userId = 'current-user-id'; // This would come from auth context

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
      const userAnswers: Record<string, string | string[]> = request.answers;

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
        userAnswers
      };
    },

    /**
     * Utility to randomly shuffle an array
     */
    shuffleArray<T>(array: T[]): T[] {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    }
  };
};