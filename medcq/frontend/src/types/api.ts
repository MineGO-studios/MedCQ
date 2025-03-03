// frontend/src/types/api.ts

import { 
    Question, 
    QuestionType, 
    Quiz, 
    QuizStatus, 
    QuizAttempt, 
    QuizResult,
    UserProgress
  } from './domain';
  
  /**
   * API request and response schemas
   */
  
  // Base API response type
  export interface ApiResponse<T> {
    data?: T;
    error?: string;
    status: number;
  }
  
  // Pagination parameters and response
  export interface PaginationParams {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  }
  
  export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
  
  // Quiz API schemas
  export interface CreateQuizRequest {
    title: string;
    description?: string;
    subject: string;
    yearLevel?: number;
    timeLimit?: number;
    randomizeQuestions?: boolean;
    randomizeOptions?: boolean;
    passScore?: number;
    tags: string[];
    status: QuizStatus;
    questions: Array<{
      text: string;
      explanation?: string;
      type: QuestionType;
      options: Array<{
        text: string;
        isCorrect: boolean;
        explanation?: string;
      }>;
      tags?: string[];
      difficulty?: number;
    }>;
  }
  
  export interface UpdateQuizRequest {
    title?: string;
    description?: string;
    subject?: string;
    yearLevel?: number;
    timeLimit?: number;
    randomizeQuestions?: boolean;
    randomizeOptions?: boolean;
    passScore?: number;
    tags?: string[];
    status?: QuizStatus;
  }
  
  export interface QuizListParams extends PaginationParams {
    subject?: string;
    yearLevel?: number;
    tags?: string[];
    status?: QuizStatus;
    search?: string;
    createdBy?: string;
  }
  
  // Quiz attempt API schemas
  export interface StartQuizAttemptRequest {
    quizId: string;
  }
  
  export interface StartQuizAttemptResponse {
    attemptId: string;
    quiz: Quiz;
    startedAt: string;
    timeLimit?: number; // in seconds
  }
  
  export interface SubmitQuizAttemptRequest {
    attemptId: string;
    answers: Record<string, string | string[]>;
    timeTakenSeconds: number;
  }
  
  export interface QuizResultResponse extends QuizResult {
    quiz: Quiz;
    correctAnswers: Record<string, string | string[]>;
    userAnswers: Record<string, string | string[]>;
  }
  
  // User progress API schemas
  export interface UserProgressResponse {
    progress: UserProgress;
    recentAttempts: QuizResult[];
    recommendedQuizzes: Quiz[];
  }