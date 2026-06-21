"""
Future Carbon Prediction Engine Service

Orchestrates the complete prediction pipeline:
1. Load current lifestyle data and calculate baseline emissions
2. Load recent emission history for trend analysis
3. Calculate trend slope and direction
4. Project current trajectory forward (red line)
5. Calculate reduction from recommendations (green line)
6. Compute potential savings gap

The green line (reduction path) always shows a meaningful
alternative to the current trajectory. Even for new users
with no accepted recommendations, it shows the potential
impact of the top 3 available recommendations.

All values in kg CO₂e.
"""

from typing import Any

from domain.algorithms.prediction import (
    calculate_trend_slope,
    classify_trend,
    project_trajectory,
    project_reduction_path,
    calculate_potential_savings,
)
from infrastructure.firestore_client import get_firestore_service
from domain.models.user_profile import UserLifestyleInput
from services.carbon_engine import calculate_carbon_breakdown


def get_emission_trajectory(
    user_id: str,
    horizon_months: int = 12,
) -> dict[str, Any]:
    """
    Generates the current emission trajectory (red line).

    Projects future CO₂e emissions based on current lifestyle
    data and recent emission trend. The reduction path (green line)
    is calculated from accepted and completed recommendations.

    If no recommendations have been acted on, falls back to showing
    the potential of accepted+pending recommendations to ensure the
    green line always differs from the red line.

    Args:
        user_id: Firebase UID
        horizon_months: Forecast horizon (6 or 12 months)

    Returns:
        EmissionTrajectory dict with trajectory, reduction_path,
        and potential savings calculations
    """
    db = get_firestore_service()

    lifestyle_data = db.get_lifestyle(user_id)
    if not lifestyle_data:
        return _empty_trajectory(horizon_months)

    lifestyle_input = UserLifestyleInput(**lifestyle_data)
    breakdown = calculate_carbon_breakdown(lifestyle_input)
    current_daily = breakdown.daily_kg
    current_monthly = current_daily * 30

    recent = db.get_recent_emissions(user_id, limit=30)
    daily_values = [e.get("total_kg", current_daily) for e in recent]

    if len(daily_values) < 3:
        daily_values = [current_daily] * 14

    slope = calculate_trend_slope(daily_values)
    trend = classify_trend(slope)
    trajectory = project_trajectory(current_daily, slope, horizon_months)

    # For the base trajectory view, use only accepted/completed reductions
    monthly_reduction = _get_accepted_reduction(user_id, db)
    monthly_reduction = _apply_reduction_bounds(monthly_reduction, current_monthly)

    reduction_path = project_reduction_path(trajectory, monthly_reduction)
    total_saving, saving_pct = calculate_potential_savings(trajectory, reduction_path)

    return {
        "horizon_months": horizon_months,
        "current_monthly_kg": round(current_monthly, 1),
        "trend": trend,
        "trend_slope": round(slope, 4),
        "trajectory": trajectory,
        "reduction_path": reduction_path,
        "potential_total_saving_kg": total_saving,
        "potential_saving_percentage": saving_pct,
    }


def get_trajectory_with_recommendations(
    user_id: str,
    horizon_months: int = 12,
) -> dict[str, Any]:
    """
    Generates the optimistic trajectory (green line) showing what
    happens if the user's top recommendations are adopted.

    Uses all actionable recommendations (accepted + completed +
    top pending) to calculate the reduction. Always returns a
    meaningful green line — even for users who have accepted nothing,
    the top 3 pending recommendations are used as the potential.

    Args:
        user_id: Firebase UID
        horizon_months: Forecast horizon (6 or 12 months)

    Returns:
        EmissionTrajectory dict representing the best achievable path
    """
    db = get_firestore_service()

    lifestyle_data = db.get_lifestyle(user_id)
    if not lifestyle_data:
        return _empty_trajectory(horizon_months)

    lifestyle_input = UserLifestyleInput(**lifestyle_data)
    breakdown = calculate_carbon_breakdown(lifestyle_input)
    current_daily = breakdown.daily_kg
    current_monthly = current_daily * 30

    recent = db.get_recent_emissions(user_id, limit=30)
    daily_values = [e.get("total_kg", current_daily) for e in recent]

    if len(daily_values) < 3:
        daily_values = [current_daily] * 14

    slope = calculate_trend_slope(daily_values)
    trend = classify_trend(slope)
    trajectory = project_trajectory(current_daily, slope, horizon_months)

    # For the optimistic view, use all available recommendation potential
    monthly_reduction = _get_all_recommendation_reduction(
        user_id, db, current_monthly
    )
    monthly_reduction = _apply_reduction_bounds(monthly_reduction, current_monthly)

    reduction_path = project_reduction_path(trajectory, monthly_reduction)
    total_saving, saving_pct = calculate_potential_savings(trajectory, reduction_path)

    return {
        "horizon_months": horizon_months,
        "current_monthly_kg": round(current_monthly, 1),
        "trend": trend,
        "trend_slope": round(slope, 4),
        "trajectory": trajectory,
        "reduction_path": reduction_path,
        "potential_total_saving_kg": total_saving,
        "potential_saving_percentage": saving_pct,
    }


