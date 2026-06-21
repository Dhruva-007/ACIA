"""
Recommendations API Routes

Endpoints:
- GET /recommendations — Get ranked personalized recommendations

Powers the Recommendations page and Dashboard quick actions.
"""

from fastapi import APIRouter, Depends, Query

from api.middleware.auth import get_current_user
from services.recommendation_engine import generate_recommendations
from infrastructure.firestore_client import get_firestore_service
from main import success_response

router = APIRouter(tags=["Recommendations"])


@router.get("/recommendations")
async def get_recommendations(
    limit: int = Query(default=5, ge=1, le=10),
    user_id: str = Depends(get_current_user),
):
    """
    Returns ranked personalized recommendations.

    If existing recommendations are stored, returns those.
    Otherwise generates fresh recommendations from the
    recommendation engine.

    Each recommendation includes:
    - Five-dimension scoring breakdown
    - Composite score
    - Plain-language reasoning
    - Estimated carbon reduction
    - Cost and disruption level
    """
    db = get_firestore_service()

    # Check for existing pending recommendations
    existing = db.get_recommendations(user_id, status="pending", limit=limit)

    if existing and len(existing) >= 3:
        return success_response(
            data=existing,
            message=f"Retrieved {len(existing)} recommendations.",
        )

    # Generate fresh recommendations
    recommendations = generate_recommendations(user_id, limit=limit)

    return success_response(
        data=recommendations,
        message=f"Generated {len(recommendations)} personalized recommendations.",
    )