"""
Behavioral Learning Engine Service

Processes user behavioral feedback and updates the system's
understanding of user preferences.

Flow:
1. Validate recommendation exists
2. Load current behavioral weights
3. Calculate updated weights via adaptation algorithm
4. Save updated weights to Firestore
5. Record behavioral event in history
6. Update recommendation status
7. Update recommendation template history (memory system)
8. Clear stale pending recommendations to force regeneration

The recommendation template history update (step 7) is the
critical addition that connects behavioral feedback to the
recommendation memory system. Without this, the engine cannot
know that a specific template was rejected and should be filtered.
"""

from typing import Any

from domain.algorithms.adaptation import (
    calculate_weight_update,
    generate_feedback_message,
)
from infrastructure.firestore_client import get_firestore_service


def process_behavioral_feedback(
    user_id: str,
    recommendation_id: str,
    action: str,
) -> dict[str, Any]:
    """
    Processes behavioral feedback on a recommendation.

    This is the main entry point for the Behavioral Learning Engine.
    Updates both category/sub-type weights AND the per-template
    history record so the recommendation memory system functions.

    Args:
        user_id: Firebase UID
        recommendation_id: ID of the recommendation document
        action: One of 'accepted', 'rejected', 'completed', 'failed', 'deferred'

    Returns:
        BehaviorFeedbackResult dict

    Raises:
        ValueError: If recommendation is not found or action is invalid
    """
    db = get_firestore_service()

    # 1. Locate the recommendation document
    all_recs = db.get_all_recommendations(user_id)
    recommendation = next(
        (rec for rec in all_recs if rec.get("id") == recommendation_id),
        None,
    )

    if not recommendation:
        raise ValueError(
            f"Recommendation '{recommendation_id}' not found for this user."
        )

    category: str = recommendation.get("category", "transport")
    sub_type: str = recommendation.get("sub_type", "general")
    # template_id links this recommendation back to the template pool
    # for the memory system update
    template_id: str = recommendation.get("template_id", "")

    # 2. Load current behavioral weights
    weights_data = db.get_behavioral_weights(user_id)
    if not weights_data:
        weights_data = {
            "transport": 0.7,
            "energy": 0.7,
            "food": 0.7,
            "shopping": 0.7,
            "sub_weights": {},
        }

    current_category_weight: float = weights_data.get(category, 0.7)
    sub_weights: dict[str, float] = weights_data.get("sub_weights", {})
    current_sub_weight: float = sub_weights.get(sub_type, 0.5)

    # 3. Calculate updated weights
    new_category_weight, new_sub_weight = calculate_weight_update(
        current_category_weight,
        current_sub_weight,
        action,
    )

    # 4. Save updated weights
    weights_data[category] = new_category_weight
    weights_data.setdefault("sub_weights", {})[sub_type] = new_sub_weight
    db.set_behavioral_weights(user_id, weights_data)

    # 5. Record behavioral event in history
    event_data = {
        "recommendation_id": recommendation_id,
        "recommendation_category": category,
        "recommendation_sub_type": sub_type,
        "action": action,
        "previous_weight": round(current_category_weight, 3),
        "new_weight": round(new_category_weight, 3),
    }
    db.add_behavioral_event(user_id, event_data)

    # 6. Update recommendation document status
    status_mapping = {
        "accepted": "accepted",
        "rejected": "rejected",
        "completed": "completed",
        "failed": "failed",
        "deferred": "deferred",
    }
    new_status = status_mapping.get(action, "pending")
    db.update_recommendation_status(user_id, recommendation_id, new_status)

    # 7. Update recommendation template history (memory system)
    # This is critical — without this, the recommendation engine
    # cannot know this template was rejected and should be filtered
    if template_id:
        db.update_recommendation_history_status(user_id, template_id, new_status)

    # 6b. Initialize streak if recommendation was accepted
    if action == "accepted":
        try:
            from services.streak_service import initialize_streak
            initialize_streak(
                user_id=user_id,
                recommendation_id=recommendation_id,
                sub_type=sub_type,
            )
        except Exception as e:
            # Streak initialization failure must not block the feedback response
            import logging
            logging.getLogger("acia.behavioral").warning(
                "Streak initialization failed for %s: %s", sub_type, str(e)
            )
    # 8. Clear pending recommendations on significant actions
    # to force regeneration with updated weights on next request
    if action in ("rejected", "completed"):
        _clear_pending_recommendations(user_id, db)

    # Generate user-facing feedback message
    message = generate_feedback_message(action, category, new_category_weight)

    return {
        "recommendation_id": recommendation_id,
        "action": action,
        "weight_updated": action != "deferred",
        "new_category_weight": round(new_category_weight, 3),
        "message": message,
    }


def _clear_pending_recommendations(user_id: str, db: Any) -> None:
    """
    Marks all pending recommendations as expired.

    Called after rejection or completion actions to force the
    recommendation engine to regenerate with updated weights
    on the next request. The expired status is excluded from
    the "fewer than 3 pending" check in the recommendations route.
    """
    pending = db.get_recommendations(user_id, status="pending", limit=20)
    for rec in pending:
        rec_id = rec.get("id")
        if rec_id:
            db.update_recommendation_status(user_id, rec_id, "expired")


def get_behavioral_summary(user_id: str) -> dict[str, Any]:
    """
    Returns a summary of the user's behavioral learning state.

    Used by the Recommendations page sidebar to show the user
    how the system has learned their preferences over time.

    Args:
        user_id: Firebase UID

    Returns:
        Dictionary with current weights and recent behavioral history
    """
    db = get_firestore_service()

    weights = db.get_behavioral_weights(user_id)
    history = db.get_behavioral_history(user_id, limit=20)

    if not weights:
        weights = {
            "transport": 0.7,
            "energy": 0.7,
            "food": 0.7,
            "shopping": 0.7,
            "sub_weights": {},
            "updated_at": "",
        }

    return {
        "weights": weights,
        "history": history,
    }