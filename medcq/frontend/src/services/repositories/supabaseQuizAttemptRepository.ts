// frontend/src/services/repositories/supabaseQuizAttemptRepository.ts

import { supabase } from '../supbase';
import { 
  QuizAttempt, 
  QuizResult, 
  UserProgress,
  Question
} from '../../types/domain';
import { 
  PaginatedResponse, 
  PaginationParams, 
  StartQuizAttemptResponse,
  QuizResultResponse
} from '../../types/api';
import { QuizAttemptRepository } from './interfaces';
import { DatabaseError } from '../databaseService';
import { quizRepository } from './supabaseQuizRepository';

/**
 * Supabase implementation of the QuizAttemptRepository interface
 */
export class SupabaseQuizAttemptRepository implements QuizAttemptRepository {
  /**
   * Start a new quiz attempt
   */
  async startQuizAttempt(quizId: string, userId: string): Promise<QuizAttempt> {
    try {
      // Get the quiz to verify it exists and is accessible
      const quiz = await quizRepository.getQuizById(quizId);
      
      // Generate attempt ID
      const attemptId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      // Calculate expiration time if there's a time limit
      let expiresAt = null;
      if (quiz.timeLimit) {
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + quiz.timeLimit);
        expiresAt = expirationDate.toISOString();
      }
      
      // Create the attempt record
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          id: attemptId,
          quiz_id: quizId,
          user_id: userId,
          started_at: now,
          expires_at: expiresAt,
          status: 'in_progress'
        })
        .select('id, quiz_id, started_at, expires_at')
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Failed to create quiz attempt');
      
      return {
        id: data.id,
        quizId: data.quiz_id,
        userId,
        startedAt: data.started_at,
        expiresAt: data.expires_at,
        isCompleted: false
      };
    } catch (error) {
      console.error('Error starting quiz attempt:', error);
      throw new DatabaseError('Failed to start quiz attempt', error as Error);
    }
  }

  /**
   * Get a specific quiz attempt
   */
  async getQuizAttempt(attemptId: string): Promise<QuizAttempt> {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('id, quiz_id, user_id, started_at, expires_at, completed_at, status')
        .eq('id', attemptId)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error(`Quiz attempt not found: ${attemptId}`);
      
      return {
        id: data.id,
        quizId: data.quiz_id,
        userId: data.user_id,
        startedAt: data.started_at,
        expiresAt: data.expires_at || undefined,
        completedAt: data.completed_at || undefined,
        isCompleted: data.status === 'completed'
      };
    } catch (error) {
      console.error(`Error getting quiz attempt ${attemptId}:`, error);
      throw new DatabaseError(`Failed to get quiz attempt: ${attemptId}`, error as Error);
    }
  }

  /**
   * Submit a quiz attempt with answers
   */
  async submitQuizAttempt(
    attemptId: string, 
    answers: Record<string, string | string[]>,
    timeTakenSeconds: number
  ): Promise<QuizResult> {
    try {
      // Get the attempt to verify it exists and is in progress
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('id, quiz_id, user_id, started_at, expires_at, status')
        .eq('id', attemptId)
        .single();
      
      if (attemptError) throw attemptError;
      if (!attemptData) throw new Error(`Quiz attempt not found: ${attemptId}`);
      
      // Check if attempt is still in progress
      if (attemptData.status !== 'in_progress') {
        throw new Error('This quiz attempt has already been completed or expired');
      }
      
      // Check if attempt has expired
      if (attemptData.expires_at) {
        const expiresAt = new Date(attemptData.expires_at);
        if (new Date() > expiresAt) {
          // Update attempt status to expired
          await supabase
            .from('quiz_attempts')
            .update({ status: 'expired' })
            .eq('id', attemptId);
          
          throw new Error('This quiz attempt has expired');
        }
      }
      
      // Get the quiz to calculate score
      const quiz = await quizRepository.getQuizById(attemptData.quiz_id);
      
      // Calculate results
      const { questionResults, pointsEarned, pointsPossible } = this.calculateResults(quiz.questions, answers);
      
      // Calculate score percentage
      const scorePercentage = pointsPossible > 0 ? (pointsEarned / pointsPossible) * 100 : 0;
      
      // Determine if passed
      const passed = quiz.passScore !== undefined ? scorePercentage >= quiz.passScore : false;
      
      // Update attempt with results
      const now = new Date().toISOString();
      const { data: updatedAttempt, error: updateError } = await supabase
        .from('quiz_attempts')
        .update({
          completed_at: now,
          time_taken_seconds: timeTakenSeconds,
          score: scorePercentage,
          points_earned: pointsEarned,
          points_possible: pointsPossible,
          status: 'completed',
          passed
        })
        .eq('id', attemptId)
        .select('id, quiz_id, user_id, score, completed_at')
        .single();
      
      if (updateError) throw updateError;
      if (!updatedAttempt) throw new Error('Failed to update quiz attempt');
      
      // Store individual question results
      for (const result of questionResults) {
        const { error: resultError } = await supabase
          .from('question_results')
          .insert({
            attempt_id: attemptId,
            question_id: result.questionId,
            is_correct: result.isCorrect,
            points_earned: result.pointsEarned,
            points_possible: result.pointsPossible,
            selected_option_ids: result.selectedOptionIds,
            correct_option_ids: result.correctOptionIds
          });
        
        if (resultError) {
          console.error('Failed to store question result:', resultError);
          // Continue despite error
        }
      }
      
      // Count correct questions
      const correctCount = questionResults.filter(r => r.isCorrect).length;
      
      // Create result object
      const quizResult: QuizResult = {
        id: crypto.randomUUID(), // Client-side ID, will be replaced by server
        attemptId,
        quizId: attemptData.quiz_id,
        userId: attemptData.user_id,
        score: scorePercentage,
        correctCount,
        totalCount: quiz.questions.length,
        timeTakenSeconds,
        completedAt: now,
        passed,
        questionResults: Object.fromEntries(
          questionResults.map(r => [r.questionId, r.isCorrect])
        )
      };
      
      return quizResult;
    } catch (error) {
      console.error(`Error submitting quiz attempt ${attemptId}:`, error);
      throw new DatabaseError(`Failed to submit quiz attempt: ${attemptId}`, error as Error);
    }
  }

  /**
   * Get quiz attempts for a user
   */
  async getUserAttempts(userId: string, params: PaginationParams): Promise<PaginatedResponse<QuizAttempt>> {
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from('quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (countError) throw countError;
      
      // Get attempts with pagination
      const page = params.page || 1;
      const limit = params.limit || 10;
      const offset = (page - 1) * limit;
      
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('id, quiz_id, started_at, completed_at, expires_at, status')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      // Map to domain model
      const attempts = (data || []).map(item => ({
        id: item.id,
        quizId: item.quiz_id,
        userId,
        startedAt: item.started_at,
        completedAt: item.completed_at || undefined,
        expiresAt: item.expires_at || undefined,
        isCompleted: item.status === 'completed'
      }));
      
      return {
        items: attempts,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error('Error getting user attempts:', error);
      throw new DatabaseError('Failed to get user attempts', error as Error);
    }
  }

  /**
   * Get quiz results for a specific quiz
   */
  async getQuizResults(quizId: string, params: PaginationParams): Promise<PaginatedResponse<QuizResult>> {
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from('quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('quiz_id', quizId)
        .eq('status', 'completed');
      
      if (countError) throw countError;
      
      // Get results with pagination
      const page = params.page || 1;
      const limit = params.limit || 10;
      const offset = (page - 1) * limit;
      
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          id, 
          quiz_id, 
          user_id, 
          score, 
          points_earned,
          points_possible,
          time_taken_seconds,
          completed_at,
          passed
        `)
        .eq('quiz_id', quizId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      // Get question results for each attempt
      const results = await Promise.all((data || []).map(async item => {
        const { data: questionResults, error: resultsError } = await supabase
          .from('question_results')
          .select('question_id, is_correct')
          .eq('attempt_id', item.id);
        
        if (resultsError) throw resultsError;
        
        // Create a map of question ID to result
        const questionResultsMap: Record<string, boolean> = {};
        (questionResults || []).forEach(qr => {
          questionResultsMap[qr.question_id] = qr.is_correct;
        });
        
        return {
          id: item.id, // Use attempt ID as result ID
          attemptId: item.id,
          quizId: item.quiz_id,
          userId: item.user_id,
          score: item.score,
          correctCount: Object.values(questionResultsMap).filter(Boolean).length,
          totalCount: Object.keys(questionResultsMap).length,
          timeTakenSeconds: item.time_taken_seconds,
          completedAt: item.completed_at,
          passed: item.passed,
          questionResults: questionResultsMap
        };
      }));
      
      return {
        items: results,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error(`Error getting quiz results for quiz ${quizId}:`, error);
      throw new DatabaseError(`Failed to get quiz results: ${quizId}`, error as Error);
    }
  }

  /**
   * Get quiz results for a user
   */
  async getUserResults(userId: string, params: PaginationParams): Promise<PaginatedResponse<QuizResult>> {
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from('quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed');
      
      if (countError) throw countError;
      
      // Get results with pagination
      const page = params.page || 1;
      const limit = params.limit || 10;
      const offset = (page - 1) * limit;
      
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select(`
          id, 
          quiz_id, 
          user_id, 
          score, 
          points_earned,
          points_possible,
          time_taken_seconds,
          completed_at,
          passed
        `)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      // Get question results for each attempt
      const results = await Promise.all((data || []).map(async item => {
        const { data: questionResults, error: resultsError } = await supabase
          .from('question_results')
          .select('question_id, is_correct')
          .eq('attempt_id', item.id);
        
        if (resultsError) throw resultsError;
        
        // Create a map of question ID to result
        const questionResultsMap: Record<string, boolean> = {};
        (questionResults || []).forEach(qr => {
          questionResultsMap[qr.question_id] = qr.is_correct;
        });
        
        return {
          id: item.id, // Use attempt ID as result ID
          attemptId: item.id,
          quizId: item.quiz_id,
          userId: item.user_id,
          score: item.score,
          correctCount: Object.values(questionResultsMap).filter(Boolean).length,
          totalCount: Object.keys(questionResultsMap).length,
          timeTakenSeconds: item.time_taken_seconds,
          completedAt: item.completed_at,
          passed: item.passed,
          questionResults: questionResultsMap
        };
      }));
      
      return {
        items: results,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };
    } catch (error) {
      console.error(`Error getting user results for user ${userId}:`, error);
      throw new DatabaseError(`Failed to get user results: ${userId}`, error as Error);
    }
  }

  /**
   * Calculate results for a quiz attempt
   * @private Helper method
   */
  private calculateResults(
    questions: Question[], 
    answers: Record<string, string | string[]>
  ): { 
    questionResults: Array<{
      questionId: string;
      isCorrect: boolean;
      pointsEarned: number;
      pointsPossible: number;
      selectedOptionIds: string[];
      correctOptionIds: string[];
    }>;
    pointsEarned: number;
    pointsPossible: number;
  } {
    const questionResults: Array<{
      questionId: string;
      isCorrect: boolean;
      pointsEarned: number;
      pointsPossible: number;
      selectedOptionIds: string[];
      correctOptionIds: string[];
    }> = [];
    
    let totalPointsEarned = 0;
    let totalPointsPossible = 0;
    
    // Process each question
    for (const question of questions) {
      // Get user's answer
      let userAnswer = answers[question.id] || [];
      
      // Convert single answer to array
      if (typeof userAnswer === 'string') {
        userAnswer = [userAnswer];
      }
      
      // Get correct answers
      const correctAnswers = question.options
        .filter(opt => opt.isCorrect)
        .map(opt => opt.id);
      
      // Calculate points
      const pointsPossible = 1.0; // Default points per question
      let pointsEarned = 0.0;
      let isCorrect = false;
      
      if (question.type === 'single_choice' || question.type === 'true_false') {
        // Single choice: all or nothing
        if (userAnswer.length === 1 && correctAnswers.includes(userAnswer[0])) {
          pointsEarned = pointsPossible;
          isCorrect = true;
        }
      } else if (question.type === 'multiple_choice') {
        // Multiple choice: partial credit
        if (correctAnswers.length > 0) {
          // Count correct and incorrect selections
          const correctSelections = userAnswer.filter(a => correctAnswers.includes(a)).length;
          const incorrectSelections = userAnswer.filter(a => !correctAnswers.includes(a)).length;
          
          // Calculate points
          const pointsPerOption = pointsPossible / correctAnswers.length;
          const rawPoints = pointsPerOption * (correctSelections - incorrectSelections);
          pointsEarned = Math.max(0, rawPoints);
          
          // Consider correct if at least half points earned
          isCorrect = pointsEarned >= (pointsPossible / 2);
        }
      }
      
      // Add to totals
      totalPointsEarned += pointsEarned;
      totalPointsPossible += pointsPossible;
      
      // Add result
      questionResults.push({
        questionId: question.id,
        isCorrect,
        pointsEarned,
        pointsPossible,
        selectedOptionIds: userAnswer,
        correctOptionIds: correctAnswers
      });
    }
    
    return {
      questionResults,
      pointsEarned: totalPointsEarned,
      pointsPossible: totalPointsPossible
    };
  }
}

// Export singleton instance
export const quizAttemptRepository = new SupabaseQuizAttemptRepository();