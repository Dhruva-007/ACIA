"""
AI Sustainability Assistant Service

Orchestrates the AI assistant pipeline:
1. Build user context from profile, emissions, CII, and behavioral data
2. Load or create conversation session
3. Build personalized system prompt with context injected
4. Call Vertex AI Gemini (with fallback if unavailable)
5. Persist conversation to Firestore
6. Return response with human-readable context metadata

The assistant's intelligence comes from its context — all relevant
user data is injected into the system prompt so Gemini can give
specific, personalized answers rather than generic sustainability advice.

All carbon values referenced in context and responses use kg CO₂e.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Any

from infrastructure.vertex_ai_client import (
    build_system_prompt,
    generate_response,
    generate_fallback_response,
    generate_explainer,
)
from infrastructure.firestore_client import get_firestore_service
from domain.models.user_profile import UserLifestyleInput
from services.carbon_engine import (
    calculate_carbon_breakdown,
    calculate_transport_daily,
    calculate_energy_daily,
    calculate_food_daily,
    calculate_shopping_daily,
)
from config import get_settings

logger = logging.getLogger("acia.assistant")


def chat_with_assistant(
    user_id: str,
    message: str,
    session_id: str | None = None,
) -> dict[str, Any]:
    """
    Processes a user message and returns an AI-generated response.

    The system prompt is rebuilt on every request to ensure it
    reflects the latest user data (emissions may have changed
    since the last conversation).

    Args:
        user_id: Firebase UID
        message: User's message (will be truncated to 1000 chars)
        session_id: Optional existing session ID for continuity.
                    If None, a new session is created.

    Returns:
        Dictionary with:
        - response: str (AI-generated or fallback)
        - session_id: str (new or existing)
        - context_used: list[str] (human-readable labels)
    """
    db = get_firestore_service()

    # Build user context for system prompt injection
    user_context = _build_user_context(user_id, db)

    # Load or create conversation session
    if not session_id:
        session_id = str(uuid.uuid4())[:12]

    conversation = db.get_conversation(user_id, session_id)
    conversation_history: list[dict[str, str]] = (
        conversation.get("messages", []) if conversation else []
    )

    # Build personalized system prompt
    system_prompt = build_system_prompt(user_context)

    # Call Vertex AI with fallback
    try:
        response_text = generate_response(
            user_message=message,
            system_prompt=system_prompt,
            conversation_history=conversation_history,
        )
    except Exception as exc:
        logger.warning(
            "Vertex AI call failed for user=%s, using fallback: %s",
            user_id[:8],
            str(exc),
        )
        response_text = generate_fallback_response(user_context)

    # Persist conversation
    now = datetime.now(timezone.utc).isoformat()
    new_messages = conversation_history + [
        {"role": "user", "content": message, "timestamp": now},
        {"role": "assistant", "content": response_text, "timestamp": now},
    ]

    # Keep session bounded to last 20 messages
    if len(new_messages) > 20:
        new_messages = new_messages[-20:]

    db.set_conversation(
        user_id,
        session_id,
        {
            "session_id": session_id,
            "messages": new_messages,
            "created_at": (
                conversation.get("created_at", now) if conversation else now
            ),
            "updated_at": now,
        },
    )

    return {
        "response": response_text,
        "session_id": session_id,
        "context_used": _format_context_labels(list(user_context.keys())),
    }


def get_conversation_sessions(user_id: str) -> list[dict[str, Any]]:
    """
    Retrieves recent conversation sessions for a user.

    Args:
        user_id: Firebase UID

    Returns:
        List of conversation session dicts (most recent first)
    """
    db = get_firestore_service()
    return db.get_conversations(user_id, limit=10)


def generate_explainer_for_category(
    user_id: str,
    category: str,
) -> dict[str, Any]:
    """
    Generates a plain-language explanation of how a specific
    emission category was calculated for this user (Feature 7).

    Builds the calculation data from the user's actual lifestyle
    inputs, then calls Vertex AI to generate an educational
    breakdown explanation.

    Args:
        user_id: Firebase UID
        category: One of 'transport', 'energy', 'food', 'shopping'

    Returns:
        Dictionary with:
        - category: str
        - monthly_kg: float
        - explanation: str (AI-generated calculation breakdown)
        - factor_source: str
    """
    db = get_firestore_service()
    lifestyle = db.get_lifestyle(user_id)

    if not lifestyle:
        return {
            "category": category,
            "monthly_kg": 0,
            "explanation": (
                "No lifestyle data found. Complete onboarding to see "
                "your personalized CO₂e calculation breakdown."
            ),
            "factor_source": "",
        }

    calculation_data, monthly_kg, factor_source = _build_calculation_data(
        category, lifestyle
    )

    try:
        explanation = generate_explainer(category, calculation_data)
    except Exception as exc:
        logger.warning(
            "Explainer generation failed for category=%s user=%s: %s",
            category,
            user_id[:8],
            str(exc),
        )
        explanation = (
            f"Your {category} category contributes approximately "
            f"{monthly_kg:.1f} kg CO₂e per month based on your lifestyle inputs. "
            f"Emission factors sourced from: {factor_source}."
        )

    return {
        "category": category,
        "monthly_kg": round(monthly_kg, 1),
        "explanation": explanation,
        "factor_source": factor_source,
    }


# ─── Internal Helpers ─────────────────────────────────────────────────

def _build_user_context(user_id: str, db: Any) -> dict[str, Any]:
    """
    Builds the user context dictionary injected into the system prompt.

    Gathers lifestyle data, calculated emissions, CII score, and
    behavioral signals. All values are CO₂e.
    """
    context: dict[str, Any] = {}

    lifestyle = db.get_lifestyle(user_id)
    if lifestyle:
        transport = lifestyle.get("transport", {})
        food = lifestyle.get("food", {})
        energy = lifestyle.get("energy", {})

        context["daily_distance_km"] = transport.get("daily_distance_km", 0)
        context["transport_mode"] = transport.get("primary_mode", "unknown")
        context["diet_type"] = food.get("diet_type", "unknown")
        context["energy_source"] = energy.get("energy_source", "unknown")

        try:
            lifestyle_input = UserLifestyleInput(**lifestyle)
            breakdown = calculate_carbon_breakdown(lifestyle_input)
            context["total_monthly_kg"] = breakdown.total_kg
            context["transport_monthly_kg"] = breakdown.breakdown.transport_kg
            context["energy_monthly_kg"] = breakdown.breakdown.energy_kg
            context["food_monthly_kg"] = breakdown.breakdown.food_kg
            context["shopping_monthly_kg"] = breakdown.breakdown.shopping_kg
            context["primary_category"] = breakdown.primary_contributor
            context["primary_percentage"] = getattr(
                breakdown.breakdown_percentage,
                breakdown.primary_contributor,
                0,
            )
        except Exception as exc:
            logger.warning(
                "Emission calculation failed for context: %s", str(exc)
            )

    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    cii = db.get_cii_score(user_id, current_month)
    if cii:
        context["cii_score"] = cii.get("composite_score", 0)

    weights = db.get_behavioral_weights(user_id)
    if weights:
        low_categories = [
            cat for cat in ("transport", "energy", "food", "shopping")
            if weights.get(cat, 0.7) < 0.3
        ]
        if low_categories:
            context["behavioral_note"] = (
                f"User has declined most {', '.join(low_categories)} recommendations"
            )

    return context


def _build_calculation_data(
    category: str,
    lifestyle: dict,
) -> tuple[dict[str, Any], float, str]:
    """
    Builds the calculation data dictionary for the explainer.

    Returns (calculation_data, monthly_kg, factor_source) tuple.
    """
    transport = lifestyle.get("transport", {})
    energy = lifestyle.get("energy", {})
    food = lifestyle.get("food", {})
    shopping = lifestyle.get("shopping", {})

    if category == "transport":
        daily_kg = calculate_transport_daily(
            primary_mode=transport.get("primary_mode", "car_petrol"),
            daily_distance_km=transport.get("daily_distance_km", 0),
            weekly_flight_hours=transport.get("weekly_flight_hours", 0),
            car_passengers_avg=transport.get("car_passengers_avg", 1),
        )
        monthly_kg = daily_kg * 30
        data = {
            "transport_mode": transport.get("primary_mode", "car_petrol"),
            "daily_distance_km": transport.get("daily_distance_km", 0),
            "round_trip_km": transport.get("daily_distance_km", 0) * 2,
            "emission_factor_kg_per_km": "0.21 (petrol car)",
            "daily_commute_kg": round(daily_kg, 2),
            "monthly_kg": round(monthly_kg, 2),
            "factor_source": "UK Government GHG Conversion Factors 2023",
        }
        return data, monthly_kg, "UK Government GHG Conversion Factors 2023"

    elif category == "energy":
        daily_kg = calculate_energy_daily(
            household_size=energy.get("household_size", 3),
            energy_source=energy.get("energy_source", "grid_average"),
            monthly_kwh=energy.get("monthly_kwh", 300),
            heating_type=energy.get("heating_type", "electric"),
        )
        monthly_kg = daily_kg * 30
        data = {
            "energy_source": energy.get("energy_source", "grid_average"),
            "monthly_kwh": energy.get("monthly_kwh", 300),
            "household_size": energy.get("household_size", 3),
            "emission_factor_kg_per_kwh": "0.233 (grid average)",
            "monthly_kg": round(monthly_kg, 2),
            "factor_source": "UK Government GHG Conversion Factors 2023",
        }
        return data, monthly_kg, "UK Government GHG Conversion Factors 2023"

    elif category == "food":
        daily_kg = calculate_food_daily(
            diet_type=food.get("diet_type", "omnivore"),
            local_food_percentage=food.get("local_food_percentage", 30),
            food_waste_level=food.get("food_waste_level", "medium"),
        )
        monthly_kg = daily_kg * 30
        data = {
            "diet_type": food.get("diet_type", "omnivore"),
            "daily_diet_factor_kg_co2e": "5.5 (omnivore, including methane)",
            "food_waste_multiplier": food.get("food_waste_level", "medium"),
            "local_food_percentage": food.get("local_food_percentage", 30),
            "daily_kg": round(daily_kg, 2),
            "monthly_kg": round(monthly_kg, 2),
            "note": "Values include CH4 (methane) via IPCC AR6 GWP100",
            "factor_source": "IPCC AR6 WG3 Chapter 7 and Poore & Nemecek (2018)",
        }
        return data, monthly_kg, "IPCC AR6 WG3 (2022)"

    else:  # shopping
        daily_kg = calculate_shopping_daily(
            monthly_spend_category=shopping.get("monthly_spend_category", "moderate"),
            second_hand_percentage=shopping.get("second_hand_percentage", 10),
            electronics_yearly=shopping.get("electronics_yearly", 2),
        )
        monthly_kg = daily_kg * 30
        data = {
            "shopping_frequency": shopping.get("monthly_spend_category", "moderate"),
            "base_monthly_factor_kg": "35.0 (moderate)",
            "second_hand_percentage": shopping.get("second_hand_percentage", 10),
            "electronics_per_year": shopping.get("electronics_yearly", 2),
            "electronics_factor_kg_per_device": "70.0",
            "monthly_kg": round(monthly_kg, 2),
            "factor_source": "Berners-Lee (2020) and Carbon Trust lifecycle data",
        }
        return data, monthly_kg, "Berners-Lee (2020) How Bad Are Bananas"


def _format_context_labels(context_keys: list[str]) -> list[str]:
    """
    Converts internal context dictionary keys to user-readable labels
    displayed in the chat interface as the 'context used' indicator.
    """
    label_map: dict[str, str] = {
        "daily_distance_km": "Commute data",
        "transport_mode": "Transport mode",
        "diet_type": "Diet profile",
        "energy_source": "Energy source",
        "total_monthly_kg": "Monthly CO₂e total",
        "transport_monthly_kg": "Transport CO₂e",
        "energy_monthly_kg": "Energy CO₂e",
        "food_monthly_kg": "Food CO₂e",
        "shopping_monthly_kg": "Shopping CO₂e",
        "primary_category": "Top emission source",
        "primary_percentage": "Emission breakdown",
        "cii_score": "CII score",
        "behavioral_note": "Behavioral history",
    }

    labels: list[str] = []
    for key in context_keys:
        label = label_map.get(key)
        if label and label not in labels:
            labels.append(label)

    return labels

def generate_category_explainer(
    user_id: str,
    category: str,
) -> dict[str, Any]:
    """
    Generates a transparent, AI-powered explanation for a specific
    emission category showing exactly how the calculation was done.

    Feature 7: Carbon Footprint Explainer Mode

    Args:
        user_id: Firebase UID
        category: Emission category (transport/energy/food/shopping)

    Returns:
        ExplainerResponse dict with explanation, calculation breakdown,
        emission factors used, and source citations
    """
    from infrastructure.vertex_ai_client import initialize_vertex_ai, SAFETY_SETTINGS
    from domain.models.user_profile import UserLifestyleInput
    from services.carbon_engine import calculate_carbon_breakdown

    db = get_firestore_service()

    lifestyle = db.get_lifestyle(user_id)
    if not lifestyle:
        return {
            "category": category,
            "explanation": "No lifestyle data found. Please complete onboarding first.",
            "calculation_breakdown": "",
            "emission_factors_used": "",
            "source_citations": "",
            "monthly_kg": 0,
        }

    try:
        lifestyle_input = UserLifestyleInput(**lifestyle)
        breakdown = calculate_carbon_breakdown(lifestyle_input)
    except (ValueError, Exception) as e:
        logger.warning("Failed to calculate breakdown for explainer: %s", str(e))
        return {
            "category": category,
            "explanation": "Unable to calculate breakdown. Please update your profile.",
            "calculation_breakdown": "",
            "emission_factors_used": "",
            "source_citations": "",
            "monthly_kg": 0,
        }

    # Get category-specific data
    category_data = lifestyle.get(category, {})
    category_kg_attr = f"{category}_kg"
    monthly_kg = getattr(breakdown.breakdown, category_kg_attr, 0)

    explainer_prompts = {
        "transport": f"""Explain this transport emission calculation in plain language:
