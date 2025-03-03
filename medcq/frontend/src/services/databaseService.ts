// src/services/databaseService.ts

import { supabase } from './supabase';
import { Quiz, QuizSummary, Question, User, QuizResult, ApiError } from '../types';
import { Database } from '../types/supabase';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Error class for database operations
 */
export class DatabaseError extends Error {
  public readonly originalError?: PostgrestError | Error;
  public readonly code?: string;
  public readonly status?: number;
  
  constructor(message: string, originalError?: PostgrestError | Error) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
    
    if (originalError && 'code' in originalError) {
      this.code = originalError.code;
    }
    
    if (originalError && 'status' in originalError && typeof originalError.status === 'number') {
      this.status = originalError.status;
    }
  }
}

/**
 * Utility to handle database operation errors consistently
 */
const handleDatabaseError = (operation: string, error: PostgrestError | Error): never => {
  console.error(`Database error during ${operation}:`, error);
  
  // Handle specific error codes
  if ('code' in error) {
    switch (error.code) {
      case '23505': // Unique violation
        throw new DatabaseError(`Duplicate entry: The record already exists`, error);
      case '23503': // Foreign key violation
        throw new DatabaseError(`Referenced record does not exist`, error);
      case '42P01': // Undefined table
        throw new DatabaseError(`Database schema error: Table not found`, error);
      default:
        throw new DatabaseError(`Error during ${operation}`, error);
    }
  }
  
  throw new DatabaseError(`Unexpected error during ${operation}`, error);
};

/**
 * Cache management utilities
 */
const cache = {
  quizzes: new Map<string, { data: Quiz, timestamp: number }>(),
  quizSummaries: new Map<string, { data: QuizSummary[], timestamp: number }>(),
  
  // Cache expiration in milliseconds (5 minutes)
  expirationTime: 5 * 60 * 1000,
  
  // Get item from cache with key
  get<T>(map: Map<string, { data: T, timestamp: number }>, key: string): T | null {
    const cached = map.get(key);
    if (!cached) return null;
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.expirationTime) {
      map.delete(key);
      return null;
    }
    
    return cached.data;
  },
  
  // Set item in cache with key
  set<T>(map: Map<string, { data: T, timestamp: number }>, key: string, data: T): void {
    map.set(key, { data, timestamp: Date.now() });
  },
  
  // Clear all caches
  clear(): void {
    this.quizzes.clear();
    this.quizSummaries.clear();
  }
};

/**
 * User-related database operations
 */
export const userService = {
  /**
   * Get the current authenticated user
   * @returns The current user's data
   * @throws DatabaseError if operation fails
   */
  async getCurrentUser(): Promise<User> {
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) throw error;
      if (!data.user) throw new Error('No authenticated user');
      
      // Fetch additional user profile data from our users table
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('id, email, display_name, photo_url, created_at, updated_at')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) throw profileError;
      if (!profileData) throw new Error('User profile not found');
      
      return {
        id: profileData.id,
        email: profileData.email,
        name: profileData.display_name || undefined,
        photoUrl: profileData.photo_url || undefined,
      };
    } catch (error) {
      return handleDatabaseError('getCurrentUser', error as Error);
    }
  },
  
  /**
   * Update user profile information
   * @param profile - User profile data to update
   * @returns The updated user profile
   * @throws DatabaseError if operation fails
   */
  async updateProfile(profile: { 
    display_name?: string; 
    photo_url?: string;
  }): Promise<User> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Not authenticated');
      
      const updates = {
        display_name: profile.display_name,
        photo_url: profile.photo_url,
        updated_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', authData.user.id)
        .select('id, email, display_name, photo_url')
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Failed to update profile');
      
      return {
        id: data.id,
        email: data.email,
        name: data.display_name || undefined,
        photoUrl: data.photo_url || undefined,
      };
    } catch (error) {
      return handleDatabaseError('updateProfile', error as Error);
    }
  },
  
  /**
   * Create a new user profile after registration
   * @param userData - User data from authentication provider
   * @returns The created user profile
   * @throws DatabaseError if operation fails
   */
  async createUserProfile(userData: { 
    id: string; 
    email: string; 
    display_name?: string; 
    photo_url?: string; 
  }): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userData.id,
          email: userData.email,
          display_name: userData.display_name,
          photo_url: userData.photo_url,
        })
        .select('id, email, display_name, photo_url')
        .single();
      
      if (error) {
        // If user already exists, try to fetch the profile
        if (error.code === '23505') {
          const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('id, email, display_name, photo_url')
            .eq('id', userData.id)
            .single();
          
          if (fetchError) throw fetchError;
          if (!existingUser) throw new Error('Failed to find existing user');
          
          return {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.display_name || undefined,
            photoUrl: existingUser.photo_url || undefined,
          };
        }
        
        throw error;
      }
      
      if (!data) throw new Error('Failed to create user profile');
      
      return {
        id: data.id,
        email: data.email,
        name: data.display_name || undefined,
        photoUrl: data.photo_url || undefined,
      };
    } catch (error) {
      return handleDatabaseError('createUserProfile', error as Error);
    }
  },
  
  /**
   * Delete user account and all associated data
   * @returns Success status
   * @throws DatabaseError if operation fails
   */
  async deleteAccount(): Promise<{ success: boolean }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Not authenticated');
      
      // Delete user from users table
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', authData.user.id);
      
      if (error) throw error;
      
      // Delete auth user
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      
      return { success: true };
    } catch (error) {
      return handleDatabaseError('deleteAccount', error as Error);
    }
  },
};

/**
 * Quiz-related database operations
 */
export const quizService = {
  /**
   * Get quizzes with optional filtering
   * @param filters - Optional filters for quizzes
   * @returns Array of quiz summaries
   * @throws DatabaseError if operation fails
   */
  async getQuizzes(filters?: { 
    subject_id?: string; 
    year_level?: number;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<QuizSummary[]> {
    try {
      // Generate cache key based on filters
      const cacheKey = filters ? JSON.stringify(filters) : 'all-quizzes';
      
      // Check cache first
      const cachedData = cache.get(cache.quizSummaries, cacheKey);
      if (cachedData) {
        return cachedData;
      }
      
      // Create the base query
      let query = supabase
        .from('quizzes')
        .select(`
          id,
          title,
          description,
          subject_id,
          year_level,
          time_limit_minutes,
          created_at,
          updated_at,
          created_by,
          subjects:subject_id(id, name),
          quiz_tags!inner(tags:tag_id(name))
        `);
      
      // Apply filters if provided
      if (filters?.subject_id) {
        query = query.eq('subject_id', filters.subject_id);
      }
      
      if (filters?.year_level) {
        query = query.eq('year_level', filters.year_level);
      }
      
      if (filters?.tags && filters.tags.length > 0) {
        // This is a more complex query for tag filtering
        // We need to join with quiz_tags again for each tag
        // ...implementation would depend on how you want to handle multiple tags
        // (AND or OR logic)
      }
      
      // Apply pagination if provided
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform the data to match our QuizSummary type
      const quizSummaries = await Promise.all(data.map(async (item) => {
        // Get question count for each quiz
        const { count, error: countError } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', item.id);
        
        if (countError) throw countError;
        
        return {
          id: item.id,
          title: item.title,
          description: item.description || undefined,
          subject: item.subjects?.[0]?.name ?? 'Unknown',
          yearLevel: item.year_level || undefined,
          timeLimit: item.time_limit_minutes || undefined,
          tags: item.quiz_tags.map(tagRel => tagRel.tags[0]?.name ?? 'Unknown'),
          questionCount: count || 0,
          createdAt: item.created_at,
          updatedAt: item.updated_at || undefined
        };
      }));
      
      // Store in cache
      cache.set(cache.quizSummaries, cacheKey, quizSummaries);
      
      return quizSummaries;
    } catch (error) {
      return handleDatabaseError('getQuizzes', error as Error);
    }
  },
  
  /**
   * Get a specific quiz by ID with all questions and options
   * @param quizId - Quiz identifier
   * @returns Complete quiz data with questions
   * @throws DatabaseError if operation fails
   */
  async getQuizById(quizId: string): Promise<Quiz> {
    try {
      // Check cache first
      const cachedQuiz = cache.get(cache.quizzes, quizId);
      if (cachedQuiz) {
        return cachedQuiz;
      }
      
      // Fetch the quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          description,
          subject_id,
          year_level,
          time_limit_minutes,
          created_at,
          updated_at,
          created_by,
          subjects:subject_id(name),
          quiz_tags!inner(tags:tag_id(name))
        `)
        .eq('id', quizId)
        .single();
      
      if (quizError) throw quizError;
      if (!quizData) throw new Error(`Quiz not found: ${quizId}`);
      
      // Fetch the questions for this quiz
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          text,
          explanation,
          type,
          order_index,
          answer_options(id, text, is_correct, order_index)
        `)
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });
      
      if (questionsError) throw questionsError;
      
      // Transform the data to match our Quiz type
      const quiz: Quiz = {
        id: quizData.id,
        title: quizData.title,
        description: quizData.description || undefined,
        subject: quizData.subjects[0].name,
        yearLevel: quizData.year_level || undefined,
        timeLimit: quizData.time_limit_minutes || undefined,
        tags: quizData.quiz_tags.flatMap(tagRel => tagRel.tags.map(tag => tag.name)),
        createdAt: quizData.created_at,
        updatedAt: quizData.updated_at || undefined,
        createdBy: quizData.created_by,
        questions: questionsData.map(q => ({
          id: q.id,
          text: q.text,
          explanation: q.explanation || undefined,
          type: q.type as any, // Cast to our enum type
          options: q.answer_options
            .sort((a, b) => a.order_index - b.order_index)
            .map(opt => ({
              id: opt.id,
              text: opt.text,
              isCorrect: opt.is_correct
            }))
        }))
      };
      
      // Store in cache
      cache.set(cache.quizzes, quizId, quiz);
      
      return quiz;
    } catch (error) {
      return handleDatabaseError('getQuizById', error as Error);
    }
  },
  
  /**
   * Create a new quiz with questions and options
   * @param quizData - Complete quiz data to create
   * @returns The created quiz
   * @throws DatabaseError if operation fails
   */
  async createQuiz(quizData: {
    title: string;
    description?: string;
    subject: string;
    yearLevel?: number;
    timeLimit?: number;
    tags: string[];
    questions: {
      text: string;
      explanation?: string;
      type: string;
      options: {
        text: string;
        isCorrect: boolean;
      }[];
    }[];
  }): Promise<Quiz> {
    try {
      // Get current user
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Not authenticated');
      
      // Start a transaction (simulated - Supabase JS doesn't directly support transactions)
      
      // 1. Get or create subject
      let subjectId: string;
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', quizData.subject)
        .single();
      
      if (subjectError && subjectError.code !== 'PGRST116') { // PGRST116 = No rows returned
        throw subjectError;
      }
      
      if (subjectData) {
        subjectId = subjectData.id;
      } else {
        // Create new subject
        const { data: newSubject, error: createSubjectError } = await supabase
          .from('subjects')
          .insert({ name: quizData.subject })
          .select('id')
          .single();
        
        if (createSubjectError) throw createSubjectError;
        if (!newSubject) throw new Error('Failed to create subject');
        
        subjectId = newSubject.id;
      }
      
      // 2. Create the quiz
      const { data: newQuiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: quizData.title,
          description: quizData.description,
          subject_id: subjectId,
          year_level: quizData.yearLevel,
          time_limit_minutes: quizData.timeLimit,
          created_by: authData.user.id
        })
        .select('id')
        .single();
      
      if (quizError) throw quizError;
      if (!newQuiz) throw new Error('Failed to create quiz');
      
      const quizId = newQuiz.id;
      
      // 3. Process tags
      for (const tagName of quizData.tags) {
        // Check if tag exists
        const { data: tagData, error: tagError } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName)
          .single();
        
        let tagId: string;
        
        if (tagError && tagError.code !== 'PGRST116') {
          throw tagError;
        }
        
        if (tagData) {
          tagId = tagData.id;
        } else {
          // Create new tag
          const { data: newTag, error: createTagError } = await supabase
            .from('tags')
            .insert({ name: tagName })
            .select('id')
            .single();
          
          if (createTagError) throw createTagError;
          if (!newTag) throw new Error(`Failed to create tag: ${tagName}`);
          
          tagId = newTag.id;
        }
        
        // Create quiz-tag relationship
        const { error: quizTagError } = await supabase
          .from('quiz_tags')
          .insert({
            quiz_id: quizId,
            tag_id: tagId
          });
        
        if (quizTagError) throw quizTagError;
      }
      
      // 4. Create questions and answer options
      for (let i = 0; i < quizData.questions.length; i++) {
        const question = quizData.questions[i];
        
        const { data: newQuestion, error: questionError } = await supabase
          .from('questions')
          .insert({
            quiz_id: quizId,
            text: question.text,
            explanation: question.explanation,
            type: question.type,
            order_index: i
          })
          .select('id')
          .single();
        
        if (questionError) throw questionError;
        if (!newQuestion) throw new Error(`Failed to create question ${i + 1}`);
        
        const questionId = newQuestion.id;
        
        // Create answer options
        for (let j = 0; j < question.options.length; j++) {
          const option = question.options[j];
          
          const { error: optionError } = await supabase
            .from('answer_options')
            .insert({
              question_id: questionId,
              text: option.text,
              is_correct: option.isCorrect,
              order_index: j
            });
          
          if (optionError) throw optionError;
        }
      }
      
      // Clear cache
      cache.clear();
      
      // Get the complete quiz
      return await this.getQuizById(quizId);
    } catch (error) {
      return handleDatabaseError('createQuiz', error as Error);
    }
  },
  
  /**
   * Update an existing quiz
   * @param quizId - Quiz identifier
   * @param updates - Quiz data to update
   * @returns The updated quiz
   * @throws DatabaseError if operation fails
   */
  async updateQuiz(quizId: string, updates: {
    title?: string;
    description?: string;
    yearLevel?: number;
    timeLimit?: number;
    tags?: string[];
  }): Promise<Quiz> {
    try {
      // Get current user for permission check
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Not authenticated');
      
      // Check if user is the creator or has admin rights
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('created_by')
        .eq('id', quizId)
        .single();
      
      if (quizError) throw quizError;
      if (!quizData) throw new Error(`Quiz not found: ${quizId}`);
      
      if (quizData.created_by !== authData.user.id) {
        // Check if user has admin role (implementation depends on your auth model)
        // For now, we'll just deny access
        throw new Error('You do not have permission to edit this quiz');
      }
      
      // Update the quiz base data
      const quizUpdates: Partial<{
        title: string;
        description: string;
        year_level: number;
        time_limit_minutes: number;
        updated_at: string;
      }> = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.title !== undefined) quizUpdates.title = updates.title;
      if (updates.description !== undefined) quizUpdates.description = updates.description;
      if (updates.yearLevel !== undefined) quizUpdates.year_level = updates.yearLevel;
      if (updates.timeLimit !== undefined) quizUpdates.time_limit_minutes = updates.timeLimit;
      
      const { error: updateError } = await supabase
        .from('quizzes')
        .update(quizUpdates)
        .eq('id', quizId);
      
      if (updateError) throw updateError;
      
      // Update tags if provided
      if (updates.tags) {
        // Delete existing tags
        const { error: deleteTagsError } = await supabase
          .from('quiz_tags')
          .delete()
          .eq('quiz_id', quizId);
        
        if (deleteTagsError) throw deleteTagsError;
        
        // Add new tags
        for (const tagName of updates.tags) {
          // Check if tag exists
          const { data: tagData, error: tagError } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .single();
          
          let tagId: string;
          
          if (tagError && tagError.code !== 'PGRST116') {
            throw tagError;
          }
          
          if (tagData) {
            tagId = tagData.id;
          } else {
            // Create new tag
            const { data: newTag, error: createTagError } = await supabase
              .from('tags')
              .insert({ name: tagName })
              .select('id')
              .single();
            
            if (createTagError) throw createTagError;
            if (!newTag) throw new Error(`Failed to create tag: ${tagName}`);
            
            tagId = newTag.id;
          }
          
          // Create quiz-tag relationship
          const { error: quizTagError } = await supabase
            .from('quiz_tags')
            .insert({
              quiz_id: quizId,
              tag_id: tagId
            });
          
          if (quizTagError) throw quizTagError;
        }
      }
      
      // Clear cache
      cache.clear();
      
      // Get the updated quiz
      return await this.getQuizById(quizId);
    } catch (error) {
      return handleDatabaseError('updateQuiz', error as Error);
    }
  },
  
  /**
   * Delete a quiz and all associated data
   * @param quizId - Quiz identifier
   * @returns Success status
   * @throws DatabaseError if operation fails
   */
  async deleteQuiz(quizId: string): Promise<{ success: boolean }> {
    try {
      // Get current user for permission check
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Not authenticated');
      
      // Check if user is the creator or has admin rights
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('created_by')
        .eq('id', quizId)
        .single();
      
      if (quizError) throw quizError;
      if (!quizData) throw new Error(`Quiz not found: ${quizId}`);
      
      if (quizData.created_by !== authData.user.id) {
        // Check if user has admin role (implementation depends on your auth model)
        // For now, we'll just deny access
        throw new Error('You do not have permission to delete this quiz');
      }
      
      // Delete the quiz (cascade will delete questions, options, and tags)
      const { error: deleteError } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);
      
      if (deleteError) throw deleteError;
      
      // Clear cache
      cache.clear();
      
      return { success: true };
    } catch (error) {
      return handleDatabaseError('deleteQuiz', error as Error);
    }
  },
  
  /**
   * Record a quiz attempt result
   * @param attemptData - Quiz attempt data
   * @returns The quiz result
   * @throws DatabaseError if operation fails
   */
  async recordQuizAttempt(attemptData: {
    quizId: string;
    score: number;
    correctCount: number;
    totalCount: number;
    timeTakenSeconds: number;
    questionResults: Record<string, boolean>;
  }): Promise<QuizResult> {
    try {
      // Get current user
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Not authenticated');
      
      // Create attempt record
      const { data: attemptRecord, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: attemptData.quizId,
          user_id: authData.user.id,
          score: attemptData.score,
          correct_count: attemptData.correctCount,
          total_count: attemptData.totalCount,
          time_taken_seconds: attemptData.timeTakenSeconds,
        })
        .select('id, completed_at')
        .single();
      
      if (attemptError) throw attemptError;
      if (!attemptRecord) throw new Error('Failed to create quiz attempt record');
      
      // Record individual question results
      const questionResultsArray = Object.entries(attemptData.questionResults).map(
        ([questionId, isCorrect]) => ({
          attempt_id: attemptRecord.id,
          question_id: questionId,
          is_correct: isCorrect,
          selected_options: null, // We're not tracking selected options in this version
        })
      );
      
      const { error: resultsError } = await supabase
        .from('question_results')
        .insert(questionResultsArray);
      
      if (resultsError) throw resultsError;
      
      // Return formatted result
      return {
        quizId: attemptData.quizId,
        userId: authData.user.id,
        score: attemptData.score,
        correctCount: attemptData.correctCount,
        totalCount: attemptData.totalCount,
        timeTakenSeconds: attemptData.timeTakenSeconds,
        completedAt: attemptRecord.completed_at,
        questionResults: attemptData.questionResults
      };
    } catch (error) {
      return handleDatabaseError('recordQuizAttempt', error as Error);
    }
  },
  
  /**
   * Get user's quiz attempt history
   * @param limit - Optional result limit
   * @param offset - Optional pagination offset
   * @returns Array of quiz results
   * @throws DatabaseError if operation fails
   */
  async getUserQuizHistory(limit = 10, offset = 0): Promise<QuizResult[]> {
    try {
      // Get current user
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error('Not authenticated');
      
      // Get attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          quiz_id,
          score,
          correct_count,
          total_count,
          time_taken_seconds,
          completed_at,
          quizzes:quiz_id(title)
        `)
        .eq('user_id', authData.user.id)
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (attemptsError) throw attemptsError;
      
      // Get question results for each attempt
      const results = await Promise.all(attempts.map(async (attempt) => {
        const { data: questionResults, error: resultsError } = await supabase
          .from('question_results')
          .select('question_id, is_correct')
          .eq('attempt_id', attempt.id);
        
        if (resultsError) throw resultsError;
        
        // Format question results
        const formattedResults: Record<string, boolean> = {};
        questionResults.forEach(result => {
          formattedResults[result.question_id] = result.is_correct;
        });
        
        return {
          quizId: attempt.quiz_id,
          userId: authData.user.id,
          score: attempt.score,
          correctCount: attempt.correct_count,
          totalCount: attempt.total_count,
          timeTakenSeconds: attempt.time_taken_seconds,
          completedAt: attempt.completed_at,
          questionResults: formattedResults,
          quizTitle: attempt.quizzes?.[0]?.title // Add quiz title for UI display
        };
      }));
      
      return results;
    } catch (error) {
      return handleDatabaseError('getUserQuizHistory', error as Error);
    }
  }
};

/**
 * Clear all cache data
 * Useful when logging out or when data might be stale
 */
export const clearDatabaseCache = (): void => {
  cache.clear();
};