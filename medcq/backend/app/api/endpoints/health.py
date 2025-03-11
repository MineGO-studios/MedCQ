# backend/app/api/endpoints/health.py
from fastapi import APIRouter, Depends
from app.core.config import settings
from app.db.supbase import get_supabase_client
from app.core.firebase import initialize_firebase
from typing import Dict, Any
from datetime import datetime
import psutil
import platform

router = APIRouter()

@router.get("", response_model=Dict[str, Any])
async def health_check():
    """
    Enhanced health check endpoint for monitoring systems.
    
    Returns:
        Dict with status information, timestamp, version, and system metrics.
    """
    # Basic health check
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENV
    }
    
    # Add system metrics
    health_status["system"] = {
        "cpu_usage": psutil.cpu_percent(),
        "memory_usage": psutil.virtual_memory().percent,
        "platform": platform.platform(),
        "python_version": platform.python_version()
    }
    
    # Check database connection
    try:
        supabase = get_supabase_client()
        if supabase:
            health_status["database"] = "connected"
        else:
            health_status["database"] = "disconnected"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
    
    # Check Firebase connection
    try:
        firebase = initialize_firebase()
        if firebase:
            health_status["firebase"] = "connected"
        else:
            health_status["firebase"] = "disconnected"
    except Exception as e:
        health_status["firebase"] = f"error: {str(e)}"
    
    return health_status