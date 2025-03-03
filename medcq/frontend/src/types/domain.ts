// frontend/src/types/domain.ts

/**
 * Core domain models for the MedCQ application
 */

export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  MATCHING = 'matching'
}

export enum QuizStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export interface AnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
  orderIndex: number;
}

export interface Question {
  id: string;
  text: string;
  explanation?: string;
  type: QuestionType;
  options: AnswerOption[];
  tags?: string[];
  difficulty?: number; // 1-5 scale
  orderIndex: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  subject: string;
  yearLevel?: number;
  timeLimit?: number; // in minutes
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  passScore?: number; // percentage required to pass
  tags: string[];
  status: QuizStatus;
  questions: Question[];
  questionCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: Record<string, string | string[]>; // questionId -> answerId(s)
  startedAt: string;
  completedAt?: string;
  timeTakenSeconds?: number;
  isCompleted: boolean;
}

export interface QuizResult {
  id: string;
  attemptId: string;
  quizId: string;
  userId: string;
  score: number; // percentage 0-100
  correctCount: number;
  totalCount: number;
  timeTakenSeconds: number;
  completedAt: string;
  questionResults: Record<string, boolean>; // questionId -> correct/incorrect
  passed: boolean;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  quizCount: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  bio?: string;
  profession?: string;
  specialization?: string;
  yearOfStudy?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface UserProgress {
  userId: string;
  quizzesAttempted: number;
  quizzesCompleted: number;
  quizzesPassed: number;
  averageScore: number;
  totalTimeSpent: number; // in seconds
  strongSubjects: string[];
  weakSubjects: string[];
}