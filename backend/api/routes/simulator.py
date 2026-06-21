"""
Carbon Impact Simulator API Routes

Endpoints:
- POST /simulator/run     — Run a single simulation scenario
- POST /simulator/compare — Compare multiple simulation scenarios
- POST /simulator/plan    — Multi-action scenario plan (Feature 4)

Powers the Simulator page single-scenario mode,
scenario comparison, and the Scenario Planner feature.

All calculations use verified CO₂e emission factors from
UK Government GHG Conversion Factors 2023 and IPCC AR6.
"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends

from api.middleware.auth import get_current_user
from domain.models.simulation import SimulationInput, ScenarioPlanRequest, ScenarioPlanResult, MilestoneProjection
from services.simulator_engine import run_simulation
from infrastructure.firestore_client import get_firestore_service
from domain.models.user_profile import UserLifestyleInput
from services.carbon_engine import calculate_carbon_breakdown
from main import success_response, error_response

router = APIRouter(tags=["Simulator"])

# ─── Milestone Targets (kg CO₂e/month) ──────────────────────────────

MILESTONE_TARGETS = [
    {"label": "Global Average (375 kg CO₂e/month)", "target_kg": 375.0},
    {"label": "EU Average (292 kg CO₂e/month)", "target_kg": 292.0},
    {"label": "Paris Agreement Target (167 kg CO₂e/month)", "target_kg": 167.0},
]


@router.post("/simulator/run")
async def run_simulation_endpoint(
    request: SimulationInput,
    user_id: str = Depends(get_current_user),
):
    """
    Runs a single lifestyle change simulation.

    Calculates the monthly and annual CO₂e reduction from
    a specific lifestyle change using the user's current
    emissions as baseline.

    Returns:
    - monthly_saving_kg: Monthly CO₂e reduction
    - annual_saving_kg: Annual CO₂e reduction
    - percentage_improvement: Reduction as % of total footprint
    - description: Plain-language explanation with emission factor sources
    """
    result = run_simulation(
        user_id=user_id,
        scenario_type=request.scenario_type,
        parameters=request.parameters,
    )

    return success_response(
        data=result,
        message="Simulation completed successfully.",
    )


@router.post("/simulator/compare")
async def compare_simulations(
    request: dict,
    user_id: str = Depends(get_current_user),
):
    """
    Compares multiple simulation scenarios side by side.

    Runs each scenario independently and returns results
    sorted by monthly saving (highest first).
    Highlights the best scenario.

    Request body:
    {
        "scenarios": [SimulationInput, ...]
    }
    """
    scenarios = request.get("scenarios", [])

    if not scenarios:
        return success_response(
            data={"scenarios": [], "best_scenario": None},
            message="No scenarios provided.",
        )

    results = []
    for scenario_data in scenarios:
        try:
            scenario_input = SimulationInput(**scenario_data)
            result = run_simulation(
                user_id=user_id,
                scenario_type=scenario_input.scenario_type,
                parameters=scenario_input.parameters,
            )
            results.append(result)
        except (ValueError, KeyError) as e:
            return error_response(
                code="SIMULATION_ERROR",
                message=f"Failed to run scenario: {str(e)}",
                status_code=400,
            )

    # Sort by monthly saving descending
    results.sort(key=lambda r: r["monthly_saving_kg"], reverse=True)
    best = results[0] if results else None

    return success_response(
        data={
            "scenarios": results,
            "best_scenario": best,
        },
        message=f"Compared {len(results)} scenarios.",
    )


@router.post("/simulator/plan")
async def create_scenario_plan(
    request: ScenarioPlanRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Creates a multi-action scenario plan (Feature 4: Scenario Planner).

    Accepts multiple lifestyle changes simultaneously and calculates:
    - Combined monthly and annual CO₂e savings
    - Combined percentage improvement
    - Milestone achievement dates (when user reaches global average,
      EU average, and Paris Agreement targets)
    - Plain-language plan summary

    The combined saving is capped at 80% of current emissions to
    remain realistic — complete elimination is not achievable through
    lifestyle changes alone.
    """
    db = get_firestore_service()

    # Get user's current monthly baseline
    lifestyle_data = db.get_lifestyle(user_id)
    if not lifestyle_data:
        return error_response(
            code="NO_LIFESTYLE_DATA",
            message="No lifestyle data found. Please complete onboarding first.",
            status_code=404,
        )

    lifestyle_input = UserLifestyleInput(**lifestyle_data)
    breakdown = calculate_carbon_breakdown(lifestyle_input)
    current_monthly = breakdown.total_kg

    # Run each scenario individually
    scenario_results = []
    for scenario_input in request.scenarios:
        try:
            result = run_simulation(
                user_id=user_id,
                scenario_type=scenario_input.scenario_type,
                parameters=scenario_input.parameters,
            )
            scenario_results.append(result)
        except (ValueError, KeyError) as e:
            return error_response(
                code="SIMULATION_ERROR",
                message=f"Failed to run scenario '{scenario_input.scenario_type}': {str(e)}",
                status_code=400,
            )

    # Calculate combined impact
    # Cap at 80% of current emissions — realistic maximum
    raw_combined_saving = sum(r["monthly_saving_kg"] for r in scenario_results)
    max_saving = current_monthly * 0.80
    combined_monthly_saving = min(raw_combined_saving, max_saving)
    combined_annual_saving = combined_monthly_saving * 12
    projected_monthly = max(current_monthly - combined_monthly_saving, current_monthly * 0.20)
    combined_percentage = (combined_monthly_saving / current_monthly * 100) if current_monthly > 0 else 0

    # Calculate milestone projections
    milestones = _calculate_milestones(
        current_monthly=current_monthly,
        projected_monthly=projected_monthly,
    )

    # Generate plan summary
    summary = _generate_plan_summary(
        scenario_count=len(scenario_results),
        combined_monthly_saving=combined_monthly_saving,
        combined_annual_saving=combined_annual_saving,
        combined_percentage=combined_percentage,
        projected_monthly=projected_monthly,
        milestones=milestones,
    )

    plan_result = ScenarioPlanResult(
        scenarios=scenario_results,
        combined_monthly_saving_kg=round(combined_monthly_saving, 1),
        combined_annual_saving_kg=round(combined_annual_saving, 1),
        combined_percentage_improvement=round(combined_percentage, 1),
        current_monthly_kg=round(current_monthly, 1),
        projected_monthly_kg=round(projected_monthly, 1),
        milestones=milestones,
        summary=summary,
    )

    return success_response(
        data=plan_result.model_dump(),
        message=f"Scenario plan created with {len(scenario_results)} actions.",
    )


