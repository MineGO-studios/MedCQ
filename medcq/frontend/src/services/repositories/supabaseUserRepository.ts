// frontend/src/services/repositories/supabaseUserRepository.ts

import { supabase } from '../supabase';
import { 
  UserProfile, 
  UserPreferences,
  UserStats,
  UserWithStats
} from '../../types/user';
import { 
  PaginatedResponse, 
  PaginationParams, 
  SearchUsersParams
} from '../../types/api';
import { UserRepository } from './interfaces';
import { DatabaseError } from '../databaseService';
import { quizAttemptRepository } from './supabaseQuizAttemptRepository';

/**
 * Supabase implementation of the UserRepository interface
 */
export class SupabaseUserRepository implements UserRepository {
  /**
   * Get a user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      // Get user profile from database
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          display_name,
          photo_url,
          bio,
          profession,
          specialization,
          year_of_study,
          institution,
          location,
          website,
          social_links,
          roles,
          created_at,
          updated_at,
          last_active_at
        `)
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error(`User not found: ${userId}`);
      
      // Map to domain model
      return {
        id: data.id,
        email: data.email,
        displayName: data.display_name || undefined,
        photoUrl: data.photo_url || undefined,
        bio: data.bio || undefined,
        profession: data.profession || undefined,
        specialization: data.specialization || undefined,
        yearOfStudy: data.year_of_study || undefined,
        institution: data.institution || undefined,
        location: data.location || undefined,
        website: data.website || undefined,
        socialLinks: data.social_links || undefined,
        roles: data.roles || ['student'],
        createdAt: data.created_at,
        updatedAt: data.updated_at || undefined,
        lastActiveAt: data.last_active_at || undefined
      };
    } catch (error) {
      console.error(`Error getting user profile ${userId}:`, error);
      throw new DatabaseError(`Failed to get user profile: ${userId}`, error as Error);
    }
  }

  /**
   * Update a user profile
   */
  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      // Convert from domain model to database model
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      
      if (profileData.displayName !== undefined) updateData.display_name = profileData.displayName;
      if (profileData.photoUrl !== undefined) updateData.photo_url = profileData.photoUrl;
      if (profileData.bio !== undefined) updateData.bio = profileData.bio;
      if (profileData.profession !== undefined) updateData.profession = profileData.profession;
      if (profileData.specialization !== undefined) updateData.specialization = profileData.specialization;
      if (profileData.yearOfStudy !== undefined) updateData.year_of_study = profileData.yearOfStudy;
      if (profileData.institution !== undefined) updateData.institution = profileData.institution;
      if (profileData.location !== undefined) updateData.location = profileData.location;
      if (profileData.website !== undefined) updateData.website = profileData.website;
      if (profileData.socialLinks !== undefined) updateData.social_links = profileData.socialLinks;
      
