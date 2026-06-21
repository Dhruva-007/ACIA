"""
Carbon Impact Simulator Engine

Simulates the carbon impact of lifestyle changes:
1. Replace car trips with public transport
2. Reduce meat consumption
3. Work remotely
4. Switch energy source

Each simulation calculates:
- Monthly carbon saving in kg CO₂
- Annual carbon saving in kg CO₂
- Percentage improvement
- Current vs projected monthly emissions

All calculations use the same verified emission factors
as the Carbon Engine for consistency.
"""

from typing import Any

from domain.emission_factors.transport_factors import (
    TRANSPORT_FACTORS_PER_KM,
    get_transport_factor,
)
from domain.emission_factors.food_factors import MEAL_FACTORS
from domain.emission_factors.energy_factors import ENERGY_FACTORS_PER_KWH
from infrastructure.firestore_client import get_firestore_service
from domain.models.user_profile import UserLifestyleInput
from services.carbon_engine import calculate_carbon_breakdown


# ─── Simulation Scenario Labels ─────────────────────────────────────

SCENARIO_LABELS = {
    "replace_car_trips": "Replace Car Trips with Public Transport",
    "reduce_meat": "Reduce Meat Consumption",
    "remote_work": "Work Remotely",
    "switch_energy_source": "Switch to Renewable Energy",
}


def run_simulation(
    user_id: str,
    scenario_type: str,
    parameters: dict[str, Any],
) -> dict[str, Any]:
    """
    Runs a single simulation scenario.

    Loads the user's current emissions to calculate the
    baseline, then computes the impact of the specified
    lifestyle change.

    Args:
        user_id: Firebase UID
        scenario_type: One of the four scenario types
        parameters: Scenario-specific parameters

    Returns:
        SimulationResult dict

    Raises:
        ValueError: If scenario_type is invalid or parameters are missing
    """
    db = get_firestore_service()

    # Get current emissions for baseline
    lifestyle_data = db.get_lifestyle(user_id)
    if not lifestyle_data:
        raise ValueError("No lifestyle data found. Complete onboarding first.")

    lifestyle_input = UserLifestyleInput(**lifestyle_data)
    breakdown = calculate_carbon_breakdown(lifestyle_input)
    current_monthly = breakdown.total_kg

    # Run scenario-specific calculation
    if scenario_type == "replace_car_trips":
        result = _simulate_replace_car_trips(parameters, breakdown)
    elif scenario_type == "reduce_meat":
        result = _simulate_reduce_meat(parameters, breakdown)
    elif scenario_type == "remote_work":
        result = _simulate_remote_work(parameters, breakdown)
    elif scenario_type == "switch_energy_source":
        result = _simulate_switch_energy(parameters, breakdown)
    else:
        raise ValueError(f"Unknown scenario type: {scenario_type}")

    # Calculate percentage improvement
    monthly_saving = result["monthly_saving_kg"]
    percentage = (monthly_saving / current_monthly * 100) if current_monthly > 0 else 0

    return {
        "scenario_type": scenario_type,
        "scenario_label": SCENARIO_LABELS.get(scenario_type, scenario_type),
        "monthly_saving_kg": round(monthly_saving, 2),
        "annual_saving_kg": round(monthly_saving * 12, 2),
        "percentage_improvement": round(percentage, 1),
        "current_monthly_kg": round(current_monthly, 2),
        "projected_monthly_kg": round(current_monthly - monthly_saving, 2),
        "description": result["description"],
    }


def _simulate_replace_car_trips(
    params: dict[str, Any],
    breakdown: Any,
) -> dict[str, Any]:
    """
    Simulates replacing car trips with public transport.

    Parameters:
    - trips_per_week: Number of car trips to replace
    - one_way_distance_km: One-way distance per trip
    - current_vehicle: Vehicle type being replaced

    Calculation:
    current = trips × 2 × distance × vehicle_factor × 4.33 weeks/month
    transit = trips × 2 × distance × transit_factor × 4.33
    saving = current - transit
    """
    trips = params.get("trips_per_week", 2)
    distance = params.get("one_way_distance_km", 15)
    vehicle = params.get("current_vehicle", "car_petrol")

    vehicle_factor = TRANSPORT_FACTORS_PER_KM.get(vehicle, 0.21)
    transit_factor = TRANSPORT_FACTORS_PER_KM.get("public_transport", 0.089)

    weekly_current = trips * 2 * distance * vehicle_factor
    weekly_transit = trips * 2 * distance * transit_factor
    weekly_saving = weekly_current - weekly_transit
    monthly_saving = weekly_saving * 4.33

    description = (
        f"Replacing {trips} car trip(s) per week with public transport "
        f"for a {distance} km journey saves approximately "
        f"{monthly_saving:.1f} kg CO₂ per month. "
        f"Vehicle factor: {vehicle_factor} kg/km, "
        f"Transit factor: {transit_factor} kg/km "
        f"(Source: UK Government GHG Conversion Factors 2023)."
    )

    return {"monthly_saving_kg": monthly_saving, "description": description}


