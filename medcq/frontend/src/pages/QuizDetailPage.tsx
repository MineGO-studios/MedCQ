// src/pages/QuizDetailPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Container, Section, PageHeader } from '../components/layout';
import { Button, Card, CardBody } from '../components/ui';
import { LoadingState, ErrorState } from '../components/feedback';
import { useAuth } from '../context/AuthContext';
import { quizzesApi } from '../services/api';
import { Quiz } from '../types';

const QuizDetailPage: React.FC = () => {
  // Get quiz ID from URL params
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { authState } = useAuth();
  
  // State management
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if current user is the creator of this quiz
  const isCreator = quiz && authState.user && quiz.createdBy === authState.user.id;
  
  // Fetch quiz data
  const fetchQuiz = useCallback(async () => {
    if (!quizId) return;
    
    try {
      setIsLoading(true);
      const fetchedQuiz = await quizzesApi.getQuiz(quizId);
      setQuiz(fetchedQuiz);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch quiz:', err);
      setError('Unable to load quiz details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [quizId]);
  
  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);
  
  // Handle start quiz button click
  const handleStartQuiz = () => {
    if (quiz) {
      navigate(`/quizzes/${quiz.id}/attempt`);
    }
  };
  
  // Handle edit quiz button click
  const handleEditQuiz = () => {
    if (quiz) {
      navigate(`/quizzes/${quiz.id}/edit`);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Layout title={quiz ? `Quiz: ${quiz.title}` : 'Quiz Details'}>
      {/* Loading state */}
      {isLoading && (
        <Container>
          <LoadingState message="Loading quiz details..." />
        </Container>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <Container>
          <ErrorState
            title="Error Loading Quiz"
            description={error}
            buttonText="Try Again"
            onAction={fetchQuiz}
          />
        </Container>
      )}

      {/* Quiz content when loaded */}
      {!isLoading && !error && quiz && (
        <>
          <PageHeader
            title={quiz.title}
            subtitle={`${typeof quiz.subject === 'string' ? quiz.subject : quiz.subject.name}${quiz.yearLevel ? ` • Year ${quiz.yearLevel}` : ''}`}
            actions={
              <div className="space-x-4">
                {isCreator && (
                  <Button
                    variant="outline"
                    onClick={handleEditQuiz}
                    leftIcon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    }
                  >
                    Edit Quiz
                  </Button>
                )}
                <Button
                  onClick={handleStartQuiz}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                >
                  Start Quiz
                </Button>
              </div>
            }
          />

          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
              {/* Main quiz information */}
              <div className="lg:col-span-2">
                <Section title="About this Quiz">
                  {quiz.description ? (
                    <div className="prose max-w-none">
                      <p>{quiz.description}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No description provided for this quiz.</p>
                  )}
                  
                  {/* Tag list */}
                  {quiz.tags && quiz.tags.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {quiz.tags.map(tag => (
                          <span 
                            key={tag}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Question preview */}
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Sample Questions</h3>
                    {quiz.questions.slice(0, 2).map((question, index) => (
                      <Card key={question.id} className="mb-4">
                        <CardBody>
                          <h4 className="font-medium text-gray-900 mb-2">Question {index + 1}</h4>
                          <p className="text-gray-700">{question.text}</p>
                          
                          <div className="mt-3 text-sm text-gray-500">
                            {question.type === 'single_choice' && 'Single choice question'}
                            {question.type === 'multiple_choice' && 'Multiple choice question'}
                            {question.type === 'true_false' && 'True/False question'}
                            {question.type === 'matching' && 'Matching question'}
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                    <p className="mt-2 text-sm text-gray-500">
                      {quiz.questions.length > 2
                        ? `...and ${quiz.questions.length - 2} more questions`
                        : ''}
                    </p>
                  </div>
                </Section>
              </div>
              
              {/* Quiz metadata sidebar */}
              <div>
                <Card>
                  <CardBody>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quiz Details</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Number of Questions</h4>
                        <p className="mt-1 text-lg font-semibold text-gray-900">{quiz.questions.length}</p>
                      </div>
                      
                      {quiz.timeLimit && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Time Limit</h4>
                          <p className="mt-1 text-lg font-semibold text-gray-900">{quiz.timeLimit} minutes</p>
                        </div>
                      )}
                      
                      {quiz.passScore && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Passing Score</h4>
                          <p className="mt-1 text-lg font-semibold text-gray-900">{quiz.passScore}%</p>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Created</h4>
                        <p className="mt-1 text-sm text-gray-700">{formatDate(quiz.createdAt)}</p>
                      </div>
                      
                      {quiz.updatedAt && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Last Updated</h4>
                          <p className="mt-1 text-sm text-gray-700">{formatDate(quiz.updatedAt)}</p>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Question Types</h4>
                        <div className="mt-1">
                          {/* Count question types and display as badges */}
                          {Object.entries(
                            quiz.questions.reduce((acc, q) => {
                              acc[q.type] = (acc[q.type] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([type, count]) => (
                            <span
                              key={type}
                              className="inline-flex items-center mr-2 mb-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                            >
                              {type.replace('_', ' ')} ({count})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <Button onClick={handleStartQuiz} fullWidth>
                        Start Quiz
                      </Button>
                    </div>
                  </CardBody>
                </Card>
                
                {/* Recent attempts section - could be expanded in future */}
                {/*
                <Card className="mt-6">
                  <CardBody>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Your Previous Attempts</h3>
                    <p className="text-gray-500">
                      You haven't attempted this quiz yet.
                    </p>
                  </CardBody>
                </Card>
                */}
              </div>
            </div>
          </Container>
        </>
      )}
    </Layout>
  );
};

export default QuizDetailPage;