# ─── Internal Helpers ────────────────────────────────────────────────

def _get_accepted_reduction(user_id: str, db: Any) -> float:
    """
    Calculates total monthly CO₂e reduction from accepted and
    completed recommendations only.

    Used for the base trajectory view where only committed
    actions are counted toward the reduction path.
    """
    accepted = db.get_recommendations(user_id, status="accepted", limit=20)
    completed = db.get_recommendations(user_id, status="completed", limit=20)

    total = sum(rec.get("monthly_kg_reduction", 0) for rec in accepted + completed)
    return total


def _get_all_recommendation_reduction(
    user_id: str,
    db: Any,
    current_monthly_kg: float,
) -> float:
    """
    Calculates total monthly CO₂e reduction potential from all
    actionable recommendations (accepted + completed + pending).

    Critical fix: When the sum is zero (no recommendations evaluated),
    falls back to calculating the potential of the top 3 pending
    recommendations by composite score. This ensures the green line
    always shows a meaningful alternative path.

    Args:
        user_id: Firebase UID
        db: FirestoreService instance
        current_monthly_kg: Current monthly emissions for fallback scaling

    Returns:
        Total monthly reduction potential in kg CO₂e (always > 0)
    """
    all_recs = db.get_all_recommendations(user_id)

    actionable_statuses = {"accepted", "completed", "pending"}
    actionable = [
        rec for rec in all_recs
        if rec.get("status") in actionable_statuses
    ]

    total = sum(rec.get("monthly_kg_reduction", 0) for rec in actionable)

    if total <= 0:
        # No recommendations evaluated — use top 3 pending by composite score
        pending = [r for r in all_recs if r.get("status") == "pending"]
        pending_sorted = sorted(
            pending,
            key=lambda r: r.get("composite_score", 0),
            reverse=True,
        )
        top_3 = pending_sorted[:3]
        total = sum(rec.get("monthly_kg_reduction", 0) for rec in top_3)

    if total <= 0:
        # Last resort fallback: use 15% of current monthly as minimum potential
        total = current_monthly_kg * 0.15

    return total


def _apply_reduction_bounds(
    monthly_reduction: float,
    current_monthly_kg: float,
) -> float:
    """
    Applies safety bounds to the monthly reduction value.

    Upper bound: 40% of current monthly emissions
    (realistic maximum for lifestyle changes)

    Lower bound: 10% of current monthly emissions
    (minimum meaningful potential always shown)

    Args:
        monthly_reduction: Raw reduction value in kg CO₂e
        current_monthly_kg: User's current monthly emissions

    Returns:
        Bounded reduction value
    """
    max_reduction = current_monthly_kg * 0.40
    min_reduction = current_monthly_kg * 0.10

    return max(min_reduction, min(monthly_reduction, max_reduction))


def _empty_trajectory(horizon_months: int) -> dict[str, Any]:
    """
    Returns an empty trajectory structure for users with no data.

    Used when lifestyle data does not exist (pre-onboarding).
    """
    return {
        "horizon_months": horizon_months,
        "current_monthly_kg": 0,
        "trend": "stable",
        "trend_slope": 0.0,
        "trajectory": [],
        "reduction_path": [],
        "potential_total_saving_kg": 0.0,
        "potential_saving_percentage": 0.0,
    }