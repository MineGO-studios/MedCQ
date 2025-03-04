# backend/app/schemas/attempt.py

from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, validator, root_validator
from app.schemas.domain import Quiz, Question

class QuizAttemptStart(BaseModel):
    """Schema for starting a new quiz attempt."""
    quiz_id: str


class QuizAttemptResponse(BaseModel):
    """Schema for quiz attempt response."""
    attempt_id: str
    quiz_id: str
    started_at: datetime
    expires_at: Optional[datetime] = None
    quiz: Quiz


class QuizAnswerSubmission(BaseModel):
    """Schema for submitting answers to a quiz."""
    answers: Dict[str, Union[str, List[str]]] = Field(
        ..., 
        description="Map of question ID to selected answer ID(s)"
    )
    time_taken_seconds: int = Field(
        ..., 
        gt=0, 
        description="Total time taken in seconds"
    )
    
    @validator('answers')
    def validate_answers(cls, v):
        """Validate that answers are properly formatted."""
        if not v:
            raise ValueError("At least one answer must be provided")
        
        for question_id, answer in v.items():
            if not isinstance(answer, (str, list)):
                raise ValueError(f"Answer for question {question_id} must be a string or list of strings")
            
            if isinstance(answer, list) and not all(isinstance(a, str) for a in answer):
                raise ValueError(f"All answers in list for question {question_id} must be strings")
        
        return v


class QuestionResult(BaseModel):
    """Schema for individual question result."""
    question_id: str
    question_text: str
    is_correct: bool
    points_earned: float
    points_possible: float
    selected_option_ids: List[str]
    correct_option_ids: List[str]
    explanation: Optional[str] = None


class QuizResultDetail(BaseModel):
    """Schema for detailed quiz result."""
    attempt_id: str
    quiz_id: str
    quiz_title: str
    user_id: str
    score: float = Field(..., ge=0, le=100, description="Score as percentage")
    points_earned: float
    points_possible: float
    time_taken_seconds: int
    started_at: datetime
    completed_at: datetime
    passed: bool
    question_results: List[QuestionResult]
    
    @property
    def total_questions(self) -> int:
        """Get total number of questions."""
        return len(self.question_results)
    
    @property
    def correct_questions(self) -> int:
        """Get number of correctly answered questions."""
        return sum(1 for q in self.question_results if q.is_correct)


class UserQuizHistory(BaseModel):
    """Schema for user's quiz attempt history."""
    attempts: List[QuizResultDetail]
    total_attempts: int
    average_score: float
    best_score: float
    total_time_spent_seconds: int


class UserStrengthWeakness(BaseModel):
    """Schema for user's strengths and weaknesses analysis."""
    strong_subjects: List[Dict[str, Any]]
    weak_subjects: List[Dict[str, Any]]
    strong_tags: List[Dict[str, Any]]
    weak_tags: List[Dict[str, Any]]
    performance_by_question_type: Dict[str, Dict[str, Any]]