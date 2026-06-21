"""
Profile API Routes

Endpoints:
- POST /profile/setup        — Initial onboarding profile setup
- GET  /profile              — Retrieve current profile with review status
- PUT  /profile              — Full lifestyle update (re-onboarding)
- PUT  /profile/quick-update — Single-category lightweight update

The profile review due flag supports adaptive re-onboarding:
after 30 days, the API signals that the user should review
their lifestyle inputs to keep CO₂e calculations accurate.
"""

from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends

from api.middleware.auth import get_current_user
from config import get_settings
from domain.models.user_profile import ProfileSetupRequest, UserLifestyleInput
from services.carbon_engine import calculate_carbon_breakdown
from infrastructure.firestore_client import get_firestore_service
from main import success_response, error_response

router = APIRouter(tags=["Profile"])


def _is_profile_review_due(profile: dict[str, Any]) -> bool:
    """
    Determines whether the user is due for a lifestyle profile review.

    Returns True if:
    - last_profile_review has never been set, OR
    - last_profile_review is older than profile_review_days (default 30)

    Args:
        profile: Profile document dict from Firestore

    Returns:
        True if review is due, False otherwise
    """
    settings = get_settings()
    last_review_str = profile.get("last_profile_review", "")

    if not last_review_str:
        return True  # Never reviewed — prompt immediately

    try:
        last_review = datetime.fromisoformat(last_review_str)
        threshold = timedelta(days=settings.profile_review_days)
        return datetime.now(timezone.utc) - last_review > threshold
    except ValueError:
        return True  # Unparseable timestamp — treat as never reviewed


