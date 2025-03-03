/**
 * Core application types providing type safety across components
 */

// Authentication types
export interface User {
    id: string;
    email: string;
    name?: string;
    photoUrl?: string;
  }
  
  export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
  }
  
  // Quiz related types
  export interface AnswerOption {
    id: string;
    text: string;
    isCorrect?: boolean; // Only visible to quiz creators
  }
  
  export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'matching';
  
  export interface Question {
    id: string;
    text: string;
    explanation?: string;
    type: QuestionType;
    options: AnswerOption[];
  }
  
  export interface Quiz {
    id: string;
    title: string;
    description?: string;
    subject: string;
    yearLevel?: number; 
    timeLimit?: number; // in minutes
    tags: string[];
    questions: Question[];
    createdAt: string;
    updatedAt?: string;
    createdBy: string;
  }
  
  export interface QuizSummary {
    id: string;
    title: string;
    description?: string;
    subject: string;
    yearLevel?: number;
    timeLimit?: number; // in minutes
    tags: string[];
    questionCount: number;
    createdAt: string;
    updatedAt?: string;
  }
  
  // Quiz attempt and result types
  export interface QuizAttempt {
    quizId: string;
    answers: Record<string, string | string[]>; // Question ID -> Answer(s)
    timeTakenSeconds: number;
  }
  
  export interface QuizResult {
    quizId: string;
    userId: string;
    score: number; // Percentage 0-100
    correctCount: number;
    totalCount: number;
    timeTakenSeconds: number;
    completedAt: string;
    questionResults: Record<string, boolean>; // Question ID -> Correct/Incorrect
  }
  
  // API response types
  export interface ApiResponse<T> {
    data?: T;
    error?: string;
    status: number;
  }
  
  export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }