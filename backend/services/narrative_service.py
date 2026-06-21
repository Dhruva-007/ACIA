"""
Narrative Service — Feature 3: AI-Powered Weekly Carbon Narrative

Generates a personalized, AI-written weekly summary of the
user's carbon emissions using Vertex AI Gemini.

The narrative transforms raw numbers into a meaningful story
that users remember and act on. Research shows that narrative
framing significantly increases engagement with sustainability
data (Moser, 2010).

Narrative structure:
1. What happened this week (total emissions, vs previous)
2. The key driver (which category changed most)
3. What to focus on next (actionable insight)
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from infrastructure.firestore_client import get_firestore_service
from infrastructure.vertex_ai_client import initialize_vertex_ai, SAFETY_SETTINGS
from config import get_settings

logger = logging.getLogger("acia.narrative")

# ─── Narrative Prompt ─────────────────────────────────────────────────

NARRATIVE_PROMPT_TEMPLATE = """You are ACIA, the Adaptive Carbon Intelligence Assistant.
Write a concise, personalized 3-sentence weekly carbon summary for a user.

Sentence 1: What happened this week (total CO₂e, comparison to previous week if available).
Sentence 2: The key driver (which category contributed most or changed most).
Sentence 3: One specific, actionable insight for next week.

User data:
- Weekly total: {weekly_total} kg CO₂e
- Previous week: {previous_week} kg CO₂e (write "first week of data" if unavailable)
- Change: {change_description}
- Largest category this week: {largest_category} ({largest_kg} kg CO₂e, {largest_pct}%)
- Current top recommendation: {top_recommendation}

