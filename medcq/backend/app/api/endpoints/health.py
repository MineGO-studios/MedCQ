from fastapi import APIRouter, Depends
from app.core.config import settings
from typing import Dict, Any
from datetime import datetime

router = APIRouter()

@router.get("", response_model=Dict[str, Any])
async def health_check():
    """
    Health check endpoint to verify API status.
    
    Returns:
        Dict with status information, timestamp, and version.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENV
    }