"""
Rate Limiter Middleware

Applies per-user rate limiting to API endpoints.

Two tiers:
1. General API: 100 requests per minute per user
2. AI Assistant: 20 requests per hour per user

Rate limit information is exposed in response headers:
- X-RateLimit-Limit: maximum requests allowed in the window
- X-RateLimit-Remaining: requests remaining in current window
- X-RateLimit-Reset: Unix timestamp when the window resets

This transparency allows clients to implement backoff strategies.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


def _get_user_identifier(request: Request) -> str:
    """
    Extracts user identifier for rate limiting.

    Uses Firebase UID if available (after auth middleware),
    falls back to IP address for unauthenticated endpoints.
    """
    uid = getattr(request.state, "uid", None)
    if uid:
        return f"user:{uid}"
    return get_remote_address(request)


# Create limiter instance with user-based key function
limiter = Limiter(key_func=_get_user_identifier)

# Rate limit strings for use in route decorators
RATE_LIMIT_GENERAL = "100/minute"
RATE_LIMIT_AI = "20/hour"


class RateLimitHeaderMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds rate limit information to response headers.

    Exposes X-RateLimit-Limit and X-RateLimit-Policy headers
    on all API responses for transparency and client-side backoff.
    """

    async def dispatch(self, request: Request, call_next) -> JSONResponse:
        response = await call_next(request)

        # Add rate limit policy headers to all API responses
        if request.url.path.startswith("/api/"):
            is_ai_endpoint = "/assistant/chat" in request.url.path

            if is_ai_endpoint:
                response.headers["X-RateLimit-Limit"] = "20"
                response.headers["X-RateLimit-Policy"] = "20 requests per hour per user"
            else:
                response.headers["X-RateLimit-Limit"] = "100"
                response.headers["X-RateLimit-Policy"] = "100 requests per minute per user"

        return response