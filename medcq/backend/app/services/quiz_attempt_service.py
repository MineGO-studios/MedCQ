# backend/app/services/quiz_attempt_service.py

from typing import Dict, List, Optional, Union, Any
from datetime import datetime, timedelta
import uuid
from fastapi import HTTPException, status

from app.schemas.domain import Quiz, QuestionType
from app.schemas.attempt import (
    QuizAttemptResponse, 
    QuizResultDetail, 
    QuestionResult,
    UserQuizHistory,
    UserStrengthWeakness
)
from app.services.quiz_service import quiz_service
from app.db.supabase import supabase_client

class QuizAttemptService:
    """Service for quiz attempt management."""
    
    async def start_quiz_attempt(self, quiz_id: str, user_id: str) -> QuizAttemptResponse:
        """
        Start a new quiz attempt.
        
        Args:
            quiz_id: ID of the quiz to attempt
            user_id: ID of the user making the attempt
            
        Returns:
            Quiz attempt response with quiz data
            
        Raises:
            HTTPException: If quiz not found or user does not have access
        """
        # Get the quiz
        quiz = await quiz_service.get_quiz_by_id(quiz_id)
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quiz with ID {quiz_id} not found"
            )
        
        # For non-public quizzes, check if user has access
        if quiz.status != "published":
            # Check if user is the creator or has admin rights
            if quiz.created_by != user_id:
                # TODO: Check if user has admin role
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have access to this quiz"
                )
        
        # Create a new attempt
        attempt_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Calculate expiration if time limit is set
        expires_at = None
        if quiz.time_limit:
            expires_at = now + timedelta(minutes=quiz.time_limit)
        
        # Create the attempt record
        attempt_resp = supabase_client.from_("quiz_attempts").insert({
            "id": attempt_id,
            "quiz_id": quiz_id,
            "user_id": user_id,
            "started_at": now.isoformat(),
            "expires_at": expires_at.isoformat() if expires_at else None,
            "status": "in_progress"
        }).execute()
        
        if attempt_resp.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create quiz attempt: {attempt_resp.error.message}"
            )
        
        # Apply randomization if specified
        if quiz.randomize_questions:
            # Shuffle questions
            import random
            quiz.questions = random.sample(quiz.questions, len(quiz.questions))
            
            # Update order index
            for i, question in enumerate(quiz.questions):
                question.order_index = i
        
        if quiz.randomize_options:
            # Shuffle options for each question
            import random
            for question in quiz.questions:
                question.options = random.sample(question.options, len(question.options))
                
                # Update order index
                for i, option in enumerate(question.options):
                    option.order_index = i
        
        # Create response
        return QuizAttemptResponse(
            attempt_id=attempt_id,
            quiz_id=quiz_id,
            started_at=now,
            expires_at=expires_at,
            quiz=quiz
        )
    
    async def submit_quiz_attempt(
        self, 
        attempt_id: str, 
        user_id: str, 
        answers: Dict[str, Union[str, List[str]]], 
        time_taken_seconds: int
    ) -> QuizResultDetail:
        """
        Submit answers for a quiz attempt.
        
        Args:
            attempt_id: ID of the quiz attempt
            user_id: ID of the user submitting the attempt
            answers: Map of question ID to selected answer ID(s)
            time_taken_seconds: Total time taken in seconds
            
        Returns:
            Detailed quiz result
            
        Raises:
            HTTPException: If attempt not found, already completed, or expired
        """
        # Get the attempt
        attempt_resp = supabase_client.from_("quiz_attempts").select(
            "id, quiz_id, user_id, started_at, expires_at, status"
        ).eq("id", attempt_id).single().execute()
        
        if attempt_resp.error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quiz attempt with ID {attempt_id} not found"
            )
        
        attempt_data = attempt_resp.data
        
        # Check if attempt belongs to user
        if attempt_data["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to submit this attempt"
            )
        
        # Check if attempt is already completed
        if attempt_data["status"] != "in_progress":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This quiz attempt has already been completed"
            )
        
        # Check if attempt has expired
        if attempt_data["expires_at"]:
            expires_at = datetime.fromisoformat(attempt_data["expires_at"].replace('Z', '+00:00'))
            if datetime.utcnow() > expires_at:
                # Update attempt status to expired
                supabase_client.from_("quiz_attempts").update({
                    "status": "expired"
                }).eq("id", attempt_id).execute()
                
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This quiz attempt has expired"
                )
        
        # Get the quiz
        quiz_id = attempt_data["quiz_id"]
        quiz = await quiz_service.get_quiz_by_id(quiz_id)
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quiz with ID {quiz_id} not found"
            )
        
        # Calculate score and generate question results
        now = datetime.utcnow()
        question_results, points_earned, points_possible = await self._calculate_results(
            quiz, answers
        )
        
        # Calculate percentage score
        score_percentage = (points_earned / points_possible * 100) if points_possible > 0 else 0
        
        # Determine if passed based on pass score
        passed = False
        if quiz.pass_score is not None:
            passed = score_percentage >= quiz.pass_score
        
        # Update attempt record with results
        update_resp = supabase_client.from_("quiz_attempts").update({
            "completed_at": now.isoformat(),
            "time_taken_seconds": time_taken_seconds,
            "score": score_percentage,
            "points_earned": points_earned,
            "points_possible": points_possible,
            "status": "completed",
            "passed": passed
        }).eq("id", attempt_id).execute()
        
        if update_resp.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update quiz attempt: {update_resp.error.message}"
            )
        
        # Store individual question results
        for result in question_results:
            result_resp = supabase_client.from_("question_results").insert({
                "attempt_id": attempt_id,
                "question_id": result.question_id,
                "is_correct": result.is_correct,
                "points_earned": result.points_earned,
                "points_possible": result.points_possible,
                "selected_option_ids": result.selected_option_ids,
                "correct_option_ids": result.correct_option_ids
            }).execute()
            
            if result_resp.error:
                # Log error but continue
                print(f"Failed to store question result: {result_resp.error.message}")
        
        # Create and return detailed result
        return QuizResultDetail(
            attempt_id=attempt_id,
            quiz_id=quiz_id,
            quiz_title=quiz.title,
            user_id=user_id,
            score=score_percentage,
            points_earned=points_earned,
            points_possible=points_possible,
            time_taken_seconds=time_taken_seconds,
            started_at=datetime.fromisoformat(attempt_data["started_at"].replace('Z', '+00:00')),
            completed_at=now,
            passed=passed,
            question_results=question_results
        )
    
    async def get_quiz_result(self, attempt_id: str, user_id: str) -> QuizResultDetail:
        """
        Get detailed result for a quiz attempt.
        
        Args:
            attempt_id: ID of the quiz attempt
            user_id: ID of the user requesting the result
            
        Returns:
            Detailed quiz result
            
        Raises:
            HTTPException: If attempt not found or user doesn't have permission
        """
        # Get the attempt
        attempt_resp = supabase_client.from_("quiz_attempts").select(
            """
            id, 
            quiz_id, 
            user_id, 
            score,
            points_earned,
            points_possible,
            started_at, 
            completed_at,
            time_taken_seconds,
            status,
            passed,
            quizzes:quiz_id (title)
            """
        ).eq("id", attempt_id).single().execute()
        
        if attempt_resp.error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quiz attempt with ID {attempt_id} not found"
            )
        
        attempt_data = attempt_resp.data
        
        # Check if user has permission (attempt owner or quiz creator)
        if attempt_data["user_id"] != user_id:
            # Check if user is quiz creator
            quiz_resp = supabase_client.from_("quizzes").select(
                "created_by"
            ).eq("id", attempt_data["quiz_id"]).single().execute()
            
            if quiz_resp.error or quiz_resp.data["created_by"] != user_id:
                # TODO: Check if user has admin role
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have permission to view this attempt"
                )
        
        # Get question results
        question_results_resp = supabase_client.from_("question_results").select(
            """
            question_id,
            is_correct,
            points_earned,
            points_possible,
            selected_option_ids,
            correct_option_ids,
            questions:question_id (text, explanation)
            """
        ).eq("attempt_id", attempt_id).execute()
        
        if question_results_resp.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get question results: {question_results_resp.error.message}"
            )
        
        # Create question results objects
        question_results = []
        for result in question_results_resp.data:
            question_results.append(QuestionResult(
                question_id=result["question_id"],
                question_text=result["questions"]["text"],
                is_correct=result["is_correct"],
                points_earned=result["points_earned"],
                points_possible=result["points_possible"],
                selected_option_ids=result["selected_option_ids"],
                correct_option_ids=result["correct_option_ids"],
                explanation=result["questions"].get("explanation")
            ))
        
        # Create and return detailed result
        return QuizResultDetail(
            attempt_id=attempt_id,
            quiz_id=attempt_data["quiz_id"],
            quiz_title=attempt_data["quizzes"]["title"],
            user_id=attempt_data["user_id"],
            score=attempt_data["score"],
            points_earned=attempt_data["points_earned"],
            points_possible=attempt_data["points_possible"],
            time_taken_seconds=attempt_data["time_taken_seconds"],
            started_at=datetime.fromisoformat(attempt_data["started_at"].replace('Z', '+00:00')),
            completed_at=datetime.fromisoformat(attempt_data["completed_at"].replace('Z', '+00:00')),
            passed=attempt_data["passed"],
            question_results=question_results
        )
    
    async def get_user_quiz_history(self, user_id: str, limit: int = 20) -> UserQuizHistory:
        """
        Get user's quiz attempt history.
        
        Args:
            user_id: ID of the user
            limit: Maximum number of attempts to return
            
        Returns:
            User's quiz attempt history
        """
        # Get user's quiz attempts
        attempts_resp = supabase_client.from_("quiz_attempts").select(
            """
            id, 
            quiz_id, 
            score,
            points_earned,
            points_possible,
            started_at, 
            completed_at,
            time_taken_seconds,
            status,
            passed,
            quizzes:quiz_id (title)
            """
        ).eq("user_id", user_id).eq("status", "completed").order("completed_at", ascending=False).limit(limit).execute()
        
        if attempts_resp.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get quiz attempts: {attempts_resp.error.message}"
            )
        
        # Get detailed results for each attempt
        attempts = []
        for attempt_data in attempts_resp.data:
            try:
                result = await self.get_quiz_result(attempt_data["id"], user_id)
                attempts.append(result)
            except HTTPException:
                # Skip attempts that couldn't be retrieved
                continue
        
        # Calculate statistics
        total_attempts = len(attempts)
        total_score = sum(attempt.score for attempt in attempts)
        average_score = total_score / total_attempts if total_attempts > 0 else 0
        best_score = max((attempt.score for attempt in attempts), default=0)
        total_time_spent = sum(attempt.time_taken_seconds for attempt in attempts)
        
        return UserQuizHistory(
            attempts=attempts,
            total_attempts=total_attempts,
            average_score=average_score,
            best_score=best_score,
            total_time_spent_seconds=total_time_spent
        )
    
    async def get_user_strengths_weaknesses(self, user_id: str) -> UserStrengthWeakness:
        """
        Analyze user's strengths and weaknesses based on quiz history.
        
        Args:
            user_id: ID of the user
            
        Returns:
            Analysis of user's strengths and weaknesses
        """
        # Get all completed quiz attempts
        attempts_resp = supabase_client.from_("quiz_attempts").select(
            "id, quiz_id"
        ).eq("user_id", user_id).eq("status", "completed").execute()
        
        if attempts_resp.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get quiz attempts: {attempts_resp.error.message}"
            )
        
        # Get all question results for these attempts
        question_ids = []
        for attempt in attempts_resp.data:
            results_resp = supabase_client.from_("question_results").select(
                "question_id, is_correct"
            ).eq("attempt_id", attempt["id"]).execute()
            
            if results_resp.error:
                continue
            
            question_ids.extend([(r["question_id"], r["is_correct"]) for r in results_resp.data])
        
        if not question_ids:
            # No data available for analysis
            return UserStrengthWeakness(
                strong_subjects=[],
                weak_subjects=[],
                strong_tags=[],
                weak_tags=[],
                performance_by_question_type={}
            )
        
        # Get questions with subjects and tags
        questions_data = {}
        for question_id, is_correct in question_ids:
            if question_id in questions_data:
                questions_data[question_id]["count"] += 1
                questions_data[question_id]["correct"] += 1 if is_correct else 0
            else:
                # Get question data
                question_resp = supabase_client.from_("questions").select(
                    """
                    id,
                    type,
                    tags,
                    quizzes:quiz_id (subjects:subject_id (name))
                    """
                ).eq("id", question_id).single().execute()
                
                if question_resp.error:
                    continue
                
                question_data = question_resp.data
                
                questions_data[question_id] = {
                    "type": question_data["type"],
                    "tags": question_data.get("tags", []),
                    "subject": question_data["quizzes"]["subjects"]["name"] if question_data["quizzes"]["subjects"] else "Unknown",
                    "count": 1,
                    "correct": 1 if is_correct else 0
                }
        
        # Analyze by subject
        subjects = {}
        for qd in questions_data.values():
            subject = qd["subject"]
            if subject not in subjects:
                subjects[subject] = {"count": 0, "correct": 0}
            subjects[subject]["count"] += 1
            subjects[subject]["correct"] += qd["correct"]
        
        # Calculate percentages and rank subjects
        subject_scores = []
        for subject, data in subjects.items():
            if data["count"] > 0:
                score = (data["correct"] / data["count"]) * 100
                subject_scores.append({
                    "name": subject,
                    "score": score,
                    "questions_answered": data["count"],
                    "questions_correct": data["correct"]
                })
        
        # Sort by score
        subject_scores.sort(key=lambda x: x["score"], reverse=True)
        
        # Analyze by tag
        tags = {}
        for qd in questions_data.values():
            for tag in qd["tags"]:
                if tag not in tags:
                    tags[tag] = {"count": 0, "correct": 0}
                tags[tag]["count"] += 1
                tags[tag]["correct"] += qd["correct"]
        
        # Calculate percentages and rank tags
        tag_scores = []
        for tag, data in tags.items():
            if data["count"] > 0:
                score = (data["correct"] / data["count"]) * 100
                tag_scores.append({
                    "name": tag,
                    "score": score,
                    "questions_answered": data["count"],
                    "questions_correct": data["correct"]
                })
        
        # Sort by score
        tag_scores.sort(key=lambda x: x["score"], reverse=True)
        
        # Analyze by question type
        question_types = {}
        for qd in questions_data.values():
            q_type = qd["type"]
            if q_type not in question_types:
                question_types[q_type] = {"count": 0, "correct": 0}
            question_types[q_type]["count"] += 1
            question_types[q_type]["correct"] += qd["correct"]
        
        # Calculate percentages for question types
        type_scores = {}
        for q_type, data in question_types.items():
            if data["count"] > 0:
                score = (data["correct"] / data["count"]) * 100
                type_scores[q_type] = {
                    "score": score,
                    "questions_answered": data["count"],
                    "questions_correct": data["correct"]
                }
        
        # Determine strengths and weaknesses (top/bottom 3 or all if less than 6)
        strong_subjects = subject_scores[:3] if len(subject_scores) > 5 else subject_scores[:len(subject_scores)//2]
        weak_subjects = subject_scores[-3:] if len(subject_scores) > 5 else subject_scores[len(subject_scores)//2:]
        weak_subjects.reverse()  # Show worst first
        
        strong_tags = tag_scores[:3] if len(tag_scores) > 5 else tag_scores[:len(tag_scores)//2]
        weak_tags = tag_scores[-3:] if len(tag_scores) > 5 else tag_scores[len(tag_scores)//2:]
        weak_tags.reverse()  # Show worst first
        
        return UserStrengthWeakness(
            strong_subjects=strong_subjects,
            weak_subjects=weak_subjects,
            strong_tags=strong_tags,
            weak_tags=weak_tags,
            performance_by_question_type=type_scores
        )
    
    async def _calculate_results(
        self, 
        quiz: Quiz, 
        answers: Dict[str, Union[str, List[str]]]
    ) -> tuple[List[QuestionResult], float, float]:
        """
        Calculate results for a quiz attempt.
        
        Args:
            quiz: The quiz with questions and correct answers
            answers: Map of question ID to selected answer ID(s)
            
        Returns:
            Tuple of (question_results, points_earned, points_possible)
        """
        question_results = []
        total_points_earned = 0
        total_points_possible = 0
        
        # Create a map of question ID to question for easier lookup
        questions_map = {q.id: q for q in quiz.questions}
        
        # Process each question
        for question in quiz.questions:
            # Get user's answer for this question
            user_answer = answers.get(question.id, [])
            
            # Convert single string answer to list for consistent processing
            if isinstance(user_answer, str):
                user_answer = [user_answer]
            
            # Get correct answers for this question
            correct_answers = [opt.id for opt in question.options if opt.isCorrect]
            
            # Calculate points based on question type
            points_possible = 1.0  # Default point value per question
            points_earned = 0.0
            is_correct = False
            
            if question.type == QuestionType.SINGLE_CHOICE or question.type == QuestionType.TRUE_FALSE:
                # Single choice: all or nothing
                if len(user_answer) == 1 and user_answer[0] in correct_answers:
                    points_earned = points_possible
                    is_correct = True
                    
            elif question.type == QuestionType.MULTIPLE_CHOICE:
                # Multiple choice: partial credit possible
                if correct_answers:  # Avoid division by zero
                    # Calculate number of correct selections and incorrect selections
                    correct_selections = sum(1 for a in user_answer if a in correct_answers)
                    incorrect_selections = sum(1 for a in user_answer if a not in correct_answers)
                    
                    # Calculate points based on correct - incorrect with minimum of 0
                    points_per_option = points_possible / len(correct_answers)
                    raw_points = points_per_option * (correct_selections - incorrect_selections)
                    points_earned = max(0, raw_points)
                    
                    # Consider correct if at least half of available points were earned
                    is_correct = points_earned >= (points_possible / 2)
            
            elif question.type == QuestionType.MATCHING:
                # Matching: each correct pair gets equal points
                # Not implemented in this version
                pass
            
            # Add to totals
            total_points_earned += points_earned
            total_points_possible += points_possible
            
            # Create result object
            result = QuestionResult(
                question_id=question.id,
                question_text=question.text,
                is_correct=is_correct,
                points_earned=points_earned,
                points_possible=points_possible,
                selected_option_ids=user_answer,
                correct_option_ids=correct_answers,
                explanation=question.explanation
            )
            
            question_results.append(result)
        
        return question_results, total_points_earned, total_points_possible


# Create singleton instance
quiz_attempt_service = QuizAttemptService()