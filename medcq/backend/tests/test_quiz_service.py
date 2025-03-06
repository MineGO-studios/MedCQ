# backend/tests/test_quiz_service.py

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
from app.services.quiz_service import QuizService
from app.schemas.domain import (
    Quiz, QuizSummary, QuizCreate, QuizUpdate, QuizStatus,
    Question, QuestionType, AnswerOptionCreate, QuestionCreate
)
from app.schemas.api import PaginatedResponse, QuizListParams
from fastapi import HTTPException

# Sample test data
SAMPLE_QUIZ_ID = "test-quiz-id"
SAMPLE_USER_ID = "test-user-id"

@pytest.fixture
def mock_supabase_client():
    """Create a mock Supabase client for testing"""
    mock_client = MagicMock()
    
    # Setup mock behavior for from_
    mock_from = MagicMock()
    mock_client.from_.return_value = mock_from
    
    # Setup select, insert, update, delete methods
    mock_select = MagicMock()
    mock_from.select.return_value = mock_select
    
    mock_insert = MagicMock()
    mock_from.insert.return_value = mock_insert
    
    mock_update = MagicMock()
    mock_from.update.return_value = mock_update
    
    mock_delete = MagicMock()
    mock_from.delete.return_value = mock_delete
    
    # Setup filter methods
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    mock_update.eq.return_value = mock_update
    mock_delete.eq.return_value = mock_delete
    
    # Setup execute method
    mock_execute = MagicMock()
    mock_execute.data = []
    mock_execute.error = None
    
    mock_eq.execute.return_value = mock_execute
    mock_insert.execute.return_value = mock_execute
    mock_update.execute.return_value = mock_execute
    mock_delete.execute.return_value = mock_execute
    
    return mock_client

@pytest.fixture
def quiz_service(mock_supabase_client):
    """Create QuizService instance with mocked dependencies"""
    with patch('app.services.quiz_service.supabase_client', mock_supabase_client):
        service = QuizService()
        return service

