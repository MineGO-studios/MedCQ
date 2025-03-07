// src/components/quiz/__tests__/QuizCard.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QuizCard from '../QuizCard';

describe('QuizCard Component', () => {
  const mockQuiz = {
    id: 'quiz-1',
    title: 'Test Quiz',
    description: 'This is a test quiz description',
    subject: 'Anatomy',
    yearLevel: 2,
    questionCount: 10,
    timeLimit: 30,
    createdAt: '2023-01-01T00:00:00.000Z',
    tags: ['anatomy', 'basic']
  };

  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  test('renders quiz information correctly', () => {
    render(<QuizCard quiz={mockQuiz} onClick={mockOnClick} />);
    
    expect(screen.getByText('Test Quiz')).toBeInTheDocument();
    expect(screen.getByText('This is a test quiz description')).toBeInTheDocument();
    expect(screen.getByText('Anatomy')).toBeInTheDocument();
    expect(screen.getByText('Year 2')).toBeInTheDocument();
    expect(screen.getByText('10 Questions')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('Start Quiz →')).toBeInTheDocument();
  });

  test('calls onClick handler when clicked', () => {
    render(<QuizCard quiz={mockQuiz} onClick={mockOnClick} />);
    
    fireEvent.click(screen.getByText('Test Quiz'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('renders without description when not provided', () => {
    const quizWithoutDesc = { ...mockQuiz, description: undefined };
    render(<QuizCard quiz={quizWithoutDesc} onClick={mockOnClick} />);
    
    expect(screen.getByText('No description provided')).toBeInTheDocument();
  });
});