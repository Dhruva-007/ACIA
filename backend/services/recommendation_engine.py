"""
Recommendation Engine Service

Generates personalized, ranked recommendations using:
1. User lifestyle data, emissions, and behavioral weights
2. Per-template history to prevent re-showing rejected recs
3. Five-dimension scoring (adoption_probability weighted highest)
4. Composite ranking with plain-language reasoning
5. Personalized descriptions with user-specific numbers

Recommendation Memory System:
Each template has a unique ID tracked in Firestore under
users/{uid}/recommendation_history/{template_id}. A template
is excluded from generation if:
- rejection_count >= 2 (explicitly rejected twice)
- last_status == "completed" (user has already done this)
- shown within last 7 days and still pending (avoid repetition)

This ensures ACIA never shows the same rejected recommendation
repeatedly, which is the primary UX failure this engine resolves.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

from domain.algorithms.scoring import (
    score_carbon_impact,
    score_adoption_probability,
    score_cost,
    score_convenience,
    score_lifestyle_compatibility,
    calculate_composite_score,
)
from infrastructure.firestore_client import get_firestore_service


# ─── Recommendation Templates ─────────────────────────────────────────
# Each template has a stable unique 'id' used as the Firestore document
# key in the recommendation_history collection. This ID must never
# change once deployed, as it is the primary key for the memory system.

RECOMMENDATION_TEMPLATES: list[dict[str, Any]] = [
    # ── Transport ──────────────────────────────────────────────────────
    {
        "id": "transport_public_transit_01",
        "title": "Use public transport for commuting",
        "description": (
            "Replace {trips_per_week} car trips per week with bus or metro. "
            "Public transport produces 60-75% less CO₂e per km than a single-occupancy car, "
            "saving approximately {monthly_saving:.1f} kg CO₂e/month for your commute."
        ),
        "description_fallback": (
            "Replace car trips with bus or metro for your daily commute. "
            "Public transport produces 60-75% less CO₂e per km than a single-occupancy car."
        ),
        "category": "transport",
        "sub_type": "public_transport",
        "cost_level": "low",
        "disruption_level": "medium",
        "reduction_factor": 0.13,
    },
    {
        "id": "transport_cycling_01",
        "title": "Cycle or walk for short trips",
        "description": (
            "Replace car trips under 5 km with cycling or walking. "
            "Zero CO₂e emissions and great for health. "
            "Could save approximately {monthly_saving:.1f} kg CO₂e/month."
        ),
        "description_fallback": (
            "Replace car trips under 5 km with cycling or walking. "
            "Zero CO₂e emissions and great for health."
        ),
        "category": "transport",
        "sub_type": "cycling",
        "cost_level": "free",
        "disruption_level": "medium",
        "reduction_factor": 0.08,
    },
    {
        "id": "transport_remote_work_01",
        "title": "Work remotely one day per week",
        "description": (
            "Eliminate one day of commuting per week. "
            "Reduces transport CO₂e by approximately 20% "
            "— saving {monthly_saving:.1f} kg CO₂e/month at no cost."
        ),
        "description_fallback": (
            "Eliminate one day of commuting per week. "
            "Reduces transport CO₂e by approximately 20% with no cost."
        ),
        "category": "transport",
        "sub_type": "remote_work",
        "cost_level": "free",
        "disruption_level": "low",
        "reduction_factor": 0.20,
    },
    {
        "id": "transport_carpooling_01",
        "title": "Carpool with colleagues",
        "description": (
            "Share your commute with one or more colleagues. "
            "Splitting the journey halves per-person CO₂e immediately, "
            "saving approximately {monthly_saving:.1f} kg CO₂e/month."
        ),
        "description_fallback": (
            "Share your commute with one or more colleagues. "
            "Halving per-person CO₂e is immediate and cost-saving."
        ),
        "category": "transport",
        "sub_type": "carpooling",
        "cost_level": "free",
        "disruption_level": "low",
        "reduction_factor": 0.10,
    },
    {
        "id": "transport_reduce_flights_01",
        "title": "Reduce one flight per year",
        "description": (
            "Replace one short-haul flight with a train journey or video call. "
            "A single round-trip flight can emit 500+ kg CO₂e — "
            "more than a month of your current total footprint."
        ),
        "description_fallback": (
            "Replace one short-haul flight with a train journey or video call. "
            "A single round-trip flight can emit 500+ kg CO₂e."
        ),
        "category": "transport",
        "sub_type": "reduce_flights",
        "cost_level": "free",
        "disruption_level": "medium",
        "reduction_factor": 0.15,
    },
    # ── Energy ────────────────────────────────────────────────────────
    {
        "id": "energy_renewable_switch_01",
        "title": "Switch to a renewable energy provider",
        "description": (
            "Change your electricity supplier to 100% renewable sources. "
            "Based on your {monthly_kwh} kWh/month usage, "
            "this could save approximately {monthly_saving:.1f} kg CO₂e/month — "
            "up to 95% of your current energy emissions."
        ),
        "description_fallback": (
            "Change your electricity supplier to one using 100% renewable sources. "
            "This can cut your energy CO₂e by up to 95%."
        ),
        "category": "energy",
        "sub_type": "energy_efficiency",
        "cost_level": "low",
        "disruption_level": "minimal",
        "reduction_factor": 0.90,
    },
    {
        "id": "energy_heating_reduction_01",
        "title": "Reduce heating by 2°C",
        "description": (
            "Lowering your thermostat by 2°C reduces heating energy by 10-15%. "
            "A jumper costs nothing — saving approximately {monthly_saving:.1f} kg CO₂e/month."
        ),
        "description_fallback": (
            "Lowering your thermostat by 2°C can reduce heating energy by 10-15%. "
            "Wear an extra layer instead."
        ),
        "category": "energy",
        "sub_type": "heating_reduction",
        "cost_level": "free",
        "disruption_level": "low",
        "reduction_factor": 0.12,
    },
    {
        "id": "energy_led_lighting_01",
        "title": "Switch to LED lighting throughout your home",
        "description": (
            "LED bulbs use 75% less energy than incandescent and last 25× longer. "
            "One-time investment saves approximately {monthly_saving:.1f} kg CO₂e/month indefinitely."
        ),
        "description_fallback": (
            "LED bulbs use 75% less energy than incandescent bulbs and last 25 times longer."
        ),
        "category": "energy",
        "sub_type": "energy_efficiency",
        "cost_level": "low",
        "disruption_level": "minimal",
        "reduction_factor": 0.05,
    },
    {
        "id": "energy_standby_power_01",
        "title": "Eliminate standby power waste",
        "description": (
            "Standby power accounts for 5-10% of household electricity. "
            "Using power strips to fully switch off devices could save "
            "approximately {monthly_saving:.1f} kg CO₂e/month at no cost."
        ),
        "description_fallback": (
            "Standby power accounts for 5-10% of household electricity. "
            "Use power strips to easily disconnect devices."
        ),
        "category": "energy",
        "sub_type": "energy_efficiency",
        "cost_level": "free",
        "disruption_level": "minimal",
        "reduction_factor": 0.07,
    },
    # ── Food ──────────────────────────────────────────────────────────
    {
        "id": "food_meat_free_days_01",
        "title": "Have two meat-free days per week",
        "description": (
            "Replace meat meals with plant-based alternatives twice a week. "
            "Beef alone produces ~6 kg CO₂e per meal including methane. "
            "This change could save approximately {monthly_saving:.1f} kg CO₂e/month."
        ),
        "description_fallback": (
            "Replace meat meals with plant-based alternatives twice a week. "
            "Beef produces ~6 kg CO₂e per meal including methane emissions."
        ),
        "category": "food",
        "sub_type": "diet_change",
        "cost_level": "free",
        "disruption_level": "low",
        "reduction_factor": 0.15,
    },
    {
        "id": "food_reduce_beef_01",
        "title": "Reduce beef consumption by half",
        "description": (
            "Beef has the highest CO₂e of any food (6 kg CO₂e/meal including methane). "
            "Replacing half your beef meals with chicken or vegetables "
            "could save approximately {monthly_saving:.1f} kg CO₂e/month."
        ),
        "description_fallback": (
            "Beef has the highest carbon footprint of any food (6 kg CO₂e/meal). "
            "Replacing half your beef meals with chicken or vegetables makes "
            "a significant difference."
        ),
        "category": "food",
        "sub_type": "diet_change",
        "cost_level": "free",
        "disruption_level": "medium",
        "reduction_factor": 0.20,
    },
    {
        "id": "food_local_seasonal_01",
        "title": "Buy more local and seasonal food",
        "description": (
            "Locally sourced food reduces transport-related CO₂e and supports local farmers. "
            "Increasing your local sourcing could save approximately {monthly_saving:.1f} kg CO₂e/month."
        ),
        "description_fallback": (
            "Locally sourced food reduces transport emissions and supports local farmers. "
            "Visit farmer's markets when possible."
        ),
        "category": "food",
        "sub_type": "local_food",
        "cost_level": "low",
        "disruption_level": "low",
        "reduction_factor": 0.08,
    },
    {
        "id": "food_reduce_waste_01",
        "title": "Reduce food waste",
        "description": (
            "Plan meals, use leftovers, and compost scraps. "
            "Cutting food waste by 50% saves approximately {monthly_saving:.1f} kg CO₂e/month "
            "— and reduces your grocery bill."
        ),
        "description_fallback": (
            "Plan meals, use leftovers, and compost scraps. "
            "Reducing food waste by 50% saves both emissions and money."
        ),
        "category": "food",
        "sub_type": "reduce_waste",
        "cost_level": "free",
        "disruption_level": "low",
        "reduction_factor": 0.10,
    },
    # ── Shopping ──────────────────────────────────────────────────────
    {
        "id": "shopping_second_hand_01",
        "title": "Buy second-hand when possible",
        "description": (
            "Second-hand purchases avoid manufacturing CO₂e entirely (~70% of lifecycle). "
            "Increasing your second-hand purchasing could save "
            "approximately {monthly_saving:.1f} kg CO₂e/month."
        ),
        "description_fallback": (
            "Second-hand purchases avoid manufacturing emissions entirely. "
            "Try thrift stores, online marketplaces, and swap events."
        ),
        "category": "shopping",
        "sub_type": "second_hand",
        "cost_level": "free",
        "disruption_level": "low",
        "reduction_factor": 0.25,
    },
    {
        "id": "shopping_extend_electronics_01",
        "title": "Extend the life of your electronics",
        "description": (
            "Keep your phone and laptop one extra year. "
            "Manufacturing electronics produces ~70 kg CO₂e/device on average. "
            "This could save approximately {monthly_saving:.1f} kg CO₂e/month."
        ),
        "description_fallback": (
            "Keep your phone and laptop an extra year. "
            "Manufacturing electronics is extremely carbon-intensive (~70 kg CO₂e/device)."
        ),
        "category": "shopping",
        "sub_type": "reduce_electronics",
        "cost_level": "free",
        "disruption_level": "minimal",
        "reduction_factor": 0.15,
    },
    {
        "id": "shopping_mindful_01",
        "title": "Choose quality over quantity",
        "description": (
            "Buy fewer, higher-quality items that last longer. "
            "Fast fashion alone accounts for 10% of global CO₂e emissions. "
            "This change could save approximately {monthly_saving:.1f} kg CO₂e/month."
        ),
        "description_fallback": (
            "Buy fewer, higher-quality items that last longer. "
            "Fast fashion and disposable goods have high hidden carbon costs."
        ),
        "category": "shopping",
        "sub_type": "mindful_shopping",
        "cost_level": "medium",
        "disruption_level": "low",
        "reduction_factor": 0.12,
    },
]


# ─── Main Engine Function ─────────────────────────────────────────────

def generate_recommendations(
    user_id: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """
    Generates personalized, ranked recommendations for a user.

    Pipeline:
    1. Load user data (lifestyle, emissions, behavioral weights)
    2. Load recommendation history to enable memory-based filtering
    3. Filter templates by behavioral weights AND history
    4. Score each passing candidate across five dimensions
    5. Rank by composite score
    6. Personalize descriptions with user-specific numbers
    7. Generate plain-language reasoning
    8. Record which templates were shown (for future filtering)
    9. Store top recommendations in Firestore

    Args:
        user_id: Firebase UID
        limit: Maximum recommendations to return (1-10)

    Returns:
        List of recommendation dicts sorted by composite score descending
    """
    db = get_firestore_service()

    lifestyle = db.get_lifestyle(user_id)
    weights_data = db.get_behavioral_weights(user_id)
    recent_emissions = db.get_recent_emissions(user_id, limit=7)

    if not lifestyle:
        return []

    # Parse user data for scoring and personalization
    transport = lifestyle.get("transport", {})
    food = lifestyle.get("food", {})
    energy = lifestyle.get("energy", {})

    transport_mode = transport.get("primary_mode", "car_petrol")
    diet_type = food.get("diet_type", "omnivore")
    energy_source = energy.get("energy_source", "grid_average")
    daily_distance = transport.get("daily_distance_km", 15)
    monthly_kwh = energy.get("monthly_kwh", 300)

    # Parse behavioral weights
    if weights_data:
        category_weights = {
            cat: weights_data.get(cat, 0.7)
            for cat in ("transport", "energy", "food", "shopping")
        }
        sub_weights: dict[str, float] = weights_data.get("sub_weights", {})
    else:
        category_weights = {cat: 0.7 for cat in ("transport", "energy", "food", "shopping")}
        sub_weights = {}

    # Calculate current monthly emissions per category
    if recent_emissions:
        latest = recent_emissions[-1]
        emission_breakdown = latest.get("breakdown", {})
        category_monthly = {
            "transport": emission_breakdown.get("transport_kg", 5) * 30,
            "energy": emission_breakdown.get("energy_kg", 3) * 30,
            "food": emission_breakdown.get("food_kg", 4) * 30,
            "shopping": emission_breakdown.get("shopping_kg", 1.5) * 30,
        }
    else:
        category_monthly = {
            "transport": 150.0,
            "energy": 90.0,
            "food": 120.0,
            "shopping": 45.0,
        }

    # Load recommendation history for memory-based filtering
    history = _load_recommendation_history(user_id, db)

    # Filter templates
    filtered_templates = _filter_templates_by_history_and_weights(
        history, category_weights, sub_weights
    )

    # Score and rank candidates
    scored_candidates: list[dict[str, Any]] = []
    total_monthly = sum(category_monthly.values())

    for template in filtered_templates:
        category = template["category"]
        sub_type = template["sub_type"]
        template_id = template["id"]

        cat_weight = category_weights.get(category, 0.5)
        monthly_cat_kg = category_monthly.get(category, 50.0)
        monthly_reduction = monthly_cat_kg * template["reduction_factor"]
        impact_pct = (monthly_reduction / total_monthly * 100) if total_monthly > 0 else 0

        # Five-dimension scoring
        impact = score_carbon_impact(monthly_reduction, monthly_cat_kg)
        sub_weight = sub_weights.get(sub_type, 0.5)
        adoption = score_adoption_probability(cat_weight, sub_weight)
        cost = score_cost(template["cost_level"])
        convenience = score_convenience(template["disruption_level"])
        compatibility = score_lifestyle_compatibility(
            category, sub_type, transport_mode, diet_type, energy_source
        )

        composite = calculate_composite_score(
            impact, adoption, cost, convenience, compatibility
        )

        # Personalize description
        description = _personalize_description(
            template=template,
            monthly_saving=monthly_reduction,
            daily_distance=daily_distance,
            monthly_kwh=monthly_kwh,
        )

        # Generate reasoning
        reasoning = _generate_reasoning(
            template=template,
            impact_score=impact,
            adoption_score=adoption,
            monthly_reduction=monthly_reduction,
            impact_pct=impact_pct,
            cat_weight=cat_weight,
            sub_weight=sub_weight,
            history_record=history.get(template_id),
        )

        now_iso = datetime.now(timezone.utc).isoformat()
        times_shown = history.get(template_id, {}).get("times_shown", 0) + 1

        scored_candidates.append({
            "id": str(uuid.uuid4())[:12],
            "template_id": template_id,
            "title": template["title"],
            "description": description,
            "category": category,
            "sub_type": sub_type,
            "scores": {
                "carbon_impact": round(impact, 1),
                "adoption_probability": round(adoption, 1),
                "cost_score": round(cost, 1),
                "convenience_score": round(convenience, 1),
                "lifestyle_score": round(compatibility, 1),
            },
            "composite_score": composite,
            "reasoning": reasoning,
            "monthly_kg_reduction": round(monthly_reduction, 1),
            "annual_kg_reduction": round(monthly_reduction * 12, 1),
            "impact_percentage": round(impact_pct, 1),
            "cost_level": template["cost_level"],
            "disruption_level": template["disruption_level"],
            "status": "pending",
            "times_shown": times_shown,
            "last_shown_at": now_iso,
            "created_at": now_iso,
            "updated_at": now_iso,
        })

    # Sort descending by composite score
    scored_candidates.sort(key=lambda r: r["composite_score"], reverse=True)
    top_recommendations = scored_candidates[:limit]

    # Record which templates were shown (memory update)
    _record_templates_shown(user_id, db, top_recommendations, history)

    # Store recommendations in Firestore
    for rec in top_recommendations:
        db.set_recommendation(user_id, rec["id"], rec)

    return top_recommendations


# ─── Memory System Functions ──────────────────────────────────────────

def _load_recommendation_history(
    user_id: str,
    db: Any,
) -> dict[str, dict[str, Any]]:
    """
    Loads the per-template recommendation history for a user.

    Returns a dictionary keyed by template_id for O(1) lookups
    during the filtering step.

    Args:
        user_id: Firebase UID
        db: FirestoreService instance

    Returns:
        Dict mapping template_id -> history record dict
    """
    raw_history = db.get_recommendation_history(user_id)
    return {record.get("template_id", ""): record for record in raw_history}


def _filter_templates_by_history_and_weights(
    history: dict[str, dict[str, Any]],
    category_weights: dict[str, float],
    sub_weights: dict[str, float],
) -> list[dict[str, Any]]:
    """
    Filters recommendation templates based on:
    1. Category behavioral weight threshold (< 0.2 = filtered)
    2. Rejection count (>= 2 = permanently filtered)
    3. Completion status (completed = filtered)
    4. Recency (shown within 7 days and still pending = filtered)

    Args:
        history: Per-template history dict from _load_recommendation_history
        category_weights: Category-level behavioral weights
        sub_weights: Sub-type-level behavioral weights

    Returns:
        List of template dicts that passed all filters
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    filtered: list[dict[str, Any]] = []

    for template in RECOMMENDATION_TEMPLATES:
        category = template["category"]
        template_id = template["id"]

        # Filter 1: Category weight threshold
        if category_weights.get(category, 0.5) < 0.2:
            continue

        # Filter 2: Sub-type weight threshold
        sub_type = template["sub_type"]
        if sub_weights.get(sub_type, 0.5) < 0.15:
            continue

        record = history.get(template_id)
        if record:
            # Filter 3: Rejected twice — permanent exclusion
            if record.get("rejection_count", 0) >= 2:
                continue

            # Filter 4: Already completed — no need to show again
            if record.get("last_status") == "completed":
                continue

            # Filter 5: Shown within 7 days and still pending
            last_shown_str = record.get("last_shown_at", "")
            if last_shown_str and record.get("last_status") == "pending":
                try:
                    last_shown = datetime.fromisoformat(last_shown_str)
                    if last_shown > seven_days_ago:
                        continue
                except ValueError:
                    pass  # Invalid timestamp — allow the template

        filtered.append(template)

    return filtered