class TestQuizService:
    """Test suite for QuizService"""
    
    async def test_get_quizzes(self, quiz_service, mock_supabase_client):
        """Test getting a list of quizzes"""
        # Setup mock data
        mock_execute = mock_supabase_client.from_.return_value.select.return_value.execute
        mock_execute.return_value.data = [
            {
                "id": "quiz-1",
                "title": "Geography Quiz",
                "description": "Test quiz",
                "subject_id": "subject-1",
                "year_level": 5,
                "time_limit_minutes": 30,
                "status": "published",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "created_by": "user-1",
                "subjects": {"name": "Geography"},
                "quiz_tags": [{"tags": {"name": "geography"}}, {"tags": {"name": "easy"}}]
            }
        ]
        mock_execute.return_value.count = 1
        
        # Create parameters
        params = QuizListParams(
            subject=None,
            year_level=None,
            status=QuizStatus.PUBLISHED,
            page=1,
            limit=10
        )
        
        # Call method
        result = await quiz_service.get_quizzes(params)
        
        # Verify result
        assert isinstance(result, PaginatedResponse)
        assert result.total == 1
        assert result.page == 1
        assert result.limit == 10
        assert result.total_pages == 1
        assert len(result.items) == 1
        
        # Verify the returned quiz summary
        quiz = result.items[0]
        assert isinstance(quiz, QuizSummary)
        assert quiz.id == "quiz-1"
        assert quiz.title == "Geography Quiz"
        assert quiz.subject == "Geography"
        assert quiz.year_level == 5
        assert quiz.time_limit == 30
        assert quiz.status == QuizStatus.PUBLISHED
        assert "geography" in quiz.tags
        assert "easy" in quiz.tags
    
    async def test_get_quiz_by_id(self, quiz_service, mock_supabase_client):
        """Test getting a quiz by ID"""
        # Setup mock data for quiz
        quiz_mock_execute = mock_supabase_client.from_.return_value.select.return_value.eq.return_value.single.return_value.execute
        quiz_mock_execute.return_value.data = {
            "id": SAMPLE_QUIZ_ID,
            "title": "Test Quiz",
            "description": "Test description",
            "subject_id": "subject-1",
            "year_level": 5,
            "time_limit_minutes": 30,
            "randomize_questions": True,
            "randomize_options": False,
            "pass_score": 70,
            "status": "published",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "created_by": SAMPLE_USER_ID,
            "subjects": {"name": "Geography"},
            "quiz_tags": [{"tags": {"name": "geography"}}]
        }
        quiz_mock_execute.return_value.error = None
        
        # Setup mock data for questions
        questions_mock = MagicMock()
        mock_supabase_client.from_.return_value.select.return_value.eq.return_value = questions_mock
        questions_mock_execute = questions_mock.execute
        questions_mock_execute.return_value.data = [
            {
                "id": "question-1",
                "text": "Test question",
                "explanation": "Test explanation",
                "type": "single_choice",
                "order_index": 0,
                "tags": ["tag1", "tag2"],
                "difficulty": 3,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
        ]
        questions_mock_execute.return_value.error = None
        
        # Setup mock data for options
        options_mock = MagicMock()
        mock_supabase_client.from_.return_value.select.return_value.eq.return_value = options_mock
        options_mock_execute = options_mock.execute
        options_mock_execute.return_value.data = [
            {
                "id": "option-1",
                "text": "Option A",
                "is_correct": True,
                "explanation": "This is correct",
                "order_index": 0
            },
            {
                "id": "option-2",
                "text": "Option B",
                "is_correct": False,
                "explanation": None,
                "order_index": 1
            }
        ]
        options_mock_execute.return_value.error = None
        
        # Call method
        result = await quiz_service.get_quiz_by_id(SAMPLE_QUIZ_ID)
        
        # Verify result
        assert isinstance(result, Quiz)
        assert result.id == SAMPLE_QUIZ_ID
        assert result.title == "Test Quiz"
        assert result.description == "Test description"
        assert result.subject == "Geography"
        assert result.year_level == 5
        assert result.time_limit == 30
        assert result.randomize_questions is True
        assert result.randomize_options is False
        assert result.pass_score == 70
        assert result.status == QuizStatus.PUBLISHED
        assert "geography" in result.tags
        assert len(result.questions) == 1
        
        # Verify question details
        question = result.questions[0]
        assert question.id == "question-1"
        assert question.text == "Test question"
        assert question.explanation == "Test explanation"
        assert question.type == QuestionType.SINGLE_CHOICE
        assert len(question.options) == 2
        
        # Verify option details
        assert question.options[0].id == "option-1"
        assert question.options[0].text == "Option A"
        assert question.options[0].isCorrect is True
        assert question.options[1].id == "option-2"
        assert question.options[1].text == "Option B"
        assert question.options[1].isCorrect is False
    
    async def test_create_quiz(self, quiz_service, mock_supabase_client):
        """Test creating a new quiz"""
        # Setup mock for subject
        subject_mock = MagicMock()
        mock_supabase_client.from_.return_value.select.return_value.eq.return_value.single.return_value = subject_mock
        subject_mock.execute.return_value.data = {"id": "subject-1"}
        subject_mock.execute.return_value.error = None
        
        # Setup mock for quiz insert
        quiz_insert_mock = MagicMock()
        mock_supabase_client.from_.return_value.insert.return_value = quiz_insert_mock
        quiz_insert_mock.execute.return_value.data = [{"id": SAMPLE_QUIZ_ID}]
        quiz_insert_mock.execute.return_value.error = None
        
        # Mock get_quiz_by_id to return a complete quiz
        quiz_service.get_quiz_by_id = MagicMock()
        mock_quiz = Quiz(
            id=SAMPLE_QUIZ_ID,
            title="Test Quiz",
            subject="Geography",
            questions=[],
            tags=["tag1"],
            status=QuizStatus.DRAFT,
            questionCount=0,
            createdBy=SAMPLE_USER_ID,
            createdAt=datetime.utcnow().isoformat()
        )
        quiz_service.get_quiz_by_id.return_value = mock_quiz
        
        # Create quiz data
        quiz_data = QuizCreate(
            title="Test Quiz",
            subject="Geography",
            tags=["tag1"],
            status=QuizStatus.DRAFT,
            questions=[
                QuestionCreate(
                    text="Test question",
                    type=QuestionType.SINGLE_CHOICE,
                    options=[
                        AnswerOptionCreate(text="Option A", is_correct=True),
                        AnswerOptionCreate(text="Option B", is_correct=False)
                    ]
                )
            ]
        )
        
        # Call method
        result = await quiz_service.create_quiz(quiz_data, SAMPLE_USER_ID)
        
        # Verify result
        assert result == mock_quiz
        
        # Verify quiz insert was called with correct data
        mock_supabase_client.from_.assert_any_call("quizzes")
        quiz_insert_call = None
        for call in mock_supabase_client.from_.return_value.insert.call_args_list:
            args, kwargs = call
            if "title" in args[0] and args[0]["title"] == "Test Quiz":
                quiz_insert_call = call
                break
        
        assert quiz_insert_call is not None
        insert_data = quiz_insert_call[0][0]
        assert insert_data["title"] == "Test Quiz"
        assert insert_data["subject_id"] == "subject-1"
        assert insert_data["status"] == "draft"
        assert insert_data["created_by"] == SAMPLE_USER_ID
    
    async def test_quiz_not_found(self, quiz_service, mock_supabase_client):
        """Test handling when quiz is not found"""
        # Setup mock to return "not found" error
        mock_execute = mock_supabase_client.from_.return_value.select.return_value.eq.return_value.single.return_value.execute
        mock_execute.return_value.data = None
        mock_execute.return_value.error = MagicMock()
        mock_execute.return_value.error.code = "PGRST116"  # Supabase "not found" error code
        
        # Verify result is None
        result = await quiz_service.get_quiz_by_id("nonexistent-id")
        assert result is None