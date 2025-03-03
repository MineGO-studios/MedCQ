# backend/app/db/supabase.py

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

# User-related database operations
async def create_user_profile(user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new user profile in Supabase.
    
    Args:
        user_data: The user data to insert
        
    Returns:
        The created user record, or None if creation failed
    """
    client = get_supabase_client()
    if not client:
        logger.warning("Supabase client not initialized. Cannot create user profile.")
        return None
    
    try:
        response = client.from_("users").insert(user_data).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error creating user in Supabase: {e}")
        return None

# Quiz-related database operations
async def create_quiz(quiz_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new quiz with questions and answer options.
    This is a transaction that creates all related records.
    
    Args:
        quiz_data: The quiz data including questions and answer options
        
    Returns:
        The created quiz record, or None if creation failed
    """
    client = get_supabase_client()
    if not client:
        logger.warning("Supabase client not initialized. Cannot create quiz.")
        return None
    
    try:
        # Extract questions and tags from quiz data
        questions = quiz_data.pop("questions", [])
        tags = quiz_data.pop("tags", [])
        
        # Start a transaction
        # Note: Supabase Python client doesn't have direct transaction support
        # We'll use separate operations
        
        # 1. Create the quiz
        quiz_response = client.from_("quizzes").insert(quiz_data).execute()
        if not quiz_response.data or len(quiz_response.data) == 0:
            logger.error("Failed to create quiz.")
            return None
            
        quiz_id = quiz_response.data[0]["id"]
        
        # 2. Process tags
        for tag_name in tags:
            # Check if tag exists
            tag_resp = client.from_("tags").select("id").eq("name", tag_name).execute()
            
            if tag_resp.data and len(tag_resp.data) > 0:
                tag_id = tag_resp.data[0]["id"]
            else:
                # Create new tag
                new_tag_resp = client.from_("tags").insert({"name": tag_name}).execute()
                if not new_tag_resp.data or len(new_tag_resp.data) == 0:
                    logger.warning(f"Failed to create tag: {tag_name}")
                    continue
                tag_id = new_tag_resp.data[0]["id"]
            
            # Create quiz-tag relationship
            client.from_("quiz_tags").insert({
                "quiz_id": quiz_id,
                "tag_id": tag_id
            }).execute()
        
        # 3. Create questions and answer options
        for i, question in enumerate(questions):
            question_data = {
                "quiz_id": quiz_id,
                "text": question["text"],
                "explanation": question.get("explanation"),
                "type": question["type"],
                "order_index": i
            }
            
            question_resp = client.from_("questions").insert(question_data).execute()
            if not question_resp.data or len(question_resp.data) == 0:
                logger.warning(f"Failed to create question: {question['text']}")
                continue
                
            question_id = question_resp.data[0]["id"]
            
            # Create answer options
            for j, option in enumerate(question.get("options", [])):
                option_data = {
                    "question_id": question_id,
                    "text": option["text"],
                    "is_correct": option.get("is_correct", False),
                    "order_index": j
                }
                
                client.from_("answer_options").insert(option_data).execute()
        
        # Get the complete quiz data
        return await fetch_quiz_by_id(quiz_id)
    except Exception as e:
        logger.error(f"Error creating quiz in Supabase: {e}")
        return None

async def fetch_quiz_by_id(quiz_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetch a quiz by its ID, including questions and answer options.
    
    Args:
        quiz_id: The ID of the quiz to fetch
        
    Returns:
        The quiz record with questions and answer options, or None if not found
    """
    client = get_supabase_client()
    if not client:
        logger.warning("Supabase client not initialized. Cannot fetch quiz.")
        return None
    
    try:
        # Fetch the quiz
        quiz_resp = client.from_("quizzes").select("*").eq("id", quiz_id).single().execute()
        if not quiz_resp.data:
            logger.warning(f"Quiz with ID {quiz_id} not found.")
            return None
        
        quiz = quiz_resp.data
        
        # Fetch questions
        questions_resp = client.from_("questions").select("*").eq("quiz_id", quiz_id).execute()
        if questions_resp.data:
            quiz["questions"] = questions_resp.data
            
            # Fetch answer options for each question
            for question in quiz["questions"]:
                options_resp = client.from_("answer_options").select("*").eq("question_id", question["id"]).execute()
                if options_resp.data:
                    question["options"] = options_resp.data
        
        return quiz
    except Exception as e:
        logger.error(f"Error fetching quiz by ID {quiz_id} in Supabase: {e}")
        return None

# Add more database functions...