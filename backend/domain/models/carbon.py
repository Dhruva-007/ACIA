"""
Carbon Domain Models

Pydantic models for emission calculations, breakdowns,
summaries, and history data.

All carbon values are expressed in kg CO₂e (CO₂ equivalent)
to correctly account for methane, nitrous oxide, and other
greenhouse gases alongside CO₂.
"""

from pydantic import BaseModel
from typing import Literal, Optional


class EmissionBreakdown(BaseModel):
    """Per-category emission values in kg CO₂e per month."""
    transport_kg: float
    energy_kg: float
    food_kg: float
    shopping_kg: float


class EmissionBreakdownPercentage(BaseModel):
    """Per-category emission percentages (0-100)."""
    transport: float
    energy: float
    food: float
    shopping: float


class CarbonBreakdown(BaseModel):
    """
    Complete carbon calculation result.

    Contains both daily and monthly estimates derived from
    lifestyle inputs, along with category-wise breakdown
    and the primary contributor identification.
    """
    total_kg: float
    daily_kg: float
    breakdown: EmissionBreakdown
    breakdown_percentage: EmissionBreakdownPercentage
    primary_contributor: str
    primary_contributor_explanation: str
    calculated_at: str


class EmissionDataPoint(BaseModel):
    """Single CO₂e emission data point for history charts."""
    date: str
    total_kg: float
    breakdown: EmissionBreakdown


class EmissionHistory(BaseModel):
    """Emission history for a time period."""
    period: str
    data_points: list[EmissionDataPoint]
    average_kg: float
    total_kg: float


class CarbonSummary(BaseModel):
    """
    Current carbon footprint summary with contextual benchmarks.

    Extends the basic breakdown with trend analysis and benchmark
    comparisons to the global average and Paris Agreement target.

    trend values:
    - "new_user": Insufficient data for trend calculation (< 7 days)
    - "increasing": Emissions trending upward (slope > 2%)
    - "stable": Emissions relatively flat (slope within ±2%)
    - "decreasing": Emissions trending downward (slope < -2%)
    """
    today_kg: float
    this_week_kg: float
    this_month_kg: float
    this_year_kg: float
    breakdown: EmissionBreakdown
    breakdown_percentage: EmissionBreakdownPercentage
    primary_contributor: str
    primary_contributor_explanation: str
    trend: Literal["increasing", "stable", "decreasing", "new_user"]
    trend_percentage: Optional[float]
    trend_message: str
    # Benchmark context fields
    vs_global_average_percentage: float
    global_average_kg: float
    paris_target_kg: float