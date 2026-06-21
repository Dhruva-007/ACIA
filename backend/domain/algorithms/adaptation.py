"""
Behavioral Weight Adaptation Algorithm

Updates behavioral weights based on user interactions
with recommendations. These weights directly influence
future recommendation ranking through the Adoption
Probability score.

Weight Update Rules:
- ACCEPTED:  category +0.15, sub_type +0.20
- REJECTED:  category -0.20, sub_type -0.25
- COMPLETED: category +0.25, sub_type +0.30 (strongest positive)
- FAILED:    category -0.10, sub_type -0.15 (lighter than rejection)
- DEFERRED:  no change (neutral signal)

Design rationale:
- Rejection penalty > acceptance reward because explicit
  rejection is a stronger preference signal
- Completion is the strongest positive signal because it
  confirms both willingness AND capability
- Failure penalty is lighter than rejection because failure
  may indicate external circumstances, not preference
- All weights are clamped to [0.0, 1.0]

Filtering threshold:
- Sub-type weight < 0.2: excluded from candidate generation
"""

from typing import Any

# ─── Weight Adjustment Constants ─────────────────────────────────────

WEIGHT_ADJUSTMENTS: dict[str, dict[str, float]] = {
    "accepted": {
        "category_delta": 0.15,
        "sub_type_delta": 0.20,
    },
    "rejected": {
        "category_delta": -0.20,
        "sub_type_delta": -0.25,
    },
    "completed": {
        "category_delta": 0.25,
        "sub_type_delta": 0.30,
    },
    "failed": {
        "category_delta": -0.10,
        "sub_type_delta": -0.15,
    },
    "deferred": {
        "category_delta": 0.0,
        "sub_type_delta": 0.0,
    },
}

WEIGHT_MIN = 0.0
WEIGHT_MAX = 1.0
FILTERING_THRESHOLD = 0.2


def clamp_weight(value: float) -> float:
    """Clamps a weight value to [0.0, 1.0]."""
    return min(WEIGHT_MAX, max(WEIGHT_MIN, round(value, 3)))


def calculate_weight_update(
    current_category_weight: float,
    current_sub_type_weight: float,
    action: str,
) -> tuple[float, float]:
    """
    Calculates new weights after a behavioral action.

    Args:
        current_category_weight: Current weight for the category (0-1)
        current_sub_type_weight: Current weight for the sub-type (0-1)
        action: User action ('accepted', 'rejected', 'completed', 'failed', 'deferred')

    Returns:
        Tuple of (new_category_weight, new_sub_type_weight)

    Raises:
        ValueError: If action is not recognized
    """
    if action not in WEIGHT_ADJUSTMENTS:
        raise ValueError(
            f"Unknown behavioral action: {action}. "
            f"Valid actions: {list(WEIGHT_ADJUSTMENTS.keys())}"
        )

    adjustments = WEIGHT_ADJUSTMENTS[action]

    new_category = clamp_weight(
        current_category_weight + adjustments["category_delta"]
    )
    new_sub_type = clamp_weight(
        current_sub_type_weight + adjustments["sub_type_delta"]
    )

    return new_category, new_sub_type


def is_sub_type_filtered(sub_type_weight: float) -> bool:
    """
    Returns True if a sub-type should be excluded from
    recommendation generation based on its weight.

    Sub-types below the filtering threshold have been
    rejected enough times that the system should stop
    suggesting them.

    Args:
        sub_type_weight: Current sub-type weight (0-1)

    Returns:
        True if the sub-type should be filtered out
    """
    return sub_type_weight < FILTERING_THRESHOLD


def apply_weekly_decay(weights: dict[str, float]) -> dict[str, float]:
    """
    Applies weekly decay to all weights, pulling them
    toward neutral (0.5) by 5%.

    Purpose: Prevents permanent exclusion of categories
    that the user may reconsider over time. A user who
    rejected cycling 6 months ago might be open to it now.

    Formula: weight = weight + (0.5 - weight) * 0.05

    Args:
        weights: Dictionary of weight name -> value pairs

    Returns:
        New dictionary with decayed weights
    """
    decayed: dict[str, float] = {}
    for key, value in weights.items():
        decayed[key] = clamp_weight(value + (0.5 - value) * 0.05)
    return decayed


def generate_feedback_message(
    action: str,
    category: str,
    new_category_weight: float,
) -> str:
    """
    Generates a user-facing message after behavioral feedback.

    Args:
        action: User action
        category: Recommendation category
        new_category_weight: Updated category weight

    Returns:
        Human-readable feedback message
    """
    messages: dict[str, str] = {
        "accepted": (
            f"Recommendation accepted! We'll track your progress. "
            f"Future {category} recommendations will be prioritized. 🌱"
        ),
        "rejected": (
            f"Got it. We'll show you different alternatives. "
            f"{category.title()} suggestions have been de-prioritized."
        ),
        "completed": (
            f"Excellent! Action completed successfully! "
            f"Your Carbon Improvement Index has been updated. 🎉"
        ),
        "failed": (
            f"No worries — we'll suggest easier alternatives. "
            f"Your feedback helps us find what works for you."
        ),
        "deferred": "Saved for later. We'll remind you.",
    }

    message = messages.get(action, "Feedback recorded.")

    # Add filtered warning if weight is very low
    if new_category_weight < FILTERING_THRESHOLD:
        message += (
            f" Note: {category.title()} recommendations have been "
            f"significantly reduced based on your preferences."
        )

    return message