// frontend/src/services/api.ts

import axios from 'axios';
import { quizService, userService } from './databaseService';
import { QuizSummary, Quiz, QuizAttempt, QuizResult } from '../types';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const session = await userService.getCurrentUser();
      if (session && config.headers) {
        config.headers.Authorization = `Bearer ${session.id}`;
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// API service for quizzes
export const quizzesApi = {
  // Get list of quizzes with optional filtering
  async getQuizzes(subject?: string, yearLevel?: number): Promise<QuizSummary[]> {
    // First try direct database access for better performance
    try {
      return await quizService.getQuizzes({
        subject_id: subject, 
        year_level: yearLevel
      });
    } catch (error) {
      console.error('Direct DB access failed, falling back to API:', error);
      // Fall back to API
      const response = await apiClient.get('/quizzes', {
        params: {
          subject,
          year_level: yearLevel
        }
      });
      return response.data;
    }
  },

  // Get a specific quiz by ID
  async getQuiz(quizId: string): Promise<Quiz> {
    // First try direct database access for better performance
    try {
      return await quizService.getQuizById(quizId);
    } catch (error) {
      console.error('Direct DB access failed, falling back to API:', error);
      // Fall back to API
      const response = await apiClient.get(`/quizzes/${quizId}`);
      return response.data;
    }
  },

  // Submit quiz attempt
  async submitQuiz(quizId: string, attempt: QuizAttempt): Promise<QuizResult> {
    // This needs to go through the API for proper scoring and validation
    const response = await apiClient.post(`/quizzes/${quizId}/submit`, attempt);
    return response.data;
  }
};