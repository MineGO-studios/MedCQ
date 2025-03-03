# backend/app/schemas/api.py

from typing import Generic, List, Optional, TypeVar, Union
from pydantic import BaseModel, Field
from pydantic.generics import GenericModel

from app.schemas.domain import QuizStatus

# Generic type for paginated responses
T = TypeVar('T')

class PaginatedResponse(GenericModel, Generic[T]):
    """Paginated response with metadata."""
    items: List[T]
    total: int
    page: int
    limit: int
    total_pages: int


class QuizListParams(BaseModel):
    """Parameters for quiz listing and filtering."""
    subject: Optional[str] = None
    year_level: Optional[int] = None
    tags: Optional[List[str]] = None
    status: Optional[QuizStatus] = None
    search: Optional[str] = None
    created_by: Optional[str] = None
    page: int = 1
    limit: int = 10
    sort: Optional[str] = None
    order: Optional[str] = "asc"


class ErrorResponse(BaseModel):
    """Standardized error response."""
    detail: str
    code: Optional[str] = None
    errors: Optional[List[dict]] = None


class SuccessResponse(BaseModel):
    """Standardized success response."""
    message: str
    data: Optional[dict] = None