"""
Vertex AI Gemini Client

Manages connection to Google Cloud Vertex AI Gemini for the
AI Sustainability Assistant, weekly narrative generation,
and category explainer mode.

Architecture decisions:
- Vertex AI SDK initialized once at application startup
- GenerativeModel instantiated per-request because system_instruction
  is user-specific and must be embedded in the model constructor,
  not in generate_content (changed in Vertex AI SDK 1.38+)
- Global model singleton is intentionally avoided for this reason
- Fallback responses use real user context so they are always
  personalized even when Vertex AI is unavailable

Safety:
- System prompt is server-side only, never exposed to clients
- User messages are truncated at 1000 characters before submission
- Safety filters active on all generation requests
- Conversation history limited to last 10 messages to control costs
"""

import logging
from typing import Any

import vertexai
from vertexai.generative_models import (
    Content,
    GenerativeModel,
    HarmBlockThreshold,
    HarmCategory,
    Part,
    SafetySetting,
)

from config import get_settings

logger = logging.getLogger("acia.vertex_ai")

_vertex_initialized: bool = False


def initialize_vertex_ai() -> None:
    """
    Initializes the Vertex AI SDK.

    Called once at application startup via the lifespan handler.
    Subsequent calls are no-ops due to the guard flag.

    Raises:
        Exception: If project credentials are invalid or the
                   Vertex AI API is not enabled for the project.
    """
    global _vertex_initialized

    if _vertex_initialized:
        return

    settings = get_settings()

    vertexai.init(
        project=settings.vertex_ai_project_id,
        location=settings.vertex_ai_location,
    )
    _vertex_initialized = True

    logger.info(
        "Vertex AI initialized: project=%s location=%s model=%s",
        settings.vertex_ai_project_id,
        settings.vertex_ai_location,
        settings.vertex_ai_model,
    )




def _ensure_initialized() -> None:
    """
    Ensures Vertex AI is initialized before any model call.

    Provides a safety net for calls made before the lifespan
    handler has run (e.g., during testing).
    """
    if not _vertex_initialized:
        initialize_vertex_ai()


# ─── Safety Settings ────────────────────────────────────────────────