Primary mode: {category_data.get('primary_mode', 'unknown')}
Daily distance: {category_data.get('daily_distance_km', 0)} km (one-way)
Weekly flights: {category_data.get('weekly_flight_hours', 0)} hours
Car passengers: {category_data.get('car_passengers_avg', 1)}
Monthly result: {monthly_kg:.1f} kg CO₂e

Show the formula used, the emission factors, and why transportation matters.
Emission factors source: UK Government GHG Conversion Factors 2023.
Maximum 120 words. Use bullet points for the calculation steps.""",

        "energy": f"""Explain this energy emission calculation in plain language:
Household size: {category_data.get('household_size', 1)} people
Energy source: {category_data.get('energy_source', 'grid_average')}
Monthly consumption: {category_data.get('monthly_kwh', 0)} kWh
Heating type: {category_data.get('heating_type', 'electric')}
Monthly result: {monthly_kg:.1f} kg CO₂e

Show the formula used, the emission factors per kWh, and the household sharing factor.
Source: UK Government GHG Conversion Factors 2023.
Maximum 120 words. Use bullet points for the calculation steps.""",

        "food": f"""Explain this food emission calculation in plain language:
Diet type: {category_data.get('diet_type', 'omnivore')}
Local food: {category_data.get('local_food_percentage', 30)}%
Food waste: {category_data.get('food_waste_level', 'medium')}
Monthly result: {monthly_kg:.1f} kg CO₂e

