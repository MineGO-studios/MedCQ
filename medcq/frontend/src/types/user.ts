// frontend/src/types/user.ts

import { Quiz, QuizResult } from './domain';

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMINISTRATOR = 'administrator'
}

export interface UserPermission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'execute';
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
  institution?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  roles: UserRole[];
  createdAt: string;
  updatedAt?: string;
  lastActiveAt?: string;
}

export interface UserPreferences {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  pushNotifications: boolean;
  studyReminders: boolean;
  showScoreImmediately: boolean;
  showExplanationsWithResults: boolean;
  defaultQuizTimeLimit?: number;
  defaultSubjectFilter?: string;
  updatedAt: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'login' | 'quiz_start' | 'quiz_complete' | 'profile_update' | 'content_create';
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface UserStats {
  userId: string;
  quizzesCreated: number;
  quizzesCompleted: number;
  quizzesPassed: number;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
  totalTimeSpent: number; // in seconds
  strongestSubject?: string;
  weakestSubject?: string;
  lastUpdated: string;
}

export interface UserWithStats extends UserProfile {
  stats: UserStats;
  recentActivity: UserActivity[];
  recentResults: QuizResult[];
  recentQuizzes?: Quiz[];
  preferences: UserPreferences;
}

export interface SearchUsersParams {
  query?: string;
  role?: UserRole;
  institution?: string;
  specialization?: string;
  page?: number;
  limit?: number;
}