      // Update profile
      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId);
      
      if (error) throw error;
      
      // Log activity
      await this.logActivity(userId, 'profile_update', {
        fields: Object.keys(updateData).filter(key => key !== 'updated_at')
      });
      
      // Return updated profile
      return this.getUserProfile(userId);
    } catch (error) {
      console.error(`Error updating user profile ${userId}:`, error);
      throw new DatabaseError(`Failed to update user profile: ${userId}`, error as Error);
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      // Get preferences from database
      const { data, error } = await supabase
        .from('user_preferences')
        .select(`
          user_id,
          theme,
          email_notifications,
          push_notifications,
          study_reminders,
          show_score_immediately,
          show_explanations_with_results,
          default_quiz_time_limit,
          default_subject_filter,
          updated_at
        `)
        .eq('user_id', userId)
        .single();
      
      if (error) {
        // If not found, create default preferences
        if (error.code === 'PGRST116') {
          return this.createDefaultPreferences(userId);
        }
        throw error;
      }
      
      // Map to domain model
      return {
        userId: data.user_id,
        theme: data.theme,
        emailNotifications: data.email_notifications,
        pushNotifications: data.push_notifications,
        studyReminders: data.study_reminders,
        showScoreImmediately: data.show_score_immediately,
        showExplanationsWithResults: data.show_explanations_with_results,
        defaultQuizTimeLimit: data.default_quiz_time_limit || undefined,
        defaultSubjectFilter: data.default_subject_filter || undefined,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error(`Error getting user preferences ${userId}:`, error);
      throw new DatabaseError(`Failed to get user preferences: ${userId}`, error as Error);
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, prefsData: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      // Convert from domain model to database model
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      
      if (prefsData.theme !== undefined) updateData.theme = prefsData.theme;
      if (prefsData.emailNotifications !== undefined) updateData.email_notifications = prefsData.emailNotifications;
      if (prefsData.pushNotifications !== undefined) updateData.push_notifications = prefsData.pushNotifications;
      if (prefsData.studyReminders !== undefined) updateData.study_reminders = prefsData.studyReminders;
      if (prefsData.showScoreImmediately !== undefined) updateData.show_score_immediately = prefsData.showScoreImmediately;
      if (prefsData.showExplanationsWithResults !== undefined) updateData.show_explanations_with_results = prefsData.showExplanationsWithResults;
      if (prefsData.defaultQuizTimeLimit !== undefined) updateData.default_quiz_time_limit = prefsData.defaultQuizTimeLimit;
      if (prefsData.defaultSubjectFilter !== undefined) updateData.default_subject_filter = prefsData.defaultSubjectFilter;
      
      // Check if preferences exist
      const { data, error } = await supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // Create default preferences first
        await this.createDefaultPreferences(userId);
      }
      
      // Update preferences
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', userId);
      
      if (updateError) throw updateError;
      
      // Return updated preferences
      return this.getUserPreferences(userId);
    } catch (error) {
      console.error(`Error updating user preferences ${userId}:`, error);
      throw new DatabaseError(`Failed to update user preferences: ${userId}`, error as Error);
    }
  }

  /**
   * Get user progress
   */
  async getUserProgress(userId: string): Promise<UserStats> {
    try {
      // Get stats from database
      const { data, error } = await supabase
        .from('user_stats')
        .select(`
          user_id,
          quizzes_created,
          quizzes_completed,
          quizzes_passed,
          total_questions,
          correct_answers,
          average_score,
          total_time_spent,
          strongest_subject,
          weakest_subject,
          last_updated
        `)
        .eq('user_id', userId)
        .single();
      
      if (error) {
        // If not found, create default stats
        if (error.code === 'PGRST116') {
          return this.createDefaultStats(userId);
        }
        throw error;
      }
      
      // Map to domain model
      return {
        userId: data.user_id,
        quizzesCreated: data.quizzes_created,
        quizzesCompleted: data.quizzes_completed,
        quizzesPassed: data.quizzes_passed,
        totalQuestions: data.total_questions,
        correctAnswers: data.correct_answers,
        averageScore: data.average_score,
        totalTimeSpent: data.total_time_spent,
        strongestSubject: data.strongest_subject || undefined,
        weakestSubject: data.weakest_subject || undefined,
        lastUpdated: data.last_updated
      };
    } catch (error) {
      console.error(`Error getting user stats ${userId}:`, error);
      throw new DatabaseError(`Failed to get user stats: ${userId}`, error as Error);
    }
  }

  /**
   * Get user with stats and recent activity
   */
  async getUserWithStats(userId: string): Promise<UserWithStats> {
    try {
      // Get user profile
      const profile = await this.getUserProfile(userId);
      
      // Get user preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Get user stats
      const stats = await this.getUserProgress(userId);
      
      // Get recent activity
      const { data: activityData, error: activityError } = await supabase
        .from('user_activities')
        .select(`
          id,
          user_id,
          type,
          details,
          ip_address,
          user_agent,
          timestamp
        `)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (activityError) throw activityError;
      
      const recentActivity = (activityData || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        type: item.type,
        details: item.details || undefined,
        ipAddress: item.ip_address || undefined,
        userAgent: item.user_agent || undefined,
        timestamp: item.timestamp
      }));
      
      // Get recent quiz results
      const resultsResponse = await quizAttemptRepository.getUserResults(userId, { page: 1, limit: 5 });
      const recentResults = resultsResponse.items;
      
      // Combine all data
      return {
        ...profile,
        stats,
        recentActivity,
        recentResults,
        preferences
      };
    } catch (error) {
      console.error(`Error getting user with stats ${userId}:`, error);
      throw new DatabaseError(`Failed to get user with stats: ${userId}`, error as Error);
    }
  }

  /**
   * Search for users
   */
  async searchUsers(params: SearchUsersParams): Promise<PaginatedResponse<UserProfile>> {
    try {
      // Build base query
      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          display_name,
          photo_url,
          profession,
          specialization,
          institution,
          roles,
          created_at
        `);
      
      // Apply filters
      if (params.query) {
        query = query.or(
          `display_name.ilike.%${params.query}%,` +
          `email.ilike.%${params.query}%,` +
          `profession.ilike.%${params.query}%,` +
          `specialization.ilike.%${params.query}%,` +
          `institution.ilike.%${params.query}%`
        );
      }
      
      if (params.role) {
        // Filter for users with this role
        query = query.contains('roles', [params.role]);
      }
      
      if (params.institution) {
        query = query.ilike('institution', `%${params.institution}%`);
      }
      
      if (params.specialization) {
        query = query.ilike('specialization', `%${params.specialization}%`);
      }
      
      // Get total count
      const { count, error: countError } = await query.count();
      if (countError) throw countError;
      
      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 10;
      const offset = (page - 1) * limit;
      
      // Execute paginated query
      const { data, error } = await query
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      // Map to domain model
      const users = (data || []).map(item => ({
        id: item.id,
        email: item.email,
        displayName: item.display_name || undefined,
        photoUrl: item.photo_url || undefined,
        profession: item.profession || undefined,
        specialization: item.specialization || undefined,
        institution: item.institution || undefined,
        roles: item.roles || ['student'],
        createdAt: item.created_at
      }));
      
      return {
        items: users,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('Error searching users:', error);
      throw new DatabaseError('Failed to search users', error as Error);
    }
  }

  /**
   * Get recommended quizzes for a user
   */
  async getRecommendedQuizzes(userId: string, limit: number = 5): Promise<any[]> {
    try {
      // This would be a real recommendation algorithm
      // For now, we'll just use a placeholder implementation
      
      // Get user's stats to see which subjects they're weak in
      const stats = await this.getUserProgress(userId);
      
      // Get quizzes in the user's weak subject
      let quizzes = [];
      if (stats.weakestSubject) {
        const { data, error } = await supabase
          .from('quizzes')
          .select(`
            id,
            title,
            description,
            subject_id,
            subjects:subject_id(name),
            year_level,
            time_limit_minutes,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(limit);
          
        if (!error && data) {
          quizzes = data.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description || undefined,
            subject: item.subjects?.name || 'Unknown',
            yearLevel: item.year_level || undefined,
            timeLimit: item.time_limit_minutes || undefined,
            createdAt: item.created_at
          }));
        }
      }
      
      return quizzes;
    } catch (error) {
      console.error(`Error getting recommended quizzes for user ${userId}:`, error);
      throw new DatabaseError(`Failed to get recommended quizzes: ${userId}`, error as Error);
    }
  }

  /**
   * Log user activity
   */
  async logActivity(
    userId: string, 
    activityType: string, 
    details?: Record<string, any>
  ): Promise<void> {
    try {
      // Create activity log
      const activityId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      // Get browser info
      const userAgent = navigator.userAgent;
      
      // Log activity
      const { error } = await supabase
        .from('user_activities')
        .insert({
          id: activityId,
          user_id: userId,
          type: activityType,
          details,
          user_agent: userAgent,
          timestamp: now
        });
      
      if (error) {
        // Log error but don't fail the request
        console.error(`Failed to log activity: ${error.message}`);
      }
      
      // Update last active timestamp
      await supabase
        .from('user_profiles')
        .update({
          last_active_at: now
        })
        .eq('id', userId);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Create default preferences for a user
   * @private Helper method
   */
  private async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    try {
      // Create default preferences
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          theme: 'system',
          email_notifications: true,
          push_notifications: true,
          study_reminders: true,
          show_score_immediately: true,
          show_explanations_with_results: true,
          updated_at: now
        });
      
      if (error) throw error;
      
      // Return default preferences
      return {
        userId,
        theme: 'system',
        emailNotifications: true,
        pushNotifications: true,
        studyReminders: true,
        showScoreImmediately: true,
        showExplanationsWithResults: true,
        updatedAt: now
      };
    } catch (error) {
      console.error(`Error creating default preferences for user ${userId}:`, error);
      throw new DatabaseError(`Failed to create default preferences: ${userId}`, error as Error);
    }
  }

  /**
   * Create default stats for a user
   * @private Helper method
   */
  private async createDefaultStats(userId: string): Promise<UserStats> {
    try {
      // Create default stats
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('user_stats')
        .insert({
          user_id: userId,
          quizzes_created: 0,
          quizzes_completed: 0,
          quizzes_passed: 0,
          total_questions: 0,
          correct_answers: 0,
          average_score: 0,
          total_time_spent: 0,
          last_updated: now
        });
      
      if (error) throw error;
      
      // Return default stats
      return {
        userId,
        quizzesCreated: 0,
        quizzesCompleted: 0,
        quizzesPassed: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        averageScore: 0,
        totalTimeSpent: 0,
        lastUpdated: now
      };
    } catch (error) {
      console.error(`Error creating default stats for user ${userId}:`, error);
      throw new DatabaseError(`Failed to create default stats: ${userId}`, error as Error);
    }
  }
}

// Export singleton instance
export const userRepository = new SupabaseUserRepository();