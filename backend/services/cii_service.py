"""
Carbon Improvement Index (CII) Service

Calculates the four sub-scores composing the CII:
1. Awareness Score (25%) — engagement with understanding emissions
2. Action Score (25%) — accepting and completing recommendations
3. Consistency Score (25%) — sustained behavioral patterns
4. Improvement Score (25%) — measurable CO₂e emission reductions

Formula: CII = (awareness + action + consistency + improvement) / 4

Each sub-score is 0-100, making the composite CII 0-100.

The CII is the single most important metric for long-term user
retention. It transforms ACIA from a carbon calculator into a
measurable sustainability journey with a score that rewards
awareness, action, consistency, and measurable improvement.
"""

from datetime import datetime, timezone
from typing import Any

from infrastructure.firestore_client import get_firestore_service


def calculate_cii(user_id: str) -> dict[str, Any]:
    """
    Calculates and persists the current Carbon Improvement Index.

    Recalculates all four sub-scores from current Firestore data
    and saves the result to cii_scores/{current_month}.

    Args:
        user_id: Firebase UID

    Returns:
        CIIScore dict with composite_score and sub_scores
    """
    db = get_firestore_service()

    awareness = _calculate_awareness_score(user_id, db)
    action = _calculate_action_score(user_id, db)
    consistency = _calculate_consistency_score(user_id, db)
    improvement = _calculate_improvement_score(user_id, db)

    composite = round((awareness + action + consistency + improvement) / 4, 1)
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")

    score_data = {
        "month": current_month,
        "composite_score": composite,
        "sub_scores": {
            "awareness_score": round(awareness, 1),
            "action_score": round(action, 1),
            "consistency_score": round(consistency, 1),
            "improvement_score": round(improvement, 1),
        },
    }

    db.set_cii_score(user_id, current_month, score_data)
    return score_data


def get_cii_breakdown(user_id: str) -> dict[str, Any]:
    """
    Returns CII with sub-scores and actionable improvement guidance.

    Recalculates the CII and augments with per-dimension guidance
    text explaining how to improve each sub-score.

    Args:
        user_id: Firebase UID

    Returns:
        CIIBreakdown dict with scores and guidance strings
    """
    score_data = calculate_cii(user_id)
    sub = score_data["sub_scores"]

    guidance = {
        "awareness_guidance": _awareness_guidance(sub["awareness_score"]),
        "action_guidance": _action_guidance(sub["action_score"]),
        "consistency_guidance": _consistency_guidance(sub["consistency_score"]),
        "improvement_guidance": _improvement_guidance(sub["improvement_score"]),
    }

    return {**score_data, **guidance}


def get_cii_history(user_id: str, months: int = 6) -> list[dict[str, Any]]:
    """
    Returns CII score history for the specified number of months.

    Used by the CII trend chart to visualize the user's
    sustainability journey over time.

    Args:
        user_id: Firebase UID
        months: Number of months of history to return (1-12)

    Returns:
        List of CIIScore dicts in descending chronological order
    """
    db = get_firestore_service()
    return db.get_cii_history(user_id, limit=months)


# ─── Sub-Score Calculators ───────────────────────────────────────────

def _calculate_awareness_score(user_id: str, db: Any) -> float:
    """
    Awareness Score (0-100)

    Measures engagement with understanding personal CO₂e emissions.

    Points awarded:
    - Onboarding completed:             +40 (foundational awareness)
    - Lifestyle data stored:            +20 (profile completeness)
    - At least one emission record:     +20 (active tracking)
    - Recommendations viewed (exist):   +20 (engagement with insights)
    """
    score = 0.0

    profile = db.get_profile(user_id)
    if profile and profile.get("onboarding_completed"):
        score += 40

    if db.get_lifestyle(user_id):
        score += 20

    if db.get_recent_emissions(user_id, limit=1):
        score += 20

    if db.get_all_recommendations(user_id):
        score += 20

    return min(100.0, score)


def _calculate_action_score(user_id: str, db: Any) -> float:
    """
    Action Score (0-100)

    Measures concrete sustainability actions taken.

    Points awarded:
    - Each accepted recommendation:   +10 (max 40 points, 4 accepted)
    - Each completed recommendation:  +20 (max 60 points, 3 completed)

    Completion is weighted more than acceptance because it confirms
    that the user actually carried out the action, not just agreed to it.
    """
    score = 0.0

    all_recs = db.get_all_recommendations(user_id)
    accepted = [r for r in all_recs if r.get("status") == "accepted"]
    completed = [r for r in all_recs if r.get("status") == "completed"]

    score += min(40.0, len(accepted) * 10)
    score += min(60.0, len(completed) * 20)

    return min(100.0, score)


