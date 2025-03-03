# app/schemas/auth.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class TokenData(BaseModel):
    """Token data for authentication."""
    user_id: str


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    """Response model for token generation."""
    access_token: str
    token_type: str
    expires_in: int  # Expiration time in seconds
    csrf_token: Optional[str] = None


class FirebaseTokenRequest(BaseModel):
    """Request model for Firebase token authentication."""
    token: str


class UserBase(BaseModel):
    """Base schema for user details."""
    email: EmailStr
    name: Optional[str] = None
    photo_url: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """Schema for updating user details."""
    name: Optional[str] = None
    photo_url: Optional[str] = None


class UserInDB(UserBase):
    """Schema for user in database."""
    id: str