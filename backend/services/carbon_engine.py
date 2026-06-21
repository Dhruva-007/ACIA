"""
Carbon Engine Service

Calculates CO₂e emissions from lifestyle inputs and generates
carbon footprint summaries with contextual benchmarks.

All calculated values are expressed in kg CO₂e (CO₂ equivalent),
incorporating methane (CH₄), nitrous oxide (N₂O), and other
greenhouse gases alongside CO₂ using IPCC AR6 GWP100 factors.

Calculation methodology:
1. Transport: distance × mode_factor × frequency × carpooling + flights
2. Energy: monthly_kwh × source_factor × heating_factor × person_factor
3. Food: diet_daily_factor × waste_multiplier × local_food_factor × 30
4. Shopping: frequency_factor × second_hand_factor + electronics_amortised

Sources: UK Government GHG Conversion Factors 2023, IPCC AR6 WG3.
"""

from datetime import datetime, timezone
from typing import Any, Optional

# ─── Emission Benchmarks ─────────────────────────────────────────────
# Source: Our World in Data 2023, IPCC SR1.5 (2 tonnes CO₂e/year target)
GLOBAL_AVERAGE_MONTHLY_KG: float = 375.0
PARIS_TARGET_MONTHLY_KG: float = 167.0
from domain.emission_factors.transport_factors import (
    get_transport_factor,
    get_carpooling_factor,
    FLIGHT_FACTOR_PER_HOUR,
)
from domain.emission_factors.energy_factors import (
    get_energy_factor,
    get_per_person_factor,
    HEATING_FACTORS,
)
from domain.emission_factors.food_factors import (
    get_diet_daily_factor,
    get_local_food_factor,
    FOOD_WASTE_MULTIPLIERS,
)
from domain.emission_factors.shopping_factors import (
    get_shopping_monthly_factor,
    get_second_hand_factor,
    ELECTRONICS_FACTOR_PER_DEVICE,
)
from domain.models.user_profile import UserLifestyleInput
from domain.models.carbon import (
    CarbonBreakdown,
    EmissionBreakdown,
    EmissionBreakdownPercentage,
)


# ─── Category Explanations ──────────────────────────────────────────

CATEGORY_EXPLANATIONS: dict[str, str] = {
    "transport": (
        "Transportation is your largest emission source. "
        "This includes your daily commute and any air travel. "
        "Vehicle type and distance are the primary drivers — "
        "switching modes or reducing distance has immediate impact."
    ),
    "energy": (
        "Home energy consumption is your largest emission source. "
        "This includes electricity and heating. "
        "Your energy source type has the greatest influence — "
        "switching to renewables can reduce this category by up to 95%."
    ),
    "food": (
        "Food and diet is your largest emission source. "
        "Animal products, especially beef and dairy, produce significant "
        "methane (CH₄) which is accounted for in these CO₂e values. "
        "Even partial shifts toward plant-based meals make a large difference."
    ),
    "shopping": (
        "Shopping and consumer goods is your largest emission source. "
        "Every product carries a carbon footprint from manufacturing "
        "and shipping. Electronics are especially carbon-intensive — "
        "extending device life by one year makes a significant impact."
    ),
}


# ─── Per-Category Calculators ────────────────────────────────────────

def calculate_transport_daily(
    primary_mode: str,
    daily_distance_km: float,
    weekly_flight_hours: float,
    car_passengers_avg: int,
) -> float:
    """
    Calculates daily transport CO₂e emissions.

    Formula:
        daily_commute = distance × 2 (round trip) × mode_factor × carpooling_factor
        daily_flights = (weekly_flight_hours × flight_factor) / 7 days
        total = daily_commute + daily_flights

    Args:
        primary_mode: Transport mode key (e.g., 'car_petrol', 'public_transport')
        daily_distance_km: One-way commute distance in km
        weekly_flight_hours: Average weekly flight duration in hours
        car_passengers_avg: Total vehicle occupants including driver

    Returns:
        Daily transport CO₂e in kg
    """
    mode_factor = get_transport_factor(primary_mode)
    carpooling = get_carpooling_factor(car_passengers_avg)

    daily_commute = daily_distance_km * 2 * mode_factor * carpooling
    daily_flights = (weekly_flight_hours * FLIGHT_FACTOR_PER_HOUR) / 7

    return daily_commute + daily_flights


