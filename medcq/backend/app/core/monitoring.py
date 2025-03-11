# backend/app/core/monitoring.py
import logging
from fastapi import FastAPI, Request
import time
from starlette.middleware.base import BaseHTTPMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MonitoringMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Process the request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Log request details
        logger.info(
            f"Request: {request.method} {request.url.path} | "
            f"Status: {response.status_code} | "
            f"Duration: {process_time:.4f}s | "
            f"Client: {request.client.host if request.client else 'Unknown'}"
        )
        
        # Add response timing header
        response.headers["X-Process-Time"] = str(process_time)
        
        return response

def setup_monitoring(app: FastAPI):
    app.add_middleware(MonitoringMiddleware)
    logger.info("Monitoring middleware configured")