def _simulate_reduce_meat(
    params: dict[str, Any],
    breakdown: Any,
) -> dict[str, Any]:
    """
    Simulates reducing meat consumption.

    Parameters:
    - meals_changed_per_week: Number of meals to change
    - from_type: Current meat type (beef/chicken/pork)
    - to_type: Replacement type (vegetarian/vegan/fish)

    Calculation:
    current = meals × from_factor × 4.33
    replacement = meals × to_factor × 4.33
    saving = current - replacement
    """
    meals = params.get("meals_changed_per_week", 3)
    from_type = params.get("from_type", "beef")
    to_type = params.get("to_type", "vegetarian")

    from_factor = MEAL_FACTORS.get(from_type, 2.5)
    to_factor = MEAL_FACTORS.get(to_type, 0.3)

    weekly_saving = meals * (from_factor - to_factor)
    monthly_saving = weekly_saving * 4.33

    description = (
        f"Replacing {meals} {from_type} meal(s) per week with "
        f"{to_type} alternatives saves approximately "
        f"{monthly_saving:.1f} kg CO₂ per month. "
        f"{from_type.title()} meal: {from_factor} kg CO₂, "
        f"{to_type.title()} meal: {to_factor} kg CO₂ "
        f"(Source: IPCC AR6)."
    )

    return {"monthly_saving_kg": monthly_saving, "description": description}


def _simulate_remote_work(
    params: dict[str, Any],
    breakdown: Any,
) -> dict[str, Any]:
    """
    Simulates working remotely.

    Parameters:
    - remote_days_per_week: Number of WFH days
    - commute_distance_km: One-way commute distance
    - vehicle_type: Commute vehicle

    Calculation:
    daily_commute = distance × 2 × vehicle_factor
    weekly_saving = remote_days × daily_commute
    monthly_saving = weekly_saving × 4.33
    """
    remote_days = params.get("remote_days_per_week", 2)
    distance = params.get("commute_distance_km", 15)
    vehicle = params.get("vehicle_type", "car_petrol")

    vehicle_factor = TRANSPORT_FACTORS_PER_KM.get(vehicle, 0.21)

    daily_commute = distance * 2 * vehicle_factor
    weekly_saving = remote_days * daily_commute
    monthly_saving = weekly_saving * 4.33

    description = (
        f"Working from home {remote_days} day(s) per week eliminates "
        f"{distance} km of round-trip commute each day, saving "
        f"approximately {monthly_saving:.1f} kg CO₂ per month. "
        f"Vehicle factor: {vehicle_factor} kg/km "
        f"(Source: UK Government GHG Conversion Factors 2023)."
    )

    return {"monthly_saving_kg": monthly_saving, "description": description}


def _simulate_switch_energy(
    params: dict[str, Any],
    breakdown: Any,
) -> dict[str, Any]:
    """
    Simulates switching to renewable energy.

    Parameters:
    - current_source: Current energy source
    - target_source: Target energy source (renewable)
    - monthly_kwh: Monthly electricity consumption

    Calculation:
    current_monthly = kwh × current_factor
    target_monthly = kwh × target_factor
    saving = current - target
    """
    current_source = params.get("current_source", "grid_average")
    monthly_kwh = params.get("monthly_kwh", 300)

    current_factor = ENERGY_FACTORS_PER_KWH.get(current_source, 0.233)
    target_factor = ENERGY_FACTORS_PER_KWH.get("renewable", 0.012)

    current_monthly = monthly_kwh * current_factor
    target_monthly = monthly_kwh * target_factor
    monthly_saving = current_monthly - target_monthly

    description = (
        f"Switching from {current_source.replace('_', ' ')} to renewable energy "
        f"for {monthly_kwh} kWh/month saves approximately "
        f"{monthly_saving:.1f} kg CO₂ per month. "
        f"Current factor: {current_factor} kg/kWh, "
        f"Renewable factor: {target_factor} kg/kWh "
        f"(Source: UK Government GHG Conversion Factors 2023)."
    )

    return {"monthly_saving_kg": monthly_saving, "description": description}