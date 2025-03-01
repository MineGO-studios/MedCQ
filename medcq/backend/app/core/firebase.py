import firebase_admin
from firebase_admin import credentials, auth
from app.core.config import settings
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK with credentials
firebase_app = None

def initialize_firebase():
    """
    Initialize Firebase Admin SDK.
    """
    global firebase_app
    
    if firebase_app:
        return firebase_app
    
    try:
        if not settings.FIREBASE_CREDENTIALS_PATH:
            logger.warning("Firebase credentials path not set. Firebase integration disabled.")
            return None
        
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully")
        return firebase_app
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        return None


def verify_firebase_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verify a Firebase ID token.
    
    Args:
        id_token: The Firebase ID token to verify
        
    Returns:
        Dict containing user information if valid, None otherwise
    """
    if not firebase_app:
        logger.error("Firebase not initialized. Cannot verify token.")
        return None
    
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.error(f"Error verifying Firebase token: {e}")
        return None


def get_firebase_user(uid: str) -> Optional[Dict[str, Any]]:
    """
    Get user information from Firebase by UID.
    
    Args:
        uid: The Firebase user ID
        
    Returns:
        Dict containing user information if found, None otherwise
    """
    if not firebase_app:
        logger.error("Firebase not initialized. Cannot get user.")
        return None
    
    try:
        user = auth.get_user(uid)
        return {
            "uid": user.uid,
            "email": user.email,
            "email_verified": user.email_verified,
            "display_name": user.display_name,
            "photo_url": user.photo_url,
            "disabled": user.disabled,
        }
    except Exception as e:
        logger.error(f"Error getting Firebase user: {e}")
        return None