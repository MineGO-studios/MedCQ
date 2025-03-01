from fastapi import APIRouter
from app.api.endpoints import health, auth, quizzes, users

# Create main API router
api_router = APIRouter()

# Include routers from endpoints
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(quizzes.router, prefix="/quizzes", tags=["Quizzes"])