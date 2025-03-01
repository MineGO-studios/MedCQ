from supabase import create_client, Client
from app.core.config import settings
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Supabase client instance
supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    """
    Get or initialize the Supabase client.
    
    Returns:
        The Supabase client instance, or None if initialization failed
    """
    global supabase_client
    
    if supabase_client:
        return supabase_client
    
    try:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            logger.warning("Supabase URL or key not set. Supabase integration disabled.")
            return None
        
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialized successfully")
        return supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None


async def fetch_users(filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Fetch users from Supabase with optional filtering.
    
    Args:
        filters: Optional filters to apply to the query
        
    Returns:
        List of user records
    """
    client = get_supabase_client()
    if not client:
        logger.warning("Supabase client not initialized. Returning empty list.")
        return []
    
    try:
        query = client.from_("users").select("*")
        
        # Apply filters if provided
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        
        response = query.execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching users from Supabase: {e}")
        return []


async def fetch_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a single user by ID.
    
    Args:
        user_id: The ID of the user to fetch
        
    Returns:
        The user record, or None if not found
    """
    client = get_supabase_client()
    if not client:
        logger.warning("Supabase client not initialized. Returning None.")
        return None
    
    try:
        response = client.from_("users").select("*").eq("id", user_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching user from Supabase: {e}")
        return None


async def fetch_quizzes(filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Fetch quizzes from Supabase with optional filtering.
    
    Args:
        filters: Optional filters to apply to the query
        
    Returns:
        List of quiz records
    """
    client = get_supabase_client()
    if not client:
        logger.warning("Supabase client not initialized. Returning empty list.")
        return []
    
    try:
        query = client.from_("quizzes").select("*")
        
        # Apply filters if provided
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        
        response = query.execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching quizzes from Supabase: {e}")
        return []


async def fetch_quiz_by_id(quiz_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a single quiz by ID.
    
    Args:
        quiz_id: The ID of the quiz to fetch
        
    Returns:
        The quiz record, or None if not found
    """
    client = get_supabase_client()
    if not client:
        logger.warning("Supabase client not initialized. Returning None.")
        return None
    
    try:
        response = client.from_("quizzes").select("*").eq("id", quiz_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching quiz from Supabase: {e}")
        return None


async def create_quiz_record(quiz_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new quiz record.
    
    Args:
        quiz_data: The quiz data to insert
        
    Returns:
        The created quiz record, or None if creation failed
    """
    client = get_supabase_client()
    if not client:
        logger.warning("Supabase client not initialized. Cannot create quiz record.")
        return None
    
    try:
        response = client.from_("quizzes").insert(quiz_data).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error creating quiz in Supabase: {e}")
        return None