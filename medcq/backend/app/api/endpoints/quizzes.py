# backend/app/api/endpoints/quizzes.py

from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from typing import List, Optional
from app.schemas.domain import Quiz, QuizSummary, QuizCreate, QuizUpdate, QuizStatus
from app.schemas.api import PaginatedResponse, QuizListParams
from app.api.dependencies import get_current_active_user
from app.services.quiz_service import quiz_service

router = APIRouter()

@router.get(
    "", 
    response_model=PaginatedResponse[QuizSummary],
    summary="List quizzes",
    description="Get a paginated list of quizzes with optional filtering and sorting."
)
async def list_quizzes(
    subject: Optional[str] = Query(None, description="Filter by subject"),
    year_level: Optional[int] = Query(None, description="Filter by year level", gt=0, lt=11),
    tags: Optional[List[str]] = Query(None, description="Filter by tags (comma-separated)"),
    status: Optional[QuizStatus] = Query(None, description="Filter by quiz status"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    created_by: Optional[str] = Query(None, description="Filter by creator ID"),
    page: int = Query(1, description="Page number", ge=1),
    limit: int = Query(10, description="Items per page", ge=1, le=100),
    sort: Optional[str] = Query(None, description="Field to sort by"),
    order: Optional[str] = Query("asc", description="Sort order (asc or desc)"),
    current_user: str = Depends(get_current_active_user)
) -> PaginatedResponse:
    """
    Get a paginated list of quizzes with optional filtering.
    
    This endpoint supports:
    - Filtering by subject, year level, tags, status
    - Full-text search in title and description
    - Pagination with customizable page size
    - Sorting by any quiz field
    
    Returns:
        Paginated list of quiz summaries
    """
    params = QuizListParams(
        subject=subject,
        year_level=year_level,
        tags=tags.split(",") if tags else None,
        status=status,
        search=search,
        created_by=created_by,
        page=page,
        limit=limit,
        sort=sort,
        order=order
    )
    
    return await quiz_service.get_quizzes(params)


@router.post(
    "", 
    response_model=Quiz, 
    status_code=status.HTTP_201_CREATED,
    summary="Create quiz",
    description="Create a new quiz with questions and answer options."
)
async def create_quiz(
    quiz_data: QuizCreate,
    current_user: str = Depends(get_current_active_user)
) -> Quiz:
    """
    Create a new quiz with questions and options.
    
    This endpoint allows:
    - Creating a complete quiz with multiple questions
    - Setting quiz metadata (subject, year level, time limit)
    - Adding tags for categorization
    - Setting randomization options for questions and answers
    
    The quiz status can be:
    - draft: Only visible to creator
    - published: Visible to all users
    - archived: Hidden from listings but accessible via direct link
    
    Returns:
        The created quiz with all data including generated IDs
    """
    return await quiz_service.create_quiz(quiz_data, current_user)


@router.get(
    "/{quiz_id}",
    response_model=Quiz,
    summary="Get quiz by ID",
    description="Get a specific quiz by ID with all questions and options."
)
async def get_quiz(
    quiz_id: str = Path(..., description="The ID of the quiz to retrieve"),
    current_user: str = Depends(get_current_active_user)
) -> Quiz:
    """
    Get a specific quiz by ID with all questions and options.
    
    This endpoint retrieves:
    - Complete quiz details with metadata
    - All questions with their type and explanation
    - All answer options for each question
    - Associated tags and subjects
    
    Returns:
        The complete quiz with all related data
        
    Raises:
        404: If quiz not found
    """
    quiz = await quiz_service.get_quiz_by_id(quiz_id)
    
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz with ID {quiz_id} not found"
        )
    
    return quiz


