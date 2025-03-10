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

interface StartQuizAttemptResponse {
  attemptId: string;
  quiz: Quiz;
  startedAt: string;
  timeLimit?: number; // in seconds
}

interface SubmitQuizAttemptRequest {
  attemptId: string;
  answers: Record<string, string | string[]>;
  timeTakenSeconds: number;
}

interface QuizResultResponse extends QuizResult {
  quiz: Quiz;
  correctAnswers: Record<string, string | string[]>;
  userAnswers: Record<string, string | string[]>;
  attemptId: string; // Adding this property to match the object structure
  passed: boolean; // Add passed property to match usage in submitQuizAttempt
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
        await authApi.refreshToken();
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
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
}

export const setupAuthInterceptor = (authContext: AuthContext) => {
  (window as unknown as { authContext: AuthContext }).authContext = authContext;
};

export const quizzesApi = {
  // Fetch list of quizzes with optional filtering & pagination
  async getQuizzes(params?: {
    subject?: string;
    yearLevel?: number;
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
  }): Promise<PaginatedResponse<QuizSummary>> {
    try {
      const queryParams: Record<string, unknown> = {
        page: params?.page || 1,
        limit: params?.limit || 10,
      };

      if (params?.subject) queryParams.subject = params.subject;
      if (params?.yearLevel) queryParams.year_level = params.yearLevel;
      if (params?.search) queryParams.search = params.search;
      if (params?.tags && params.tags.length > 0) queryParams.tags = params.tags;

      const quizzes = await quizService.getQuizzes(queryParams);
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      
      return {
        items: quizzes,
        total: quizzes.length,
        page,
        limit,
        pages: Math.ceil(quizzes.length / limit)
      };
    } catch (error) {
      console.error('Direct DB access failed, falling back to API:', error);
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

  // Get a specific quiz by ID with complete details
  async getQuiz(quizId: string): Promise<Quiz> {
    try {
      return await quizService.getQuizById(quizId);
    } catch (error) {
      console.error('Direct DB access failed, falling back to API:', error);
      const response = await apiClient.get(`/quizzes/${quizId}`);
      return response.data;
    }
  },

  // START QUIZ ATTEMPT
  async startQuizAttempt(quizId: string): Promise<StartQuizAttemptResponse> {
    try {
      // Try direct API call to start a quiz attempt
      const response = await apiClient.post(`/quiz-attempts/start`, { quizId });
      return response.data;
    } catch (error) {
      console.error('API call failed, using local implementation:', error);
      // Fallback: get quiz details locally and create a temporary attempt
      const quiz = await this.getQuiz(quizId);
      const attemptId = Date.now().toString();
      return {
        attemptId,
        quiz,
        startedAt: new Date().toISOString(),
        timeLimit: quiz.timeLimit ? quiz.timeLimit * 60 : undefined, // convert minutes to seconds if applicable
      };
    }
  },

  // SUBMIT QUIZ ATTEMPT
  async submitQuizAttempt(request: SubmitQuizAttemptRequest): Promise<QuizResultResponse> {
    try {
      // Direct API call for submission with proper scoring and validation
      const response = await apiClient.post(`/quiz-attempts/${request.attemptId}/submit`, request);
      return response.data;
    } catch (error) {
      console.error('API call failed, using local implementation:', error);
      // Fallback: try retrieving quiz attempt data from localStorage
      const attemptData = localStorage.getItem(`quiz_attempt_${request.attemptId}`);
      let quizId = '';

      if (attemptData) {
        const parsedData = JSON.parse(attemptData);
        quizId = parsedData.quizId;
      } else {
        // Fallback to recent quizzes if local data is unavailable
        const recentQuizzes = await this.getQuizzes({ limit: 10 });
        if (recentQuizzes.items.length > 0) {
          quizId = recentQuizzes.items[0].id;
        } else {
          throw new Error('Could not determine quiz ID for this attempt');
        }
      }

      const quiz = await this.getQuiz(quizId);
      let correctCount = 0;
      const questionResults: Record<string, boolean> = {};
      const correctAnswers: Record<string, string | string[]> = {};

      // Process each question to determine correct answers and evaluate user responses
      quiz.questions.forEach(question => {
        const questionId = question.id;

        // Determine the correct answer(s) based on question type
        if (question.type === 'multiple_choice') {
          correctAnswers[questionId] = question.options
            .filter(opt => opt.isCorrect)
            .map(opt => opt.id);
        } else {
          const correctOption = question.options.find(opt => opt.isCorrect);
          if (correctOption) {
            correctAnswers[questionId] = correctOption.id;
          }
        }

        // Evaluate the user's answer
        const userAnswer = request.answers[questionId];
        if (userAnswer) {
          if (question.type === 'multiple_choice') {
            const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
            const correctOptions = correctAnswers[questionId] as string[];
            const allCorrectSelected = correctOptions.every(id => userAnswers.includes(id));
            const noIncorrectSelected = userAnswers.every(id => correctOptions.includes(id));
            const isCorrect = allCorrectSelected && noIncorrectSelected;
            questionResults[questionId] = isCorrect;
            if (isCorrect) correctCount++;
          } else {
            const isCorrect = userAnswer === correctAnswers[questionId];
            questionResults[questionId] = isCorrect;
            if (isCorrect) correctCount++;
          }
        } else {
          questionResults[questionId] = false;
        }
      });

      // Calculate overall score and determine pass/fail status
      const score = (correctCount / quiz.questions.length) * 100;
      const passed = quiz.passScore ? score >= quiz.passScore : score >= 70;

      const result: QuizResultResponse = {
        id: `result_${Date.now()}`,
        attemptId: request.attemptId,
        quizId,
        userId: 'current-user', // This should be replaced by your auth user ID from context
        score,
        correctCount,
        totalCount: quiz.questions.length,
        timeTakenSeconds: request.timeTakenSeconds,
        completedAt: new Date().toISOString(),
        passed,
        questionResults,
        quiz,
        correctAnswers,
        userAnswers: request.answers,
      };

      return result;
    }
  },

  // Existing submitQuiz function (if needed for other flows)
  async submitQuiz(quizId: string, attempt: QuizAttempt): Promise<QuizResult> {
    const response = await apiClient.post(`/quizzes/${quizId}/submit`, attempt);
    return response.data;
  },
};

export const authApi = {
  // Login using Firebase token; handles HTTP-only cookie response
  async loginWithFirebase(firebaseToken: string) {
    return apiClient.post(
      '/auth/firebase-token',
      { token: firebaseToken },
      {
        withCredentials: true,
      }
    );
  },

  // Get the user profile
  async getProfile() {
    return apiClient.get('/users/me', {
      withCredentials: true,
    });
  },

  // Refresh auth token
  async refreshToken() {
    return apiClient.post('/auth/refresh', {}, { withCredentials: true });
  },

  // Logout
  async logout() {
    return apiClient.post('/auth/logout', {}, { withCredentials: true });
  },
};

let csrfToken: string | null = null;
const getCsrfToken = async () => {
  if (!csrfToken) {
    const response = await apiClient.get('/auth/csrf-token', {
      withCredentials: true,
    });
    csrfToken = response.data?.token;
  }
  return csrfToken;
};

apiClient.interceptors.request.use(
  async (config) => {
    config.withCredentials = true;
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