def _record_templates_shown(
    user_id: str,
    db: Any,
    recommendations: list[dict[str, Any]],
    existing_history: dict[str, dict[str, Any]],
) -> None:
    """
    Records which templates were shown in this generation cycle.

    Updates the recommendation_history collection for each shown
    template. This is the write side of the memory system.

    Args:
        user_id: Firebase UID
        db: FirestoreService instance
        recommendations: The generated recommendations to record
        existing_history: Current history dict to merge updates into
    """
    now_iso = datetime.now(timezone.utc).isoformat()

    for rec in recommendations:
        template_id = rec.get("template_id", "")
        if not template_id:
            continue

        existing = existing_history.get(template_id, {})

        updated_record = {
            "template_id": template_id,
            "times_shown": existing.get("times_shown", 0) + 1,
            "last_shown_at": now_iso,
            "first_shown_at": existing.get("first_shown_at", now_iso),
            "last_status": "pending",
            "rejection_count": existing.get("rejection_count", 0),
            "completion_count": existing.get("completion_count", 0),
        }

        db.set_recommendation_history_record(user_id, template_id, updated_record)


# ─── Description Personalization ──────────────────────────────────────

def _personalize_description(
    template: dict[str, Any],
    monthly_saving: float,
    daily_distance: float,
    monthly_kwh: float,
) -> str:
    """
    Injects user-specific numbers into template descriptions.

    Falls back to the static fallback description if format
    string substitution fails for any reason.

    Args:
        template: Recommendation template dict
        monthly_saving: Calculated monthly CO₂e saving in kg
        daily_distance: User's daily commute distance in km
        monthly_kwh: User's monthly electricity consumption

    Returns:
        Personalized description string
    """
    try:
        trips_per_week = max(1, round(daily_distance / 10))
        description = template["description"].format(
            monthly_saving=monthly_saving,
            trips_per_week=trips_per_week,
            monthly_kwh=monthly_kwh,
        )
        return description
    except (KeyError, ValueError):
        return template.get("description_fallback", template.get("description", ""))


