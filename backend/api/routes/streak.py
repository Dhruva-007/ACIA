"""
Streak API Routes — Feature 1: Behavioral Streak Tracking

Endpoints:
- GET  /streaks           — Get all active streaks with summary
- POST /streaks/checkin   — Submit weekly streak check-in
"""

from fastapi import APIRouter, Depends

from api.middleware.auth import get_current_user
from services.streak_service import get_streak_summary, process_checkin
from main import success_response, error_response

router = APIRouter(tags=["Streaks"])


@router.get("/streaks")
async def get_streaks(
    user_id: str = Depends(get_current_user),
):
    """
    Returns all active streak records with summary statistics.

    Streaks are created automatically when a recommendation is accepted.
    Status is updated based on check-in due dates:
    - active: check-in not yet due
    - at_risk: check-in due within 24 hours
    - broken: check-in overdue and not completed
    """
    summary = get_streak_summary(user_id)

    return success_response(
        data=summary,
        message=f"Retrieved {len(summary['streaks'])} streak(s).",
    )


@router.post("/streaks/checkin")
async def submit_checkin(
    body: dict,
    user_id: str = Depends(get_current_user),
):
    """
    Submits a weekly check-in for a streak.

    Request body:
    {
        "sub_type": string,   — The recommendation sub-type
        "completed": boolean  — Did the user follow through?
    }

    On success: increments streak count if completed, resets if not.
    Returns updated streak with motivating message.
    """
    sub_type = body.get("sub_type", "").strip()
    completed = body.get("completed", False)

    if not sub_type:
        return error_response(
            code="MISSING_SUB_TYPE",
            message="sub_type is required.",
            status_code=400,
        )

    try:
        result = process_checkin(
            user_id=user_id,
            sub_type=sub_type,
            completed=completed,
        )
        return success_response(
            data=result,
            message=result.get("message", "Check-in recorded."),
        )
    except ValueError as e:
        return error_response(
            code="STREAK_NOT_FOUND",
            message=str(e),
            status_code=404,
        )