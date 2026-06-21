"""
Prediction Algorithms

Calculates emission trends and projects future trajectories.

Methodology:
1. Linear regression on recent emission data to find trend slope
2. Project forward using trend slope for each future month
3. Calculate reduction path by applying recommendation impacts
4. Gap between trajectory and reduction path = potential savings

Design constraints:
- Reduction path never drops below 20% of the trajectory value
  (realistic minimum — even maximum lifestyle changes cannot
   eliminate all emissions)
- Compounding is conservative (1% per month) to avoid unrealistic
  divergence between trajectory and reduction path
- All functions are pure — no database access, no side effects

All values are in kg CO₂e.
"""

from datetime import datetime, timezone, timedelta
from typing import Any


def calculate_trend_slope(daily_emissions: list[float]) -> float:
    """
    Calculates the linear regression slope of daily CO₂e emissions.

    Uses ordinary least squares (OLS) linear regression to determine
    the daily rate of change. A positive slope indicates increasing
    emissions; negative indicates decreasing.

    Args:
        daily_emissions: Chronologically ordered list of daily kg CO₂e values.
                         Minimum 2 values required; fewer returns 0.0.

    Returns:
        Slope in kg CO₂e per day. Returns 0.0 if insufficient data
        or if all values are identical (zero denominator).
    """
    n = len(daily_emissions)
    if n < 2:
        return 0.0

    x_values = list(range(n))
    x_mean = sum(x_values) / n
    y_mean = sum(daily_emissions) / n

    numerator = sum(
        (x - x_mean) * (y - y_mean)
        for x, y in zip(x_values, daily_emissions)
    )
    denominator = sum((x - x_mean) ** 2 for x in x_values)

    if denominator == 0:
        return 0.0

    return numerator / denominator


def classify_trend(slope: float) -> str:
    """
    Classifies a trend slope into a human-readable direction category.

    Thresholds:
    - > +0.02 kg/day: "increasing" (meaningful upward trend)
    - < -0.02 kg/day: "decreasing" (meaningful downward trend)
    - between ±0.02:  "stable" (within daily variation noise)

    Args:
        slope: Daily emission slope from calculate_trend_slope()

    Returns:
        One of 'increasing', 'stable', or 'decreasing'
    """
    if slope > 0.02:
        return "increasing"
    elif slope < -0.02:
        return "decreasing"
    return "stable"


def project_trajectory(
    current_daily_kg: float,
    trend_slope: float,
    horizon_months: int,
) -> list[dict[str, Any]]:
    """
    Projects monthly CO₂e emissions for the specified horizon.

    For each future month, projects the daily emission rate forward
    using the current rate plus accumulated trend slope, then converts
    to monthly total. Daily rate is floored at 0 to prevent negatives
    in the raw trajectory (physical minimum).

    Args:
        current_daily_kg: Current daily emission rate in kg CO₂e
        trend_slope: Daily rate of change from calculate_trend_slope()
        horizon_months: Number of months to project (typically 6 or 12)

    Returns:
        List of dicts with keys: month (YYYY-MM), projected_kg, label (MMM YYYY)
    """
    now = datetime.now(timezone.utc)
    trajectory: list[dict[str, Any]] = []

    for i in range(1, horizon_months + 1):
        future_date = now + timedelta(days=30 * i)
        days_elapsed = 30 * i

        projected_daily = max(0.0, current_daily_kg + (trend_slope * days_elapsed))
        projected_monthly = round(projected_daily * 30, 1)

        trajectory.append({
            "month": future_date.strftime("%Y-%m"),
            "projected_kg": projected_monthly,
            "label": future_date.strftime("%b %Y"),
        })

    return trajectory


def project_reduction_path(
    trajectory: list[dict[str, Any]],
    monthly_reduction_kg: float,
) -> list[dict[str, Any]]:
    """
    Projects a reduction path by applying recommendation impacts
    to the base trajectory.

    Key design constraints:
    1. If monthly_reduction_kg is 0 or negative, returns a path
       that is 10% below the trajectory (always shows some potential)
    2. Reduction compounds at 1% per month (conservative and realistic)
    3. Reduction path is floored at 20% of the trajectory value —
       this prevents the green line from reaching zero, which would
       be physically impossible and misleading to users

    The 20% floor reflects the reality that even with maximum lifestyle
    changes, background emissions (infrastructure, supply chain,
    public services) cannot be eliminated at the individual level.

    Args:
        trajectory: Base trajectory from project_trajectory()
        monthly_reduction_kg: Total monthly kg CO₂e savings from
                               recommendations. May be 0 if no
                               recommendations have been evaluated yet.

    Returns:
        List of dicts with same structure as trajectory, but with
        reduced projected_kg values that always stay above the floor.
    """
    if not trajectory:
        return []

    # If no explicit reduction, show a default 10% potential
    # so the green line always differs meaningfully from the red line
    effective_base_reduction = (
        monthly_reduction_kg
        if monthly_reduction_kg > 0
        else trajectory[0]["projected_kg"] * 0.10
    )

    reduction_path: list[dict[str, Any]] = []

    for i, point in enumerate(trajectory):
        trajectory_kg = point["projected_kg"]

        # Floor: reduction path cannot drop below 20% of trajectory
        minimum_floor = trajectory_kg * 0.20

        # Apply conservative compounding (1% per month)
        compounding = 1.0 + (i * 0.01)
        compounded_reduction = effective_base_reduction * compounding

        # Cap reduction so it cannot exceed 80% of trajectory value
        # (ensures floor is never breached by the subtraction)
        capped_reduction = min(compounded_reduction, trajectory_kg * 0.80)

        reduced_monthly = max(minimum_floor, trajectory_kg - capped_reduction)

        reduction_path.append({
            "month": point["month"],
            "projected_kg": round(reduced_monthly, 1),
            "label": point["label"],
        })

    return reduction_path


def calculate_potential_savings(
    trajectory: list[dict[str, Any]],
    reduction_path: list[dict[str, Any]],
) -> tuple[float, float]:
    """
    Calculates total potential CO₂e savings over the full horizon.

    Args:
        trajectory: Base trajectory projection
        reduction_path: Reduction path projection

    Returns:
        Tuple of (total_saving_kg, saving_percentage):
        - total_saving_kg: Sum of monthly gaps between trajectory
          and reduction path over the full horizon
        - saving_percentage: total_saving_kg as a percentage of
          total_trajectory_kg, rounded to 1 decimal place
    """
    total_trajectory = sum(p["projected_kg"] for p in trajectory)
    total_reduction_path = sum(p["projected_kg"] for p in reduction_path)

    total_saving = total_trajectory - total_reduction_path
    percentage = (
        (total_saving / total_trajectory * 100)
        if total_trajectory > 0
        else 0.0
    )

    return round(total_saving, 1), round(percentage, 1)