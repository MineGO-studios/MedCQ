// src/components/quiz/QuizCard.tsx

import React from 'react';
import { Card, CardBody } from '../ui';
import { QuizSummary } from '../../types';

interface QuizCardProps {
  quiz: QuizSummary;
  onClick: () => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, onClick }) => {
  return (
    <Card 
      hoverable 
      fullHeight 
      className="cursor-pointer transition-all duration-200"
      onClick={onClick}
    >
      <CardBody>
        <div className="flex flex-col h-full">
          <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
          
          <div className="mt-2 text-sm text-gray-500 flex-grow">
            {quiz.description ? (
              <p className="line-clamp-2">{quiz.description}</p>
            ) : (
              <p className="italic">No description provided</p>
            )}
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            {quiz.subject && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {quiz.subject}
              </span>
            )}
            
            {quiz.yearLevel && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Year {quiz.yearLevel}
              </span>
            )}
            
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {quiz.questionCount} Questions
            </span>
            
            {quiz.timeLimit && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {quiz.timeLimit} min
              </span>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center text-sm">
            <div className="text-gray-500">
              {new Date(quiz.createdAt).toLocaleDateString()}
            </div>
            <div className="font-medium text-blue-600">
              Start Quiz →
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default QuizCard;