def _calculate_milestones(
    current_monthly: float,
    projected_monthly: float,
) -> list[MilestoneProjection]:
    """
    Calculates when the user will reach each emission milestone.

    Uses the linear reduction rate implied by the plan to project
    when each target will be achieved.

    Args:
        current_monthly: Current monthly emissions in kg CO₂e
        projected_monthly: Projected monthly after all plan actions

    Returns:
        List of MilestoneProjection objects
    """
    now = datetime.now(timezone.utc)
    monthly_reduction = current_monthly - projected_monthly

    milestones = []
    for target in MILESTONE_TARGETS:
        target_kg = target["target_kg"]

        if current_monthly <= target_kg:
            # Already at or below this milestone
            milestones.append(MilestoneProjection(
                milestone_label=target["label"],
                target_kg_monthly=target_kg,
                estimated_months=0,
                estimated_date=now.strftime("%Y-%m-%d"),
                achievable=True,
            ))
            continue

        if monthly_reduction <= 0:
            # No reduction possible
            milestones.append(MilestoneProjection(
                milestone_label=target["label"],
                target_kg_monthly=target_kg,
                estimated_months=None,
                estimated_date=None,
                achievable=False,
            ))
            continue

        # Calculate months needed to reach target
        gap = current_monthly - target_kg
        months_needed = gap / monthly_reduction

        if months_needed > 120:
            # More than 10 years — not practically achievable
            milestones.append(MilestoneProjection(
                milestone_label=target["label"],
                target_kg_monthly=target_kg,
                estimated_months=None,
                estimated_date=None,
                achievable=False,
            ))
        else:
            months_int = round(months_needed)
            estimated_date = now + timedelta(days=30 * months_int)
            milestones.append(MilestoneProjection(
                milestone_label=target["label"],
                target_kg_monthly=target_kg,
                estimated_months=months_int,
                estimated_date=estimated_date.strftime("%Y-%m-%d"),
                achievable=True,
            ))

    return milestones


def _generate_plan_summary(
    scenario_count: int,
    combined_monthly_saving: float,
    combined_annual_saving: float,
    combined_percentage: float,
    projected_monthly: float,
    milestones: list[MilestoneProjection],
) -> str:
    """
    Generates a plain-language summary of the scenario plan.

    Args:
        scenario_count: Number of actions in the plan
        combined_monthly_saving: Total monthly CO₂e saving
        combined_annual_saving: Total annual CO₂e saving
        combined_percentage: Percentage reduction
        projected_monthly: Projected monthly emissions after plan
        milestones: List of milestone projections

    Returns:
        Human-readable summary string
    """
    summary_parts = [
        f"Your {scenario_count}-action plan could reduce your emissions by "
        f"{combined_monthly_saving:.1f} kg CO₂e per month "
        f"({combined_percentage:.1f}%), saving "
        f"{combined_annual_saving:.0f} kg CO₂e per year."
    ]

    # Find the nearest achievable milestone
    achievable = [m for m in milestones if m.achievable and m.estimated_months and m.estimated_months > 0]
    if achievable:
        nearest = min(achievable, key=lambda m: m.estimated_months or 999)
        summary_parts.append(
            f"At this rate, you could reach the {nearest.milestone_label} "
            f"in approximately {nearest.estimated_months} month(s)."
        )

    summary_parts.append(
        f"Your projected monthly footprint would be {projected_monthly:.1f} kg CO₂e."
    )

    return " ".join(summary_parts)