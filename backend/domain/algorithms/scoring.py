"""
Recommendation Scoring Algorithms

Implements the five-dimension scoring system:
1. Carbon Impact Score (30% weight)
2. User Adoption Probability (35% weight)
3. Cost Score (15% weight)
4. Convenience Score (10% weight)
5. Lifestyle Compatibility Score (10% weight)

All scoring functions are pure — no database access, no side effects.
They receive data and return scores. This makes them independently
testable and easy to tune.

Adoption Probability has the highest weight (35%) because a
recommendation the user ignores achieves zero carbon reduction.
"""


# ─── Composite Weights ──────────────────────────────────────────────

COMPOSITE_WEIGHTS = {
    "adoption_probability": 0.35,
    "carbon_impact": 0.30,
    "cost_score": 0.15,
    "convenience_score": 0.10,
    "lifestyle_score": 0.10,
}


def score_carbon_impact(
    monthly_reduction_kg: float,
    current_category_monthly_kg: float,
) -> float:
    """
    Scores the carbon reduction potential of a recommendation.

    Scale:
    - 0-5% reduction of category: 0-40 points
    - 5-15% reduction: 40-75 points
    - 15%+ reduction: 75-100 points

    Args:
        monthly_reduction_kg: Estimated monthly kg CO₂ reduction
        current_category_monthly_kg: User's current monthly emissions
            for this category

    Returns:
        Score from 0 to 100
    """
    if current_category_monthly_kg <= 0:
        return 0.0

    reduction_pct = (monthly_reduction_kg / current_category_monthly_kg) * 100

    if reduction_pct <= 5:
        return (reduction_pct / 5) * 40
    elif reduction_pct <= 15:
        return 40 + ((reduction_pct - 5) / 10) * 35
    else:
        return min(100, 75 + ((reduction_pct - 15) / 10) * 25)


def score_adoption_probability(
    category_weight: float,
    sub_type_weight: float,
) -> float:
    """
    Scores the likelihood that this user will adopt this action.

    Derived from the Behavioral Learning Engine weights.
    Sub-type weight matters more (60%) because it represents
    specific action-level preferences rather than category-level.

    Args:
        category_weight: Behavioral weight for the category (0-1)
        sub_type_weight: Behavioral weight for the sub-type (0-1)

    Returns:
        Score from 0 to 100
    """
    combined = (category_weight * 0.4) + (sub_type_weight * 0.6)
    return min(100, max(0, combined * 100))


def score_cost(
    cost_level: str,
    user_income_level: str = "moderate",
) -> float:
    """
    Scores the financial accessibility of a recommendation.
    Higher score = more affordable for this user.

    Args:
        cost_level: One of "free", "low", "medium", "high", "investment"
        user_income_level: One of "student", "moderate", "comfortable"

    Returns:
        Score from 0 to 100
    """
    cost_base: dict[str, float] = {
        "free": 100,
        "low": 80,
        "medium": 60,
        "high": 30,
        "investment": 10,
    }

    base_score = cost_base.get(cost_level, 50)

    # Students face higher barrier for costly actions
    if user_income_level == "student" and cost_level in ("high", "investment"):
        base_score *= 0.5

    return min(100, max(0, base_score))


def score_convenience(
    disruption_level: str,
    user_schedule_type: str = "moderate",
) -> float:
    """
    Scores how convenient this action is for the user.
    Higher score = less lifestyle disruption.

    Args:
        disruption_level: One of "minimal", "low", "medium", "high"
        user_schedule_type: One of "flexible", "moderate", "demanding"

    Returns:
        Score from 0 to 100
    """
    disruption_base: dict[str, float] = {
        "minimal": 100,
        "low": 75,
        "medium": 50,
        "high": 25,
    }

    base_score = disruption_base.get(disruption_level, 50)

    # Demanding schedules penalize high-disruption actions
    if user_schedule_type == "demanding" and disruption_level in ("medium", "high"):
        base_score *= 0.7

    return min(100, max(0, base_score))


def score_lifestyle_compatibility(
    category: str,
    sub_type: str,
    user_transport_mode: str = "",
    user_diet_type: str = "",
    user_energy_source: str = "",
) -> float:
    """
    Scores how well this recommendation fits the user's profile.

    Uses rule-based matching against user lifestyle data.

    Args:
        category: Recommendation category
        sub_type: Recommendation sub-type
        user_transport_mode: User's primary transport mode
        user_diet_type: User's diet type
        user_energy_source: User's energy source

    Returns:
        Score from 0 to 100
    """
    score = 50.0  # Neutral baseline

    if category == "transport":
        if sub_type == "public_transport":
            # More compatible if user already uses motorized transport
            if user_transport_mode in ("car_petrol", "car_diesel", "motorcycle"):
                score += 30
            elif user_transport_mode == "public_transport":
                score -= 20  # Already doing this
        elif sub_type == "cycling":
            if user_transport_mode in ("car_petrol", "car_diesel"):
                score += 20
            elif user_transport_mode in ("bicycle", "walking"):
                score -= 30  # Already doing this

    elif category == "food":
        if sub_type == "diet_change":
            if user_diet_type == "high_meat":
                score += 35  # High potential
            elif user_diet_type == "omnivore":
                score += 20
            elif user_diet_type in ("vegetarian", "vegan"):
                score -= 30  # Already optimized

    elif category == "energy":
        if sub_type == "energy_efficiency":
            if user_energy_source == "gas_heavy":
                score += 30
            elif user_energy_source == "renewable":
                score -= 20  # Already green

    return min(100, max(0, score))


def calculate_composite_score(
    carbon_impact: float,
    adoption_probability: float,
    cost_score: float,
    convenience_score: float,
    lifestyle_score: float,
) -> float:
    """
    Calculates the weighted composite score from all five dimensions.

    Weights:
    - Adoption probability: 35% (highest — useless if ignored)
    - Carbon impact: 30% (core objective)
    - Cost: 15% (financial accessibility)
    - Convenience: 10% (lifestyle fit)
    - Lifestyle compatibility: 10% (context match)

    Args:
        All five dimension scores (0-100 each)

    Returns:
        Composite score from 0 to 100
    """
    composite = (
        carbon_impact * COMPOSITE_WEIGHTS["carbon_impact"]
        + adoption_probability * COMPOSITE_WEIGHTS["adoption_probability"]
        + cost_score * COMPOSITE_WEIGHTS["cost_score"]
        + convenience_score * COMPOSITE_WEIGHTS["convenience_score"]
        + lifestyle_score * COMPOSITE_WEIGHTS["lifestyle_score"]
    )
    return round(min(100, max(0, composite)), 1)