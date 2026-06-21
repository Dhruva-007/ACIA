"""
Carbon API Routes

Endpoints:
- POST /carbon/calculate  — Calculate carbon from lifestyle inputs
- GET  /carbon/summary    — Get current footprint summary
- GET  /carbon/history    — Get emission history for a period

These endpoints power the Dashboard and Tracking pages.
"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query

from api.middleware.auth import get_current_user
from domain.models.user_profile import UserLifestyleInput
from services.carbon_engine import calculate_carbon_breakdown, generate_carbon_summary
from infrastructure.firestore_client import get_firestore_service
from main import success_response, error_response

router = APIRouter(tags=["Carbon"])


@router.post("/carbon/calculate")
async def calculate_carbon(
    lifestyle: UserLifestyleInput,
    user_id: str = Depends(get_current_user),
):
    """
    Calculates carbon footprint from lifestyle inputs.

    Does NOT save the result — use /profile/setup or /profile
    for persistent calculations. This endpoint is for ad-hoc
    calculations and simulations.
    """
    breakdown = calculate_carbon_breakdown(lifestyle)

    return success_response(
        data=breakdown.model_dump(),
        message="Carbon footprint calculated successfully.",
    )


@router.get("/carbon/summary")
async def get_carbon_summary(
    user_id: str = Depends(get_current_user),
):
    """
    Returns current carbon footprint summary with breakdown,
    trends, and primary contributor analysis.

    This endpoint powers the Dashboard page.

    If no lifestyle data exists, returns an error guiding
    the user to complete onboarding.
    """
    db = get_firestore_service()

    # Get lifestyle data for fresh calculation
    lifestyle_data = db.get_lifestyle(user_id)
    if not lifestyle_data:
        return error_response(
            code="NO_LIFESTYLE_DATA",
            message="No lifestyle data found. Please complete onboarding first.",
            status_code=404,
        )

    # Build lifestyle input from stored data
    lifestyle_input = UserLifestyleInput(**lifestyle_data)
    breakdown = calculate_carbon_breakdown(lifestyle_input)

    # Get recent emissions for trend calculation
    recent_emissions = db.get_recent_emissions(user_id, limit=30)

    # Generate summary
    summary = generate_carbon_summary(breakdown, recent_emissions)

    return success_response(
        data=summary,
        message="Carbon summary retrieved successfully.",
    )


@router.get("/carbon/history")
async def get_carbon_history(
    period: str = Query(
        default="daily",
        pattern="^(daily|weekly|monthly|yearly)$",
        description="Time period granularity",
    ),
    user_id: str = Depends(get_current_user),
):
    """
    Returns emission history for the specified time period.

    Periods:
    - daily: last 30 days
    - weekly: last 12 weeks
    - monthly: last 12 months
    - yearly: all available data

    This endpoint powers the Tracking page timeline chart.
    """
    db = get_firestore_service()
    now = datetime.now(timezone.utc)

    # Determine date range based on period
    if period == "daily":
        start_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = now.strftime("%Y-%m-%d")
    elif period == "weekly":
        start_date = (now - timedelta(weeks=12)).strftime("%Y-%m-%d")
        end_date = now.strftime("%Y-%m-%d")
    elif period == "monthly":
        start_date = (now - timedelta(days=365)).strftime("%Y-%m-%d")
        end_date = now.strftime("%Y-%m-%d")
    else:  # yearly
        start_date = "2020-01-01"
        end_date = now.strftime("%Y-%m-%d")

    # Fetch emissions from Firestore
    emissions = db.get_emissions_range(user_id, start_date, end_date)

    # If no emissions exist, generate from current lifestyle
    if not emissions:
        lifestyle_data = db.get_lifestyle(user_id)
        if lifestyle_data:
            lifestyle_input = UserLifestyleInput(**lifestyle_data)
            breakdown = calculate_carbon_breakdown(lifestyle_input)

            # Generate synthetic daily data for the period
            days = min(30, (now - datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)).days + 1)
            for i in range(days):
                date = (now - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
                daily_variation = 1.0 + (hash(date) % 20 - 10) / 100  # ±10% variation
                record = {
                    "date": date,
                    "total_kg": round(breakdown.daily_kg * daily_variation, 2),
                    "breakdown": {
                        "transport_kg": round(breakdown.breakdown.transport_kg / 30 * daily_variation, 2),
                        "energy_kg": round(breakdown.breakdown.energy_kg / 30 * daily_variation, 2),
                        "food_kg": round(breakdown.breakdown.food_kg / 30 * daily_variation, 2),
                        "shopping_kg": round(breakdown.breakdown.shopping_kg / 30 * daily_variation, 2),
                    },
                }
                emissions.append(record)
                db.set_emission(user_id, date, record)

    # Build response data points
    data_points = []
    for emission in emissions:
        breakdown_data = emission.get("breakdown", {})
        data_points.append({
            "date": emission.get("date", ""),
            "total_kg": emission.get("total_kg", 0),
            "breakdown": {
                "transport_kg": breakdown_data.get("transport_kg", 0),
                "energy_kg": breakdown_data.get("energy_kg", 0),
                "food_kg": breakdown_data.get("food_kg", 0),
                "shopping_kg": breakdown_data.get("shopping_kg", 0),
            },
        })

    # Calculate aggregates
    total_kg = sum(dp["total_kg"] for dp in data_points)
    average_kg = total_kg / len(data_points) if data_points else 0

    return success_response(
        data={
            "period": period,
            "data_points": data_points,
            "average_kg": round(average_kg, 2),
            "total_kg": round(total_kg, 2),
        },
        message="Emission history retrieved successfully.",
    )