@router.post("/profile/setup")
async def setup_profile(
    request: ProfileSetupRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Initial profile setup after onboarding completion.

    Performs six initialization steps:
    1. Saves lifestyle inputs across all four categories
    2. Calculates initial CO₂e footprint breakdown
    3. Saves today's emission record
    4. Initializes behavioral weights to neutral priors
    5. Marks onboarding complete with profile review timestamp
    6. Initializes CII score at baseline

    Returns:
        CarbonBreakdown with initial CO₂e calculation results
    """
    db = get_firestore_service()
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    now_iso = now.isoformat()

    # 1. Save lifestyle inputs
    lifestyle_data = {
        "transport": request.transport.model_dump(),
        "energy": request.energy.model_dump(),
        "food": request.food.model_dump(),
        "shopping": request.shopping.model_dump(),
    }
    db.set_lifestyle(user_id, lifestyle_data)

    # 2. Calculate CO₂e breakdown
    lifestyle_input = UserLifestyleInput(
        transport=request.transport,
        energy=request.energy,
        food=request.food,
        shopping=request.shopping,
    )
    breakdown = calculate_carbon_breakdown(lifestyle_input)

    # 3. Save today's emission record
    db.set_emission(user_id, today_str, {
        "date": today_str,
        "total_kg": breakdown.daily_kg,
        "breakdown": breakdown.breakdown.model_dump(),
        "breakdown_percentage": breakdown.breakdown_percentage.model_dump(),
        "primary_contributor": breakdown.primary_contributor,
    })

    # 4. Initialize behavioral weights to neutral priors
    db.set_behavioral_weights(user_id, {
        "transport": 0.7,
        "energy": 0.7,
        "food": 0.7,
        "shopping": 0.7,
        "sub_weights": {
            "cycling": 0.5,
            "public_transport": 0.5,
            "remote_work": 0.5,
            "diet_change": 0.5,
            "energy_efficiency": 0.5,
            "second_hand": 0.5,
            "carpooling": 0.5,
            "reduce_flights": 0.5,
            "heating_reduction": 0.5,
            "local_food": 0.5,
            "reduce_waste": 0.5,
            "reduce_electronics": 0.5,
            "mindful_shopping": 0.5,
        },
    })

    # 5. Mark onboarding complete with profile review timestamp
    db.set_profile(user_id, {
        "uid": user_id,
        "onboarding_completed": True,
        "last_profile_review": now_iso,
        "created_at": now_iso,
        "updated_at": now_iso,
    })

    # 6. Initialize CII score at baseline
    current_month = now.strftime("%Y-%m")
    db.set_cii_score(user_id, current_month, {
        "month": current_month,
        "composite_score": 25,
        "sub_scores": {
            "awareness_score": 50,
            "action_score": 0,
            "consistency_score": 0,
            "improvement_score": 0,
        },
    })

    return success_response(
        data=breakdown.model_dump(),
        message="Profile setup complete. Your CO₂e footprint has been calculated.",
    )


@router.get("/profile")
async def get_profile(
    user_id: str = Depends(get_current_user),
):
    """
    Retrieves current user profile, lifestyle data, and review status.

    Includes profile_review_due flag to support the adaptive
    re-onboarding banner on the Dashboard. When True, the frontend
    should prompt the user to review their lifestyle inputs.

    Returns:
        Profile document, lifestyle inputs, and profile_review_due flag
    """
    db = get_firestore_service()

    profile = db.get_profile(user_id)
    if not profile:
        return error_response(
            code="PROFILE_NOT_FOUND",
            message="Profile not found. Please complete onboarding.",
            status_code=404,
        )

    lifestyle = db.get_lifestyle(user_id)
    review_due = _is_profile_review_due(profile)

    return success_response(
        data={
            "profile": profile,
            "lifestyle": lifestyle,
            "profile_review_due": review_due,
        },
        message="Profile retrieved successfully.",
    )


@router.put("/profile")
async def update_profile(
    request: ProfileSetupRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Full lifestyle update — recalculates CO₂e footprint.

    Called when the user completes a full profile review through
    the re-onboarding flow. Updates all four categories and
    resets the last_profile_review timestamp.

    Returns:
        Updated CarbonBreakdown with recalculated CO₂e values
    """
    db = get_firestore_service()
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    lifestyle_data = {
        "transport": request.transport.model_dump(),
        "energy": request.energy.model_dump(),
        "food": request.food.model_dump(),
        "shopping": request.shopping.model_dump(),
    }
    db.set_lifestyle(user_id, lifestyle_data)

    lifestyle_input = UserLifestyleInput(
        transport=request.transport,
        energy=request.energy,
        food=request.food,
        shopping=request.shopping,
    )
    breakdown = calculate_carbon_breakdown(lifestyle_input)

    db.set_emission(user_id, today_str, {
        "date": today_str,
        "total_kg": breakdown.daily_kg,
        "breakdown": breakdown.breakdown.model_dump(),
        "breakdown_percentage": breakdown.breakdown_percentage.model_dump(),
        "primary_contributor": breakdown.primary_contributor,
    })

    # Reset the profile review timestamp
    db.set_profile(user_id, {
        "last_profile_review": now.isoformat(),
        "updated_at": now.isoformat(),
    })

    return success_response(
        data=breakdown.model_dump(),
        message="Profile updated and CO₂e footprint recalculated.",
    )


@router.put("/profile/quick-update")
async def quick_update_profile(
    request: dict,
    user_id: str = Depends(get_current_user),
):
    """
    Single-category lightweight profile update.

    Called from the adaptive re-onboarding modal when the user
    confirms that one specific category has changed (e.g., they
    switched from driving to public transport).

    Accepts a partial lifestyle update with only the changed
    category. Merges with existing lifestyle data, recalculates
    CO₂e, and resets the review timestamp.

    Request body:
        category: str (one of 'transport', 'energy', 'food', 'shopping')
        data: dict (category-specific fields to update)

    Returns:
        Updated CarbonBreakdown with recalculated CO₂e values
    """
    db = get_firestore_service()
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    category = request.get("category")
    update_data = request.get("data", {})

    valid_categories = ("transport", "energy", "food", "shopping")
    if category not in valid_categories:
        return error_response(
            code="INVALID_CATEGORY",
            message=f"Category must be one of: {', '.join(valid_categories)}",
            status_code=400,
        )

    # Load existing lifestyle and merge the single-category update
    existing_lifestyle = db.get_lifestyle(user_id) or {}
    existing_lifestyle[category] = {
        **existing_lifestyle.get(category, {}),
        **update_data,
    }

    # Validate the merged lifestyle by constructing the full model
    try:
        lifestyle_input = UserLifestyleInput(**existing_lifestyle)
    except Exception as exc:
        return error_response(
            code="VALIDATION_ERROR",
            message=f"Invalid lifestyle data: {str(exc)}",
            status_code=422,
        )

    # Save merged lifestyle
    db.set_lifestyle(user_id, {
        "transport": lifestyle_input.transport.model_dump(),
        "energy": lifestyle_input.energy.model_dump(),
        "food": lifestyle_input.food.model_dump(),
        "shopping": lifestyle_input.shopping.model_dump(),
    })

    # Recalculate CO₂e with updated inputs
    breakdown = calculate_carbon_breakdown(lifestyle_input)

    db.set_emission(user_id, today_str, {
        "date": today_str,
        "total_kg": breakdown.daily_kg,
        "breakdown": breakdown.breakdown.model_dump(),
        "breakdown_percentage": breakdown.breakdown_percentage.model_dump(),
        "primary_contributor": breakdown.primary_contributor,
    })

    # Reset profile review timestamp
    db.set_profile(user_id, {
        "last_profile_review": now.isoformat(),
        "updated_at": now.isoformat(),
    })

    return success_response(
        data={
            "updated_category": category,
            "breakdown": breakdown.model_dump(),
        },
        message=f"{category.title()} profile updated and CO₂e footprint recalculated.",
    )