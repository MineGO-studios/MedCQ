# backend/tests/test_domain_models.py

import pytest
from datetime import datetime
from pydantic import ValidationError
from app.schemas.domain import (
    QuestionType, 
    QuizStatus, 
    AnswerOptionCreate, 
    QuestionCreate, 
    QuizCreate,
    Quiz,
    Question,
    AnswerOption
)

class TestAnswerOption:
    """Test suite for AnswerOption model"""
    
    def test_answer_option_create_valid(self):
        """Test creating valid answer options"""
        # Basic valid option
        option = AnswerOptionCreate(text="This is an answer")
        assert option.text == "This is an answer"
        assert option.is_correct is False
        assert option.explanation is None
        
        # Option with all fields
        option = AnswerOptionCreate(
            text="This is a correct answer",
            is_correct=True,
            explanation="This is why it's correct"
        )
        assert option.text == "This is a correct answer"
        assert option.is_correct is True
        assert option.explanation == "This is why it's correct"
    
    def test_answer_option_create_invalid(self):
        """Test validation for invalid answer options"""
        # Empty text
        with pytest.raises(ValidationError):
            AnswerOptionCreate(text="")
        
        # Text too long (over 500 chars)
        with pytest.raises(ValidationError):
            AnswerOptionCreate(text="A" * 501)
        
        # Invalid explanation (too long)
        with pytest.raises(ValidationError):
            AnswerOptionCreate(
                text="Valid text",
                explanation="E" * 1001  # Over 1000 chars
            )

class TestQuestion:
    """Test suite for Question model"""
    
    def test_question_create_valid(self):
        """Test creating valid questions"""
        # Single choice question
        question = QuestionCreate(
            text="What is the capital of France?",
            type=QuestionType.SINGLE_CHOICE,
            options=[
                AnswerOptionCreate(text="London", is_correct=False),
                AnswerOptionCreate(text="Paris", is_correct=True),
                AnswerOptionCreate(text="Berlin", is_correct=False)
            ]
        )
        assert question.text == "What is the capital of France?"
        assert question.type == QuestionType.SINGLE_CHOICE
        assert len(question.options) == 3
        
        # True/False question
        question = QuestionCreate(
            text="Paris is the capital of France",
            type=QuestionType.TRUE_FALSE,
            options=[
                AnswerOptionCreate(text="True", is_correct=True),
                AnswerOptionCreate(text="False", is_correct=False)
            ]
        )
        assert question.type == QuestionType.TRUE_FALSE
        assert len(question.options) == 2
        
        # Multiple choice question
        question = QuestionCreate(
            text="Which of these are primary colors?",
            type=QuestionType.MULTIPLE_CHOICE,
            options=[
                AnswerOptionCreate(text="Red", is_correct=True),
                AnswerOptionCreate(text="Green", is_correct=False),
                AnswerOptionCreate(text="Blue", is_correct=True),
                AnswerOptionCreate(text="Yellow", is_correct=True)
            ]
        )
        assert question.type == QuestionType.MULTIPLE_CHOICE
        assert len(question.options) == 4
        assert sum(1 for o in question.options if o.is_correct) == 3
    
    def test_question_validation_rules(self):
        """Test validation rules for questions"""
        # Single choice must have exactly one correct answer
        with pytest.raises(ValidationError) as excinfo:
            QuestionCreate(
                text="What is the capital of France?",
                type=QuestionType.SINGLE_CHOICE,
                options=[
                    AnswerOptionCreate(text="London", is_correct=False),
                    AnswerOptionCreate(text="Paris", is_correct=True),
                    AnswerOptionCreate(text="Berlin", is_correct=True)
                ]
            )
        assert "exactly one correct answer" in str(excinfo.value)
        
        # True/False must have exactly two options
        with pytest.raises(ValidationError) as excinfo:
            QuestionCreate(
                text="Paris is the capital of France",
                type=QuestionType.TRUE_FALSE,
                options=[
                    AnswerOptionCreate(text="True", is_correct=True),
                    AnswerOptionCreate(text="False", is_correct=False),
                    AnswerOptionCreate(text="Maybe", is_correct=False)
                ]
            )
        assert "exactly two options" in str(excinfo.value)
        
        # Multiple choice must have at least one correct answer
        with pytest.raises(ValidationError) as excinfo:
            QuestionCreate(
                text="Which of these are primary colors?",
                type=QuestionType.MULTIPLE_CHOICE,
                options=[
                    AnswerOptionCreate(text="Red", is_correct=False),
                    AnswerOptionCreate(text="Green", is_correct=False),
                    AnswerOptionCreate(text="Purple", is_correct=False)
                ]
            )
        assert "at least one correct answer" in str(excinfo.value)
        
        # Must have at least two options
        with pytest.raises(ValidationError):
            QuestionCreate(
                text="What is the capital of France?",
                type=QuestionType.SINGLE_CHOICE,
                options=[
                    AnswerOptionCreate(text="Paris", is_correct=True)
                ]
            )