Show the formula used, the CO₂e factors by diet type (including methane CH4 from meat),
and why methane makes food emissions higher than just CO₂.
Source: IPCC AR6, Poore & Nemecek (2018).
Maximum 120 words. Use bullet points for the calculation steps.""",

        "shopping": f"""Explain this shopping emission calculation in plain language:
Shopping frequency: {category_data.get('monthly_spend_category', 'moderate')}
Second-hand percentage: {category_data.get('second_hand_percentage', 10)}%
Electronics per year: {category_data.get('electronics_yearly', 2)}
Monthly result: {monthly_kg:.1f} kg CO₂e

Show the formula used, the lifecycle emission factors for goods and electronics,
and how second-hand purchasing reduces manufacturing emissions.
Source: Berners-Lee (2020), product lifecycle analysis averages.
Maximum 120 words. Use bullet points for the calculation steps.""",
    }

    prompt = explainer_prompts.get(
        category,
        f"Explain the {category} emission calculation result of {monthly_kg:.1f} kg CO₂e/month."
    )

    # Call Vertex AI
    try:
        from vertexai.generative_models import GenerativeModel, Content, Part
        initialize_vertex_ai()
        settings = get_settings()

        model = GenerativeModel(
            model_name=settings.vertex_ai_model,
            system_instruction=(
                "You are ACIA, explaining carbon emission calculations transparently. "
                "Always show the formula and emission factors. "
                "Use CO₂e units. Be specific with numbers. Maximum 120 words."
            ),
        )

        contents = [Content(role="user", parts=[Part.from_text(prompt)])]
        response = model.generate_content(
            contents,
            generation_config={"temperature": 0.3, "max_output_tokens": 300},
            safety_settings=SAFETY_SETTINGS,
        )

        explanation = response.text.strip() if response.text else ""

    except Exception as e:
        logger.warning("Vertex AI explainer failed: %s", str(e))
        explanation = (
            f"Your {category} emissions are {monthly_kg:.1f} kg CO₂e/month. "
            f"This is calculated from your {category} lifestyle inputs using "
            f"verified emission factors. Ask the AI Assistant for a detailed breakdown."
        )

    source_map = {
        "transport": "UK Government GHG Conversion Factors 2023",
        "energy": "UK Government GHG Conversion Factors 2023",
        "food": "IPCC AR6, Poore & Nemecek (2018), Science 360(6392)",
        "shopping": "Berners-Lee (2020), Product lifecycle analysis averages",
    }

    return {
        "category": category,
        "explanation": explanation,
        "calculation_breakdown": f"Monthly {category} emissions: {monthly_kg:.1f} kg CO₂e",
        "emission_factors_used": f"See explanation above for specific factors",
        "source_citations": source_map.get(category, "Multiple sources"),
        "monthly_kg": round(monthly_kg, 2),
    }