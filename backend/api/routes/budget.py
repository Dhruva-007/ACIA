"""
Carbon Budget API Routes — Feature 2: Carbon Budget System

Endpoints:
- GET /budget/current — Get current month budget progress
"""

from fastapi import APIRouter, Depends

from api.middleware.auth import get_current_user
from services.budget_service import get_current_budget
from main import success_response

router = APIRouter(tags=["Budget"])


@router.get("/budget/current")
async def get_budget_current(
    user_id: str = Depends(get_current_user),
):
    """
    Returns the current month carbon budget and progress.

    Budget is calculated as:
    budget_kg = current_monthly_footprint × 0.90
    (10% reduction target from current baseline)

    Response includes:
    - budget_kg: Monthly budget in kg CO₂e
    - used_kg: Estimated emissions so far this month
    - daily_rate_kg: Current daily emission rate
    - percentage_used: Progress as percentage of budget
    - status: on_track | slightly_over | significantly_over
    - days_remaining: Days left in the current month
    """
    budget = get_current_budget(user_id)

    return success_response(
        data=budget,
        message="Carbon budget retrieved successfully.",
    )