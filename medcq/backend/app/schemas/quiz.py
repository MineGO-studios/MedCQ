from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class QuestionType(str, Enum):
    """Type of question in a quiz."""
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    MATCHING = "matching"


class AnswerOption(BaseModel):
    """Answer option for a quiz question."""
    id: str
    text: str
    is_correct: bool = False


class QuestionBase(BaseModel):
    """Base class for quiz questions."""
    text: str
    explanation: Optional[str] = None
    type: QuestionType = QuestionType.SINGLE_CHOICE
    options: List[AnswerOption]
    
    class Config:
        schema_extra = {
            "example": {
                "text": "What is the capital of France?",
                "explanation": "Paris is the capital and most populous city of France.",
                "type": "single_choice",
                "options": [
                    {"id": "a", "text": "London", "is_correct": False},
                    {"id": "b", "text": "Paris", "is_correct": True},
                    {"id": "c", "text": "Berlin", "is_correct": False},
                    {"id": "d", "text": "Madrid", "is_correct": False}
                ]
            }
        }


class QuestionCreate(QuestionBase):
    """Schema for creating a new question."""
    pass


class Question(QuestionBase):
    """Schema for a quiz question with ID."""
    id: str


class QuizBase(BaseModel):
    """Base class for quizzes."""
    title: str
    description: Optional[str] = None
    subject: str
    year_level: Optional[int] = None
    time_limit_minutes: Optional[int] = None
    tags: List[str] = []


class QuizCreate(QuizBase):
    """Schema for creating a new quiz."""
    questions: List[QuestionCreate]


class QuizSummary(QuizBase):
    """Schema for quiz summary without questions."""
    id: str
    question_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None


class Quiz(QuizBase):
    """Schema for a complete quiz with questions."""
    id: str
    questions: List[Question]
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: str


class QuizAttemptSubmit(BaseModel):
    """Schema for submitting a quiz attempt."""
    quiz_id: str
    answers: Dict[str, Any]  # Question ID -> Answer (format depends on question type)
    time_taken_seconds: int = Field(..., gt=0)


class QuizResult(BaseModel):
    """Schema for quiz attempt results."""
    quiz_id: str
    user_id: str
    score: float  # Percentage score (0-100)
    correct_count: int
    total_count: int
    time_taken_seconds: int
    completed_at: datetime
    question_results: Dict[str, bool]  # Question ID -> Correct/Incorrect