/**
 * API Client for communication with the backend
 * Provides typesafe endpoints with error handling
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, Quiz, QuizAttempt, QuizResult, QuizSummary, User } from '../types';

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Generic API request function with error handling
 */
async function apiRequest<T>(
  config: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  try {
    const response: AxiosResponse<T> = await apiClient(config);
    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        error: error.response?.data?.detail || error.message,
        status: error.response?.status || 500,
      };
    }
    return {
      error: 'An unexpected error occurred',
      status: 500,
    };
  }
}

/**
 * Authentication API endpoints
 */
export const authApi = {
  /**
   * Login with email and password (for development)
   */
  login: async (email: string, password: string): Promise<ApiResponse<{ access_token: string }>> => {
    return apiRequest({
      url: '/auth/token',
      method: 'POST',
      data: { username: email, password },
    });
  },

  /**
   * Login with Firebase token
   */
  loginWithFirebase: async (firebaseToken: string): Promise<ApiResponse<{ access_token: string }>> => {
    return apiRequest({
      url: '/auth/firebase-token',
      method: 'POST',
      data: { firebase_token: firebaseToken },
    });
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<ApiResponse<User>> => {
    return apiRequest({
      url: '/users/me',
      method: 'GET',
    });
  },
};

/**
 * Quizzes API endpoints
 */
export const quizzesApi = {
  /**
   * Get list of quizzes with optional filtering
   */
  getQuizzes: async (subject?: string, yearLevel?: number): Promise<ApiResponse<QuizSummary[]>> => {
    const params: Record<string, string | number> = {};
    if (subject) params.subject = subject;
    if (yearLevel) params.year_level = yearLevel;

    return apiRequest({
      url: '/quizzes',
      method: 'GET',
      params,
    });
  },

  /**
   * Get a specific quiz by ID
   */
  getQuiz: async (quizId: string): Promise<ApiResponse<Quiz>> => {
    return apiRequest({
      url: `/quizzes/${quizId}`,
      method: 'GET',
    });
  },

  /**
   * Create a new quiz
   */
  createQuiz: async (quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<ApiResponse<Quiz>> => {
    return apiRequest({
      url: '/quizzes',
      method: 'POST',
      data: quiz,
    });
  },

  /**
   * Submit quiz attempt and get results
   */
  submitQuiz: async (quizId: string, attempt: QuizAttempt): Promise<ApiResponse<QuizResult>> => {
    return apiRequest({
      url: `/quizzes/${quizId}/submit`,
      method: 'POST',
      data: attempt,
    });
  },
};

export default apiClient;