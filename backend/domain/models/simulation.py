"""
Simulation and Prediction Domain Models

Pydantic models for the Carbon Impact Simulator and
Future Carbon Prediction Engine.

All values use CO₂e (CO₂ equivalent) units including
methane and nitrous oxide converted using IPCC AR6 GWP100 factors.
"""

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal


# ─── Simulation Parameter Models ────────────────────────────────────

class ReplaceCarTripsParams(BaseModel):
    """Parameters for replacing car trips with public transport."""
    trips_per_week: int = Field(ge=1, le=30, description="Number of car trips to replace weekly")
    one_way_distance_km: float = Field(ge=0.1, le=500, description="One-way trip distance in km")
    current_vehicle: str = Field(description="Vehicle type being replaced")


class ReduceMeatParams(BaseModel):
    """Parameters for reducing meat consumption."""
    meals_changed_per_week: int = Field(ge=1, le=21, description="Number of meals to change per week")
    from_type: Literal["beef", "chicken", "pork"] = Field(description="Current meat type")
    to_type: Literal["vegetarian", "vegan", "fish"] = Field(description="Replacement meal type")


class RemoteWorkParams(BaseModel):
    """Parameters for working remotely."""
    remote_days_per_week: int = Field(ge=1, le=5, description="Number of WFH days per week")
    commute_distance_km: float = Field(ge=0.1, le=500, description="One-way commute distance in km")
    vehicle_type: str = Field(description="Commute vehicle type")


class SwitchEnergyParams(BaseModel):
    """Parameters for switching energy source."""
    current_source: Literal["grid_average", "gas_heavy"] = Field(description="Current energy source")
    target_source: Literal["renewable"] = Field(description="Target energy source")
    monthly_kwh: float = Field(ge=1, le=99999, description="Monthly electricity consumption in kWh")


# ─── Simulation Input / Result ───────────────────────────────────────

class SimulationInput(BaseModel):
    """
    Input for a single simulation scenario.

    The parameters field accepts any of the four scenario-specific
    parameter models as a dictionary. Validation is performed
    within the simulator engine service.
    """
    scenario_type: Literal[
        "replace_car_trips",
        "reduce_meat",
        "remote_work",
        "switch_energy_source",
    ] = Field(description="Type of lifestyle change to simulate")
    parameters: dict = Field(description="Scenario-specific parameters")


class SimulationResult(BaseModel):
    """
    Result of a single carbon impact simulation.

    All kg values are in kg CO₂e.
    """
    scenario_type: str
    scenario_label: str
    monthly_saving_kg: float = Field(description="Monthly CO₂e reduction in kg")
    annual_saving_kg: float = Field(description="Annual CO₂e reduction in kg")
    percentage_improvement: float = Field(description="Percentage reduction of total footprint")
    current_monthly_kg: float = Field(description="Current monthly total in kg CO₂e")
    projected_monthly_kg: float = Field(description="Projected monthly total after change in kg CO₂e")
    description: str = Field(description="Plain-language explanation with emission factor sources")


class SimulationComparison(BaseModel):
    """Result of comparing multiple simulation scenarios."""
    scenarios: list[SimulationResult]
    best_scenario: SimulationResult | None = None


# ─── Scenario Plan Models (Feature 4) ───────────────────────────────

class MilestoneProjection(BaseModel):
    """
    Projects when the user will reach a specific emission milestone.

    Used by the Scenario Planner to show target dates.
    """
    milestone_label: str = Field(description="Human-readable milestone name")
    target_kg_monthly: float = Field(description="Target monthly emissions in kg CO₂e")
    estimated_months: int | None = Field(
        default=None,
        description="Months until milestone is reached. None if not achievable in horizon."
    )
    estimated_date: str | None = Field(
        default=None,
        description="ISO date string of estimated milestone date. None if not achievable."
    )
    achievable: bool = Field(description="Whether this milestone is achievable with the plan")


class ScenarioPlanRequest(BaseModel):
    """
    Request body for multi-action scenario planning.

    Accepts a list of simulation inputs and calculates
    the combined impact across all selected actions.
    """
    scenarios: list[SimulationInput] = Field(
        min_length=1,
        max_length=4,
        description="List of lifestyle changes to combine into a plan"
    )


class ScenarioPlanResult(BaseModel):
    """
    Result of a multi-action scenario plan.

    Shows combined impact of all selected actions with milestone dates.
    All kg values are in kg CO₂e.
    """
    scenarios: list[SimulationResult] = Field(description="Individual scenario results")
    combined_monthly_saving_kg: float = Field(description="Total monthly saving from all actions")
    combined_annual_saving_kg: float = Field(description="Total annual saving from all actions")
    combined_percentage_improvement: float = Field(description="Combined percentage reduction")
    current_monthly_kg: float = Field(description="Current baseline monthly emissions")
    projected_monthly_kg: float = Field(description="Projected monthly after all actions")
    milestones: list[MilestoneProjection] = Field(description="Milestone achievement projections")
    summary: str = Field(description="Plain-language summary of the combined plan")


# ─── Prediction Models ───────────────────────────────────────────────

class PredictionDataPoint(BaseModel):
    """Single data point in an emission trajectory projection."""
    month: str = Field(description="Month in YYYY-MM format")
    projected_kg: float = Field(description="Projected monthly emissions in kg CO₂e", ge=0)
    label: str = Field(description="Human-readable month label (e.g. 'Jan 2025')")


class EmissionTrajectory(BaseModel):
    """
    Complete emission trajectory projection.

    Contains both the current trajectory (what happens if nothing changes)
    and the reduction path (what happens if recommendations are adopted).
    The gap between them represents potential savings.

    All kg values are in kg CO₂e.
    """
    horizon_months: int = Field(description="Projection horizon in months (6 or 12)")
    current_monthly_kg: float = Field(description="Current monthly baseline in kg CO₂e")
    trend: Literal["increasing", "stable", "decreasing"] = Field(
        description="Emission trend direction based on recent data"
    )
    trend_slope: float = Field(description="Daily emission slope in kg CO₂e/day")
    trajectory: list[PredictionDataPoint] = Field(
        description="Month-by-month projection at current behavior"
    )
    reduction_path: list[PredictionDataPoint] = Field(
        description="Month-by-month projection with top recommendations applied"
    )
    potential_total_saving_kg: float = Field(
        description="Total CO₂e savings over horizon if recommendations adopted"
    )
    potential_saving_percentage: float = Field(
        description="Percentage reduction vs current trajectory"
    )