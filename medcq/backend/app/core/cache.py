# backend/app/core/cache.py
from fastapi import Request, Response
import hashlib
import time
from functools import wraps
from typing import Callable, Dict, Any, Optional
import json

# Simple in-memory cache
class APICache:
    def __init__(self, max_size: int = 1000):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
    
    def set(self, key: str, value: Any, ttl: int = 300):
        """Store a value in the cache with TTL in seconds"""
        expires_at = time.time() + ttl
        
        # Manage cache size
        if len(self.cache) >= self.max_size:
            # Remove oldest or expired entries
            now = time.time()
            expired_keys = [k for k, v in self.cache.items() if v["expires_at"] <= now]
            
            # Remove expired entries first
            for k in expired_keys:
                del self.cache[k]
                
            # If still too big, remove oldest
            if len(self.cache) >= self.max_size:
                oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k]["expires_at"])
                del self.cache[oldest_key]
        
        self.cache[key] = {
            "value": value,
            "expires_at": expires_at
        }
    
    def get(self, key: str) -> Optional[Any]:
        """Get a value from the cache if not expired"""
        if key not in self.cache:
            return None
            
        cached = self.cache[key]
        if cached["expires_at"] <= time.time():
            # Expired
            del self.cache[key]
            return None
            
        return cached["value"]
    
    def invalidate(self, key_prefix: str):
        """Invalidate all cache entries that start with key_prefix"""
        keys_to_delete = [k for k in self.cache.keys() if k.startswith(key_prefix)]
        for k in keys_to_delete:
            del self.cache[k]

# Create singleton instance
api_cache = APICache()

# Cache decorator for API endpoints
def cache_response(ttl: int = 300):
    """
    Decorator to cache API responses
    
    Args:
        ttl: Cache lifetime in seconds
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get request from arguments
            request = next((arg for arg in args if isinstance(arg, Request)), None)
            if not request:
                # No request found, can't cache
                return await func(*args, **kwargs)
            
            # Skip caching for non-GET requests
            if request.method != "GET":
                return await func(*args, **kwargs)
            
            # Generate cache key from path and query params
            path = request.url.path
            query = str(request.query_params)
            user_id = request.state.user_id if hasattr(request.state, "user_id") else "anonymous"
            
            # Include user in the key for personalized responses
            cache_key = f"{user_id}:{path}:{query}"
            # Hash long keys to prevent excessive memory usage
            if len(cache_key) > 100:
                cache_key = hashlib.md5(cache_key.encode()).hexdigest()
            
            # Check cache
            cached_response = api_cache.get(cache_key)
            if cached_response:
                return Response(
                    content=cached_response["content"],
                    status_code=cached_response["status_code"],
                    headers={"X-Cache": "HIT", **cached_response["headers"]}
                )
            
            # Execute the original function
            response = await func(*args, **kwargs)
            
            # Cache the response if it's a success
            if 200 <= response.status_code < 400:
                # Get response content
                if hasattr(response, "body"):
                    content = response.body
                elif hasattr(response, "render"):
                    content = await response.render()
                else:
                    # Can't determine content, don't cache
                    return response
                
                # Store in cache
                api_cache.set(
                    cache_key,
                    {
                        "content": content,
                        "status_code": response.status_code,
                        "headers": {k: v for k, v in response.headers.items() if k != "X-Cache"}
                    },
                    ttl
                )
                
                # Add cache header
                response.headers["X-Cache"] = "MISS"
            
            return response
        
        return wrapper
    
    return decorator

# Example usage in API endpoint
from app.core.cache import cache_response

@router.get("", response_model=PaginatedResponse[QuizSummary])
@cache_response(ttl=60)  # Cache for 1 minute
async def list_quizzes(
    subject: Optional[str] = Query(None),
    year_level: Optional[int] = Query(None),
    # Other parameters...
    current_user: str = Depends(get_current_active_user)
) -> PaginatedResponse:
    # Function implementation...
    pass