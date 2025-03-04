# backend/app/api/endpoints/users.py

from fastapi import APIRouter, Depends, HTTPException, Query, Path, status, Request
from typing import List, Optional
from app.schemas.user import (
    UserProfile,
    UserProfileUpdate,
    UserPreferences,
    UserPreferencesUpdate,
    UserStats,
    UserWithStats,
    UserRole,
    SearchUsersParams
)
from app.schemas.api import PaginatedResponse
from app.api.dependencies import get_current_active_user, has_role
from app.services.user_service import user_service

router = APIRouter()

@router.get(
    "/me",
    response_model=UserProfile,
    summary="Get current user profile",
    description="Get the profile for the currently authenticated user."
)
async def get_current_user_profile(
    current_user: str = Depends(get_current_active_user)
) -> UserProfile:
    """
    Get the profile for the currently authenticated user.
    
    This endpoint returns:
    - User's basic profile information
    - Roles and permissions
    - Account metadata (creation date, last login)
    
    Returns:
        User profile for the authenticated user
    """
    return await user_service.get_user_profile(current_user)


@router.put(
    "/me",
    response_model=UserProfile,
    summary="Update current user profile",
    description="Update the profile for the currently authenticated user."
)
async def update_current_user_profile(
    profile_data: UserProfileUpdate,
    current_user: str = Depends(get_current_active_user)
) -> UserProfile:
    """
    Update the profile for the currently authenticated user.
    
    This endpoint allows:
    - Updating profile information (display name, bio, etc.)
    - Setting professional details
    - Adding social links and website
    
    Fields not included in the request will remain unchanged.
    
    Returns:
        Updated user profile
    """
    return await user_service.update_user_profile(current_user, profile_data)


@router.get(
    "/me/preferences",
    response_model=UserPreferences,
    summary="Get current user preferences",
    description="Get the preferences for the currently authenticated user."
)
async def get_current_user_preferences(
    current_user: str = Depends(get_current_active_user)
) -> UserPreferences:
    """
    Get the preferences for the currently authenticated user.
    
    This endpoint returns:
    - User interface preferences (theme)
    - Notification settings
    - Quiz display preferences
    - Default filters
    
    Returns:
        User preferences for the authenticated user
    """
    return await user_service.get_user_preferences(current_user)


@router.put(
    "/me/preferences",
    response_model=UserPreferences,
    summary="Update current user preferences",
    description="Update the preferences for the currently authenticated user."
)
async def update_current_user_preferences(
    prefs_data: UserPreferencesUpdate,
    current_user: str = Depends(get_current_active_user)
) -> UserPreferences:
    """
    Update the preferences for the currently authenticated user.
    
    This endpoint allows:
    - Changing UI theme
    - Configuring notification preferences
    - Setting quiz display options
    - Defining default filters
    
    Fields not included in the request will remain unchanged.
    
    Returns:
        Updated user preferences
    """
    return await user_service.update_user_preferences(current_user, prefs_data)


@router.get(
    "/me/stats",
    response_model=UserStats,
    summary="Get current user statistics",
    description="Get usage statistics for the currently authenticated user."
)
async def get_current_user_stats(
    current_user: str = Depends(get_current_active_user)
) -> UserStats:
    """
    Get usage statistics for the currently authenticated user.
    
    This endpoint returns:
    - Quiz completion metrics
    - Performance statistics
    - Time spent studying
    - Strengths and weaknesses
    
    Returns:
        User statistics for the authenticated user
    """
    return await user_service.get_user_stats(current_user)


@router.get(
    "/me/dashboard",
    response_model=UserWithStats,
    summary="Get user dashboard data",
    description="Get comprehensive dashboard data for the current user."
)
async def get_current_user_dashboard(
    current_user: str = Depends(get_current_active_user)
) -> UserWithStats:
    """
    Get comprehensive dashboard data for the current user.
    
    This endpoint returns:
    - User profile information
    - Usage statistics
    - Recent activity
    - Recent quiz results
    - User preferences
    
    Returns:
        Comprehensive user data for dashboard display
    """
    return await user_service.get_user_with_stats(current_user)


