# backend/app/services/user_service.py

from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from fastapi import HTTPException, status

from app.schemas.user import (
    UserProfile, 
    UserProfileUpdate,
    UserPreferences,
    UserPreferencesUpdate,
    UserActivity,
    UserStats,
    UserWithStats,
    UserRole,
    SearchUsersParams
)
from app.schemas.api import PaginatedResponse
from app.services.quiz_attempt_service import quiz_attempt_service
from app.db.supabase import supabase_client

class UserService:
    """Service for user management."""
    
    async def get_user_profile(self, user_id: str) -> UserProfile:
        """
        Get a user profile by ID.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            User profile
            
        Raises:
            HTTPException: If user not found
        """
        try:
            # Get user profile from database
            profile_resp = supabase_client.from_("user_profiles").select(
                """
                id,
                email,
                display_name,
                photo_url,
                bio,
                profession,
                specialization,
                year_of_study,
                institution,
                location,
                website,
                social_links,
                roles,
                created_at,
                updated_at,
                last_active_at
                """
            ).eq("id", user_id).single().execute()
            
            if profile_resp.error:
                if profile_resp.error.code == "PGRST116":  # Record not found
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"User with ID {user_id} not found"
                    )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error: {profile_resp.error.message}"
                )
            
            profile_data = profile_resp.data
            
            # Convert to domain model
            return UserProfile(
                id=profile_data["id"],
                email=profile_data["email"],
                display_name=profile_data.get("display_name"),
                photo_url=profile_data.get("photo_url"),
                bio=profile_data.get("bio"),
                profession=profile_data.get("profession"),
                specialization=profile_data.get("specialization"),
                year_of_study=profile_data.get("year_of_study"),
                institution=profile_data.get("institution"),
                location=profile_data.get("location"),
                website=profile_data.get("website"),
                social_links=profile_data.get("social_links"),
                roles=profile_data.get("roles", [UserRole.STUDENT]),
                created_at=profile_data["created_at"],
                updated_at=profile_data.get("updated_at"),
                last_active_at=profile_data.get("last_active_at")
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get user profile: {str(e)}"
            )
    
    async def create_user_profile(self, user_data: Dict[str, Any]) -> UserProfile:
        """
        Create a new user profile.
        
        Args:
            user_data: User data including ID and email
            
        Returns:
            Created user profile
            
        Raises:
            HTTPException: If user creation fails
        """
        try:
            # Check if user already exists
            existing_resp = supabase_client.from_("user_profiles").select(
                "id"
            ).eq("id", user_data["id"]).single().execute()
            
            if not existing_resp.error:
                # User already exists, return existing profile
                return await self.get_user_profile(user_data["id"])
            
            if existing_resp.error.code != "PGRST116":  # Not a "not found" error
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error: {existing_resp.error.message}"
                )
            
            # Prepare user data
            now = datetime.utcnow().isoformat()
            profile_data = {
                "id": user_data["id"],
                "email": user_data["email"],
                "display_name": user_data.get("display_name"),
                "photo_url": user_data.get("photo_url"),
                "roles": [UserRole.STUDENT],  # Default role
                "created_at": now,
                "updated_at": now,
                "last_active_at": now
            }
            
            # Create user profile
            profile_resp = supabase_client.from_("user_profiles").insert(
                profile_data
            ).execute()
            
            if profile_resp.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create user profile: {profile_resp.error.message}"
                )
            
            # Create default preferences
            prefs_resp = supabase_client.from_("user_preferences").insert({
                "user_id": user_data["id"],
                "theme": "system",
                "email_notifications": True,
                "push_notifications": True,
                "study_reminders": True,
                "show_score_immediately": True,
                "show_explanations_with_results": True,
                "updated_at": now
            }).execute()
            
            if prefs_resp.error:
                # Log error but continue
                print(f"Failed to create user preferences: {prefs_resp.error.message}")
            
            # Initialize user stats
            stats_resp = supabase_client.from_("user_stats").insert({
                "user_id": user_data["id"],
                "quizzes_created": 0,
                "quizzes_completed": 0,
                "quizzes_passed": 0,
                "total_questions": 0,
                "correct_answers": 0,
                "average_score": 0.0,
                "total_time_spent": 0,
                "last_updated": now
            }).execute()
            
            if stats_resp.error:
                # Log error but continue
                print(f"Failed to create user stats: {stats_resp.error.message}")
            
            # Log activity
            await self.log_activity(
                user_data["id"],
                "login",
                {"message": "Initial account creation"},
                user_data.get("ip_address"),
                user_data.get("user_agent")
            )
            
            # Return created profile
            return await self.get_user_profile(user_data["id"])
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user profile: {str(e)}"
            )
    
    async def update_user_profile(self, user_id: str, profile_data: UserProfileUpdate) -> UserProfile:
        """
        Update a user profile.
        
        Args:
            user_id: The ID of the user to update
            profile_data: User profile data to update
            
        Returns:
            Updated user profile
            
        Raises:
            HTTPException: If user not found or update fails
        """
        try:
            # Check if user exists
            await self.get_user_profile(user_id)
            
            # Prepare update data
            update_data = profile_data.dict(exclude_unset=True)
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            # Update user profile
            update_resp = supabase_client.from_("user_profiles").update(
                update_data
            ).eq("id", user_id).execute()
            
            if update_resp.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to update user profile: {update_resp.error.message}"
                )
            
            # Log activity
            await self.log_activity(
                user_id,
                "profile_update",
                {"fields": list(update_data.keys())}
            )
            
            # Return updated profile
            return await self.get_user_profile(user_id)
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update user profile: {str(e)}"
            )
    
    async def get_user_preferences(self, user_id: str) -> UserPreferences:
        """
        Get user preferences.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            User preferences
            
        Raises:
            HTTPException: If preferences not found
        """
        try:
            # Get user preferences from database
            prefs_resp = supabase_client.from_("user_preferences").select(
                """
                user_id,
                theme,
                email_notifications,
                push_notifications,
                study_reminders,
                show_score_immediately,
                show_explanations_with_results,
                default_quiz_time_limit,
                default_subject_filter,
                updated_at
                """
            ).eq("user_id", user_id).single().execute()
            
            if prefs_resp.error:
                if prefs_resp.error.code == "PGRST116":  # Record not found
                    # Create default preferences
                    return await self.create_default_preferences(user_id)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error: {prefs_resp.error.message}"
                )
            
            prefs_data = prefs_resp.data
            
            # Convert to domain model
            return UserPreferences(
                user_id=prefs_data["user_id"],
                theme=prefs_data["theme"],
                email_notifications=prefs_data["email_notifications"],
                push_notifications=prefs_data["push_notifications"],
                study_reminders=prefs_data["study_reminders"],
                show_score_immediately=prefs_data["show_score_immediately"],
                show_explanations_with_results=prefs_data["show_explanations_with_results"],
                default_quiz_time_limit=prefs_data.get("default_quiz_time_limit"),
                default_subject_filter=prefs_data.get("default_subject_filter"),
                updated_at=prefs_data["updated_at"]
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get user preferences: {str(e)}"
            )
    
    async def update_user_preferences(self, user_id: str, prefs_data: UserPreferencesUpdate) -> UserPreferences:
        """
        Update user preferences.
        
        Args:
            user_id: The ID of the user
            prefs_data: Preferences data to update
            
        Returns:
            Updated user preferences
            
        Raises:
            HTTPException: If update fails
        """
        try:
            # Check if preferences exist
            try:
                await self.get_user_preferences(user_id)
            except HTTPException as e:
                if e.status_code == status.HTTP_404_NOT_FOUND:
                    # Create default preferences first
                    await self.create_default_preferences(user_id)
                else:
                    raise
            
            # Prepare update data
            update_data = prefs_data.dict(exclude_unset=True)
            update_data["updated_at"] = datetime.utcnow().isoformat()
            
            # Update preferences
            update_resp = supabase_client.from_("user_preferences").update(
                update_data
            ).eq("user_id", user_id).execute()
            
            if update_resp.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to update user preferences: {update_resp.error.message}"
                )
            
            # Return updated preferences
            return await self.get_user_preferences(user_id)
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update user preferences: {str(e)}"
            )
    
    async def get_user_stats(self, user_id: str) -> UserStats:
        """
        Get user statistics.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            User statistics
            
        Raises:
            HTTPException: If stats not found
        """
        try:
            # Get user stats from database
            stats_resp = supabase_client.from_("user_stats").select(
                """
                user_id,
                quizzes_created,
                quizzes_completed,
                quizzes_passed,
                total_questions,
                correct_answers,
                average_score,
                total_time_spent,
                strongest_subject,
                weakest_subject,
                last_updated
                """
            ).eq("user_id", user_id).single().execute()
            
            if stats_resp.error:
                if stats_resp.error.code == "PGRST116":  # Record not found
                    # Create default stats
                    return await self.create_default_stats(user_id)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error: {stats_resp.error.message}"
                )
            
            stats_data = stats_resp.data
            
            # Convert to domain model
            return UserStats(
                user_id=stats_data["user_id"],
                quizzes_created=stats_data["quizzes_created"],
                quizzes_completed=stats_data["quizzes_completed"],
                quizzes_passed=stats_data["quizzes_passed"],
                total_questions=stats_data["total_questions"],
                correct_answers=stats_data["correct_answers"],
                average_score=stats_data["average_score"],
                total_time_spent=stats_data["total_time_spent"],
                strongest_subject=stats_data.get("strongest_subject"),
                weakest_subject=stats_data.get("weakest_subject"),
                last_updated=stats_data["last_updated"]
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get user stats: {str(e)}"
            )
    
    async def update_user_stats(self, user_id: str, stats_update: Dict[str, Any]) -> UserStats:
        """
        Update user statistics.
        
        Args:
            user_id: The ID of the user
            stats_update: Stats data to update
            
        Returns:
            Updated user statistics
            
        Raises:
            HTTPException: If update fails
        """
        try:
            # Check if stats exist
            try:
                current_stats = await self.get_user_stats(user_id)
            except HTTPException as e:
                if e.status_code == status.HTTP_404_NOT_FOUND:
                    # Create default stats first
                    current_stats = await self.create_default_stats(user_id)
                else:
                    raise
            
            # Prepare update data with current values
            update_data = {
                "quizzes_created": current_stats.quizzes_created,
                "quizzes_completed": current_stats.quizzes_completed,
                "quizzes_passed": current_stats.quizzes_passed,
                "total_questions": current_stats.total_questions,
                "correct_answers": current_stats.correct_answers,
                "average_score": current_stats.average_score,
                "total_time_spent": current_stats.total_time_spent,
                "strongest_subject": current_stats.strongest_subject,
                "weakest_subject": current_stats.weakest_subject,
                "last_updated": datetime.utcnow().isoformat()
            }
            
            # Apply updates
            for key, value in stats_update.items():
                if key in update_data:
                    update_data[key] = value
            
            # Recalculate average score if needed
            if "correct_answers" in stats_update or "total_questions" in stats_update:
                if update_data["total_questions"] > 0:
                    update_data["average_score"] = (update_data["correct_answers"] / update_data["total_questions"]) * 100
                else:
                    update_data["average_score"] = 0.0
            
            # Update stats
            update_resp = supabase_client.from_("user_stats").update(
                update_data
            ).eq("user_id", user_id).execute()
            
            if update_resp.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to update user stats: {update_resp.error.message}"
                )
            
            # Return updated stats
            return await self.get_user_stats(user_id)
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update user stats: {str(e)}"
            )
    
    async def get_user_with_stats(self, user_id: str) -> UserWithStats:
        """
        Get user profile with statistics and recent activity.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            User profile with statistics
            
        Raises:
            HTTPException: If user not found
        """
        try:
            # Get user profile
            profile = await self.get_user_profile(user_id)
            
            # Get user stats
            stats = await self.get_user_stats(user_id)
            
            # Get user preferences
            preferences = await self.get_user_preferences(user_id)
            
            # Get recent activity
            activity_resp = supabase_client.from_("user_activities").select(
                """
                id,
                user_id,
                type,
                details,
                ip_address,
                user_agent,
                timestamp
                """
            ).eq("user_id", user_id).order("timestamp", ascending=False).limit(10).execute()
            
            recent_activity = []
            if not activity_resp.error:
                for item in activity_resp.data:
                    recent_activity.append(UserActivity(
                        id=item["id"],
                        user_id=item["user_id"],
                        type=item["type"],
                        details=item.get("details"),
                        ip_address=item.get("ip_address"),
                        user_agent=item.get("user_agent"),
                        timestamp=item["timestamp"]
                    ))
            
            # Get recent quiz results
            recent_results = []
            try:
                recent_history = await quiz_attempt_service.get_user_quiz_history(user_id, 5)
                recent_results = recent_history.attempts
            except Exception as e:
                # Log error but continue
                print(f"Failed to get recent results: {str(e)}")
            
            # Create combined response
            return UserWithStats(
                **profile.dict(),
                stats=stats,
                recent_activity=recent_activity,
                recent_results=recent_results,
                preferences=preferences
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get user with stats: {str(e)}"
            )
    
    async def search_users(self, params: SearchUsersParams) -> PaginatedResponse:
        """
        Search for users with filtering and pagination.
        
        Args:
            params: Search parameters
            
        Returns:
            Paginated list of user profiles
        """
        try:
            # Build base query
            query = supabase_client.from_("user_profiles").select(
                """
                id,
                email,
                display_name,
                photo_url,
                profession,
                specialization,
                institution,
                roles,
                created_at
                """
            )
            
            # Apply filters
            if params.query:
                query = query.or_(
                    f"display_name.ilike.%{params.query}%,"
                    f"email.ilike.%{params.query}%,"
                    f"profession.ilike.%{params.query}%,"
                    f"specialization.ilike.%{params.query}%,"
                    f"institution.ilike.%{params.query}%"
                )
            
            if params.role:
                # Filter for users with this role
                # This is a simplification - in a real implementation, we would need
                # to handle array containment properly
                query = query.contains("roles", [params.role])
            
            if params.institution:
                query = query.ilike("institution", f"%{params.institution}%")
                
            if params.specialization:
                query = query.ilike("specialization", f"%{params.specialization}%")
            
            # Get total count
            count_resp = query.execute(count="exact")
            total = count_resp.count if hasattr(count_resp, "count") else 0
            
            # Apply pagination
            page = params.page
            limit = params.limit
            offset = (page - 1) * limit
            
            # Execute paginated query
            data_resp = query.range(offset, offset + limit - 1).execute()
            
            if data_resp.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Database error: {data_resp.error.message}"
                )
            
            # Map to domain models
            items = []
            for item in data_resp.data:
                items.append(UserProfile(
                    id=item["id"],
                    email=item["email"],
                    display_name=item.get("display_name"),
                    photo_url=item.get("photo_url"),
                    profession=item.get("profession"),
                    specialization=item.get("specialization"),
                    institution=item.get("institution"),
                    roles=item.get("roles", [UserRole.STUDENT]),
                    created_at=item["created_at"]
                ))
            
            # Return paginated response
            return PaginatedResponse[UserProfile](
                items=items,
                total=total,
                page=page,
                limit=limit,
                total_pages=(total + limit - 1) // limit
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to search users: {str(e)}"
            )
    
    async def log_activity(
        self, 
        user_id: str, 
        activity_type: str, 
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> UserActivity:
        """
        Log user activity.
        
        Args:
            user_id: The ID of the user
            activity_type: Type of activity
            details: Additional details about the activity
            ip_address: User's IP address
            user_agent: User's browser/device info
            
        Returns:
            Created activity log
        """
        try:
            # Create activity log
            activity_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            activity_data = {
                "id": activity_id,
                "user_id": user_id,
                "type": activity_type,
                "details": details,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "timestamp": now
            }
            
            # Insert activity
            activity_resp = supabase_client.from_("user_activities").insert(
                activity_data
            ).execute()
            
            if activity_resp.error:
                # Log error but don't fail the request
                print(f"Failed to log activity: {activity_resp.error.message}")
                
                # Return partial data anyway
                return UserActivity(
                    id=activity_id,
                    user_id=user_id,
                    type=activity_type,
                    details=details,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    timestamp=now
                )
            
            # Update last active timestamp
            supabase_client.from_("user_profiles").update({
                "last_active_at": now
            }).eq("id", user_id).execute()
            
            return UserActivity(
                id=activity_id,
                user_id=user_id,
                type=activity_type,
                details=details,
                ip_address=ip_address,
                user_agent=user_agent,
                timestamp=now
            )
        except Exception as e:
            # Log error but don't fail the request
            print(f"Failed to log activity: {str(e)}")
            
            # Return basic activity object
            return UserActivity(
                id=str(uuid.uuid4()),
                user_id=user_id,
                type=activity_type,
                details=details,
                timestamp=datetime.utcnow()
            )
    
    async def update_user_role(self, user_id: str, role: UserRole, add: bool = True) -> UserProfile:
        """
        Add or remove a role from a user.
        
        Args:
            user_id: The ID of the user
            role: The role to add or remove
            add: True to add the role, False to remove it
            
        Returns:
            Updated user profile
            
        Raises:
            HTTPException: If user not found or update fails
        """
        try:
            # Get current user profile
            profile = await self.get_user_profile(user_id)
            
            # Update roles
            current_roles = set(profile.roles)
            if add:
                current_roles.add(role)
            else:
                current_roles.discard(role)
            
            # Ensure at least one role
            if not current_roles:
                current_roles.add(UserRole.STUDENT)
            
            # Update profile
            update_resp = supabase_client.from_("user_profiles").update({
                "roles": list(current_roles),
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", user_id).execute()
            
            if update_resp.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to update user role: {update_resp.error.message}"
                )
            
            # Log activity
            action = "added" if add else "removed"
            await self.log_activity(
                user_id,
                "profile_update",
                {"message": f"Role {role} {action}"}
            )
            
            # Return updated profile
            return await self.get_user_profile(user_id)
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update user role: {str(e)}"
            )
    
    async def create_default_preferences(self, user_id: str) -> UserPreferences:
        """
        Create default preferences for a user.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            Created user preferences
        """
        try:
            # Create default preferences
            now = datetime.utcnow().isoformat()
            
            prefs_resp = supabase_client.from_("user_preferences").insert({
                "user_id": user_id,
                "theme": "system",
                "email_notifications": True,
                "push_notifications": True,
                "study_reminders": True,
                "show_score_immediately": True,
                "show_explanations_with_results": True,
                "updated_at": now
            }).execute()
            
            if prefs_resp.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create user preferences: {prefs_resp.error.message}"
                )
            
            # Return created preferences
            return UserPreferences(
                user_id=user_id,
                theme="system",
                email_notifications=True,
                push_notifications=True,
                study_reminders=True,
                show_score_immediately=True,
                show_explanations_with_results=True,
                updated_at=now
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create default preferences: {str(e)}"
            )
    
    async def create_default_stats(self, user_id: str) -> UserStats:
        """
        Create default stats for a user.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            Created user stats
        """
        try:
            # Create default stats
            now = datetime.utcnow().isoformat()
            
            stats_resp = supabase_client.from_("user_stats").insert({
                "user_id": user_id,
                "quizzes_created": 0,
                "quizzes_completed": 0,
                "quizzes_passed": 0,
                "total_questions": 0,
                "correct_answers": 0,
                "average_score": 0.0,
                "total_time_spent": 0,
                "last_updated": now
            }).execute()
            
            if stats_resp.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create user stats: {stats_resp.error.message}"
                )
            
            # Return created stats
            return UserStats(
                user_id=user_id,
                quizzes_created=0,
                quizzes_completed=0,
                quizzes_passed=0,
                total_questions=0,
                correct_answers=0,
                average_score=0.0,
                total_time_spent=0,
                last_updated=now
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create default stats: {str(e)}"
            )


# Create singleton instance
user_service = UserService()