"""
Future Carbon Prediction API Routes

Endpoints:
- GET /prediction/trajectory              — Current emission trajectory
- GET /prediction/with-recommendations    — Trajectory with actions applied

Powers the Prediction page charts and insights.
"""

from fastapi import APIRouter, Depends, Query

from api.middleware.auth import get_current_user
from services.prediction_engine import (
    get_emission_trajectory,
    get_trajectory_with_recommendations,
)
from main import success_response

router = APIRouter(tags=["Prediction"])


@router.get("/prediction/trajectory")
async def get_trajectory(
    months: int = Query(default=12, ge=6, le=12),
    user_id: str = Depends(get_current_user),
):
    """
    Returns the current emission trajectory projection.

    Projects future emissions based on current behavior
    and recent trends. The trajectory line shows what
    happens if nothing changes.
    """
    trajectory = get_emission_trajectory(user_id, months)

    return success_response(
        data=trajectory,
        message=f"Trajectory projected for {months} months.",
    )


@router.get("/prediction/with-recommendations")
async def get_trajectory_with_recs(
    months: int = Query(default=12, ge=6, le=12),
    user_id: str = Depends(get_current_user),
):
    """
    Returns projected emissions if top recommendations are adopted.

    Shows the reduction path — what happens if the user follows
    through on recommended actions. The gap between this and
    the trajectory represents potential savings.
    """
    trajectory = get_trajectory_with_recommendations(user_id, months)

    return success_response(
        data=trajectory,
        message=f"Trajectory with recommendations projected for {months} months.",
    )