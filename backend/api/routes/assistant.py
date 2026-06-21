"""
AI Sustainability Assistant API Routes

Endpoints:
- POST /assistant/chat    — Send message to AI assistant
- GET  /assistant/history — Get conversation sessions

Rate limited to 20 requests per user per hour.
"""

from fastapi import APIRouter, Depends, Request

from api.middleware.auth import get_current_user
from api.middleware.rate_limiter import limiter, RATE_LIMIT_AI
from services.assistant_service import chat_with_assistant, get_conversation_sessions
from main import success_response, error_response

router = APIRouter(tags=["Assistant"])


@router.post("/assistant/chat")
@limiter.limit(RATE_LIMIT_AI)
async def chat(
    request: Request,
    body: dict,
    user_id: str = Depends(get_current_user),
):
    """
    Sends a message to the AI sustainability assistant.

    The assistant uses the user's actual emission data,
    behavioral history, and lifestyle profile to provide
    specific, personalized answers.

    Rate limited to 20 requests per user per hour.

    Request body:
    - message: string (max 1000 characters)
    - session_id: optional string (for conversation continuity)
    """
    message = body.get("message", "").strip()
    session_id = body.get("session_id")

    if not message:
        return error_response(
            code="EMPTY_MESSAGE",
            message="Please enter a message.",
            status_code=400,
        )

    if len(message) > 1000:
        return error_response(
            code="MESSAGE_TOO_LONG",
            message="Message must be under 1000 characters.",
            status_code=400,
        )

    result = chat_with_assistant(
        user_id=user_id,
        message=message,
        session_id=session_id,
    )

    return success_response(
        data=result,
        message="Response generated successfully.",
    )


@router.get("/assistant/history")
async def get_history(
    user_id: str = Depends(get_current_user),
):
    """
    Retrieves recent conversation sessions.

    Returns the last 10 conversation sessions with
    all messages in each session.
    """
    sessions = get_conversation_sessions(user_id)

    return success_response(
        data=sessions,
        message=f"Retrieved {len(sessions)} conversation sessions.",
    )