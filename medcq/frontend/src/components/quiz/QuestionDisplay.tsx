// src/components/quiz/QuestionDisplay.tsx

import React from 'react';
import { Question } from '../../types';

interface QuestionDisplayProps {
  /**
   * Question data to display
   */
  question: Question;
  
  /**
   * Currently selected answer(s)
   */
  selectedAnswer: string | string[];
  
  /**
   * Callback when answer is changed
   */
  onAnswerChange: (answer: string | string[]) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Displays a quiz question with its answer options
 * Supports different question types (single choice, multiple choice, true/false)
 */
const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  selectedAnswer,
  onAnswerChange,
  className = '',
}) => {
  // Handle checkbox/radio change
  const handleOptionChange = (optionId: string, isMultiple: boolean) => {
    if (isMultiple) {
      // For multiple choice questions (checkboxes)
      const currentSelections = Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer].filter(Boolean);
      
      if (currentSelections.includes(optionId)) {
        // Remove option if already selected
        onAnswerChange(currentSelections.filter(id => id !== optionId));
      } else {
        // Add option to selections
        onAnswerChange([...currentSelections, optionId]);
      }
    } else {
      // For single choice questions (radio buttons)
      onAnswerChange(optionId);
    }
  };

  // Determine if the question is multiple choice
  const isMultipleChoice = question.type === 'multiple_choice';
  
  // Convert selectedAnswer to array for consistent handling
  const selectedOptions = Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer].filter(Boolean);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Question text */}
      <div className="mb-6">
        <h3 className="text-xl font-medium text-gray-900 mb-2">{question.text}</h3>
        {question.type === 'multiple_choice' && (
          <p className="text-sm text-gray-500 italic">Select all that apply</p>
        )}
      </div>
      
      {/* Answer options */}
      <div className="space-y-3">
        {question.options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          
          return (
            <label 
              key={option.id}
              className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors
                ${isSelected 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'}`}
            >
              <input
                type={isMultipleChoice ? 'checkbox' : 'radio'}
                name={`question-${question.id}`}
                value={option.id}
                checked={isSelected}
                onChange={() => handleOptionChange(option.id, isMultipleChoice)}
                className={`form-${isMultipleChoice ? 'checkbox' : 'radio'} h-5 w-5
                  ${isMultipleChoice ? 'rounded text-blue-600' : 'rounded-full text-blue-600'}`}
              />
              <span className="ml-3 text-gray-900">{option.text}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionDisplay;