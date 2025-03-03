# backend/app/services/quiz_service.py

from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
import uuid
from datetime import datetime

from app.schemas.domain import Quiz, QuizSummary, QuizCreate, QuizUpdate
from app.schemas.api import PaginatedResponse, QuizListParams
from app.db.supabase import supabase_client

class QuizService:
    """Service class for quiz-related business logic."""
    
    async def get_quizzes(self, params: QuizListParams) -> PaginatedResponse:
        """
        Get a paginated list of quizzes with optional filtering.
        
        Args:
            params: Query parameters for filtering and pagination
            
        Returns:
            Paginated response with quiz summaries
        """
        try:
            # Build the base query
            query = supabase_client.from_("quizzes").select(
                """
                id, 
                title, 
                description, 
                subject_id, 
                year_level, 
                time_limit_minutes,
                status,
                created_at, 
                updated_at, 
                created_by,
                subjects:subject_id (name)
                """
            )
            
            # Apply filters
            if params.subject:
                # First get the subject ID
                subject_resp = supabase_client.from_("subjects").select("id").eq("name", params.subject).execute()
                if subject_resp.data and len(subject_resp.data) > 0:
                    query = query.eq("subject_id", subject_resp.data[0]["id"])
            
            if params.year_level:
                query = query.eq("year_level", params.year_level)
                
            if params.status:
                query = query.eq("status", params.status)
                
            if params.search:
                query = query.or_(f"title.ilike.%{params.search}%,description.ilike.%{params.search}%")
                
            if params.created_by:
                query = query.eq("created_by", params.created_by)
            
            # Get total count for pagination
            count_resp = query.execute(count="exact")
            total = count_resp.count if hasattr(count_resp, "count") else 0
            
            # Apply pagination
            page = params.page or 1
            limit = params.limit or 10
            offset = (page - 1) * limit
            
            # Apply sorting
            if params.sort:
                order = params.order or "asc"
                ascending = order != "desc"
                query = query.order(params.sort, ascending=ascending)
            else:
                # Default sort by created_at descending
                query = query.order("created_at", ascending=False)
            
            # Execute the query with pagination
            response = query.range(offset, offset + limit - 1).execute()
            
            if response.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error: {response.error.message}"
                )
            
            # Process the results
            quiz_summaries = []
            for item in response.data:
                # Get question count
                question_count_resp = supabase_client.from_("questions").select(
                    "id", count="exact"
                ).eq("quiz_id", item["id"]).execute()
                
                question_count = question_count_resp.count if hasattr(question_count_resp, "count") else 0
                
                # Get tags
                tags_resp = supabase_client.from_("quiz_tags").select(
                    "tags:tag_id (name)"
                ).eq("quiz_id", item["id"]).execute()
                
                tags = []
                if tags_resp.data:
                    for tag_item in tags_resp.data:
                        if tag_item.get("tags") and tag_item["tags"].get("name"):
                            tags.append(tag_item["tags"]["name"])
                
                # Create quiz summary
                quiz_summaries.append(QuizSummary(
                    id=item["id"],
                    title=item["title"],
                    description=item.get("description"),
                    subject=item["subjects"]["name"] if item.get("subjects") else "Unknown",
                    year_level=item.get("year_level"),
                    time_limit=item.get("time_limit_minutes"),
                    randomize_questions=item.get("randomize_questions", False),
                    randomize_options=item.get("randomize_options", False),
                    pass_score=item.get("pass_score"),
                    tags=tags,
                    status=item.get("status", "draft"),
                    question_count=question_count,
                    created_by=item["created_by"],
                    created_at=item["created_at"],
                    updated_at=item.get("updated_at")
                ))
            
            # Construct the paginated response
            return PaginatedResponse[QuizSummary](
                items=quiz_summaries,
                total=total,
                page=page,
                limit=limit,
                total_pages=(total + limit - 1) // limit
            )
        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get quizzes: {str(e)}"
            )
    
    async def get_quiz_by_id(self, quiz_id: str) -> Optional[Quiz]:
        """
        Get a specific quiz by ID with all questions and options.
        
        Args:
            quiz_id: The ID of the quiz to retrieve
            
        Returns:
            Complete quiz data or None if not found
        """
        try:
            # Get the quiz base data
            quiz_resp = supabase_client.from_("quizzes").select(
                """
                id, 
                title, 
                description, 
                subject_id, 
                year_level, 
                time_limit_minutes,
                randomize_questions,
                randomize_options,
                pass_score,
                status,
                created_at, 
                updated_at, 
                created_by,
                subjects:subject_id (name)
                """
            ).eq("id", quiz_id).single().execute()
            
            if quiz_resp.error:
                if quiz_resp.error.code == "PGRST116":  # Record not found
                    return None
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error: {quiz_resp.error.message}"
                )
            
            quiz_data = quiz_resp.data
            
            # Get tags
            tags_resp = supabase_client.from_("quiz_tags").select(
                "tags:tag_id (name)"
            ).eq("quiz_id", quiz_id).execute()
            
            tags = []
            if tags_resp.data:
                for tag_item in tags_resp.data:
                    if tag_item.get("tags") and tag_item["tags"].get("name"):
                        tags.append(tag_item["tags"]["name"])
            
            # Get questions
            questions_resp = supabase_client.from_("questions").select(
                """
                id,
                text,
                explanation,
                type,
                order_index,
                tags,
                difficulty,
                created_at,
                updated_at
                """
            ).eq("quiz_id", quiz_id).order("order_index").execute()
            
            if questions_resp.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error: {questions_resp.error.message}"
                )
            
            # Process questions and get options for each
            questions = []
            for question_data in questions_resp.data:
                # Get options for this question
                options_resp = supabase_client.from_("answer_options").select(
                    """
                    id,
                    text,
                    is_correct,
                    explanation,
                    order_index
                    """
                ).eq("question_id", question_data["id"]).order("order_index").execute()
                
                if options_resp.error:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Database error: {options_resp.error.message}"
                    )
                
                # Map options to domain model
                options = []
                for option_data in options_resp.data:
                    options.append({
                        "id": option_data["id"],
                        "text": option_data["text"],
                        "is_correct": option_data["is_correct"],
                        "explanation": option_data.get("explanation"),
                        "order_index": option_data["order_index"]
                    })
                
                # Add question with options
                questions.append({
                    "id": question_data["id"],
                    "text": question_data["text"],
                    "explanation": question_data.get("explanation"),
                    "type": question_data["type"],
                    "options": options,
                    "tags": question_data.get("tags", []),
                    "difficulty": question_data.get("difficulty"),
                    "order_index": question_data["order_index"],
                    "created_at": question_data["created_at"],
                    "updated_at": question_data.get("updated_at")
                })
            
            # Construct the complete quiz
            return Quiz(
                id=quiz_data["id"],
                title=quiz_data["title"],
                description=quiz_data.get("description"),
                subject=quiz_data["subjects"]["name"] if quiz_data.get("subjects") else "Unknown",
                year_level=quiz_data.get("year_level"),
                time_limit=quiz_data.get("time_limit_minutes"),
                randomize_questions=quiz_data.get("randomize_questions", False),
                randomize_options=quiz_data.get("randomize_options", False),
                pass_score=quiz_data.get("pass_score"),
                tags=tags,
                status=quiz_data.get("status", "draft"),
                questions=questions,
                question_count=len(questions),
                created_by=quiz_data["created_by"],
                created_at=quiz_data["created_at"],
                updated_at=quiz_data.get("updated_at")
            )
                
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get quiz: {str(e)}"
            )
    
    async def create_quiz(self, quiz_data: QuizCreate, user_id: str) -> Quiz:
        """
        Create a new quiz with questions and options.
        
        Args:
            quiz_data: The quiz data including questions and options
            user_id: ID of the user creating the quiz
            
        Returns:
            The created quiz
        """
        try:
            # 1. Get or create subject
            subject_id = await self._get_or_create_subject(quiz_data.subject)
            
            # 2. Create the quiz
            quiz_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            quiz_resp = supabase_client.from_("quizzes").insert({
                "id": quiz_id,
                "title": quiz_data.title,
                "description": quiz_data.description,
                "subject_id": subject_id,
                "year_level": quiz_data.year_level,
                "time_limit_minutes": quiz_data.time_limit,
                "randomize_questions": quiz_data.randomize_questions,
                "randomize_options": quiz_data.randomize_options,
                "pass_score": quiz_data.pass_score,
                "status": quiz_data.status,
                "created_by": user_id,
                "created_at": now,
                "updated_at": now
            }).execute()
            
            if quiz_resp.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create quiz: {quiz_resp.error.message}"
                )
            
            # 3. Process tags
            for tag_name in quiz_data.tags:
                tag_id = await self._get_or_create_tag(tag_name)
                
                # Create quiz-tag association
                tag_assoc_resp = supabase_client.from_("quiz_tags").insert({
                    "quiz_id": quiz_id,
                    "tag_id": tag_id
                }).execute()
                
                if tag_assoc_resp.error:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to associate tag: {tag_assoc_resp.error.message}"
                    )
            
            # 4. Create questions with options
            for i, question_data in enumerate(quiz_data.questions):
                question_id = str(uuid.uuid4())
                
                # Create question
                question_resp = supabase_client.from_("questions").insert({
                    "id": question_id,
                    "quiz_id": quiz_id,
                    "text": question_data.text,
                    "explanation": question_data.explanation,
                    "type": question_data.type,
                    "order_index": i,
                    "tags": question_data.tags,
                    "difficulty": question_data.difficulty,
                    "created_at": now,
                    "updated_at": now
                }).execute()
                
                if question_resp.error:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to create question: {question_resp.error.message}"
                    )
                
                # Create options
                for j, option_data in enumerate(question_data.options):
                    option_resp = supabase_client.from_("answer_options").insert({
                        "id": str(uuid.uuid4()),
                        "question_id": question_id,
                        "text": option_data.text,
                        "is_correct": option_data.is_correct,
                        "explanation": option_data.explanation,
                        "order_index": j,
                        "created_at": now,
                        "updated_at": now
                    }).execute()
                    
                    if option_resp.error:
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to create answer option: {option_resp.error.message}"
                        )
            
            # Return the created quiz
            created_quiz = await self.get_quiz_by_id(quiz_id)
            if not created_quiz:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Quiz was created but could not be retrieved"
                )
                
            return created_quiz
            
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create quiz: {str(e)}"
            )
    
    async def update_quiz(self, quiz_id: str, quiz_data: QuizUpdate, user_id: str) -> Quiz:
        """
        Update an existing quiz.
        
        Args:
            quiz_id: ID of the quiz to update
            quiz_data: Data to update
            user_id: ID of the user making the update
            
        Returns:
            Updated quiz
            
        Raises:
            ValueError: If quiz not found
            PermissionError: If user doesn't have permission
        """
        try:
            # Check if quiz exists and user has permission
            quiz_resp = supabase_client.from_("quizzes").select(
                "id, created_by"
            ).eq("id", quiz_id).single().execute()
            
            if quiz_resp.error:
                if quiz_resp.error.code == "PGRST116":  # Record not found
                    raise ValueError(f"Quiz not found: {quiz_id}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error: {quiz_resp.error.message}"
                )
            
            quiz_data_db = quiz_resp.data
            
            # Check permission
            if quiz_data_db["created_by"] != user_id:
                # TODO: Add admin role check
                raise PermissionError("You do not have permission to update this quiz")
            
            # Build update object
            update_data = {"updated_at": datetime.utcnow().isoformat()}
            
            if quiz_data.title is not None:
                update_data["title"] = quiz_data.title
            
            if quiz_data.description is not None:
                update_data["description"] = quiz_data.description
            
            if quiz_data.year_level is not None:
                update_data["year_level"] = quiz_data.year_level
                
            if quiz_data.time_limit is not None:
                update_data["time_limit_minutes"] = quiz_data.time_limit
                
            if quiz_data.randomize_questions is not None:
                update_data["randomize_questions"] = quiz_data.randomize_questions
                
            if quiz_data.randomize_options is not None:
                update_data["randomize_options"] = quiz_data.randomize_options
                
            if quiz_data.pass_score is not None:
                update_data["pass_score"] = quiz_data.pass_score
                
            if quiz_data.status is not None:
                update_data["status"] = quiz_data.status
            
            # Handle subject update
            if quiz_data.subject is not None:
                subject_id = await self._get_or_create_subject(quiz_data.subject)
                update_data["subject_id"] = subject_id
            
            # Update quiz
            update_resp = supabase_client.from_("quizzes").update(
                update_data
            ).eq("id", quiz_id).execute()
            
            if update_resp.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to update quiz: {update_resp.error.message}"
                )
            
            # Handle tags update
            if quiz_data.tags is not None:
                # Delete existing associations
                delete_tags_resp = supabase_client.from_("quiz_tags").delete().eq(
                    "quiz_id", quiz_id
                ).execute()
                
                if delete_tags_resp.error:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to update tags: {delete_tags_resp.error.message}"
                    )
                
                # Create new associations
                for tag_name in quiz_data.tags:
                    tag_id = await self._get_or_create_tag(tag_name)
                    
                    tag_assoc_resp = supabase_client.from_("quiz_tags").insert({
                        "quiz_id": quiz_id,
                        "tag_id": tag_id
                    }).execute()
                    
                    if tag_assoc_resp.error:
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to associate tag: {tag_assoc_resp.error.message}"
                        )
            
            # Return updated quiz
            updated_quiz = await self.get_quiz_by_id(quiz_id)
            if not updated_quiz:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Quiz was updated but could not be retrieved"
                )
                
            return updated_quiz
            
        except ValueError:
            # Re-raise ValueError exceptions
            raise
        except PermissionError:
            # Re-raise PermissionError exceptions
            raise
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update quiz: {str(e)}"
            )
    
    async def delete_quiz(self, quiz_id: str, user_id: str) -> bool:
        """
        Delete a quiz and all associated data.
        
        Args:
            quiz_id: ID of the quiz to delete
            user_id: ID of the user making the deletion
            
        Returns:
            True if successful
            
        Raises:
            PermissionError: If user doesn't have permission
        """
        try:
            # Check if quiz exists and user has permission
            quiz_resp = supabase_client.from_("quizzes").select(
                "id, created_by"
            ).eq("id", quiz_id).single().execute()
            
            if quiz_resp.error:
                if quiz_resp.error.code == "PGRST116":  # Record not found
                    return False
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error: {quiz_resp.error.message}"
                )
            
            quiz_data = quiz_resp.data
            
            # Check permission
            if quiz_data["created_by"] != user_id:
                # TODO: Add admin role check
                raise PermissionError("You do not have permission to delete this quiz")
            
            # Delete the quiz (cascade will handle related entities)
            delete_resp = supabase_client.from_("quizzes").delete().eq(
                "id", quiz_id
            ).execute()
            
            if delete_resp.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to delete quiz: {delete_resp.error.message}"
                )
            
            return True
            
        except PermissionError:
            # Re-raise PermissionError exceptions
            raise
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete quiz: {str(e)}"
            )
    
    # Helper methods
    
    async def _get_or_create_subject(self, subject_name: str) -> str:
        """Get or create a subject and return its ID."""
        # Check if subject exists
        subject_resp = supabase_client.from_("subjects").select(
            "id"
        ).eq("name", subject_name).single().execute()
        
        if not subject_resp.error:
            # Subject exists
            return subject_resp.data["id"]
        
        if subject_resp.error.code != "PGRST116":  # Not a "not found" error
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {subject_resp.error.message}"
            )
        
        # Create new subject
        subject_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        create_resp = supabase_client.from_("subjects").insert({
            "id": subject_id,
            "name": subject_name,
            "created_at": now,
            "updated_at": now
        }).execute()
        
        if create_resp.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create subject: {create_resp.error.message}"
            )
        
        return subject_id
    
    async def _get_or_create_tag(self, tag_name: str) -> str:
        """Get or create a tag and return its ID."""
        # Check if tag exists
        tag_resp = supabase_client.from_("tags").select(
            "id"
        ).eq("name", tag_name).single().execute()
        
        if not tag_resp.error:
            # Tag exists
            return tag_resp.data["id"]
        
        if tag_resp.error.code != "PGRST116":  # Not a "not found" error
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {tag_resp.error.message}"
            )
        
        # Create new tag
        tag_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        create_resp = supabase_client.from_("tags").insert({
            "id": tag_id,
            "name": tag_name,
            "created_at": now
        }).execute()
        
        if create_resp.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create tag: {create_resp.error.message}"
            )
        
        return tag_id


# Singleton instance
quiz_service = QuizService()