@router.get(
    "/search",
    response_model=PaginatedResponse[UserProfile],
    summary="Search users",
    description="Search for users with filtering and pagination."
)
async def search_users(
    query: Optional[str] = Query(None, description="Search query for name, email, etc."),
    role: Optional[UserRole] = Query(None, description="Filter by user role"),
    institution: Optional[str] = Query(None, description="Filter by institution"),
    specialization: Optional[str] = Query(None, description="Filter by specialization"),
    page: int = Query(1, description="Page number", ge=1),
    limit: int = Query(10, description="Items per page", ge=1, le=100),
    current_user: str = Depends(get_current_active_user)
) -> PaginatedResponse:
    """
    Search for users with filtering and pagination.
    
    This endpoint supports:
    - Text search across multiple fields
    - Filtering by role, institution, and specialization
    - Pagination with customizable page size
    
    Returns:
        Paginated list of user profiles matching the search criteria
    """
    params = SearchUsersParams(
        query=query,
        role=role,
        institution=institution,
        specialization=specialization,
        page=page,
        limit=limit
    )
    
    return await user_service.search_users(params)


@router.get(
    "/{user_id}",
    response_model=UserProfile,
    summary="Get user profile",
    description="Get the profile for a specific user."
)
async def get_user_profile(
    user_id: str = Path(..., description="The ID of the user to retrieve"),
    current_user: str = Depends(get_current_active_user)
) -> UserProfile:
    """
    Get the profile for a specific user.
    
    This endpoint returns:
    - User's basic profile information
    - Professional details
    - Account metadata
    
    Note:
    - For privacy, some fields may be restricted for non-admin users
    
    Returns:
        User profile for the specified user
    """
    return await user_service.get_user_profile(user_id)


@router.put(
    "/{user_id}/role/{role}",
    response_model=UserProfile,
    summary="Add role to user",
    description="Add a role to a user (admin only)."
)
async def add_user_role(
    user_id: str = Path(..., description="The ID of the user"),
    role: UserRole = Path(..., description="The role to add"),
    current_user: str = Depends(has_role(UserRole.ADMINISTRATOR))
) -> UserProfile:
    """
    Add a role to a user (admin only).
    
    This endpoint:
    - Adds the specified role to the user
    - Records the change in the activity log
    - Returns the updated user profile
    
    Note:
    - Requires administrator privileges
    
    Returns:
        Updated user profile with the new role
    """
    return await user_service.update_user_role(user_id, role, True)


@router.delete(
    "/{user_id}/role/{role}",
    response_model=UserProfile,
    summary="Remove role from user",
    description="Remove a role from a user (admin only)."
)
async def remove_user_role(
    user_id: str = Path(..., description="The ID of the user"),
    role: UserRole = Path(..., description="The role to remove"),
    current_user: str = Depends(has_role(UserRole.ADMINISTRATOR))
) -> UserProfile:
    """
    Remove a role from a user (admin only).
    
    This endpoint:
    - Removes the specified role from the user
    - Records the change in the activity log
    - Returns the updated user profile
    
    Note:
    - Requires administrator privileges
    - Cannot remove all roles (user will keep STUDENT role)
    
    Returns:
        Updated user profile without the removed role
    """
    return await user_service.update_user_role(user_id, role, False)


@router.post(
    "/activity",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Log user activity",
    description="Log an activity for the current user."
)
async def log_user_activity(
    request: Request,
    activity_type: str = Query(..., regex="^(login|quiz_start|quiz_complete|profile_update|content_create)$"),
    details: Optional[dict] = None,
    current_user: str = Depends(get_current_active_user)
) -> None:
    """
    Log an activity for the current user.
    
    This endpoint:
    - Records the specified activity type
    - Captures client information (IP, user agent)
    - Updates the user's last active timestamp
    
    Note:
    - Activity logs are used for analytics and user history
    """
    # Get client information
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent")
    
    await user_service.log_activity(
        current_user,
        activity_type,
        details,
        ip_address,
        user_agent
    )