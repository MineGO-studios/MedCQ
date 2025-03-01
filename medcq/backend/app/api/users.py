from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any, Dict, List

from app.api.dependencies import get_current_active_user
from app.schemas.auth import UserBase

router = APIRouter()

# Temporary in-memory user store for development
# In production, this would be replaced with a database
fake_users_db = {
    "test-user-id": {
        "email": "test@example.com",
        "name": "Test User",
    }
}

@router.get("/me", response_model=UserBase)
async def read_users_me(
    current_user: str = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Get current user information.
    
    Args:
        current_user: The current authenticated user ID
        
    Returns:
        The user information
    """
    if current_user not in fake_users_db:
        # In a real implementation, we would query the database
        # For now, we'll return a placeholder user
        return {"email": "user@example.com", "name": "Sample User"}
    
    return fake_users_db[current_user]


@router.get("/{user_id}", response_model=UserBase)
async def read_user(
    user_id: str,
    current_user: str = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Get user information by user ID.
    
    Args:
        user_id: The ID of the user to get
        current_user: The current authenticated user ID
        
    Returns:
        The user information
    """
    # In a real implementation, we'd check permissions
    # Only allow users to access their own information or admins to access any
    if user_id != current_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's information"
        )
    
    if user_id not in fake_users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return fake_users_db[user_id]