@router.put(
    "/{quiz_id}",
    response_model=Quiz,
    summary="Update quiz",
    description="Update an existing quiz with new data."
)
async def update_quiz(
    quiz_data: QuizUpdate,
    quiz_id: str = Path(..., description="The ID of the quiz to update"),
    current_user: str = Depends(get_current_active_user)
) -> Quiz:
    """
    Update an existing quiz.
    
    This endpoint allows:
    - Updating basic quiz information
    - Changing subject, year level, or time limit
    - Modifying tags for categorization
    - Changing randomization settings
    - Updating the quiz status
    
    Note:
    - Only the quiz creator can update the quiz
    - You can update specific fields without affecting others
    
    Returns:
        The updated quiz
        
    Raises:
        404: If quiz not found
        403: If user doesn't have permission
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


@router.delete(
    "/{quiz_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete quiz",
    description="Delete a quiz and all associated data."
)
async def delete_quiz(
    quiz_id: str = Path(..., description="The ID of the quiz to delete"),
    current_user: str = Depends(get_current_active_user)
) -> None:
    """
    Delete a quiz and all associated data.
    
    This endpoint:
    - Deletes the quiz and all its questions and options
    - Removes quiz-tag associations
    - Removes quiz attempt records
    
    Note:
    - Only the quiz creator can delete the quiz
    - This operation cannot be undone
    
    Raises:
        404: If quiz not found
        403: If user doesn't have permission
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


@router.get(
    "/popular",
    response_model=List[QuizSummary],
    summary="Get popular quizzes",
    description="Get a list of popular quizzes based on attempt count."
)
async def get_popular_quizzes(
    limit: int = Query(10, description="Number of quizzes to return", ge=1, le=50),
    current_user: str = Depends(get_current_active_user)
) -> List[QuizSummary]:
    """
    Get popular quizzes based on attempt count.
    
    This endpoint returns:
    - Quizzes with the highest number of attempts
    - Limited to the specified number (default 10)
    - Only published quizzes are included
    
    Returns:
        List of quiz summaries ordered by popularity
    """
    # This would be a custom implementation in the service
    # For now, we'll use a simplified approach
    params = QuizListParams(
        status="published",
        limit=limit,
        sort="created_at",  # Replace with actual popularity metric
        order="desc"
    )
    
    result = await quiz_service.get_quizzes(params)
    return result.items


@router.get(
    "/user/{user_id}",
    response_model=PaginatedResponse[QuizSummary],
    summary="Get quizzes by user",
    description="Get quizzes created by a specific user."
)
async def get_quizzes_by_user(
    user_id: str = Path(..., description="The user ID to get quizzes for"),
    page: int = Query(1, description="Page number", ge=1),
    limit: int = Query(10, description="Items per page", ge=1, le=100),
    current_user: str = Depends(get_current_active_user)
) -> PaginatedResponse:
    """
    Get quizzes created by a specific user.
    
    This endpoint returns:
    - All quizzes created by the specified user
    - Paginated results with customizable page size
    
    Notes:
    - If requesting other user's quizzes, only published ones are returned
    - If requesting your own quizzes, all are returned regardless of status
    
    Returns:
        Paginated list of quiz summaries
    """
    # Include status filter for non-own quizzes
    status = None if user_id == current_user else "published"
    
    params = QuizListParams(
        created_by=user_id,
        status=status,
        page=page,
        limit=limit,
        sort="created_at",
        order="desc"
    )
    
    return await quiz_service.get_quizzes(params)


@router.get(
    "/search/{query}",
    response_model=PaginatedResponse[QuizSummary],
    summary="Search quizzes",
    description="Search for quizzes by keyword."
)
async def search_quizzes(
    query: str = Path(..., description="Search query"),
    page: int = Query(1, description="Page number", ge=1),
    limit: int = Query(10, description="Items per page", ge=1, le=100),
    current_user: str = Depends(get_current_active_user)
) -> PaginatedResponse:
    """
    Search for quizzes by keyword.
    
    This endpoint searches:
    - Quiz titles and descriptions
    - Subject names
    - Tags
    
    Returns:
        Paginated list of quiz summaries matching the search query
    """
    params = QuizListParams(
        search=query,
        status="published",  # Only search published quizzes
        page=page,
        limit=limit
    )
    
    return await quiz_service.get_quizzes(params)