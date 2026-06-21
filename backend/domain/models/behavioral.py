"""
Behavioral Domain Models

Re-exports from recommendation module for backward compatibility.
Core behavioral models (BehavioralWeights, BehavioralEvent, etc.)
are defined in domain.models.recommendation.
"""

from domain.models.recommendation import (
    BehavioralWeights,
    BehavioralEvent,
    BehaviorFeedbackRequest,
    BehaviorFeedbackResult,
)

__all__ = [
    "BehavioralWeights",
    "BehavioralEvent",
    "BehaviorFeedbackRequest",
    "BehaviorFeedbackResult",
]