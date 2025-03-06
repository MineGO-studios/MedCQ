// frontend/src/services/repositories/__tests__/supabaseQuizRepository.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseQuizRepository } from '../supabaseQuizRepository';
import { supabase } from '../../supbase';

// Mock the supabase client methods explicitly for this test file
vi.mock('../../supbase', () => {
  const mockSingle = vi.fn();
  return {
    supabase: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        single: mockSingle
      }),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  };
});

describe('SupabaseQuizRepository', () => {
  let repository: SupabaseQuizRepository;
  
  beforeEach(() => {
    repository = new SupabaseQuizRepository();
    vi.clearAllMocks();
  });

  it('should initialize correctly', () => {
    expect(repository).toBeInstanceOf(SupabaseQuizRepository);
  });

  it('should get a quiz by id', async () => {
    // Set up mock to return sample data
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: '123', title: 'Test Quiz' },
      error: null
    });
    
    (supabase.from as any).mockReturnThis();
    (supabase.select as any).mockReturnThis();
    (supabase.eq as any).mockReturnValue({ single: mockSingle });

    const result = await repository.getQuiz('123');
    
    expect(supabase.from).toHaveBeenCalledWith('quizzes');
    expect(supabase.select).toHaveBeenCalled();
    expect(supabase.eq).toHaveBeenCalledWith('id', '123');
    expect(mockSingle).toHaveBeenCalled();
    expect(result).toEqual({ id: '123', title: 'Test Quiz' });
  });
});