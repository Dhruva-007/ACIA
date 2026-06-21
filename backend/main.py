"""
ACIA Backend - FastAPI Application Entry Point

Configures:
- CORS for frontend origin
- Authentication middleware (Firebase JWT)
- Rate limiting middleware
- Request logging middleware
- Global error handlers
- Standard response envelope
- Health check endpoint

All API routes are mounted under /api/v1/ prefix.

Lifespan pattern used instead of deprecated on_event decorators.
See: https://fastapi.tiangolo.com/advanced/events/
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from config import get_settings
from api.middleware.logging import RequestLoggingMiddleware
from api.middleware.rate_limiter import limiter

# ─── Logging Configuration ──────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("acia")

# ─── Settings ───────────────────────────────────────────────────────

settings = get_settings()


# ─── Lifespan Event Handler ──────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application startup and shutdown events.

    Startup:
    - Initializes Vertex AI connection
    - Logs service start

    Shutdown:
    - Logs graceful shutdown
    """
    # ── Startup ──────────────────────────────────────────────────────
    logger.info(
        "ACIA Backend starting: version=%s environment=%s",
        settings.app_version,
        settings.environment,
    )

    try:
        from infrastructure.vertex_ai_client import initialize_vertex_ai
        initialize_vertex_ai()
        logger.info("Vertex AI initialized successfully at startup")
    except Exception as exc:
        logger.warning(
            "Vertex AI initialization failed at startup: %s — fallback responses active",
            str(exc),
        )

    logger.info("ACIA Backend initialized successfully")

    yield

    # ── Shutdown ──────────────────────────────────────────────────────
    logger.info("ACIA Backend shutting down gracefully")


# ─── Application Setup ──────────────────────────────────────────────

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered carbon footprint reduction backend",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# ─── Rate Limiter ────────────────────────────────────────────────────

app.state.limiter = limiter

# ─── CORS Middleware ─────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# ─── Request Logging Middleware ──────────────────────────────────────

app.add_middleware(RequestLoggingMiddleware)
from api.middleware.rate_limiter import RateLimitHeaderMiddleware
app.add_middleware(RateLimitHeaderMiddleware)


# ─── Standard Response Helpers ───────────────────────────────────────

def success_response(
    data: Any,
    message: str = "Success",
    status_code: int = 200,
) -> JSONResponse:
    """
    Creates a standardized success response envelope.

    All API endpoints return this shape:
    {
        "success": true,
        "data": <payload>,
        "message": "...",
        "timestamp": "ISO-8601"
    }

    Args:
        data: The response payload (must be JSON-serializable)
        message: Human-readable success description
        status_code: HTTP status code (default 200)

    Returns:
        JSONResponse with standard envelope
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "data": data,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


def error_response(
    code: str,
    message: str,
    status_code: int = 400,
    field: str | None = None,
) -> JSONResponse:
    """
    Creates a standardized error response envelope.

    All API errors return this shape:
    {
        "success": false,
        "error": {
            "code": "ERROR_CODE",
            "message": "Human-readable message",
            "field": "optional_field_name"
        },
        "timestamp": "ISO-8601"
    }

    Args:
        code: Machine-readable error code (SCREAMING_SNAKE_CASE)
        message: Human-readable error description
        status_code: HTTP status code (default 400)
        field: Optional field name for validation errors

    Returns:
        JSONResponse with standard error envelope
    """
    error_detail: dict[str, Any] = {
        "code": code,
        "message": message,
    }
    if field:
        error_detail["field"] = field

    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": error_detail,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


# ─── Global Exception Handlers ──────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request, exc: HTTPException
) -> JSONResponse:
    """
    Converts FastAPI HTTPExceptions to the standard error envelope.

    Preserves pre-formatted error envelopes from auth middleware
    so they are not double-wrapped.
    """
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                **detail,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

    return error_response(
        code="HTTP_ERROR",
        message=str(detail),
        status_code=exc.status_code,
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(
    request: Request, exc: RateLimitExceeded
) -> JSONResponse:
    """Returns 429 with standard error envelope when rate limit is exceeded."""
    return error_response(
        code="RATE_LIMITED",
        message="Too many requests. Please wait before trying again.",
        status_code=429,
    )


@app.exception_handler(ValueError)
async def value_error_handler(
    request: Request, exc: ValueError
) -> JSONResponse:
    """
    Converts ValueErrors raised by the domain layer to 400 responses.

    Domain functions raise ValueError for invalid inputs rather
    than importing FastAPI exceptions, keeping the domain layer
    framework-agnostic.
    """
    return error_response(
        code="VALIDATION_ERROR",
        message=str(exc),
        status_code=400,
    )


@app.exception_handler(Exception)
async def general_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """
    Catches all unhandled exceptions as a safety net.

    Logs the full traceback server-side for debugging but
    returns only a generic message to the client to prevent
    leaking internal implementation details.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        "Unhandled exception request_id=%s path=%s: %s",
        request_id,
        request.url.path,
        str(exc),
        exc_info=True,
    )
    return error_response(
        code="INTERNAL_ERROR",
        message="An unexpected error occurred. Please try again.",
        status_code=500,
    )


# ─── Health Check ────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check() -> JSONResponse:
    """
    Service health check endpoint.

    No authentication required.
    Used by Cloud Run for liveness probes and by the
    frontend to verify backend connectivity.

    Returns:
        200 with service status information
    """
    return success_response(
        data={
            "status": "healthy",
            "service": "ACIA Backend",
            "version": settings.app_version,
            "environment": settings.environment,
        },
        message="Service is healthy",
    )


# ─── Route Registration ─────────────────────────────────────────────

from api.routes.profile import router as profile_router
from api.routes.carbon import router as carbon_router
from api.routes.recommendations import router as recommendations_router
from api.routes.behavior import router as behavior_router
from api.routes.simulator import router as simulator_router
from api.routes.prediction import router as prediction_router
from api.routes.assistant import router as assistant_router
from api.routes.cii import router as cii_router
from api.routes.streak import router as streak_router
from api.routes.budget import router as budget_router
from api.routes.narrative import router as narrative_router
from api.routes.explainer import router as explainer_router

app.include_router(profile_router, prefix=settings.api_prefix)
app.include_router(carbon_router, prefix=settings.api_prefix)
app.include_router(recommendations_router, prefix=settings.api_prefix)
app.include_router(behavior_router, prefix=settings.api_prefix)
app.include_router(simulator_router, prefix=settings.api_prefix)
app.include_router(prediction_router, prefix=settings.api_prefix)
app.include_router(assistant_router, prefix=settings.api_prefix)
app.include_router(cii_router, prefix=settings.api_prefix)
app.include_router(streak_router, prefix=settings.api_prefix)
app.include_router(budget_router, prefix=settings.api_prefix)
app.include_router(narrative_router, prefix=settings.api_prefix)
app.include_router(explainer_router, prefix=settings.api_prefix)

logger.info("ACIA Backend initialized successfully")