class TestQuiz:
    """Test suite for Quiz model"""
    
    def test_quiz_create_valid(self):
        """Test creating valid quizzes"""
        # Basic quiz
        quiz = QuizCreate(
            title="Geography Quiz",
            subject="Geography",
            questions=[
                QuestionCreate(
                    text="What is the capital of France?",
                    type=QuestionType.SINGLE_CHOICE,
                    options=[
                        AnswerOptionCreate(text="London", is_correct=False),
                        AnswerOptionCreate(text="Paris", is_correct=True),
                        AnswerOptionCreate(text="Berlin", is_correct=False)
                    ]
                )
            ]
        )
        assert quiz.title == "Geography Quiz"
        assert quiz.subject == "Geography"
        assert len(quiz.questions) == 1
        
        # Quiz with all fields
        quiz = QuizCreate(
            title="Comprehensive Quiz",
            description="A detailed quiz on various topics",
            subject="General Knowledge",
            year_level=8,
            time_limit=30,
            randomize_questions=True,
            randomize_options=True,
            pass_score=70,
            tags=["general", "knowledge", "mixed"],
            status=QuizStatus.DRAFT,
            questions=[
                QuestionCreate(
                    text="Question 1",
                    type=QuestionType.SINGLE_CHOICE,
                    options=[
                        AnswerOptionCreate(text="A", is_correct=False),
                        AnswerOptionCreate(text="B", is_correct=True)
                    ]
                ),
                QuestionCreate(
                    text="Question 2",
                    type=QuestionType.TRUE_FALSE,
                    options=[
                        AnswerOptionCreate(text="True", is_correct=True),
                        AnswerOptionCreate(text="False", is_correct=False)
                    ]
                )
            ]
        )
        assert quiz.title == "Comprehensive Quiz"
        assert quiz.description == "A detailed quiz on various topics"
        assert quiz.year_level == 8
        assert quiz.time_limit == 30
        assert quiz.randomize_questions is True
        assert quiz.randomize_options is True
        assert quiz.pass_score == 70
        assert len(quiz.tags) == 3
        assert quiz.status == QuizStatus.DRAFT
        assert len(quiz.questions) == 2
    
    def test_quiz_validation_rules(self):
        """Test validation rules for quizzes"""
        # Title too short
        with pytest.raises(ValidationError):
            QuizCreate(
                title="QZ",  # Less than 3 chars
                subject="Geography",
                questions=[
                    QuestionCreate(
                        text="Question 1",
                        type=QuestionType.SINGLE_CHOICE,
                        options=[
                            AnswerOptionCreate(text="A", is_correct=False),
                            AnswerOptionCreate(text="B", is_correct=True)
                        ]
                    )
                ]
            )
        
        # Invalid year level
        with pytest.raises(ValidationError):
            QuizCreate(
                title="Geography Quiz",
                subject="Geography",
                year_level=15,  # Invalid: must be 1-10
                questions=[
                    QuestionCreate(
                        text="Question 1",
                        type=QuestionType.SINGLE_CHOICE,
                        options=[
                            AnswerOptionCreate(text="A", is_correct=False),
                            AnswerOptionCreate(text="B", is_correct=True)
                        ]
                    )
                ]
            )
        
        # No questions
        with pytest.raises(ValidationError):
            QuizCreate(
                title="Geography Quiz",
                subject="Geography",
                questions=[]  # Empty questions list
            )
        
        # Invalid pass score
        with pytest.raises(ValidationError):
            QuizCreate(
                title="Geography Quiz",
                subject="Geography",
                pass_score=110,  # Invalid: must be 0-100
                questions=[
                    QuestionCreate(
                        text="Question 1",
                        type=QuestionType.SINGLE_CHOICE,
                        options=[
                            AnswerOptionCreate(text="A", is_correct=False),
                            AnswerOptionCreate(text="B", is_correct=True)
                        ]
                    )
                ]
            )