# backend/app/api/router.py

from fastapi import APIRouter
from app.api.endpoints import health, auth, quizzes, users, quiz_attempts

# Create main API router
api_router = APIRouter()

# Include routers from endpoints
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(quizzes.router, prefix="/quizzes", tags=["Quizzes"])
api_router.include_router(quiz_attempts.router, prefix="/quiz-attempts", tags=["Quiz Attempts"])