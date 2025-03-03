// frontend/src/services/repositories/supabaseQuizRepository.ts

import { supabase } from '../supabase';
import { 
  Quiz, 
  QuizStatus,
  Question,
  AnswerOption
} from '../../types/domain';
import { 
  PaginatedResponse, 
  QuizListParams 
} from '../../types/api';
import { QuizRepository } from './interfaces';
import { DatabaseError } from '../databaseService';

/**
 * Supabase implementation of the QuizRepository interface
 */
export class SupabaseQuizRepository implements QuizRepository {
  /**
   * Get quizzes with optional filtering and pagination
   */
  async getQuizzes(params: QuizListParams): Promise<PaginatedResponse<Quiz>> {
    try {
      // Base query with all required relationships
      let query = supabase
        .from('quizzes')
        .select(`
          id,
          title,
          description,
          subject_id,
          year_level,
          time_limit_minutes,
          randomize_questions,
          randomize_options,
          pass_score,
          status,
          created_at,
          updated_at,
          created_by,
          subjects:subject_id(id, name),
          quiz_tags(tags(id, name))
        `);
      
      // Apply filters
      if (params.subject) {
        const { data: subjectData } = await supabase
          .from('subjects')
          .select('id')
          .eq('name', params.subject)
          .single();
          
        if (subjectData) {
          query = query.eq('subject_id', subjectData.id);
        }
      }
      
      if (params.yearLevel) {
        query = query.eq('year_level', params.yearLevel);
      }
      
      if (params.status) {
        query = query.eq('status', params.status);
      }
      
      if (params.search) {
        query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
      }
      
      if (params.createdBy) {
        query = query.eq('created_by', params.createdBy);
      }
      
      // Handle tags filtering (more complex)
      if (params.tags && params.tags.length > 0) {
        // Get tag IDs first
        const { data: tagData } = await supabase
          .from('tags')
          .select('id')
          .in('name', params.tags);
          
        if (tagData && tagData.length > 0) {
          const tagIds = tagData.map(tag => tag.id);
          
          // Find quizzes that have ALL the specified tags
          const { data: quizTagData } = await supabase
            .from('quiz_tags')
            .select('quiz_id, tag_id');
            
          if (quizTagData) {
            // Group by quiz_id
            const quizTagMap: Record<string, string[]> = {};
            quizTagData.forEach(qt => {
              if (!quizTagMap[qt.quiz_id]) {
                quizTagMap[qt.quiz_id] = [];
              }
              quizTagMap[qt.quiz_id].push(qt.tag_id);
            });
            
            // Find quizzes that contain all the specified tag IDs
            const matchingQuizIds = Object.entries(quizTagMap)
              .filter(([_, quizTagIds]) => 
                tagIds.every(tagId => quizTagIds.includes(tagId))
              )
              .map(([quizId]) => quizId);
              
            if (matchingQuizIds.length > 0) {
              query = query.in('id', matchingQuizIds);
            } else {
              // No quizzes match all tags, return empty result
              return {
                items: [],
                total: 0,
                page: params.page || 1,
                limit: params.limit || 10,
                totalPages: 0
              };
            }
          }
        }
      }
      
      // Calculate total count (before pagination)
      const { count, error: countError } = await query.count();
      if (countError) throw countError;
      
      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 10;
      const offset = (page - 1) * limit;
      
      // Apply sorting
      if (params.sort) {
        const order = params.order === 'desc' ? true : false;
        query = query.order(params.sort, { ascending: !order });
      } else {
        // Default sort by created_at
        query = query.order('created_at', { ascending: false });
      }
      
      // Execute query with pagination
      const { data, error } = await query
        .range(offset, offset + limit - 1);
        
      if (error) throw error;
      if (!data) throw new Error('No data returned from query');
      
      // Transform results to domain model
      const quizzes = await Promise.all(data.map(async (item) => {
        // Get question count for each quiz
        const { count: questionCount, error: questionCountError } = await supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('quiz_id', item.id);
          
        if (questionCountError) throw questionCountError;
        
        // Extract tags
        const tags = item.quiz_tags
          .map((qt: any) => qt.tags.name)
          .filter(Boolean);
          
        return {
          id: item.id,
          title: item.title,
          description: item.description || undefined,
          subject: item.subjects?.name || 'Unknown',
          yearLevel: item.year_level || undefined,
          timeLimit: item.time_limit_minutes || undefined,
          randomizeQuestions: item.randomize_questions || false,
          randomizeOptions: item.randomize_options || false,
          passScore: item.pass_score || undefined,
          status: item.status as QuizStatus,
          tags,
          questionCount: questionCount || 0,
          createdBy: item.created_by,
          createdAt: item.created_at,
          updatedAt: item.updated_at || undefined
        };
      }));
      
      // Return paginated response
      return {
        items: quizzes,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('Error getting quizzes:', error);
      throw new DatabaseError('Failed to get quizzes', error as Error);
    }
  }

  /**
   * Get a specific quiz by ID with all questions and options
   */
  async getQuizById(quizId: string): Promise<Quiz> {
    try {
      // Get the quiz with basic information
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          description,
          subject_id,
          year_level,
          time_limit_minutes,
          randomize_questions,
          randomize_options,
          pass_score,
          status,
          created_at,
          updated_at,
          created_by,
          subjects:subject_id(id, name),
          quiz_tags(tags(id, name))
        `)
        .eq('id', quizId)
        .single();
        
      if (quizError) throw quizError;
      if (!quizData) throw new Error(`Quiz not found: ${quizId}`);
      
      // Get questions for this quiz
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          text,
          explanation,
          type,
          order_index,
          tags,
          difficulty
        `)
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });
        
