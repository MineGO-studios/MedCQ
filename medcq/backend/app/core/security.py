# app/core/security.py

from datetime import datetime, timedelta
from typing import Optional, Any, Dict
import secrets

from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    
    Args:
        plain_password: The plain-text password
        hashed_password: The hashed password to compare against
        
    Returns:
        bool: True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password for storing.
    
    Args:
        password: The plain-text password to hash
        
    Returns:
        str: The hashed password
    """
    return pwd_context.hash(password)


def create_access_token(
    subject: Any, 
    expires_delta: Optional[timedelta] = None,
    token_type: str = "access"
) -> str:
    """
    Create a JWT token.
    
    Args:
        subject: The subject to encode in the token (typically user_id)
        expires_delta: Optional expiration delta, defaults to settings value
        token_type: Type of token (access or refresh)
        
    Returns:
        str: The encoded JWT token
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": token_type,
        "iat": datetime.utcnow()
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_and_validate_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: The JWT token to validate
        
    Returns:
        Dict containing the decoded payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        
        # Verify token hasn't expired
        expiration = payload.get("exp")
        if expiration is None:
            return None
            
        if datetime.utcnow() > datetime.fromtimestamp(expiration):
            return None
            
        return payload
    except jwt.JWTError:
        return None


def generate_csrf_token() -> str:
    """
    Generate a secure CSRF token.
    
    Returns:
        str: A randomly generated token
    """
    return secrets.token_hex(32)


def verify_csrf_token(token: str, stored_token: str) -> bool:
    """
    Verify a CSRF token using constant-time comparison.
    
    Args:
        token: The token to verify
        stored_token: The known good token to compare against
        
    Returns:
        bool: True if tokens match, False otherwise
    """
    return secrets.compare_digest(token, stored_token)