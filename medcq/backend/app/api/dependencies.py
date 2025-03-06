# backend/app/api/dependencies.py

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from typing import Optional, Dict, Any, List, Callable
from datetime import datetime

from app.core.config import settings
from app.schemas.auth import TokenData
from app.core.firebase import initialize_firebase
from app.core.security import decode_and_validate_token
from app.schemas.user import UserRole
from app.db.supbase import supabase_client 

# Initialize OAuth2 scheme for token validation
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/token", auto_error=False)

# Initialize Firebase when the app starts
firebase_app = initialize_firebase()

async def get_current_user(request: Request) -> str:
    """Extract user from token in cookie or header."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Try to get token from cookie first
    token = None
    auth_cookie = request.cookies.get("access_token")
    
    if auth_cookie and auth_cookie.startswith("Bearer "):
        token = auth_cookie.replace("Bearer ", "")
    else:
        # Fall back to Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
        else:
            # Try the OAuth2 scheme as last resort
            token_from_scheme = await oauth2_scheme(request)
            if token_from_scheme:
                token = token_from_scheme
    
    if not token:
        raise credentials_exception
    
    # Validate token
    payload = decode_and_validate_token(token)
    if not payload:
        raise credentials_exception
    
    # Extract user ID
    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception
    
    # Create token data object
    token_data = TokenData(user_id=user_id)
    return token_data.user_id


async def get_current_active_user(current_user: str = Depends(get_current_user)) -> str:
    """Verify that the current user is active."""
    # TODO: Implement user status validation against database
    # For now, we'll just return the user ID
    return current_user


async def get_user_roles(user_id: str) -> List[UserRole]:
    """
    Get roles for a specific user.
    
    Args:
        user_id: The ID of the user
        
    Returns:
        List of user roles
    """
    try:
        # Get user from database
        response = supabase_client.from_("user_profiles").select(
            "roles"
        ).eq("id", user_id).single().execute()
        
        if response.error:
            # Default to student role if profile not found
            return [UserRole.STUDENT]
        
        roles = response.data.get("roles", [UserRole.STUDENT])
        
        # Ensure at least one role
        if not roles:
            roles = [UserRole.STUDENT]
            
        return roles
    except Exception:
        # Default to student role on error
        return [UserRole.STUDENT]


def has_role(required_role: UserRole) -> Callable:
    """
    Dependency to check if a user has a specific role.
    
    Args:
        required_role: The role required for access
        
    Returns:
        User ID if role check passes
    """
    async def role_checker(current_user: str = Depends(get_current_active_user)) -> str:
        user_roles = await get_user_roles(current_user)
        
        if required_role not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {required_role} required for this operation"
            )
        
        return current_user
    
    return role_checker


async def validate_csrf_token(
    request: Request, 
    csrf_token: str = Depends(lambda r: r.headers.get("X-CSRF-Token"))
) -> None:
    """
    Validate the CSRF token from request header against the one stored in session.
    
    Args:
        request: The FastAPI request object
        csrf_token: The CSRF token from request header
        
    Raises:
        HTTPException: If the CSRF token is invalid or missing
    """
    # Skip CSRF validation for GET, HEAD, OPTIONS requests (they should be idempotent)
    if request.method.upper() in ("GET", "HEAD", "OPTIONS"):
        return
    
    if not csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing",
        )
    
    # Get stored token from session
    # In a real implementation, you would get this from a session store
    # For now, we'll use a cookie as a simplified approach
    stored_token = request.cookies.get("csrf_token")
    
    if not stored_token or stored_token != csrf_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token",
        )