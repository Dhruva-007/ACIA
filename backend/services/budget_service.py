"""
Carbon Budget Service — Feature 2: Carbon Budget System

Calculates and tracks the user's monthly carbon budget.

The budget system transforms abstract emission numbers into
a concrete, actionable financial metaphor that any user can
understand. Every person understands a budget.

Budget calculation:
- Based on the user's current monthly footprint
- Applies a 10% monthly reduction target
- Shows daily rate and current month progress
- Indicates on-track / slightly over / significantly over

Behavioral science basis:
Setting specific, measurable targets is one of the strongest
predictors of behavior change (Locke & Latham goal-setting theory).
"""

from datetime import datetime, timezone
from typing import Any

from infrastructure.firestore_client import get_firestore_service
from domain.models.user_profile import UserLifestyleInput
from services.carbon_engine import calculate_carbon_breakdown

# ─── Budget Configuration ─────────────────────────────────────────────

# 10% reduction from current footprint as monthly target
BUDGET_REDUCTION_TARGET = 0.10

# Status thresholds (percentage of budget used)
SLIGHTLY_OVER_THRESHOLD = 100.0
SIGNIFICANTLY_OVER_THRESHOLD = 120.0


def get_current_budget(user_id: str) -> dict[str, Any]:
    """
    Calculates and returns the current month carbon budget status.

    The budget is:
    - Budget = current_monthly_footprint × (1 - BUDGET_REDUCTION_TARGET)
    - Used = (days elapsed / days in month) × budget
    - Progress = (calculated daily rate × days elapsed) vs budget

    Args:
        user_id: Firebase UID

    Returns:
        CarbonBudget dict with budget, used, status, and progress
    """
    db = get_firestore_service()
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")

    # Get current emission rate
    lifestyle_data = db.get_lifestyle(user_id)
    if not lifestyle_data:
        return _empty_budget(current_month)

    try:
        lifestyle_input = UserLifestyleInput(**lifestyle_data)
        breakdown = calculate_carbon_breakdown(lifestyle_input)
        current_monthly_kg = breakdown.total_kg
    except (ValueError, Exception):
        return _empty_budget(current_month)

    # Calculate budget
    budget_kg = round(current_monthly_kg * (1 - BUDGET_REDUCTION_TARGET), 1)

    # Calculate days elapsed in current month
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    days_elapsed = max(1, (now - first_of_month).days + 1)

    # Days remaining in month (approximate using 30-day month)
    days_in_month = 30
    days_remaining = max(0, days_in_month - days_elapsed)

    # Calculate used kg based on daily emission rate
    daily_rate = breakdown.daily_kg
    used_kg = round(daily_rate * days_elapsed, 1)

    # Calculate percentage used
    percentage_used = (used_kg / budget_kg * 100) if budget_kg > 0 else 0

    # Determine status
    if percentage_used <= SLIGHTLY_OVER_THRESHOLD:
        status = "on_track"
    elif percentage_used <= SIGNIFICANTLY_OVER_THRESHOLD:
        status = "slightly_over"
    else:
        status = "significantly_over"

    budget_data = {
        "month": current_month,
        "budget_kg": budget_kg,
        "used_kg": used_kg,
        "daily_rate_kg": round(daily_rate, 2),
        "status": status,
        "days_remaining": days_remaining,
        "percentage_used": round(percentage_used, 1),
    }

    # Persist to Firestore for history
    db.set_carbon_budget(user_id, current_month, budget_data)

    return budget_data


def _empty_budget(current_month: str) -> dict[str, Any]:
    """Returns a zero-state budget for users without lifestyle data."""
    return {
        "month": current_month,
        "budget_kg": 0,
        "used_kg": 0,
        "daily_rate_kg": 0,
        "status": "on_track",
        "days_remaining": 30,
        "percentage_used": 0,
    }