SAFETY_SETTINGS: list[SafetySetting] = [
    SafetySetting(
        category=HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold=HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
    SafetySetting(
        category=HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold=HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
    SafetySetting(
        category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold=HarmBlockThreshold.BLOCK_ONLY_HIGH,
    ),
    SafetySetting(
        category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold=HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    ),
]

# ─── Generation Configuration ────────────────────────────────────────

ASSISTANT_GENERATION_CONFIG: dict[str, Any] = {
    "temperature": 0.7,
    "top_p": 0.9,
    "max_output_tokens": 1024,
}

NARRATIVE_GENERATION_CONFIG: dict[str, Any] = {
    "temperature": 0.6,
    "top_p": 0.85,
    "max_output_tokens": 512,
}

EXPLAINER_GENERATION_CONFIG: dict[str, Any] = {
    "temperature": 0.3,   # Lower temperature for factual accuracy
    "top_p": 0.8,
    "max_output_tokens": 768,
}


# ─── System Prompts ─────────────────────────────────────────────────

ASSISTANT_SYSTEM_PROMPT_TEMPLATE = """You are ACIA, the Adaptive Carbon Intelligence Assistant.
You are a sustainability expert specializing in helping individuals reduce their personal carbon footprint.

Your role:
- Provide specific, personalized advice based on the user's actual data
- Always cite specific numbers from the user's profile
- Explain the reasoning behind your suggestions
- Quantify the impact of suggested actions in kg CO₂e
- Keep responses under 200 words unless the user explicitly asks for more detail
- Acknowledge the user's existing positive behaviors
- Be encouraging and practical, never preachy or judgmental

Rules:
- Never give generic advice that ignores the user's context
- Never suggest high-cost actions without explicitly noting the cost
- Never use vague language like "consider reducing" — always be specific
- Never refer to yourself as an AI or discuss your technical limitations
- Always express carbon values in kg CO₂e (not just CO₂)

Current user context:
{user_context}
"""

NARRATIVE_SYSTEM_PROMPT = """You are ACIA, the Adaptive Carbon Intelligence Assistant.
Generate a concise, encouraging weekly carbon footprint summary for this user.

Rules:
- Exactly 3 sentences
- Mention the specific weekly total in kg CO₂e
- Reference one specific action or pattern that influenced the result
- End with a forward-looking motivational statement
- Be warm and specific, not generic
- Use kg CO₂e for all values
"""

EXPLAINER_SYSTEM_PROMPT = """You are ACIA, the Adaptive Carbon Intelligence Assistant.
You are explaining exactly how a specific carbon emission category was calculated for this user.

Rules:
- Show the actual calculation step by step
- Use the user's real numbers
- Cite the emission factor source
- Keep it under 150 words
- Format clearly with the calculation visible
- Express all values in kg CO₂e
- Be educational but accessible, not technical jargon
"""


def build_system_prompt(user_context: dict[str, Any]) -> str:
    """
    Builds the conversational assistant system prompt with
    injected user-specific context data.

    The system prompt is constructed server-side and never
    exposed to the client. It provides the AI with enough
    context to give specific, personalized answers.

    Args:
        user_context: Dictionary of user profile and emission data

    Returns:
        Complete system prompt string with context injected
    """
    context_lines: list[str] = []

    if user_context.get("daily_distance_km"):
        context_lines.append(
            f"- Daily commute: {user_context['daily_distance_km']} km "
            f"by {user_context.get('transport_mode', 'car')}"
        )

    if user_context.get("transport_monthly_kg"):
        context_lines.append(
            f"- Transport emissions: {user_context['transport_monthly_kg']:.1f} kg CO₂e/month"
        )

    if user_context.get("total_monthly_kg"):
        context_lines.append(
            f"- Total footprint: {user_context['total_monthly_kg']:.1f} kg CO₂e/month"
        )

    if user_context.get("primary_category"):
        context_lines.append(
            f"- Largest emission source: {user_context['primary_category']} "
            f"at {user_context.get('primary_percentage', 0):.0f}%"
        )

    if user_context.get("cii_score") is not None:
        context_lines.append(
            f"- Carbon Improvement Index: {user_context['cii_score']}/100"
        )

    if user_context.get("diet_type"):
        context_lines.append(f"- Diet type: {user_context['diet_type']}")

    if user_context.get("energy_source"):
        context_lines.append(f"- Energy source: {user_context['energy_source']}")

    if user_context.get("behavioral_note"):
        context_lines.append(f"- Behavioral note: {user_context['behavioral_note']}")

    context_str = (
        "\n".join(context_lines)
        if context_lines
        else "No profile data available yet. Provide general sustainability guidance."
    )

    return ASSISTANT_SYSTEM_PROMPT_TEMPLATE.format(user_context=context_str)


def generate_response(
    user_message: str,
    system_prompt: str,
    conversation_history: list[dict[str, str]] | None = None,
) -> str:
    """
    Generates a conversational AI assistant response.

    Creates a new GenerativeModel instance per request with the
    user-specific system prompt embedded at model construction time.
    This is the correct pattern for Vertex AI SDK 1.38+ where
    system_instruction must be passed to the constructor.

    Args:
        user_message: The user's message (truncated to 1000 chars)
        system_prompt: User-specific system prompt with context injected
        conversation_history: Optional list of previous messages for
                               conversational context (last 10 used)

    Returns:
        Generated response text string

    Raises:
        Exception: Propagated to caller for fallback handling
    """
    _ensure_initialized()
    settings = get_settings()

    # Instantiate model with user-specific system instruction
    model = GenerativeModel(
        model_name=settings.vertex_ai_model,
        system_instruction=system_prompt,
    )

    contents: list[Content] = []

    # Include recent conversation history for context continuity
    if conversation_history:
        for msg in conversation_history[-10:]:
            role = "user" if msg.get("role") == "user" else "model"
            content_text = msg.get("content", "")
            if content_text:
                contents.append(
                    Content(role=role, parts=[Part.from_text(content_text)])
                )

    # Add current user message
    contents.append(
        Content(role="user", parts=[Part.from_text(user_message[:1000])])
    )

    response = model.generate_content(
        contents,
        generation_config=ASSISTANT_GENERATION_CONFIG,
        safety_settings=SAFETY_SETTINGS,
    )

    if response.text:
        return response.text.strip()

    return (
        "Could you rephrase your question? "
        "I want to give you the most accurate answer based on your profile."
    )


def generate_narrative(
    weekly_data: dict[str, Any],
) -> str:
    """
    Generates a concise AI weekly carbon narrative (Feature 3).

    Uses a structured prompt optimized for brief, encouraging
    weekly summaries rather than the conversational assistant prompt.

    Args:
        weekly_data: Dictionary containing:
            - weekly_total_kg: float
            - previous_week_kg: float
            - change_percentage: float
            - top_category: str
            - top_category_kg: float
            - completed_actions: list[str]

    Returns:
        3-sentence narrative string

    Raises:
        Exception: Propagated to caller for fallback handling
    """
    _ensure_initialized()
    settings = get_settings()

    model = GenerativeModel(
        model_name=settings.vertex_ai_model,
        system_instruction=NARRATIVE_SYSTEM_PROMPT,
    )

    weekly_kg = weekly_data.get("weekly_total_kg", 0)
    prev_kg = weekly_data.get("previous_week_kg", weekly_kg)
    change_pct = weekly_data.get("change_percentage", 0)
    top_category = weekly_data.get("top_category", "transport")
    completed = weekly_data.get("completed_actions", [])

    change_direction = "less" if change_pct <= 0 else "more"
    change_abs = abs(change_pct)

    user_prompt = (
        f"Weekly total: {weekly_kg:.1f} kg CO₂e "
        f"({change_abs:.1f}% {change_direction} than last week). "
        f"Largest source: {top_category}. "
        f"Completed actions this week: {', '.join(completed) if completed else 'none'}. "
        f"Generate the 3-sentence narrative now."
    )

    contents = [Content(role="user", parts=[Part.from_text(user_prompt)])]

    response = model.generate_content(
        contents,
        generation_config=NARRATIVE_GENERATION_CONFIG,
        safety_settings=SAFETY_SETTINGS,
    )

    if response.text:
        return response.text.strip()

    return (
        f"This week you emitted {weekly_kg:.1f} kg CO₂e. "
        f"Your {top_category} category was your largest source. "
        f"Keep engaging with your recommendations to build on your progress."
    )


def generate_explainer(
    category: str,
    calculation_data: dict[str, Any],
) -> str:
    """
    Generates a plain-language calculation explanation for a
    specific emission category (Feature 7 — Explainer Mode).

    Uses a low-temperature prompt to ensure factual accuracy
    in the calculation breakdown.

    Args:
        category: Emission category ('transport', 'energy', 'food', 'shopping')
        calculation_data: Dictionary containing the raw calculation
            inputs and outputs for this category, e.g.:
            {
                "distance_km": 15,
                "factor_per_km": 0.21,
                "daily_kg": 6.3,
                "monthly_kg": 189.0,
                "factor_source": "UK Gov GHG 2023"
            }

    Returns:
        Formatted explanation string with calculation steps

    Raises:
        Exception: Propagated to caller for fallback handling
    """
    _ensure_initialized()
    settings = get_settings()

    model = GenerativeModel(
        model_name=settings.vertex_ai_model,
        system_instruction=EXPLAINER_SYSTEM_PROMPT,
    )

    user_prompt = (
        f"Explain the {category} emission calculation for this user:\n"
        f"{_format_calculation_data(category, calculation_data)}\n"
        f"Show the step-by-step calculation and cite the emission factor source."
    )

    contents = [Content(role="user", parts=[Part.from_text(user_prompt)])]

    response = model.generate_content(
        contents,
        generation_config=EXPLAINER_GENERATION_CONFIG,
        safety_settings=SAFETY_SETTINGS,
    )

    if response.text:
        return response.text.strip()

    return _build_fallback_explainer(category, calculation_data)


def generate_fallback_response(user_context: dict[str, Any]) -> str:
    """
    Generates a contextual fallback response when Vertex AI is unavailable.

    Always uses the user's actual data so the response is personalized
    even without AI generation. This ensures the fallback is meaningfully
    different from a generic error message.

    Args:
        user_context: Dictionary of user profile and emission data

    Returns:
        Personalized fallback response string
    """
    primary = user_context.get("primary_category", "transportation")
    percentage = user_context.get("primary_percentage", 0)
    total = user_context.get("total_monthly_kg", 0)
    cii = user_context.get("cii_score")

    if total > 0:
        cii_note = f" Your current CII score is {cii}/100." if cii is not None else ""
        return (
            f"I'm temporarily unable to process your request with full AI capabilities.{cii_note} "
            f"Based on your profile, your largest emission source is {primary} "
            f"at {percentage:.0f}% of your {total:.1f} kg CO₂e/month footprint. "
            f"Check your Recommendations page for personalized actions to reduce this. "
            f"Please try asking again in a moment."
        )

    return (
        "I'm temporarily unable to process your request. "
        "Please try again in a moment. In the meantime, "
        "check your Dashboard for your carbon footprint overview "
        "and the Recommendations page for personalized actions to reduce it."
    )


# ─── Internal Helpers ────────────────────────────────────────────────

def _format_calculation_data(category: str, data: dict[str, Any]) -> str:
    """Formats calculation data into a readable string for the explainer prompt."""
    lines = [f"Category: {category}"]
    for key, value in data.items():
        readable_key = key.replace("_", " ").title()
        lines.append(f"- {readable_key}: {value}")
    return "\n".join(lines)


def _build_fallback_explainer(category: str, data: dict[str, Any]) -> str:
    """
    Builds a structured fallback explainer when Vertex AI is unavailable.
    Uses the raw calculation data to produce a readable explanation.
    """
    monthly_kg = data.get("monthly_kg", 0)
    source = data.get("factor_source", "UK Government GHG Conversion Factors 2023")

    return (
        f"Your {category} category contributes approximately {monthly_kg:.1f} kg CO₂e per month. "
        f"This is calculated from your lifestyle inputs using verified emission factors. "
        f"Source: {source}."
    )