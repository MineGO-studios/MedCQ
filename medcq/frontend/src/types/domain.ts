// frontend/src/types/domain.ts

/**
 * Core domain models representing business entities
 */

// User-related types
export interface User {
  id: string;
  email: string;
  name?: string;
  photoUrl?: string;
}

export interface UserProfile extends User {
  createdAt: string;
  updatedAt: string;
  preferences: Record<string, any>;
}

export interface UserProgress {
  userId: string;
  quizzesTaken: number;
  quizzesPassed: number;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
  streakDays: number;
  lastActive: string;
}

// Quiz-related types
export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'matching';
export type QuizStatus = 'draft' | 'published' | 'archived';

export interface AnswerOption {
  id: string;
  text: string;
  isCorrect?: boolean; // Only visible to quiz creators
  explanation?: string; // Explanation for this specific option
  orderIndex?: number; // For ordering options
}

export interface Question {
  id: string;
  text: string;
  explanation?: string;
  type: QuestionType;
  options: AnswerOption[];
  tags?: string[];
  difficulty?: number; // 1-5 scale
  orderIndex?: number; // For ordering questions
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  subject: Subject | string; // Either full subject or subject ID
  yearLevel?: number;
  timeLimit?: number; // in minutes
  tags: string[];
  questions: Question[];
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  passScore?: number; // Minimum percentage to pass
  status: QuizStatus;
  questionCount: number;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

export interface QuizSummary {
  id: string;
  title: string;
  description?: string;
  subject: Subject | string;
  yearLevel?: number;
  timeLimit?: number; // in minutes
  tags: string[];
  questionCount: number;
  status: QuizStatus;
  createdAt: string;
  updatedAt?: string;
}

// Quiz attempt and result types
export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  startedAt: string;
  answers?: Record<string, string | string[]>; // Question ID -> Answer(s)
  timeTakenSeconds?: number;
}

export interface QuizResult {
  id: string;
  quizId: string;
  userId: string;
  score: number; // Percentage 0-100
  correctCount: number;
  totalCount: number;
  timeTakenSeconds: number;
  completedAt: string;
  questionResults: Record<string, boolean>; // Question ID -> Correct/Incorrect
}