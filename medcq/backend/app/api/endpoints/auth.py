from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import timedelta
from typing import Any, Dict

from app.core.config import settings
from app.core.security import create_access_token
from app.core.firebase import verify_firebase_token
from app.schemas.auth import TokenResponse, UserLogin

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/token")

@router.post("/token", response_model=TokenResponse)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Dict[str, Any]:
    """
    OAuth2 compatible token login, get an access token for future requests.
    This endpoint is primarily for internal/testing purposes.
    
    For production use, the /firebase-token endpoint should be used with Firebase authentication.
    """
    # This is a placeholder until we integrate with the database
    # In the real implementation, we would validate the user against the database
    if not (form_data.username == "test@example.com" and form_data.password == "testpassword"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject="test-user-id", expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # in seconds
    }


@router.post("/firebase-token", response_model=TokenResponse)
async def login_with_firebase(firebase_token: str) -> Dict[str, Any]:
    """
    Authenticate using a Firebase ID token.
    
    Args:
        firebase_token: The Firebase ID token from the client
        
    Returns:
        A JWT token for API authentication
    """
    decoded_token = verify_firebase_token(firebase_token)
    if not decoded_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract user information from the verified token
    user_id = decoded_token.get("uid")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create our own access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user_id, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # in seconds
    }