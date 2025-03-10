# backend/app/middleware/rate_limit.py
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Tuple, List, Optional, Callable
import time
import hashlib
from app.core.config import settings

class RateLimiter:
    """Rate limiter with sliding window implementation"""
    
    def __init__(self, window_size: int = 60, max_requests: int = 100):
        self.window_size = window_size  # in seconds
        self.max_requests = max_requests
        self.requests: Dict[str, List[float]] = {}
    
    def is_rate_limited(self, key: str) -> Tuple[bool, Optional[int]]:
        """
        Check if a key is rate limited
        
        Returns:
            Tuple of (is_limited, retry_after)
        """
        now = time.time()
        
        # Initialize if key not seen before
        if key not in self.requests:
            self.requests[key] = []
        
        # Remove expired timestamps
        self.requests[key] = [ts for ts in self.requests[key] if now - ts <= self.window_size]
        
        # Check if over limit
        if len(self.requests[key]) >= self.max_requests:
            # Calculate when they can retry
            oldest = min(self.requests[key])
            retry_after = int(oldest + self.window_size - now) + 1
            return True, retry_after
        
        # Not limited, add current timestamp
        self.requests[key].append(now)
        return False, None


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to apply rate limiting to API requests
    
    Different rate limits can be applied to different endpoints
    """
    
    def __init__(
        self, 
        app,
        default_limits: Tuple[int, int] = (60, 100),  # (window_size, max_requests)
        endpoint_limits: Dict[str, Tuple[int, int]] = None,
        whitelist_ips: List[str] = None,
        whitelist_checker: Optional[Callable[[Request], bool]] = None
    ):
        super().__init__(app)
        self.limiters: Dict[str, RateLimiter] = {}
        self.default_limits = default_limits
        self.endpoint_limits = endpoint_limits or {}
        self.whitelist_ips = set(whitelist_ips or [])
        self.whitelist_checker = whitelist_checker
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for whitelisted IPs
        client_ip = request.client.host
        if client_ip in self.whitelist_ips:
            return await call_next(request)
        
        # Skip if custom whitelist function indicates so
        if self.whitelist_checker and self.whitelist_checker(request):
            return await call_next(request)
        
        # Determine appropriate limits based on endpoint
        path = request.url.path
        window_size, max_requests = self.default_limits
        
        # Check if there are specific limits for this endpoint
        for endpoint_pattern, limits in self.endpoint_limits.items():
            if path.startswith(endpoint_pattern):
                window_size, max_requests = limits
                break
        
        # Create or get rate limiter for this configuration
        limiter_key = f"{window_size}:{max_requests}"
        if limiter_key not in self.limiters:
            self.limiters[limiter_key] = RateLimiter(window_size, max_requests)
        
        limiter = self.limiters[limiter_key]
        
        # Generate rate limit key based on IP + endpoint
        # Can be extended to use user ID for authenticated requests
        user_id = "anonymous"
        if hasattr(request.state, "user_id"):
            user_id = request.state.user_id
        
        # Create rate limit key using IP or user ID
        rate_limit_key = f"{user_id}:{path}" if user_id != "anonymous" else f"{client_ip}:{path}"
        # Hash the key to maintain privacy
        hashed_key = hashlib.md5(rate_limit_key.encode()).hexdigest()
        
        # Check if rate limited
        is_limited, retry_after = limiter.is_rate_limited(hashed_key)
        
        if is_limited:
            # Return rate limit response
            headers = {
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(max_requests),
                "X-RateLimit-Window": str(window_size),
            }
            
            return Response(
                content={"detail": "Rate limit exceeded. Please try again later."},
                status_code=429,
                headers=headers
            )
        
        # Process the request normally
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Window"] = str(window_size)
        
        return response

# Add the middleware to the application
# backend/app/api/main.py
from app.middleware.rate_limit import RateLimitMiddleware

# Configure rate limiting
app.add_middleware(
    RateLimitMiddleware,
    default_limits=(60, 100),  # 100 requests per minute by default
    endpoint_limits={
        # More strict limits for authentication endpoints
        "/api/auth/": (60, 20),  # 20 requests per minute
        # Less strict for public endpoints
        "/api/quizzes": (60, 200),  # 200 requests per minute
    },
    whitelist_ips=settings.RATE_LIMIT_WHITELIST_IPS
)