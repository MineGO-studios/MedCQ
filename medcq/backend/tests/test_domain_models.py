# backend/tests/test_domain_models.py

import pytest
from datetime import datetime
from app.schemas.domain import (
    QuestionType, 
    QuizStatus, 
    AnswerOptionCreate, 
    QuestionCreate, 
    QuizCreate
)
from pydantic import ValidationError

def test_answer_option_create_valid():
    """Test that a valid answer option can be created."""
    option = AnswerOptionCreate(
        text="This is a correct answer",
        is_correct=True,
        explanation="This is why it's correct"
    )
    assert option.text == "This is a correct answer"
    assert option.is_correct is True
    assert option.explanation == "This is why it's correct"


def test_answer_option_create_minimal():
    """Test that a minimal answer option can be created."""
    option = AnswerOptionCreate(text="An answer")
    assert option.text == "An answer"
    assert option.is_correct is False
    assert option.explanation is None


def test_answer_option_create_invalid():
    """Test that invalid answer options are rejected."""
    # Empty text
    with pytest.raises(ValidationError):
        AnswerOptionCreate(text="")
    
    # Text too long
    with pytest.raises(ValidationError):
        AnswerOptionCreate(text="A" * 501)


def test_question_create_valid():
    """Test that a valid question can be created."""
    question = QuestionCreate(
        text="What is the capital of France?",
        explanation="This is a geography question",
        type=QuestionType.SINGLE_CHOICE,
        options=[
            AnswerOptionCreate(text="London", is_correct=False),
            AnswerOptionCreate(text="Paris", is_correct=True),
            AnswerOptionCreate(text="Berlin", is_correct=False),
            AnswerOptionCreate(text="Madrid", is_correct=False)
        ],
        tags=["geography", "europe"],
        difficulty=2
    )
    assert question.text == "What is the capital of France?"
    assert question.explanation == "This is a geography question"
    assert question.type == QuestionType.SINGLE_CHOICE
    assert len(question.options) == 4
    assert question.options[1].is_correct is True
    assert question.tags == ["geography", "europe"]
    assert question.difficulty == 2


def test_question_create_single_choice_validation():
    """Test that single choice questions must have exactly one correct answer."""
    # No correct answers
    with pytest.raises(ValidationError) as exc_info:
        QuestionCreate(
            text="What is the capital of France?",
            type=QuestionType.SINGLE_CHOICE,
            options=[
                AnswerOptionCreate(text="London", is_correct=False),
                AnswerOptionCreate(text="Paris", is_correct=False)
            ]
        )
    assert "exactly one correct answer" in str(exc_info.value)
    
    # Multiple correct answers
    with pytest.raises(ValidationError) as exc_info:
        QuestionCreate(
            text="What is the capital of France?",
            type=QuestionType.SINGLE_CHOICE,
            options=[
                AnswerOptionCreate(text="London", is_correct=True),
                AnswerOptionCreate(text="Paris", is_correct=True)
            ]
        )
    assert "exactly one correct answer" in str(exc_info.value)


def test_question_create_true_false_validation():
    """Test that true/false questions must have exactly two options with one correct."""
    # Correct structure
    question = QuestionCreate(
        text="Paris is the capital of France",
        type=QuestionType.TRUE_FALSE,
        options=[
            AnswerOptionCreate(text="True", is_correct=True),
            AnswerOptionCreate(text="False", is_correct=False)
        ]
    )
    assert len(question.options) == 2
    
    # Too many options
    with pytest.raises(ValidationError) as exc_info:
        QuestionCreate(
            text="Paris is the capital of France",
            type=QuestionType.TRUE_FALSE,
            options=[
                AnswerOptionCreate(text="True", is_correct=True),
                AnswerOptionCreate(text="False", is_correct=False),
                AnswerOptionCreate(text="Maybe", is_correct=False)
            ]
        )
    assert "exactly two options" in str(exc_info.value)


def test_quiz_create_valid():
    """Test that a valid quiz can be created."""
    quiz = QuizCreate(
        title="Geography Quiz",
        description="Test your knowledge of world capitals",
        subject="Geography",
        year_level=5,
        time_limit=30,
        randomize_questions=True,
        randomize_options=False,
        pass_score=70,
        tags=["geography", "capitals", "beginner"],
        status=QuizStatus.DRAFT,
        questions=[
            QuestionCreate(
                text="What is the capital of France?",
                type=QuestionType.SINGLE_CHOICE,
                options=[
                    AnswerOptionCreate(text="London", is_correct=False),
                    AnswerOptionCreate(text="Paris", is_correct=True),
                    AnswerOptionCreate(text="Berlin", is_correct=False),
                    AnswerOptionCreate(text="Madrid", is_correct=False)
                ]
            ),
            QuestionCreate(
                text="Rome is the capital of Italy",
                type=QuestionType.TRUE_FALSE,
                options=[
                    AnswerOptionCreate(text="True", is_correct=True),
                    AnswerOptionCreate(text="False", is_correct=False)
                ]
            )
        ]
    )
    assert quiz.title == "Geography Quiz"
    assert quiz.subject == "Geography"
    assert quiz.year_level == 5
    assert quiz.time_limit == 30
    assert quiz.randomize_questions is True
    assert quiz.randomize_options is False
    assert quiz.pass_score == 70
    assert quiz.status == QuizStatus.DRAFT
    assert len(quiz.questions) == 2
    assert quiz.questions[0].type == QuestionType.SINGLE_CHOICE
    assert quiz.questions[1].type == QuestionType.TRUE_FALSE


def test_quiz_create_validation():
    """Test quiz creation validation rules."""
    # Title too short
    with pytest.raises(ValidationError):
        QuizCreate(
            title="AB",
            subject="Geography",
            questions=[
                QuestionCreate(
                    text="What is the capital of France?",
                    type=QuestionType.SINGLE_CHOICE,
                    options=[
                        AnswerOptionCreate(text="Paris", is_correct=True),
                        AnswerOptionCreate(text="London", is_correct=False)
                    ]
                )
            ]
        )
    
    # Invalid year level
    with pytest.raises(ValidationError):
        QuizCreate(
            title="Geography Quiz",
            subject="Geography",
            year_level=15,
            questions=[
                QuestionCreate(
                    text="What is the capital of France?",
                    type=QuestionType.SINGLE_CHOICE,
                    options=[
                        AnswerOptionCreate(text="Paris", is_correct=True),
                        AnswerOptionCreate(text="London", is_correct=False)
                    ]
                )
            ]
        )
    
    # No questions
    with pytest.raises(ValidationError):
        QuizCreate(
            title="Geography Quiz",
            subject="Geography",
            questions=[]
        )