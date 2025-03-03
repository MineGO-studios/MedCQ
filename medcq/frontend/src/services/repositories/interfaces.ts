// frontend/src/services/repositories/interfaces.ts

import { 
  Quiz, 
  Question, 
  QuizAttempt, 
  QuizResult, 
  UserProfile, 
  UserProgress,
  Subject
} from '../../types/domain';

import {
  PaginationParams,
  PaginatedResponse,
  QuizListParams
} from '../../types/api';

/**
 * Repository interfaces for data access patterns
 */

export interface QuizRepository {
  getQuizzes(params: QuizListParams): Promise<PaginatedResponse<Quiz>>;
  getQuizById(quizId: string): Promise<Quiz>;
  createQuiz(quizData: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'questionCount'>): Promise<Quiz>;
  updateQuiz(quizId: string, quizData: Partial<Quiz>): Promise<Quiz>;
  deleteQuiz(quizId: string): Promise<boolean>;
  getQuizzesByUser(userId: string, params: PaginationParams): Promise<PaginatedResponse<Quiz>>;
  getPopularQuizzes(limit?: number): Promise<Quiz[]>;
  searchQuizzes(query: string, params: PaginationParams): Promise<PaginatedResponse<Quiz>>;
}

export interface QuizAttemptRepository {
  startQuizAttempt(quizId: string, userId: string): Promise<QuizAttempt>;
  getQuizAttempt(attemptId: string): Promise<QuizAttempt>;
  submitQuizAttempt(
    attemptId: string, 
    answers: Record<string, string | string[]>,
    timeTakenSeconds: number
  ): Promise<QuizResult>;
  getUserAttempts(userId: string, params: PaginationParams): Promise<PaginatedResponse<QuizAttempt>>;
  getQuizResults(quizId: string, params: PaginationParams): Promise<PaginatedResponse<QuizResult>>;
  getUserResults(userId: string, params: PaginationParams): Promise<PaginatedResponse<QuizResult>>;
}

export interface UserRepository {
  getUserProfile(userId: string): Promise<UserProfile>;
  updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile>;
  getUserProgress(userId: string): Promise<UserProgress>;
  getRecommendedQuizzes(userId: string, limit?: number): Promise<Quiz[]>;
}

export interface SubjectRepository {
  getSubjects(): Promise<Subject[]>;
  getSubjectById(subjectId: string): Promise<Subject>;
  getQuizzesBySubject(subjectId: string, params: PaginationParams): Promise<PaginatedResponse<Quiz>>;
}