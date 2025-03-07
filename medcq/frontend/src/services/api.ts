// frontend/src/services/api.ts

declare global {
  interface Window {
    authContext?: AuthContext;
  }
}

import axios from 'axios';
import { quizService, userService } from './databaseService';
import { QuizSummary, Quiz, QuizAttempt, QuizResult } from '../types/domain';

// Define pagination response interface
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        await authApi.refreshToken();
        
        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        console.error('Token refresh failed:', refreshError);
        
        // Get auth context
        const auth = window.authContext;
        if (auth) {
          auth.signOut();
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Expose auth context to window for interceptor use
interface AuthContext {
  signOut: () => void;
  // Add other properties and methods of AuthContext if needed
}

export const setupAuthInterceptor = (authContext: AuthContext) => {
  (window as unknown as { authContext: AuthContext }).authContext = authContext;
};

// API service for quizzes
export const quizzesApi = {
  // Get list of quizzes with optional filtering and pagination
  async getQuizzes(params?: {
    subject?: string,
    yearLevel?: number,
    page?: number,
    limit?: number,
    search?: string,
    tags?: string[]
  }): Promise<PaginatedResponse<QuizSummary>> {
    try {
      // First try direct database access for better performance
      const queryParams: Record<string, any> = {
        page: params?.page || 1,
        limit: params?.limit || 10
      };
      
      if (params?.subject) queryParams.subject = params.subject;
      if (params?.yearLevel) queryParams.year_level = params.yearLevel;
      if (params?.search) queryParams.search = params.search;
      if (params?.tags && params.tags.length > 0) queryParams.tags = params.tags;
      
      return await quizService.getQuizzes(queryParams);
    } catch (error) {
      console.error('Direct DB access failed, falling back to API:', error);
      
      // Fall back to API
      const queryParams = new URLSearchParams();
      if (params?.subject) queryParams.append('subject', params.subject);
      if (params?.yearLevel) queryParams.append('year_level', params.yearLevel.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.tags && params.tags.length > 0) {
        queryParams.append('tags', params.tags.join(','));
      }
      
      const response = await apiClient.get(`/quizzes?${queryParams.toString()}`);
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

// src/services/api.ts - Update authApi

export const authApi = {
  // Login with Firebase token and handle HTTP-only cookie response
  async loginWithFirebase(firebaseToken: string) {
    return apiClient.post('/auth/firebase-token', { token: firebaseToken }, {
      withCredentials: true, // Important for cookies
    });
  },
  
  // Get user profile
  async getProfile() {
    return apiClient.get('/users/me', {
      withCredentials: true,
    });
  },
  
  // Refresh token
  async refreshToken() {
    return apiClient.post('/auth/refresh', {}, {
      withCredentials: true,
    });
  },
  
  // Logout
  async logout() {
    return apiClient.post('/auth/logout', {}, {
      withCredentials: true,
    });
  }
};

let csrfToken: string | null = null;

// Function to get CSRF token
const getCsrfToken = async () => {
  if (!csrfToken) {
    const response = await apiClient.get('/auth/csrf-token', {
      withCredentials: true,
    });
    csrfToken = response.data?.token;
  }
  return csrfToken;
};

// Add request interceptor to include CSRF token
apiClient.interceptors.request.use(
  async (config) => {
    // Add credentials for cookie handling
    config.withCredentials = true;
    
    // Add CSRF token for non-GET requests
    if (config.method !== 'get') {
      try {
        const token = await getCsrfToken();
        if (token && config.headers) {
          config.headers['X-CSRF-Token'] = token;
        }
      } catch (error) {
        console.error('Failed to get CSRF token:', error);
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

