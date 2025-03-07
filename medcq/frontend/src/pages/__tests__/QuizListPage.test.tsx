// src/pages/__tests__/QuizListPage.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import QuizListPage from '../QuizListPage';
import { quizzesApi } from '../../services/api';

// Mock the API service
vi.mock('../../services/api', () => ({
  quizzesApi: {
    getQuizzes: vi.fn()
  }
}));

// Mock the navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('QuizListPage Component', () => {
  const mockQuizzes = [
    {
      id: 'quiz-1',
      title: 'Anatomy Quiz',
      description: 'Test your knowledge of human anatomy',
      subject: 'Anatomy',
      yearLevel: 1,
      questionCount: 10,
      timeLimit: 30,
      createdAt: '2023-01-01T00:00:00.000Z',
      tags: ['anatomy'],
      status: 'published',
      createdBy: 'user-1'
    },
    {
      id: 'quiz-2',
      title: 'Physiology Quiz',
      description: 'Learn about body systems',
      subject: 'Physiology',
      yearLevel: 2,
      questionCount: 15,
      timeLimit: 45,
      createdAt: '2023-01-02T00:00:00.000Z',
      tags: ['physiology'],
      status: 'published',
      createdBy: 'user-1'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API response
    (quizzesApi.getQuizzes as any).mockResolvedValue({
      items: mockQuizzes,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1
    });
  });

  test('renders loading state initially', () => {
    render(
      <BrowserRouter>
        <QuizListPage />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Loading quizzes...')).toBeInTheDocument();
  });

  test('renders quizzes after loading', async () => {
    render(
      <BrowserRouter>
        <QuizListPage />
      </BrowserRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading quizzes...')).not.toBeInTheDocument();
    });
    
    // Check if quizzes are rendered
    expect(screen.getByText('Anatomy Quiz')).toBeInTheDocument();
    expect(screen.getByText('Physiology Quiz')).toBeInTheDocument();
  });

  test('navigates to quiz detail when quiz card is clicked', async () => {
    render(
      <BrowserRouter>
        <QuizListPage />
      </BrowserRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading quizzes...')).not.toBeInTheDocument();
    });
    
    // Click on a quiz card
    fireEvent.click(screen.getByText('Anatomy Quiz'));
    
    // Check if navigation was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/quizzes/quiz-1');
  });

  test('filters quizzes by subject', async () => {
    render(
      <BrowserRouter>
        <QuizListPage />
      </BrowserRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading quizzes...')).not.toBeInTheDocument();
    });
    
    // Select a subject filter
    fireEvent.change(screen.getByLabelText('Filter by subject'), { 
      target: { value: 'Anatomy' } 
    });
    
    // Verify API was called with correct params
    expect(quizzesApi.getQuizzes).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Anatomy' })
    );
  });

  test('shows error state when API fails', async () => {
    // Mock API error
    (quizzesApi.getQuizzes as any).mockRejectedValue(new Error('Network error'));
    
    render(
      <BrowserRouter>
        <QuizListPage />
      </BrowserRouter>
    );
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Error Loading Quizzes')).toBeInTheDocument();
    });
    
    // Check if error description is shown
    expect(screen.getByText('Unable to load quizzes. Please try again later.')).toBeInTheDocument();
  });

  test('shows empty state when no quizzes match filters', async () => {
    // Mock empty response
    (quizzesApi.getQuizzes as any).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0
    });
    
    render(
      <BrowserRouter>
        <QuizListPage />
      </BrowserRouter>
    );
    
    // Wait for empty state to be displayed
    await waitFor(() => {
      expect(screen.getByText('No Quizzes Found')).toBeInTheDocument();
    });
  });

  test('clear filters button resets all filters', async () => {
    render(
      <BrowserRouter>
        <QuizListPage />
      </BrowserRouter>
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading quizzes...')).not.toBeInTheDocument();
    });
    
    // Set filters
    fireEvent.change(screen.getByLabelText('Filter by subject'), { 
      target: { value: 'Anatomy' } 
    });
    
    // Clear filters
    fireEvent.click(screen.getByText('Clear Filters'));
    
    // Verify filters were reset
    expect(screen.getByLabelText('Filter by subject')).toHaveValue('');
    expect(screen.getByLabelText('Filter by year level')).toHaveValue('');
  });
});