# ─── Reasoning Generation ─────────────────────────────────────────────

def _generate_reasoning(
    template: dict[str, Any],
    impact_score: float,
    adoption_score: float,
    monthly_reduction: float,
    impact_pct: float,
    cat_weight: float,
    sub_weight: float,
    history_record: dict[str, Any] | None,
) -> str:
    """
    Generates a plain-language explanation for why this recommendation
    was prioritized for this specific user.

    Incorporates behavioral history to make the reasoning genuinely
    personalized — referencing past positive interactions when available.

    Args:
        template: Recommendation template
        impact_score: Carbon impact score (0-100)
        adoption_score: Adoption probability score (0-100)
        monthly_reduction: Monthly kg CO₂e saving
        impact_pct: Percentage of total emissions reduced
        cat_weight: Category behavioral weight (0-1)
        sub_weight: Sub-type behavioral weight (0-1)
        history_record: Previous interaction history for this template, or None

    Returns:
        Multi-sentence reasoning string
    """
    reasons: list[str] = []

    # Impact reasoning
    if impact_score >= 70:
        reasons.append(
            f"This action could reduce your {template['category']} CO₂e emissions "
            f"by approximately {monthly_reduction:.1f} kg/month "
            f"({impact_pct:.1f}% of your total footprint)"
        )
    elif impact_score >= 40:
        reasons.append(
            f"This action could reduce your emissions by "
            f"approximately {monthly_reduction:.1f} kg CO₂e/month"
        )

    # Behavioral history reasoning
    if adoption_score >= 70:
        if history_record and history_record.get("times_shown", 0) >= 1:
            reasons.append(
                "You have shown interest in this type of action before"
            )
        elif sub_weight >= 0.7:
            reasons.append(
                "You have responded positively to similar recommendations"
            )
        else:
            reasons.append("This matches your lifestyle profile well")
    elif adoption_score < 40:
        reasons.append(
            "While this may require some adjustment, the CO₂e impact is worth considering"
        )

    # Cost reasoning
    if template["cost_level"] == "free":
        reasons.append("This requires no financial investment")
    elif template["cost_level"] == "low":
        reasons.append("This involves minimal cost")

    # Convenience reasoning
    if template["disruption_level"] == "minimal":
        reasons.append("This requires very little change to your current routine")

    if not reasons:
        reasons.append(
            f"This is a practical way to reduce your {template['category']} CO₂e emissions"
        )

    return ". ".join(reasons) + "."