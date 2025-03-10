# backend/app/api/endpoints/errors.py
from fastapi import APIRouter, Request, Depends, Body
from app.core.config import settings
from app.api.dependencies import get_current_user
from typing import Dict, Any, Optional
import logging
import json
import os
from datetime import datetime

router = APIRouter()

# Configure error logger
error_logger = logging.getLogger("error_tracking")
error_logger.setLevel(logging.ERROR)

# File handler for development
if settings.ENV != "production":
    # Ensure log directory exists
    os.makedirs("logs", exist_ok=True)
    
    file_handler = logging.FileHandler("logs/frontend_errors.log")
    file_handler.setFormatter(logging.Formatter(
        "%(asctime)s - %(levelname)s - %(message)s"
    ))
    error_logger.addHandler(file_handler)
else:
    # In production, we'd configure a more robust handler
    # e.g., sending to an error tracking service or centralized logging
    pass

@router.post("/report")
async def report_error(
    request: Request,
    error_data: Dict[str, Any] = Body(...),
    user_id: Optional[str] = Depends(get_current_user)
):
    """
    Endpoint to report client-side errors
    """
    # Enrich error data
    enriched_data = {
        **error_data,
        "reported_at": datetime.utcnow().isoformat(),
        "ip_address": request.client.host,
        "request_id": request.headers.get("X-Request-ID", "unknown"),
    }
    
    # Log the error
    error_message = f"Frontend error: {error_data.get('message', 'Unknown error')}"
    error_context = json.dumps(enriched_data, indent=2)
    error_logger.error(f"{error_message}\n{error_context}")
    
    # In production, send to external error tracking service
    
    return {"status": "error_reported"}