# app/api/endpoints/auth.py

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Cookie
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import create_access_token, verify_password, get_password_hash, generate_csrf_token
from app.core.firebase import verify_firebase_token
from app.schemas.auth import TokenResponse, UserLogin, FirebaseTokenRequest, TokenData
from app.api.dependencies import get_current_user, validate_csrf_token
from app.services.user_service import user_service

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/token")

class CsrfResponse(BaseModel):
    """CSRF token response model."""
    token: str


@router.get("/csrf-token", response_model=CsrfResponse)
async def get_csrf_token(response: Response) -> Dict[str, str]:
    """
    Generate a new CSRF token and set it in a cookie.
    
    This endpoint should be called before performing any non-GET requests
    that require CSRF protection.
    
    Args:
        response: FastAPI response object for setting cookies
        
    Returns:
        Dictionary containing the generated CSRF token
    """
    # Generate a new CSRF token
    csrf_token = generate_csrf_token()
    
    # Set the token in a cookie
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        max_age=24 * 60 * 60,  # 1 day
        httponly=False,  # Must be accessible from JavaScript
        secure=settings.ENV != "development",
        samesite="lax" if settings.ENV == "development" else "strict"
    )
    
    return {"token": csrf_token}


@router.post("/token", response_model=TokenResponse)
async def login_for_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Dict[str, Any]:
    """
    OAuth2 compatible token login, get an access token for future requests.
    This endpoint is primarily for internal/testing purposes.
    
    For production use, the /firebase-token endpoint should be used with Firebase authentication.
    
    Args:
        response: FastAPI response object for setting cookies
        form_data: OAuth2 form containing username and password
        
    Returns:
        Dictionary containing access token information
        
    Raises:
        HTTPException: If authentication fails
    """
    # This is a placeholder until we integrate with the database
    # In the real implementation, we would validate the user against the database
    if not (form_data.username == "test@example.com" and form_data.password == "testpassword"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject="test-user-id", expires_delta=access_token_expires
    )
    
    # Create refresh token
    refresh_token_expires = timedelta(days=30)
    refresh_token = create_access_token(
        subject="test-user-id", 
        expires_delta=refresh_token_expires,
        token_type="refresh"
    )
    
    # Set HTTP-only cookies
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=settings.ENV != "development",
        samesite="lax" if settings.ENV == "development" else "strict"
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=30 * 24 * 60 * 60,  # 30 days
        expires=30 * 24 * 60 * 60,
        secure=settings.ENV != "development",
        samesite="lax" if settings.ENV == "development" else "strict"
    )
    
    # Generate a CSRF token
    csrf_token = generate_csrf_token()
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=False,  # Must be accessible from JavaScript
        secure=settings.ENV != "development",
        samesite="lax" if settings.ENV == "development" else "strict"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # in seconds
        "csrf_token": csrf_token
    }


@router.post("/firebase-token")
async def login_with_firebase(
    request: Request,
    firebase_token_data: FirebaseTokenRequest,
    response: Response
) -> Dict[str, Any]:
    """Authenticate using a Firebase ID token."""
    firebase_token = firebase_token_data.token
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
    
    # Create refresh token with longer expiration
    refresh_token_expires = timedelta(days=30)
    refresh_token = create_access_token(
        subject=user_id, 
        expires_delta=refresh_token_expires,
        token_type="refresh"
    )
    
    # Generate a CSRF token
    csrf_token = generate_csrf_token()
    
    # Set secure HTTP-only cookies
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        secure=settings.ENV != "development",
        samesite="lax" if settings.ENV == "development" else "strict"
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=30 * 24 * 60 * 60,  # 30 days
        expires=30 * 24 * 60 * 60,
        secure=settings.ENV != "development",
        samesite="lax" if settings.ENV == "development" else "strict"
    )
    
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=False,  # Must be accessible from JavaScript
        secure=settings.ENV != "development",
        samesite="lax" if settings.ENV == "development" else "strict"
    )
    
    # Create or update user profile
    try:
        # Get user info from Firebase token
        user_data = {
            "id": user_id,
            "email": decoded_token.get("email", ""),
            "display_name": decoded_token.get("name"),
            "photo_url": decoded_token.get("picture"),
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("User-Agent")
        }
        
        # Create or update user profile
        await user_service.create_user_profile(user_data)
    except Exception as e:
        # Log error but continue
        print(f"Failed to create/update user profile: {str(e)}")
    
    return {
        "status": "success",
        "user_id": user_id,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # in seconds
        "csrf_token": csrf_token
    }


@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    refresh_token: Optional[str] = Cookie(None, alias="refresh_token")
) -> Dict[str, Any]:
    """
    Refresh access token using refresh token from cookies.
    
    Args:
        request: FastAPI request object
        response: FastAPI response object for setting cookies
        refresh_token: The refresh token from cookies
        
    Returns:
        Dictionary containing new token information
        
    Raises:
        HTTPException: If the refresh token is invalid or expired
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Decode and validate the refresh token
    try:
        payload = jwt.decode(
            refresh_token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        # Check if it's a refresh token
        token_type = payload.get("type")
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if token is expired
        expiration = payload.get("exp")
        if expiration is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has no expiration",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if datetime.utcnow() > datetime.fromtimestamp(expiration):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Extract user ID from token
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Generate new access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user_id, expires_delta=access_token_expires
        )
        
        # Generate new CSRF token
        csrf_token = generate_csrf_token()
        
        # Set new access token in cookie
        response.set_cookie(
            key="access_token",
            value=f"Bearer {access_token}",
            httponly=True,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            secure=settings.ENV != "development",
            samesite="lax" if settings.ENV == "development" else "strict"
        )
        
        response.set_cookie(
            key="csrf_token",
            value=csrf_token,
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            httponly=False,  # Must be accessible from JavaScript
            secure=settings.ENV != "development",
            samesite="lax" if settings.ENV == "development" else "strict"
        )
        
        return {
            "status": "success",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # in seconds
            "csrf_token": csrf_token
        }
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/logout")
async def logout(
    response: Response,
    _: str = Depends(get_current_user),  # Ensures user is authenticated
) -> Dict[str, str]:
    """
    Log out the user by clearing auth cookies.
    
    Args:
        response: FastAPI response object for clearing cookies
        _: Current user ID (used only for authentication check)
        
    Returns:
        Dictionary containing logout status
    """
    # Clear all authentication cookies
    response.delete_cookie(
        key="access_token",
        secure=settings.ENV != "development",
        httponly=True,
        samesite="lax" if settings.ENV == "development" else "strict"
    )
    
    response.delete_cookie(
        key="refresh_token",
        secure=settings.ENV != "development",
        httponly=True,
        samesite="lax" if settings.ENV == "development" else "strict"
    )
    
    response.delete_cookie(
        key="csrf_token",
        secure=settings.ENV != "development",
        httponly=False,
        samesite="lax" if settings.ENV == "development" else "strict"
    )
    
    return {"status": "success"}