Rules:
- Be specific with numbers, always use kg CO₂e
- Be encouraging but honest
- Never be preachy or generic
- Maximum 80 words total
- Do not start with "This week"
"""


def get_weekly_narrative(user_id: str) -> dict[str, Any] | None:
    """
    Returns the most recent weekly narrative, or None if not generated yet.

    Args:
        user_id: Firebase UID

    Returns:
        WeeklyNarrative dict or None
    """
    db = get_firestore_service()
    now = datetime.now(timezone.utc)
    current_week = now.strftime("%Y-W%W")
    return db.get_weekly_narrative(user_id, current_week)


def generate_weekly_narrative(user_id: str) -> dict[str, Any]:
    """
    Generates a new AI-powered weekly carbon narrative.

    Gathers the user's emission data for the past 7 days,
    builds context, calls Vertex AI Gemini with a structured
    narrative prompt, and stores the result.

    Args:
        user_id: Firebase UID

    Returns:
        WeeklyNarrative dict
    """
    db = get_firestore_service()
    now = datetime.now(timezone.utc)
    current_week = now.strftime("%Y-W%W")

    # Gather emission data for current week (last 7 days)
    week_start = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    week_end = now.strftime("%Y-%m-%d")

    weekly_emissions = db.get_emissions_range(user_id, week_start, week_end)

    if not weekly_emissions:
        narrative_text = (
            "No emission data recorded this week. "
            "Visit your Dashboard to ensure your profile is set up, "
            "and check back next week for your first carbon narrative."
        )
        return _store_narrative(
            db, user_id, current_week,
            narrative_text, 0, None, None
        )

    # Calculate weekly total and breakdown
    weekly_total = sum(e.get("total_kg", 0) for e in weekly_emissions)
    avg_breakdown: dict[str, float] = {
        "transport_kg": 0, "energy_kg": 0, "food_kg": 0, "shopping_kg": 0
    }
    for emission in weekly_emissions:
        breakdown = emission.get("breakdown", {})
        for key in avg_breakdown:
            avg_breakdown[key] += breakdown.get(key, 0)

    # Find largest category
    largest_category = max(avg_breakdown, key=avg_breakdown.get)  # type: ignore
    largest_kg = avg_breakdown[largest_category]
    largest_pct = (largest_kg / weekly_total * 100) if weekly_total > 0 else 0

    category_labels = {
        "transport_kg": "Transportation",
        "energy_kg": "Energy",
        "food_kg": "Food & Diet",
        "shopping_kg": "Shopping",
    }

    # Get previous week data for comparison
    prev_start = (now - timedelta(days=14)).strftime("%Y-%m-%d")
    prev_end = (now - timedelta(days=7)).strftime("%Y-%m-%d")
    prev_emissions = db.get_emissions_range(user_id, prev_start, prev_end)
    previous_week_total = sum(e.get("total_kg", 0) for e in prev_emissions) if prev_emissions else None

    # Calculate change
    if previous_week_total and previous_week_total > 0:
        change_pct = ((weekly_total - previous_week_total) / previous_week_total) * 100
        if change_pct > 0:
            change_description = f"+{change_pct:.1f}% increase vs last week"
        elif change_pct < 0:
            change_description = f"{abs(change_pct):.1f}% decrease vs last week"
        else:
            change_description = "same as last week"
        vs_prev_pct: float | None = round(change_pct, 1)
    else:
        change_description = "first week of tracking"
        vs_prev_pct = None

    # Get top recommendation for context
    recommendations = db.get_recommendations(user_id, limit=1)
    top_rec = recommendations[0].get("title", "No recommendations yet") if recommendations else "No recommendations yet"

    # Build prompt and call Vertex AI
    prompt = NARRATIVE_PROMPT_TEMPLATE.format(
        weekly_total=f"{weekly_total:.1f}",
        previous_week=f"{previous_week_total:.1f}" if previous_week_total else "unavailable",
        change_description=change_description,
        largest_category=category_labels.get(largest_category, largest_category),
        largest_kg=f"{largest_kg:.1f}",
        largest_pct=f"{largest_pct:.0f}",
        top_recommendation=top_rec,
    )

    narrative_text = _call_vertex_ai_for_narrative(prompt, weekly_total)

    return _store_narrative(
        db, user_id, current_week,
        narrative_text, weekly_total, vs_prev_pct, top_rec
    )


def _call_vertex_ai_for_narrative(prompt: str, weekly_total: float) -> str:
    """
    Calls Vertex AI Gemini to generate the narrative text.

    Falls back to a template-based narrative if Vertex AI is unavailable.

    Args:
        prompt: The structured narrative prompt
        weekly_total: Weekly total in kg CO₂e (used in fallback)

    Returns:
        Generated narrative text string
    """
    try:
        from vertexai.generative_models import GenerativeModel, Content, Part
        initialize_vertex_ai()
        settings = get_settings()

        model = GenerativeModel(
            model_name=settings.vertex_ai_model,
            system_instruction=(
                "You are ACIA, a sustainability assistant. "
                "Write concise, specific, encouraging weekly carbon summaries. "
                "Always use kg CO₂e units. Maximum 80 words."
            ),
        )

        contents = [Content(role="user", parts=[Part.from_text(prompt)])]

        response = model.generate_content(
            contents,
            generation_config={
                "temperature": 0.6,
                "top_p": 0.9,
                "max_output_tokens": 200,
            },
            safety_settings=SAFETY_SETTINGS,
        )

        if response.text:
            return response.text.strip()

    except Exception as e:
        logger.warning("Vertex AI narrative generation failed: %s", str(e))

    # Fallback narrative
    return (
        f"Your carbon footprint for the week was {weekly_total:.1f} kg CO₂e. "
        f"Check your Dashboard for a detailed breakdown of where your emissions came from. "
        f"Visit the Recommendations page to see your personalized actions for next week."
    )


def _store_narrative(
    db: Any,
    user_id: str,
    week: str,
    narrative_text: str,
    weekly_total: float,
    vs_previous_week_pct: float | None,
    key_action: str | None,
) -> dict[str, Any]:
    """Stores the narrative in Firestore and returns the record."""
    now = datetime.now(timezone.utc)
    narrative_data = {
        "week": week,
        "narrative_text": narrative_text,
        "weekly_total_kg": round(weekly_total, 1),
        "vs_previous_week_percentage": vs_previous_week_pct,
        "key_action_mentioned": key_action,
        "generated_at": now.isoformat(),
    }
    db.set_weekly_narrative(user_id, week, narrative_data)
    return narrative_data