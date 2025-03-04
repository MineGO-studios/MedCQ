# backend/app/api/endpoints/quiz_attempts.py

from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from typing import List, Optional
from app.schemas.attempt import (
    QuizAttemptStart,
    QuizAttemptResponse,
    QuizAnswerSubmission,
    QuizResultDetail,
    UserQuizHistory,
    UserStrengthWeakness
)
from app.api.dependencies import get_current_active_user
from app.services.quiz_attempt_service import quiz_attempt_service

router = APIRouter()

@router.post(
    "/start",
    response_model=QuizAttemptResponse,
    summary="Start a quiz attempt",
    description="Initialize a new quiz attempt and return quiz data."
)
async def start_quiz_attempt(
    quiz_data: QuizAttemptStart,
    current_user: str = Depends(get_current_active_user)
) -> QuizAttemptResponse:
    """
    Start a new quiz attempt.
    
    This endpoint:
    - Validates the quiz is accessible to the user
    - Creates a new attempt record
    - Applies randomization if specified in quiz settings
    - Returns the quiz with all questions and options
    
    Returns:
        Quiz attempt data with the full quiz
    """
    return await quiz_attempt_service.start_quiz_attempt(quiz_data.quiz_id, current_user)


@router.post(
    "/{attempt_id}/submit",
    response_model=QuizResultDetail,
    summary="Submit quiz answers",
    description="Submit answers for a quiz attempt and get results."
)
async def submit_quiz_attempt(
    submission: QuizAnswerSubmission,
    attempt_id: str = Path(..., description="The ID of the quiz attempt"),
    current_user: str = Depends(get_current_active_user)
) -> QuizResultDetail:
    """
    Submit answers for a quiz attempt.
    
    This endpoint:
    - Validates the attempt belongs to the user
    - Checks attempt status and expiration
    - Calculates score based on answers
    - Stores results with detailed feedback
    
    Returns:
        Detailed quiz result with feedback
    """
    return await quiz_attempt_service.submit_quiz_attempt(
        attempt_id,
        current_user,
        submission.answers,
        submission.time_taken_seconds
    )


@router.get(
    "/{attempt_id}/result",
    response_model=QuizResultDetail,
    summary="Get quiz result",
    description="Get detailed result for a completed quiz attempt."
)
async def get_quiz_result(
    attempt_id: str = Path(..., description="The ID of the quiz attempt"),
    current_user: str = Depends(get_current_active_user)
) -> QuizResultDetail:
    """
    Get detailed result for a quiz attempt.
    
    This endpoint:
    - Retrieves the attempt with all question results
    - Validates user has permission to view the result
    - Returns comprehensive feedback on each question
    
    Note:
    - Quiz creators can view results for their quizzes
    - Users can only view their own attempt results
    
    Returns:
        Detailed quiz result with feedback
    """
    return await quiz_attempt_service.get_quiz_result(attempt_id, current_user)


@router.get(
    "/history",
    response_model=UserQuizHistory,
    summary="Get user quiz history",
    description="Get user's quiz attempt history with statistics."
)
async def get_user_quiz_history(
    limit: int = Query(20, description="Maximum number of attempts to return", ge=1, le=100),
    current_user: str = Depends(get_current_active_user)
) -> UserQuizHistory:
    """
    Get user's quiz attempt history.
    
    This endpoint:
    - Retrieves all completed quiz attempts for the user
    - Calculates performance statistics
    - Returns detailed results for each attempt
    
    Returns:
        User's quiz attempt history with performance metrics
    """
    return await quiz_attempt_service.get_user_quiz_history(current_user, limit)


@router.get(
    "/analytics",
    response_model=UserStrengthWeakness,
    summary="Get user analytics",
    description="Get analysis of user's strengths and weaknesses."
)
async def get_user_analytics(
    current_user: str = Depends(get_current_active_user)
) -> UserStrengthWeakness:
    """
    Get analysis of user's strengths and weaknesses.
    
    This endpoint:
    - Analyzes all quiz attempts to identify performance patterns
    - Categorizes performance by subject, tag, and question type
    - Identifies strongest and weakest areas
    
    Returns:
        Analysis of user's strengths and weaknesses
    """
    return await quiz_attempt_service.get_user_strengths_weaknesses(current_user)