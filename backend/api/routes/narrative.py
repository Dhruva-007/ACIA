"""
Narrative API Routes — Feature 3: AI Weekly Carbon Narrative

Endpoints:
- GET  /narrative/weekly   — Get current week's narrative
- POST /narrative/generate — Generate a new narrative for this week
"""

from fastapi import APIRouter, Depends

from api.middleware.auth import get_current_user
from services.narrative_service import get_weekly_narrative, generate_weekly_narrative
from main import success_response

router = APIRouter(tags=["Narrative"])


@router.get("/narrative/weekly")
async def get_narrative_weekly(
    user_id: str = Depends(get_current_user),
):
    """
    Returns the current week's AI-generated carbon narrative.

    If no narrative exists for this week, returns None in data.
    Use POST /narrative/generate to create one.
    """
    narrative = get_weekly_narrative(user_id)

    if not narrative:
        return success_response(
            data=None,
            message="No narrative generated yet for this week.",
        )

    return success_response(
        data=narrative,
        message="Weekly narrative retrieved.",
    )


@router.post("/narrative/generate")
async def generate_narrative(
    user_id: str = Depends(get_current_user),
):
    """
    Generates a new AI-powered weekly carbon narrative.

    Uses Vertex AI Gemini to write a personalized 3-sentence
    summary of the user's week in carbon terms.

    Falls back to a template-based narrative if Vertex AI
    is unavailable, ensuring the feature always returns useful data.
    """
    narrative = generate_weekly_narrative(user_id)

    return success_response(
        data=narrative,
        message="Weekly narrative generated successfully.",
    )