def _calculate_consistency_score(user_id: str, db: Any) -> float:
    """
    Consistency Score (0-100)

    Measures sustained engagement and positive behavioral patterns.

    Two components:
    1. Engagement score (up to 50): total behavioral events × 5
       (rewards regular app usage and recommendation interaction)
    2. Positive ratio score (up to 50): proportion of positive
       actions (accepted + completed) vs negative (rejected + failed)
       Neutral (deferred) actions do not affect the ratio.
    """
    history = db.get_behavioral_history(user_id, limit=50)

    if not history:
        return 0.0

    total_events = len(history)
    positive_events = sum(
        1 for e in history if e.get("action") in ("accepted", "completed")
    )
    negative_events = sum(
        1 for e in history if e.get("action") in ("rejected", "failed")
    )

    engagement = min(50.0, total_events * 5)

    total_decisive = positive_events + negative_events
    ratio_score = (
        (positive_events / total_decisive) * 50
        if total_decisive > 0
        else 25.0  # Neutral baseline for users with no decisive actions yet
    )

    return min(100.0, engagement + ratio_score)


def _calculate_improvement_score(user_id: str, db: Any) -> float:
    """
    Improvement Score (0-100)

    Measures measurable reductions in CO₂e emissions.

    Two components:
    1. Trend score (up to 50): based on 7-day vs previous 7-day
       emission comparison
    2. Reduction score (up to 50): based on total monthly CO₂e
       reduction from completed recommendations (2 points per kg)
    """
    emissions = db.get_recent_emissions(user_id, limit=14)

    trend_score = 25.0  # Neutral baseline for insufficient data

    if len(emissions) >= 7:
        recent_7 = emissions[-7:]
        previous_7 = emissions[:7] if len(emissions) >= 14 else emissions[:len(emissions) // 2 + 1]

        recent_avg = sum(e.get("total_kg", 0) for e in recent_7) / max(len(recent_7), 1)
        previous_avg = sum(e.get("total_kg", 0) for e in previous_7) / max(len(previous_7), 1)

        if previous_avg > 0:
            change_pct = ((recent_avg - previous_avg) / previous_avg) * 100
            if change_pct < -5:
                trend_score = 50.0   # Significant CO₂e reduction
            elif change_pct < -2:
                trend_score = 40.0   # Moderate CO₂e reduction
            elif change_pct > 5:
                trend_score = 10.0   # CO₂e increasing significantly
            elif change_pct > 2:
                trend_score = 20.0   # CO₂e increasing moderately

    all_recs = db.get_all_recommendations(user_id)
    completed = [r for r in all_recs if r.get("status") == "completed"]
    total_reduction = sum(r.get("monthly_kg_reduction", 0) for r in completed)

    reduction_score = min(50.0, total_reduction * 2)

    return min(100.0, trend_score + reduction_score)


# ─── Guidance Text Generators ────────────────────────────────────────

def _awareness_guidance(score: float) -> str:
    if score >= 80:
        return "Excellent awareness! You are fully engaged with understanding your CO₂e emissions."
    if score >= 50:
        return "Good progress! Explore the Tracking page to see your CO₂e trends over time."
    return (
        "Complete your profile and explore the Dashboard to understand "
        "your CO₂e footprint breakdown across all four categories."
    )


def _action_guidance(score: float) -> str:
    if score >= 80:
        return "Outstanding! You are actively completing sustainability actions."
    if score >= 40:
        return (
            "You have started taking action. "
            "Complete your accepted recommendations to boost this score."
        )
    return (
        "Visit the Recommendations page and accept actions that fit your lifestyle. "
        "Start with the free, low-disruption ones first."
    )


def _consistency_guidance(score: float) -> str:
    if score >= 80:
        return "Impressive consistency! You are building lasting sustainable habits."
    if score >= 40:
        return "You are building momentum. Keep engaging with recommendations regularly."
    return (
        "Sustainability is a journey. "
        "Regular engagement with ACIA helps build consistent habits over time."
    )


def _improvement_guidance(score: float) -> str:
    if score >= 80:
        return "Your CO₂e emissions are measurably decreasing. You are making a real impact!"
    if score >= 40:
        return (
            "Some improvement visible. "
            "Complete more recommendations to see measurable CO₂e reductions."
        )
    return (
        "Focus on completing accepted recommendations. "
        "Even small actions compound into significant CO₂e reductions over time."
    )