from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List, Any
from datetime import datetime, timezone
import uuid

from app.api.dependencies import get_current_active_user
from app.schemas.quiz import QuizSummary, Quiz, QuizCreate, QuizResult, QuizAttemptSubmit

router = APIRouter()

# Temporary in-memory quiz store for development
# In production, this would be replaced with a database
fake_quizzes_db = {
    "1": {
        "id": "1",
        "title": "Introduction to Anatomy",
        "description": "Basic concepts of human anatomy",
        "subject": "Anatomy",
        "year_level": 1,
        "time_limit_minutes": 30,
        "tags": ["anatomy", "beginner"],
        "question_count": 10,
        "created_at": datetime(2023, 1, 1, tzinfo=timezone.utc),
        "updated_at": datetime(2023, 1, 2, tzinfo=timezone.utc),
        "created_by": "admin",
        "questions": [
            {
                "id": "q1",
                "text": "Which of the following is NOT a major body system?",
                "explanation": "The major body systems include Cardiovascular, Respiratory, Digestive, Nervous, Musculoskeletal, etc.",
                "type": "single_choice",
                "options": [
                    {"id": "a", "text": "Respiratory System", "is_correct": False},
                    {"id": "b", "text": "Integumentary System", "is_correct": False},
                    {"id": "c", "text": "Computational System", "is_correct": True},
                    {"id": "d", "text": "Nervous System", "is_correct": False}
                ]
            }
        ]
    },
    "2": {
        "id": "2",
        "title": "Cardiology Basics",
        "description": "Fundamentals of cardiac physiology",
        "subject": "Cardiology",
        "year_level": 2,
        "time_limit_minutes": 45,
        "tags": ["cardiology", "physiology"],
        "question_count": 15,
        "created_at": datetime(2023, 2, 1, tzinfo=timezone.utc),
        "updated_at": None,
        "created_by": "admin",
        "questions": []
    }
}

@router.get("", response_model=List[QuizSummary])
async def list_quizzes(
    subject: str = None,
    year_level: int = None,
    current_user: str = Depends(get_current_active_user)
) -> List[Dict[str, Any]]:
    """
    List available quizzes with optional filtering.
    
    Args:
        subject: Filter by subject
        year_level: Filter by year level
        current_user: Current authenticated user
        
    Returns:
        List of quiz summaries
    """
    quizzes = list(fake_quizzes_db.values())
    
    # Apply filters if provided
    if subject:
        quizzes = [q for q in quizzes if q["subject"].lower() == subject.lower()]
    
    if year_level:
        quizzes = [q for q in quizzes if q["year_level"] == year_level]
    
    # Convert to QuizSummary objects
    return quizzes


@router.post("", response_model=Quiz, status_code=status.HTTP_201_CREATED)
async def create_quiz(
    quiz: QuizCreate,
    current_user: str = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Create a new quiz.
    
    Args:
        quiz: The quiz data
        current_user: Current authenticated user
        
    Returns:
        The created quiz
    """
    # Generate a new quiz ID
    quiz_id = str(uuid.uuid4())
    
    # Create a new quiz object
    now = datetime.now(timezone.utc)
    
    # Assign IDs to questions
    questions = []
    for q in quiz.questions:
        question_id = str(uuid.uuid4())
        question_dict = q.dict()
        question_dict["id"] = question_id
        questions.append(question_dict)
    
    # Create quiz record
    new_quiz = {
        "id": quiz_id,
        "title": quiz.title,
        "description": quiz.description,
        "subject": quiz.subject,
        "year_level": quiz.year_level,
        "time_limit_minutes": quiz.time_limit_minutes,
        "tags": quiz.tags,
        "created_at": now,
        "updated_at": None,
        "created_by": current_user,
        "questions": questions,
        "question_count": len(questions)
    }
    
    # Save to database (in this case, our fake DB)
    fake_quizzes_db[quiz_id] = new_quiz
    
    return new_quiz


@router.get("/{quiz_id}", response_model=Quiz)
async def get_quiz(
    quiz_id: str,
    current_user: str = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Get a specific quiz by ID.
    
    Args:
        quiz_id: The ID of the quiz to retrieve
        current_user: Current authenticated user
        
    Returns:
        The quiz data
    """
    if quiz_id not in fake_quizzes_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    return fake_quizzes_db[quiz_id]


@router.post("/{quiz_id}/submit", response_model=QuizResult)
async def submit_quiz_attempt(
    quiz_id: str,
    attempt: QuizAttemptSubmit,
    current_user: str = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Submit answers for a quiz and get results.
    
    Args:
        quiz_id: The ID of the quiz being attempted
        attempt: The quiz attempt data
        current_user: Current authenticated user
        
    Returns:
        The quiz results
    """
    if quiz_id not in fake_quizzes_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    # Verify the quiz_id in the path matches the one in the request body
    if quiz_id != attempt.quiz_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quiz ID mismatch between path and body"
        )
    
    # Get the quiz
    quiz = fake_quizzes_db[quiz_id]
    
    # Check if answers are provided for all questions (simplified validation)
    question_ids = [q["id"] for q in quiz["questions"]]
    missing_answers = set(question_ids) - set(attempt.answers.keys())
    
    if missing_answers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing answers for questions: {missing_answers}"
        )
    
    # Evaluate answers (simplified evaluation logic)
    # In a real implementation, this would be more sophisticated
    correct_count = 0
    question_results = {}
    
    for question in quiz["questions"]:
        question_id = question["id"]
        user_answer = attempt.answers.get(question_id)
        
        # For single choice questions, check if the selected option is correct
        if question["type"] == "single_choice":
            correct_option = next((o["id"] for o in question["options"] if o["is_correct"]), None)
            is_correct = user_answer == correct_option
            
            if is_correct:
                correct_count += 1
            
            question_results[question_id] = is_correct
    
    # Calculate the score as a percentage
    total_count = len(quiz["questions"])
    score = (correct_count / total_count) * 100 if total_count > 0 else 0
    
    # Create and return the result
    result = {
        "quiz_id": quiz_id,
        "user_id": current_user,
        "score": score,
        "correct_count": correct_count,
        "total_count": total_count,
        "time_taken_seconds": attempt.time_taken_seconds,
        "completed_at": datetime.now(timezone.utc),
        "question_results": question_results
    }
    
    # In a real implementation, we would save this result to the database
    
    return result