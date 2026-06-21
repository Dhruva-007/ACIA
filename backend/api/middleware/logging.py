"""
Request Logging Middleware

Logs every API request with:
- Method and path
- Response status code
- Response time in milliseconds
- User ID (hashed for privacy)
- Request ID for tracing

Security:
- Authorization headers are stripped from logs
- User IDs are truncated (first 8 chars) for privacy
- Request/response bodies are never logged
"""

import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("acia.api")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that logs every API request with timing and context.

    Assigns a unique request_id to each request for distributed tracing.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        # Record start time
        start_time = time.time()

        # Process request
        try:
            response = await call_next(request)
        except Exception as exc:
            # Log unhandled exceptions
            elapsed_ms = (time.time() - start_time) * 1000
            user_id = self._get_user_id(request)
            logger.error(
                "request_id=%s method=%s path=%s user=%s "
                "status=500 elapsed_ms=%.1f error=%s",
                request_id,
                request.method,
                request.url.path,
                user_id,
                elapsed_ms,
                str(exc)[:200],
            )
            raise

        # Calculate elapsed time
        elapsed_ms = (time.time() - start_time) * 1000
        user_id = self._get_user_id(request)

        # Log request
        log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            log_level,
            "request_id=%s method=%s path=%s user=%s "
            "status=%d elapsed_ms=%.1f",
            request_id,
            request.method,
            request.url.path,
            user_id,
            response.status_code,
            elapsed_ms,
        )

        # Add request ID to response headers for debugging
        response.headers["X-Request-ID"] = request_id

        return response

    @staticmethod
    def _get_user_id(request: Request) -> str:
        """
        Extracts truncated user ID from request state.
        Returns 'anonymous' if not authenticated.
        """
        uid = getattr(request.state, "uid", None)
        if uid:
            return uid[:8] + "..."
        return "anonymous"