# backend/app/api/endpoints/quizzes.py

from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from typing import List, Optional
from app.schemas.domain import Quiz, QuizSummary, QuizCreate, QuizUpdate
from app.schemas.api import PaginatedResponse, QuizListParams
from app.api.dependencies import get_current_active_user
from app.services.quiz_service import quiz_service

router = APIRouter()

@router.get("", response_model=PaginatedResponse[QuizSummary])
async def list_quizzes(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    year_level: Optional[int] = Query(None, description="Filter by year level", gt=0, lt=11),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    page: int = Query(1, description="Page number", ge=1),
    limit: int = Query(10, description="Items per page", ge=1, le=100),
    current_user: str = Depends(get_current_active_user)
) -> PaginatedResponse:
    """
    Get a paginated list of quizzes with optional filtering.
    
    Args:
        subject: Filter quizzes by subject
        year_level: Filter quizzes by year level (1-10)
        tags: Filter quizzes by tags
        search: Search query for title and description
        page: Page number for pagination
        limit: Number of items per page
        current_user: Current authenticated user
        
    Returns:
        Paginated list of quiz summaries
    """
    params = QuizListParams(
        subject=subject,
        year_level=year_level,
        tags=tags,
        search=search,
        page=page,
        limit=limit
    )
    
    return await quiz_service.get_quizzes(params)


@router.post("", response_model=Quiz, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    quiz_data: QuizCreate,
    current_user: str = Depends(get_current_active_user)
) -> Quiz:
    """
    Create a new quiz with questions and options.
    
    Args:
        quiz_data: The quiz data including questions and options
        current_user: Current authenticated user
        
    Returns:
        The created quiz with all data
    """
    return await quiz_service.create_quiz(quiz_data, current_user)


@router.get("/{quiz_id}", response_model=Quiz)
async def get_quiz(
    quiz_id: str = Path(..., description="The ID of the quiz to retrieve"),
    current_user: str = Depends(get_current_active_user)
) -> Quiz:
    """
    Get a specific quiz by ID with all questions and options.
    
    Args:
        quiz_id: The ID of the quiz to retrieve
        current_user: Current authenticated user
        
    Returns:
        The quiz with all questions and options
        
    Raises:
        HTTPException: If quiz not found
    """
    quiz = await quiz_service.get_quiz_by_id(quiz_id)
    
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz with ID {quiz_id} not found"
        )
    
    return quiz


@router.put("/{quiz_id}", response_model=Quiz)
async def update_quiz(
    quiz_data: QuizUpdate,
    quiz_id: str = Path(..., description="The ID of the quiz to update"),
    current_user: str = Depends(get_current_active_user)
) -> Quiz:
    """
    Update an existing quiz.
    
    Args:
        quiz_data: The quiz data to update
        quiz_id: The ID of the quiz to update
        current_user: Current authenticated user
        
    Returns:
        The updated quiz
        
    Raises:
        HTTPException: If quiz not found or user doesn't have permission
    """
    try:
        return await quiz_service.update_quiz(quiz_id, quiz_data, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz(
    quiz_id: str = Path(..., description="The ID of the quiz to delete"),
    current_user: str = Depends(get_current_active_user)
) -> None:
    """
    Delete a quiz and all associated data.
    
    Args:
        quiz_id: The ID of the quiz to delete
        current_user: Current authenticated user
        
    Raises:
        HTTPException: If quiz not found or user doesn't have permission
    """
    try:
        success = await quiz_service.delete_quiz(quiz_id, current_user)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quiz with ID {quiz_id} not found"
            )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )