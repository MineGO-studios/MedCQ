# backend/app/schemas/domain.py

from enum import Enum
from typing import List, Dict, Optional, Union, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator, root_validator
import uuid


class QuestionType(str, Enum):
    """Type of question in a quiz."""
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    MATCHING = "matching"


class QuizStatus(str, Enum):
    """Status of a quiz."""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class AnswerOptionBase(BaseModel):
    """Base schema for answer options."""
    text: str = Field(..., min_length=1, max_length=500)
    is_correct: bool = False
    explanation: Optional[str] = Field(None, max_length=1000)


class AnswerOptionCreate(AnswerOptionBase):
    """Schema for creating a new answer option."""
    pass


class AnswerOption(AnswerOptionBase):
    """Schema for a complete answer option with ID."""
    id: str
    order_index: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class QuestionBase(BaseModel):
    """Base schema for quiz questions."""
    text: str = Field(..., min_length=1, max_length=1000)
    explanation: Optional[str] = Field(None, max_length=2000)
    type: QuestionType = QuestionType.SINGLE_CHOICE
    tags: List[str] = []
    difficulty: Optional[int] = Field(None, ge=1, le=5)


class QuestionCreate(QuestionBase):
    """Schema for creating a new question."""
    options: List[AnswerOptionCreate] = Field(..., min_items=2)
    
    @validator('options')
    def validate_options(cls, v, values):
        """Validate that the options are appropriate for the question type."""
        if 'type' not in values:
            return v
            
        question_type = values['type']
        
        # For single choice, exactly one option must be correct
        if question_type == QuestionType.SINGLE_CHOICE:
            correct_count = sum(1 for opt in v if opt.is_correct)
            if correct_count != 1:
                raise ValueError(f"Single choice questions must have exactly one correct answer, found {correct_count}")
                
        # For true/false, exactly two options with one correct
        elif question_type == QuestionType.TRUE_FALSE:
            if len(v) != 2:
                raise ValueError("True/False questions must have exactly two options")
            correct_count = sum(1 for opt in v if opt.is_correct)
            if correct_count != 1:
                raise ValueError("True/False questions must have exactly one correct answer")
                
        # For multiple choice, at least one option must be correct
        elif question_type == QuestionType.MULTIPLE_CHOICE:
            correct_count = sum(1 for opt in v if opt.is_correct)
            if correct_count < 1:
                raise ValueError("Multiple choice questions must have at least one correct answer")
                
        # For matching, all options must be correct (paired)
        elif question_type == QuestionType.MATCHING:
            if not all(opt.is_correct for opt in v):
                raise ValueError("All options in matching questions must be marked as correct")
                
        return v


class Question(QuestionBase):
    """Schema for a complete question with ID and options."""
    id: str
    options: List[AnswerOption]
    order_index: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class QuizBase(BaseModel):
    """Base schema for quizzes."""
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    subject: str = Field(..., min_length=1, max_length=100)
    year_level: Optional[int] = Field(None, ge=1, le=10)
    time_limit: Optional[int] = Field(None, gt=0)  # in minutes
    randomize_questions: bool = False
    randomize_options: bool = False
    pass_score: Optional[float] = Field(None, ge=0, le=100)  # percentage
    tags: List[str] = []
    status: QuizStatus = QuizStatus.DRAFT


class QuizCreate(QuizBase):
    """Schema for creating a new quiz."""
    questions: List[QuestionCreate] = Field(..., min_items=1)


class QuizUpdate(BaseModel):
    """Schema for updating a quiz."""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    subject: Optional[str] = Field(None, min_length=1, max_length=100)
    year_level: Optional[int] = Field(None, ge=1, le=10)
    time_limit: Optional[int] = Field(None, gt=0)
    randomize_questions: Optional[bool] = None
    randomize_options: Optional[bool] = None
    pass_score: Optional[float] = Field(None, ge=0, le=100)
    tags: Optional[List[str]] = None
    status: Optional[QuizStatus] = None


class QuizSummary(QuizBase):
    """Schema for quiz summary without questions."""
    id: str
    question_count: int
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class Quiz(QuizBase):
    """Schema for a complete quiz with questions."""
    id: str
    questions: List[Question]
    question_count: int
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True