      if (questionsError) throw questionsError;
      
      // Get answer options for all questions
      const questions: Question[] = await Promise.all(questionsData.map(async (question) => {
        const { data: optionsData, error: optionsError } = await supabase
          .from('answer_options')
          .select(`
            id,
            text,
            is_correct,
            explanation,
            order_index
          `)
          .eq('question_id', question.id)
          .order('order_index', { ascending: true });
          
        if (optionsError) throw optionsError;
        
        // Map options to domain model
        const options: AnswerOption[] = optionsData.map(option => ({
          id: option.id,
          text: option.text,
          isCorrect: option.is_correct,
          explanation: option.explanation || undefined,
          orderIndex: option.order_index
        }));
        
        // Return question with options
        return {
          id: question.id,
          text: question.text,
          explanation: question.explanation || undefined,
          type: question.type,
          options,
          tags: question.tags || [],
          difficulty: question.difficulty || undefined,
          orderIndex: question.order_index,
          createdAt: question.created_at,
          updatedAt: question.updated_at
        };
      }));
      
      // Extract tags
      const tags = quizData.quiz_tags
        .map((qt: any) => qt.tags.name)
        .filter(Boolean);
        
      // Map quiz to domain model
      return {
        id: quizData.id,
        title: quizData.title,
        description: quizData.description || undefined,
        subject: quizData.subjects?.name || 'Unknown',
        yearLevel: quizData.year_level || undefined,
        timeLimit: quizData.time_limit_minutes || undefined,
        randomizeQuestions: quizData.randomize_questions || false,
        randomizeOptions: quizData.randomize_options || false,
        passScore: quizData.pass_score || undefined,
        status: quizData.status as QuizStatus,
        tags,
        questions,
        questionCount: questions.length,
        createdBy: quizData.created_by,
        createdAt: quizData.created_at,
        updatedAt: quizData.updated_at || undefined
      };
    } catch (error) {
      console.error(`Error getting quiz ${quizId}:`, error);
      throw new DatabaseError(`Failed to get quiz: ${quizId}`, error as Error);
    }
  }

  /**
   * Create a new quiz with questions and options
   */
  async createQuiz(quizData: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'questionCount'>): Promise<Quiz> {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');
      
      // Begin transaction (simulated - Supabase JS doesn't directly support transactions)
      
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
        // Create subject
        const { data: newSubject, error: createSubjectError } = await supabase
          .from('subjects')
          .insert({ name: quizData.subject })
          .select('id')
          .single();
          
        if (createSubjectError) throw createSubjectError;
        if (!newSubject) throw new Error(`Failed to create subject: ${quizData.subject}`);
        
        subjectId = newSubject.id;
      }
      
      // 2. Create quiz
      const { data: newQuiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          title: quizData.title,
          description: quizData.description,
          subject_id: subjectId,
          year_level: quizData.yearLevel,
          time_limit_minutes: quizData.timeLimit,
          randomize_questions: quizData.randomizeQuestions,
          randomize_options: quizData.randomizeOptions,
          pass_score: quizData.passScore,
          status: quizData.status,
          created_by: userData.user.id
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
        
        if (tagError && tagError.code !== 'PGRST116') { // No rows returned
          throw tagError;
        }
        
        if (tagData) {
          tagId = tagData.id;
        } else {
          // Create tag
          const { data: newTag, error: createTagError } = await supabase
            .from('tags')
            .insert({ name: tagName })
            .select('id')
            .single();
            
          if (createTagError) throw createTagError;
          if (!newTag) throw new Error(`Failed to create tag: ${tagName}`);
          
          tagId = newTag.id;
        }
        
        // Create quiz-tag association
        const { error: quizTagError } = await supabase
          .from('quiz_tags')
          .insert({
            quiz_id: quizId,
            tag_id: tagId
          });
          
        if (quizTagError) throw quizTagError;
      }
      
      // 4. Create questions with options
      for (let i = 0; i < quizData.questions.length; i++) {
        const question = quizData.questions[i];
        
        // Create question
        const { data: newQuestion, error: questionError } = await supabase
          .from('questions')
          .insert({
            quiz_id: quizId,
            text: question.text,
            explanation: question.explanation,
            type: question.type,
            order_index: i,
            tags: question.tags || [],
            difficulty: question.difficulty
          })
          .select('id')
          .single();
          
        if (questionError) throw questionError;
        if (!newQuestion) throw new Error(`Failed to create question: ${question.text}`);
        
        const questionId = newQuestion.id;
        
        // Create options
        for (let j = 0; j < question.options.length; j++) {
          const option = question.options[j];
          
          const { error: optionError } = await supabase
            .from('answer_options')
            .insert({
              question_id: questionId,
              text: option.text,
              is_correct: option.isCorrect,
              explanation: option.explanation,
              order_index: j
            });
            
          if (optionError) throw optionError;
        }
      }
      
      // Return the created quiz
      return await this.getQuizById(quizId);
    } catch (error) {
      console.error('Error creating quiz:', error);
      throw new DatabaseError('Failed to create quiz', error as Error);
    }
  }

  /**
   * Update an existing quiz
   */
  async updateQuiz(quizId: string, quizData: Partial<Quiz>): Promise<Quiz> {
    try {
      // Get current user for permission check
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');
      
      // Check if user is quiz creator or admin
      const { data: existingQuiz, error: quizError } = await supabase
        .from('quizzes')
        .select('created_by')
        .eq('id', quizId)
        .single();
        
      if (quizError) throw quizError;
      if (!existingQuiz) throw new Error(`Quiz not found: ${quizId}`);
      
      // Check permission (created_by === current user or user is admin)
      // TODO: Add admin role check
      if (existingQuiz.created_by !== userData.user.id) {
        throw new Error('You do not have permission to update this quiz');
      }
      
      // Build update object
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };
      
      // Only include fields that are provided
      if (quizData.title !== undefined) updateData.title = quizData.title;
      if (quizData.description !== undefined) updateData.description = quizData.description;
      if (quizData.yearLevel !== undefined) updateData.year_level = quizData.yearLevel;
      if (quizData.timeLimit !== undefined) updateData.time_limit_minutes = quizData.timeLimit;
      if (quizData.randomizeQuestions !== undefined) updateData.randomize_questions = quizData.randomizeQuestions;
      if (quizData.randomizeOptions !== undefined) updateData.randomize_options = quizData.randomizeOptions;
      if (quizData.passScore !== undefined) updateData.pass_score = quizData.passScore;
      if (quizData.status !== undefined) updateData.status = quizData.status;
      
      // If subject changed, get or create subject ID
      if (quizData.subject !== undefined) {
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('id')
          .eq('name', quizData.subject)
          .single();
          
        if (subjectError && subjectError.code !== 'PGRST116') { // PGRST116 = No rows returned
          throw subjectError;
        }
        
        let subjectId: string;
        
        if (subjectData) {
          subjectId = subjectData.id;
        } else {
          // Create subject
          const { data: newSubject, error: createSubjectError } = await supabase
            .from('subjects')
            .insert({ name: quizData.subject })
            .select('id')
            .single();
            
          if (createSubjectError) throw createSubjectError;
          if (!newSubject) throw new Error(`Failed to create subject: ${quizData.subject}`);
          
          subjectId = newSubject.id;
        }
        
        updateData.subject_id = subjectId;
      }
      
      // Update quiz
      const { error: updateError } = await supabase
        .from('quizzes')
        .update(updateData)
        .eq('id', quizId);
        
      if (updateError) throw updateError;
      
      // Update tags if provided
      if (quizData.tags !== undefined) {
        // Delete existing associations
        const { error: deleteTagsError } = await supabase
          .from('quiz_tags')
          .delete()
          .eq('quiz_id', quizId);
          
        if (deleteTagsError) throw deleteTagsError;
        
        // Create new associations
        for (const tagName of quizData.tags) {
          // Check if tag exists
          const { data: tagData, error: tagError } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .single();
            
          let tagId: string;
          
          if (tagError && tagError.code !== 'PGRST116') { // No rows returned
            throw tagError;
          }
          
          if (tagData) {
            tagId = tagData.id;
          } else {
            // Create tag
            const { data: newTag, error: createTagError } = await supabase
              .from('tags')
              .insert({ name: tagName })
              .select('id')
              .single();
              
            if (createTagError) throw createTagError;
            if (!newTag) throw new Error(`Failed to create tag: ${tagName}`);
            
            tagId = newTag.id;
          }
          
          // Create quiz-tag association
          const { error: quizTagError } = await supabase
            .from('quiz_tags')
            .insert({
              quiz_id: quizId,
              tag_id: tagId
            });
            
          if (quizTagError) throw quizTagError;
        }
      }
      
      // Return updated quiz
      return await this.getQuizById(quizId);
    } catch (error) {
      console.error(`Error updating quiz ${quizId}:`, error);
      throw new DatabaseError(`Failed to update quiz: ${quizId}`, error as Error);
    }
  }

  /**
   * Delete a quiz and all associated data
   */
  async deleteQuiz(quizId: string): Promise<boolean> {
    try {
      // Get current user for permission check
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');
      
      // Check if user is quiz creator or admin
      const { data: existingQuiz, error: quizError } = await supabase
        .from('quizzes')
        .select('created_by')
        .eq('id', quizId)
        .single();
        
      if (quizError) throw quizError;
      if (!existingQuiz) throw new Error(`Quiz not found: ${quizId}`);
      
      // Check permission (created_by === current user or user is admin)
      // TODO: Add admin role check
      if (existingQuiz.created_by !== userData.user.id) {
        throw new Error('You do not have permission to delete this quiz');
      }
      
      // Delete quiz (cascade will handle questions, options, and tags)
      const { error: deleteError } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);
        
      if (deleteError) throw deleteError;
      
      return true;
    } catch (error) {
      console.error(`Error deleting quiz ${quizId}:`, error);
      throw new DatabaseError(`Failed to delete quiz: ${quizId}`, error as Error);
    }
  }

  /**
   * Get quizzes created by a specific user
   */
  async getQuizzesByUser(userId: string, params: PaginationParams): Promise<PaginatedResponse<Quiz>> {
    const quizParams: QuizListParams = {
      ...params,
      createdBy: userId
    };
    
    return await this.getQuizzes(quizParams);
  }

  /**
   * Get popular quizzes based on attempt count
   */
  async getPopularQuizzes(limit: number = 10): Promise<Quiz[]> {
    try {
      // Get quiz attempts count, grouped by quiz_id
      const { data: attemptStats, error: statsError } = await supabase
        .rpc('get_quiz_attempt_stats'); // This is a custom Postgres function
        
      if (statsError) throw statsError;
      
      // Sort by attempt count and take top N
      const topQuizIds = attemptStats
        .sort((a, b) => b.attempt_count - a.attempt_count)
        .slice(0, limit)
        .map(stat => stat.quiz_id);
        
      if (topQuizIds.length === 0) {
        // Fallback to recently created quizzes
        const { data: recentQuizzes, error: recentError } = await supabase
          .from('quizzes')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(limit);
          
        if (recentError) throw recentError;
        
        topQuizIds.push(...recentQuizzes.map(q => q.id));
      }
      
      // Get full quiz data for these IDs
      const quizzes = await Promise.all(
        topQuizIds.map(id => this.getQuizById(id))
      );
      
      return quizzes;
    } catch (error) {
      console.error('Error getting popular quizzes:', error);
      throw new DatabaseError('Failed to get popular quizzes', error as Error);
    }
  }

  /**
   * Search quizzes by keyword
   */
  async searchQuizzes(query: string, params: PaginationParams): Promise<PaginatedResponse<Quiz>> {
    const quizParams: QuizListParams = {
      ...params,
      search: query
    };
    
    return await this.getQuizzes(quizParams);
  }
}

// Export singleton instance
export const quizRepository = new SupabaseQuizRepository();