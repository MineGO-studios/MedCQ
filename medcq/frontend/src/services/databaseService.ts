// src/services/databaseService.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { Quiz, QuizSummary } from '../types/domain';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Quiz service for direct database operations
export const quizService = {
  // Get list of quizzes with optional filtering
  async getQuizzes(params?: { subject_id?: string, year_level?: number }): Promise<QuizSummary[]> {
    let query = supabase
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        subject:subject_id (id, name),
        year_level,
        time_limit_minutes,
        created_at,
        updated_at,
        created_by,
        status,
        tags
      `)
      .order('updated_at', { ascending: false });

    // Apply filters if provided
    if (params?.subject_id) {
      query = query.eq('subject_id', params.subject_id);
    }
    
    if (params?.year_level) {
      query = query.eq('year_level', params.year_level);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    // Transform to QuizSummary
    return (data || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || undefined,
      subject: Array.isArray(item.subject) ? item.subject[0] : item.subject,
      yearLevel: item.year_level || undefined,
      timeLimit: item.time_limit_minutes || undefined,
      tags: item.tags || [],
      questionCount: 0, // Need to fetch separately or use a view
      status: item.status || 'published',
      createdAt: item.created_at,
      updatedAt: item.updated_at || undefined
    }));
  },

  // Get a specific quiz by ID
  async getQuizById(quizId: string): Promise<Quiz> {
    // First get the quiz details
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        subject:subject_id (id, name),
        year_level,
        time_limit_minutes,
        created_at,
        updated_at,
        created_by,
        status,
        tags,
        randomize_questions,
        randomize_options,
        pass_score
      `)
      .eq('id', quizId)
      .single();

    if (quizError) throw quizError;
    if (!quiz) throw new Error(`Quiz not found: ${quizId}`);

    // Then get the questions
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        id,
        text,
        explanation,
        type,
        difficulty,
        tags,
        order_index,
        options:question_options (
          id,
          text,
          is_correct,
          explanation,
          order_index
        )
      `)
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });

    if (questionsError) throw questionsError;

    // Transform to domain model
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description || undefined,
      subject: Array.isArray(quiz.subject) ? quiz.subject[0] : quiz.subject,
      yearLevel: quiz.year_level || undefined,
      timeLimit: quiz.time_limit_minutes || undefined,
      tags: quiz.tags || [],
      randomizeQuestions: quiz.randomize_questions || false,
      randomizeOptions: quiz.randomize_options || false,
      passScore: quiz.pass_score,
      status: quiz.status || 'published',
      questionCount: questions?.length || 0,
      createdAt: quiz.created_at,
      updatedAt: quiz.updated_at,
      createdBy: quiz.created_by,
      questions: (questions || []).map(q => ({
        id: q.id,
        text: q.text,
        explanation: q.explanation,
        type: q.type as any,
        difficulty: q.difficulty,
        tags: q.tags,
        orderIndex: q.order_index,
        options: (q.options || []).map(o => ({
          id: o.id,
          text: o.text,
          isCorrect: o.is_correct,
          explanation: o.explanation,
          orderIndex: o.order_index
        }))
      }))
    };
  }
};

// User service
export const userService = {
  // Get current user session
  async getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  }
};