def calculate_energy_daily(
    household_size: int,
    energy_source: str,
    monthly_kwh: float,
    heating_type: str,
) -> float:
    """
    Calculates daily energy CO₂e emissions per person.

    Formula:
        daily_kwh = monthly_kwh / 30
        per_person_kwh = daily_kwh × per_person_factor(household_size)
        daily_energy = per_person_kwh × energy_source_factor × heating_factor

    Args:
        household_size: Number of people in the household
        energy_source: Energy source key (e.g., 'grid_average', 'renewable')
        monthly_kwh: Monthly electricity consumption in kWh
        heating_type: Heating system type key

    Returns:
        Daily energy CO₂e per person in kg
    """
    energy_factor = get_energy_factor(energy_source)
    person_factor = get_per_person_factor(household_size)
    heating_factor = HEATING_FACTORS.get(heating_type, 1.0)

    daily_kwh = monthly_kwh / 30
    per_person_kwh = daily_kwh * person_factor

    return per_person_kwh * energy_factor * heating_factor


def calculate_food_daily(
    diet_type: str,
    local_food_percentage: float,
    food_waste_level: str,
) -> float:
    """
    Calculates daily food CO₂e emissions.

    Includes methane from livestock (enteric fermentation) via
    IPCC AR6 GWP100 factors embedded in the diet factor values.

    Formula:
        daily_food = diet_daily_factor × waste_multiplier × local_food_factor

    Args:
        diet_type: Diet type key (e.g., 'omnivore', 'vegan')
        local_food_percentage: Percentage of food sourced locally (0-100)
        food_waste_level: Waste level key ('low', 'medium', 'high')

    Returns:
        Daily food CO₂e in kg
    """
    diet_factor = get_diet_daily_factor(diet_type)
    waste_multiplier = FOOD_WASTE_MULTIPLIERS.get(food_waste_level, 1.0)
    local_factor = get_local_food_factor(local_food_percentage)

    return diet_factor * waste_multiplier * local_factor


def calculate_shopping_daily(
    monthly_spend_category: str,
    second_hand_percentage: float,
    electronics_yearly: int,
) -> float:
    """
    Calculates daily shopping CO₂e emissions.

    Formula:
        monthly_goods = frequency_factor × second_hand_factor
        monthly_electronics = (electronics_yearly × electronics_factor) / 12
        daily_shopping = (monthly_goods + monthly_electronics) / 30

    Args:
        monthly_spend_category: Shopping frequency key
        second_hand_percentage: Percentage of purchases that are second-hand
        electronics_yearly: Number of electronic devices purchased per year

    Returns:
        Daily shopping CO₂e in kg
    """
    shopping_factor = get_shopping_monthly_factor(monthly_spend_category)
    second_hand_factor = get_second_hand_factor(second_hand_percentage)

    monthly_goods = shopping_factor * second_hand_factor
    monthly_electronics = (electronics_yearly * ELECTRONICS_FACTOR_PER_DEVICE) / 12
    monthly_total = monthly_goods + monthly_electronics

    return monthly_total / 30


# ─── Main Calculation Entry Point ────────────────────────────────────

def calculate_carbon_breakdown(
    lifestyle: UserLifestyleInput,
) -> CarbonBreakdown:
    """
    Calculates the complete CO₂e footprint breakdown from lifestyle inputs.

    This is the single entry point for all carbon calculations.
    All inputs are validated by Pydantic before reaching this function.

    Args:
        lifestyle: Validated lifestyle inputs across all four categories

    Returns:
        CarbonBreakdown with monthly totals, category breakdown,
        percentages, and primary contributor with explanation
    """
    transport_daily = calculate_transport_daily(
        primary_mode=lifestyle.transport.primary_mode,
        daily_distance_km=lifestyle.transport.daily_distance_km,
        weekly_flight_hours=lifestyle.transport.weekly_flight_hours,
        car_passengers_avg=lifestyle.transport.car_passengers_avg,
    )

    energy_daily = calculate_energy_daily(
        household_size=lifestyle.energy.household_size,
        energy_source=lifestyle.energy.energy_source,
        monthly_kwh=lifestyle.energy.monthly_kwh,
        heating_type=lifestyle.energy.heating_type,
    )

    food_daily = calculate_food_daily(
        diet_type=lifestyle.food.diet_type,
        local_food_percentage=lifestyle.food.local_food_percentage,
        food_waste_level=lifestyle.food.food_waste_level,
    )

    shopping_daily = calculate_shopping_daily(
        monthly_spend_category=lifestyle.shopping.monthly_spend_category,
        second_hand_percentage=lifestyle.shopping.second_hand_percentage,
        electronics_yearly=lifestyle.shopping.electronics_yearly,
    )

    total_daily = transport_daily + energy_daily + food_daily + shopping_daily

    # Monthly estimates for display
    breakdown = EmissionBreakdown(
        transport_kg=round(transport_daily * 30, 2),
        energy_kg=round(energy_daily * 30, 2),
        food_kg=round(food_daily * 30, 2),
        shopping_kg=round(shopping_daily * 30, 2),
    )

    total_monthly = round(total_daily * 30, 2)

    # Percentage breakdown
    if total_monthly > 0:
        percentages = EmissionBreakdownPercentage(
            transport=round((breakdown.transport_kg / total_monthly) * 100, 1),
            energy=round((breakdown.energy_kg / total_monthly) * 100, 1),
            food=round((breakdown.food_kg / total_monthly) * 100, 1),
            shopping=round((breakdown.shopping_kg / total_monthly) * 100, 1),
        )
    else:
        percentages = EmissionBreakdownPercentage(
            transport=25.0, energy=25.0, food=25.0, shopping=25.0
        )

    # Identify primary contributor
    category_values = {
        "transport": breakdown.transport_kg,
        "energy": breakdown.energy_kg,
        "food": breakdown.food_kg,
        "shopping": breakdown.shopping_kg,
    }
    primary = max(category_values, key=category_values.get)  # type: ignore
    explanation = CATEGORY_EXPLANATIONS[primary]

    return CarbonBreakdown(
        total_kg=total_monthly,
        daily_kg=round(total_daily, 2),
        breakdown=breakdown,
        breakdown_percentage=percentages,
        primary_contributor=primary,
        primary_contributor_explanation=explanation,
        calculated_at=datetime.now(timezone.utc).isoformat(),
    )


