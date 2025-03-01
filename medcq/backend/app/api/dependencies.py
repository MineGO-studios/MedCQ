from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from typing import Optional

from app.core.config import settings
from app.schemas.auth import TokenData
from app.core.firebase import initialize_firebase

# Initialize OAuth2 scheme for token validation
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/token")

# Initialize Firebase when the app starts
firebase_app = initialize_firebase()

async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """
    Validate the access token and return the user ID.
    
    Args:
        token: The JWT token from Authorization header
        
    Returns:
        str: The user ID extracted from the token
        
    Raises:
        HTTPException: If the token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the JWT token
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        
        # Extract the user ID from the token
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # Create token data object
        token_data = TokenData(user_id=user_id)
        return token_data.user_id
    except (JWTError, ValidationError):
        raise credentials_exception


async def get_current_active_user(current_user: str = Depends(get_current_user)) -> str:
    """
    Verify that the current user is active.
    
    This is a placeholder for future user status validation logic.
    
    Args:
        current_user: The user ID of the authenticated user
        
    Returns:
        str: The user ID if the user is active
        
    Raises:
        HTTPException: If the user is inactive
    """
    # In a real implementation, we would check if the user is active in the database
    # For now, we'll just return the user ID
    return current_user