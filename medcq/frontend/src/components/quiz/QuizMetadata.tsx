// src/components/quiz/QuizMetadata.tsx

import React, { useMemo } from 'react';
import { Card, CardBody, Button } from '../ui';
import { Quiz } from '../../types';

interface QuizMetadataProps {
  quiz: Quiz;
  onStartQuiz: () => void;
}

const QuizMetadata: React.FC<QuizMetadataProps> = ({ quiz, onStartQuiz }) => {
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Use useMemo to calculate question type counts efficiently
  const questionTypeCounts = useMemo(() => {
    return Object.entries(
      quiz.questions.reduce((acc, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    );
  }, [quiz.questions]);

  return (
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
              {/* Render badges using the memoized question type counts */}
              {questionTypeCounts.map(([type, count]) => (
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
          <Button onClick={onStartQuiz} fullWidth>
            Start Quiz
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default QuizMetadata;