# ─── Summary Generation ──────────────────────────────────────────────

def generate_carbon_summary(
    latest_breakdown: CarbonBreakdown,
    recent_emissions: list[dict],
) -> dict[str, Any]:
    """
    Generates a carbon summary with trend analysis and benchmarks.

    Handles the "new_user" state gracefully when insufficient
    data exists for trend calculation (fewer than 7 data points).

    Benchmark comparisons:
    - Global average: ~375 kg CO₂e/month (Our World in Data 2023)
    - Paris target: ~167 kg CO₂e/month (IPCC SR1.5, 2 tonnes/year)

    Args:
        latest_breakdown: Most recent carbon calculation result
        recent_emissions: List of recent daily emission records
                          from Firestore (chronological order)

    Returns:
        Dictionary matching the CarbonSummary schema, including
        trend state, trend message, and benchmark comparison fields
    """
    daily_kg = latest_breakdown.daily_kg
    monthly_kg = latest_breakdown.total_kg

    # ─── Trend Analysis ─────────────────────────────────────────────

    trend: str
    trend_percentage: Optional[float]
    trend_message: str

    if len(recent_emissions) < 7:
        # Insufficient data — new user state
        trend = "new_user"
        trend_percentage = None
        trend_message = (
            f"Track for {7 - len(recent_emissions)} more day"
            f"{'s' if 7 - len(recent_emissions) != 1 else ''} "
            f"to see your weekly trend."
        )
    else:
        recent_7 = recent_emissions[-7:]
        previous_7 = (
            recent_emissions[-14:-7]
            if len(recent_emissions) >= 14
            else recent_emissions[:7]
        )

        recent_avg = sum(e.get("total_kg", 0) for e in recent_7) / len(recent_7)
        previous_avg = (
            sum(e.get("total_kg", 0) for e in previous_7) / len(previous_7)
            if previous_7
            else recent_avg
        )

        if previous_avg > 0:
            raw_pct = ((recent_avg - previous_avg) / previous_avg) * 100
            trend_percentage = round(raw_pct, 1)

            if trend_percentage > 2:
                trend = "increasing"
                trend_message = (
                    f"Emissions up {trend_percentage:.1f}% vs last week. "
                    f"Check your recommendations to reverse this trend."
                )
            elif trend_percentage < -2:
                trend = "decreasing"
                trend_message = (
                    f"Emissions down {abs(trend_percentage):.1f}% vs last week. "
                    f"Great progress — keep it up!"
                )
            else:
                trend = "stable"
                trend_message = "Emissions stable this week."
        else:
            trend = "stable"
            trend_percentage = 0.0
            trend_message = "Emissions stable this week."

    # ─── Benchmark Comparison ────────────────────────────────────────

    vs_global = round(
        ((monthly_kg - GLOBAL_AVERAGE_MONTHLY_KG) / GLOBAL_AVERAGE_MONTHLY_KG) * 100,
        1,
    )

    return {
        "today_kg": round(daily_kg, 2),
        "this_week_kg": round(daily_kg * 7, 2),
        "this_month_kg": round(monthly_kg, 2),
        "this_year_kg": round(daily_kg * 365, 2),
        "breakdown": latest_breakdown.breakdown.model_dump(),
        "breakdown_percentage": latest_breakdown.breakdown_percentage.model_dump(),
        "primary_contributor": latest_breakdown.primary_contributor,
        "primary_contributor_explanation": latest_breakdown.primary_contributor_explanation,
        "trend": trend,
        "trend_percentage": trend_percentage,
        "trend_message": trend_message,
        "vs_global_average_percentage": vs_global,
        "global_average_kg": GLOBAL_AVERAGE_MONTHLY_KG,
        "paris_target_kg": PARIS_TARGET_MONTHLY_KG,
    }