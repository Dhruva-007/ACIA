"""
Behavioral Feedback API Routes

Endpoints:
- POST /behavior/feedback  — Submit feedback on a recommendation
- GET  /behavior/weights   — Get current behavioral weights
- GET  /behavior/history   — Get behavioral interaction history

These endpoints power the behavioral learning loop:
User acts → weights update → recommendations adapt
"""

from fastapi import APIRouter, Depends, Query

from api.middleware.auth import get_current_user
from domain.models.recommendation import BehaviorFeedbackRequest
from services.behavioral_learning import (
    process_behavioral_feedback,
    get_behavioral_summary,
)
from infrastructure.firestore_client import get_firestore_service
from main import success_response

router = APIRouter(tags=["Behavior"])


@router.post("/behavior/feedback")
async def submit_feedback(
    request: BehaviorFeedbackRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Submits user feedback on a recommendation.

    Actions and their effects on behavioral weights:
    - accepted:  category +0.15, sub_type +0.20
    - rejected:  category -0.20, sub_type -0.25
    - completed: category +0.25, sub_type +0.30
    - failed:    category -0.10, sub_type -0.15
    - deferred:  no weight change

    After processing, pending recommendations are cleared
    and regenerated on the next request with updated weights.
    """
    result = process_behavioral_feedback(
        user_id=user_id,
        recommendation_id=request.recommendation_id,
        action=request.action,
    )

    return success_response(
        data=result,
        message=result["message"],
    )


@router.get("/behavior/weights")
async def get_weights(
    user_id: str = Depends(get_current_user),
):
    """
    Returns current behavioral weights.

    Shows the user how the system has learned their preferences.
    Transparency feature for the Recommendations page sidebar.
    """
    db = get_firestore_service()
    weights = db.get_behavioral_weights(user_id)

    if not weights:
        weights = {
            "transport": 0.7,
            "energy": 0.7,
            "food": 0.7,
            "shopping": 0.7,
            "sub_weights": {
                "cycling": 0.5,
                "public_transport": 0.5,
                "remote_work": 0.5,
                "diet_change": 0.5,
                "energy_efficiency": 0.5,
                "second_hand": 0.5,
            },
            "updated_at": "",
        }

    return success_response(
        data=weights,
        message="Behavioral weights retrieved.",
    )


@router.get("/behavior/history")
async def get_history(
    limit: int = Query(default=20, ge=1, le=100),
    user_id: str = Depends(get_current_user),
):
    """
    Returns behavioral interaction history.

    Shows the user their past interactions with recommendations
    and how each interaction affected their weights.
    """
    db = get_firestore_service()
    history = db.get_behavioral_history(user_id, limit=limit)

    return success_response(
        data=history,
        message=f"Retrieved {len(history)} behavioral events.",
    )