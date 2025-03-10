# backend/app/middleware/security.py
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import re
from typing import List, Pattern

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Content Security Policy - adjust based on your needs
        if settings.ENV == "production":
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' https://cdnjs.cloudflare.com; "
                "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
                "img-src 'self' data:; "
                "font-src 'self'; "
                "connect-src 'self' https://api.medcq.com; "
                "frame-ancestors 'none'; "
                "form-action 'self';"
            )
        
        return response

class SQLInjectionProtectionMiddleware(BaseHTTPMiddleware):
    """Basic protection against SQL injection attacks"""
    
    def __init__(self, app, patterns: List[str] = None):
        super().__init__(app)
        default_patterns = [
            r"[\s]+(OR|AND)[\s]+[\"'0-9]",
            r"UNION[\s]+ALL[\s]+SELECT",
            r"SELECT[\s]+.*?FROM",
            r"DELETE[\s]+FROM",
            r"INSERT[\s]+INTO",
            r"UPDATE[\s]+.*?SET",
            r"DROP[\s]+TABLE",
            r"--[\s]*$",
            r";[\s]*$",
        ]
        patterns = patterns or default_patterns
        self.patterns: List[Pattern] = [re.compile(p, re.IGNORECASE) for p in patterns]
    
    async def dispatch(self, request: Request, call_next):
        # Check query parameters
        query_params = request.query_params
        for param in query_params.values():
            if self.is_suspicious(param):
                return Response(
                    content={"detail": "Invalid request parameters"},
                    status_code=400
                )
        
        # For POST/PUT requests, check request body
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.json()
                if self.check_nested_values(body):
                    return Response(
                        content={"detail": "Invalid request data"},
                        status_code=400
                    )
            except:
                # Invalid JSON or not JSON - continue
                pass
        
        return await call_next(request)
    
    def is_suspicious(self, value: str) -> bool:
        """Check if a string matches suspicious patterns"""
        if not isinstance(value, str):
            return False
            
        for pattern in self.patterns:
            if pattern.search(value):
                return True
        
        return False
    
    def check_nested_values(self, data: Any) -> bool:
        """Recursively check nested values in dictionaries and lists"""
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(key, str) and self.is_suspicious(key):
                    return True
                if self.check_nested_values(value):
                    return True
        elif isinstance(data, list):
            for item in data:
                if self.check_nested_values(item):
                    return True
        elif isinstance(data, str):
            return self.is_suspicious(data)
        
        return False

# Add the middlewares to the application
# backend/app/api/main.py
from app.middleware.security import SecurityHeadersMiddleware, SQLInjectionProtectionMiddleware

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(SQLInjectionProtectionMiddleware)