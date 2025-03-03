// frontend/src/services/databaseService.ts

import { supabase } from './supabase';
import { Quiz, QuizSummary, Question } from '../types';

// User-related operations
export const userService = {
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },
  
  async updateProfile(profile: { display_name?: string, photo_url?: string }) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('users')
      .update({
        display_name: profile.display_name,
        photo_url: profile.photo_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
};

// Quiz-related operations
export const quizService = {
  async getQuizzes(filters?: { subject_id?: string, year_level?: number }): Promise<QuizSummary[]> {
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
        subjects:subject_id(name),
        quiz_tags!inner(tags:tag_id(name))
      `);
    
    if (filters?.subject_id) {
      query = query.eq('subject_id', filters.subject_id);
    }
    
    if (filters?.year_level) {
      query = query.eq('year_level', filters.year_level);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Transform the data to match our QuizSummary type
    return data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || undefined,
      subject: item.subjects.name,
      yearLevel: item.year_level || undefined,
      timeLimit: item.time_limit_minutes || undefined,
      tags: item.quiz_tags.map(tagRel => tagRel.tags.name),
      questionCount: 0, // We'll need to fetch this separately or use a view
      createdAt: item.created_at,
      updatedAt: item.updated_at || undefined
    }));
  },
  
  async getQuizById(quizId: string): Promise<Quiz> {
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
      subject: quizData.subjects.name,
      yearLevel: quizData.year_level || undefined,
      timeLimit: quizData.time_limit_minutes || undefined,
      tags: quizData.quiz_tags.map(tagRel => tagRel.tags.name),
      createdAt: quizData.created_at,
      updatedAt: quizData.updated_at || undefined,
      createdBy: quizData.created_by,
      questions: questionsData.map(q => ({
        id: q.id,
        text: q.text,
        explanation: q.explanation || undefined,
        type: q.type as any, // Cast to our enum type
        options: q.answer_options.map(opt => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.is_correct
        }))
      }))
    };
    
    return quiz;
  },
  
  // Add more methods for quiz operations...
};