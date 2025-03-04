// frontend/src/services/userService.ts

import { 
    UserProfile, 
    UserPreferences, 
    UserStats, 
    UserWithStats,
    SearchUsersParams
  } from '../types/user';
  import {
    PaginatedResponse
  } from '../types/api';
  import { userRepository } from './repositories/supabaseUserRepository';
  import { useAuth } from '../context/AuthContext';
  
  /**
   * Service for user management
   */
  export const userService = {
    /**
     * Get the current user's profile
     * @returns User profile
     */
    async getCurrentUserProfile(): Promise<UserProfile> {
      // Get current user ID from auth context
      const { authState } = useAuth();
      if (!authState.user) {
        throw new Error('User not authenticated');
      }
      
      return userRepository.getUserProfile(authState.user.id);
    },
    
    /**
     * Update the current user's profile
     * @param profileData Profile data to update
     * @returns Updated user profile
     */
    async updateCurrentUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
      // Get current user ID from auth context
      const { authState } = useAuth();
      if (!authState.user) {
        throw new Error('User not authenticated');
      }
      
      return userRepository.updateUserProfile(authState.user.id, profileData);
    },
    
    /**
     * Get the current user's preferences
     * @returns User preferences
     */
    async getCurrentUserPreferences(): Promise<UserPreferences> {
      // Get current user ID from auth context
      const { authState } = useAuth();
      if (!authState.user) {
        throw new Error('User not authenticated');
      }
      
      return userRepository.getUserPreferences(authState.user.id);
    },
    
    /**
     * Update the current user's preferences
     * @param prefsData Preferences data to update
     * @returns Updated user preferences
     */
    async updateCurrentUserPreferences(prefsData: Partial<UserPreferences>): Promise<UserPreferences> {
      // Get current user ID from auth context
      const { authState } = useAuth();
      if (!authState.user) {
        throw new Error('User not authenticated');
      }
      
      return userRepository.updateUserPreferences(authState.user.id, prefsData);
    },
    
    /**
     * Get the current user's progress/stats
     * @returns User stats
     */
    async getCurrentUserProgress(): Promise<UserStats> {
      // Get current user ID from auth context
      const { authState } = useAuth();
      if (!authState.user) {
        throw new Error('User not authenticated');
      }
      
      return userRepository.getUserProgress(authState.user.id);
    },
    
    /**
     * Get the current user's dashboard data
     * @returns User with stats and activity
     */
    async getCurrentUserDashboard(): Promise<UserWithStats> {
      // Get current user ID from auth context
      const { authState } = useAuth();
      if (!authState.user) {
        throw new Error('User not authenticated');
      }
      
      return userRepository.getUserWithStats(authState.user.id);
    },
    
    /**
     * Get a specific user's profile
     * @param userId User ID
     * @returns User profile
     */
    async getUserProfile(userId: string): Promise<UserProfile> {
      return userRepository.getUserProfile(userId);
    },
    
    /**
     * Search for users
     * @param params Search parameters
     * @returns Paginated list of users
     */
    async searchUsers(params: SearchUsersParams): Promise<PaginatedResponse<UserProfile>> {
      return userRepository.searchUsers(params);
    },
    
    /**
     * Get recommended quizzes for the current user
     * @param limit Maximum number of quizzes to return
     * @returns List of recommended quizzes
     */
    async getRecommendedQuizzes(limit: number = 5): Promise<any[]> {
      // Get current user ID from auth context
      const { authState } = useAuth();
      if (!authState.user) {
        throw new Error('User not authenticated');
      }
      
      return userRepository.getRecommendedQuizzes(authState.user.id, limit);
    },
    
    /**
     * Log user activity
     * @param activityType Type of activity
     * @param details Additional details
     */
    async logActivity(activityType: string, details?: Record<string, any>): Promise<void> {
      // Get current user ID from auth context
      const { authState } = useAuth();
      if (!authState.user) {
        throw new Error('User not authenticated');
      }
      
      return userRepository.logActivity(authState.user.id, activityType, details);
    }
  };