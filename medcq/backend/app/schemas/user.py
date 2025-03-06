# backend/app/schemas/user.py

from typing import List, Dict, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, HttpUrl, validator
from enum import Enum
from .quiz import QuizResult  # Import the QuizResult class from the quiz module


class UserRole(str, Enum):
    """Enum for user roles."""
    STUDENT = "student"
    TEACHER = "teacher"
    ADMINISTRATOR = "administrator"


class UserPermission(BaseModel):
    """Schema for user permission."""
    resource: str
    action: str = Field(..., regex="^(create|read|update|delete|execute)$")


class UserProfileBase(BaseModel):
    """Base schema for user profile."""
    display_name: Optional[str] = Field(None, max_length=100)
    photo_url: Optional[HttpUrl] = None
    bio: Optional[str] = Field(None, max_length=500)
    profession: Optional[str] = Field(None, max_length=100)
    specialization: Optional[str] = Field(None, max_length=100)
    year_of_study: Optional[int] = Field(None, ge=1, le=10)
    institution: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=100)
    website: Optional[HttpUrl] = None
    social_links: Optional[Dict[str, HttpUrl]] = None


class UserProfileCreate(UserProfileBase):
    """Schema for creating a user profile."""
    email: EmailStr
    
    @validator("email")
    def email_must_be_valid(cls, v):
        """Validate that the email is valid."""
        if not v:
            raise ValueError("Email is required")
        return v


class UserProfileUpdate(UserProfileBase):
    """Schema for updating a user profile."""
    pass


class UserProfile(UserProfileBase):
    """Schema for a complete user profile."""
    id: str
    email: EmailStr
    roles: List[UserRole] = [UserRole.STUDENT]
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class UserPreferencesBase(BaseModel):
    """Base schema for user preferences."""
    theme: str = Field("system", regex="^(light|dark|system)$")
    email_notifications: bool = True
    push_notifications: bool = True
    study_reminders: bool = True
    show_score_immediately: bool = True
    show_explanations_with_results: bool = True
    default_quiz_time_limit: Optional[int] = None
    default_subject_filter: Optional[str] = None


class UserPreferencesUpdate(UserPreferencesBase):
    """Schema for updating user preferences."""
    pass


class UserPreferences(UserPreferencesBase):
    """Schema for complete user preferences."""
    user_id: str
    updated_at: datetime

    class Config:
        orm_mode = True


class UserActivity(BaseModel):
    """Schema for user activity log."""
    id: str
    user_id: str
    type: str = Field(..., regex="^(login|quiz_start|quiz_complete|profile_update|content_create)$")
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime

    class Config:
        orm_mode = True


class UserStats(BaseModel):
    """Schema for user statistics."""
    user_id: str
    quizzes_created: int = 0
    quizzes_completed: int = 0
    quizzes_passed: int = 0
    total_questions: int = 0
    correct_answers: int = 0
    average_score: float = 0.0
    total_time_spent: int = 0  # in seconds
    strongest_subject: Optional[str] = None
    weakest_subject: Optional[str] = None
    last_updated: datetime

    class Config:
        orm_mode = True


class UserWithStats(UserProfile):
    """Schema for user profile with statistics."""
    stats: UserStats
    recent_activity: List[UserActivity] = []
    recent_results: List["QuizResult"] = []
    preferences: UserPreferences

    class Config:
        orm_mode = True


class SearchUsersParams(BaseModel):
    """Parameters for searching users."""
    query: Optional[str] = None
    role: Optional[UserRole] = None
    institution: Optional[str] = None
    specialization: Optional[str] = None
    page: int = 1
    limit: int = 10