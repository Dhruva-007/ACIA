"""
Recommendation Domain Models

Pydantic models for the Adaptive Recommendation Engine,
Behavioral Learning Engine, and feedback system.

The recommendation lifecycle:
pending → accepted → completed (positive path)
pending → rejected             (negative path — de-prioritized)
pending → failed               (negative path — lighter penalty)
pending → deferred             (neutral — no weight change)
pending → expired              (system — cleared after weight update)
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional


class RecommendationScores(BaseModel):
    """
    Five-dimension scoring for a recommendation.

    Each score is 0-100. The composite score is a weighted
    average with adoption_probability carrying the highest
    weight (35%) because a recommendation the user ignores
    achieves zero carbon reduction regardless of its impact.
    """
    carbon_impact: float = Field(ge=0, le=100)
    adoption_probability: float = Field(ge=0, le=100)
    cost_score: float = Field(ge=0, le=100)
    convenience_score: float = Field(ge=0, le=100)
    lifestyle_score: float = Field(ge=0, le=100)


class Recommendation(BaseModel):
    """
    Complete recommendation with scoring, metadata, and
    display history tracking for the recommendation memory system.
    """
    id: str
    title: str
    description: str
    category: Literal["transport", "energy", "food", "shopping"]
    sub_type: str
    scores: RecommendationScores
    composite_score: float = Field(ge=0, le=100)
    reasoning: str
    monthly_kg_reduction: float
    annual_kg_reduction: float
    impact_percentage: float
    cost_level: Literal["free", "low", "medium", "high", "investment"]
    disruption_level: Literal["minimal", "low", "medium", "high"]
    status: Literal[
        "pending", "accepted", "rejected",
        "completed", "failed", "deferred", "expired"
    ] = "pending"
    # Display history fields — used by recommendation memory system
    # to prevent re-showing recently displayed or rejected recommendations
    times_shown: int = 0
    last_shown_at: str = ""
    created_at: str = ""
    updated_at: str = ""


class RecommendationHistoryRecord(BaseModel):
    """
    Per-template display and interaction history record.

    Stored in users/{uid}/recommendation_history/{template_id}.
    Used by the recommendation engine to implement memory:
    preventing templates that have been rejected twice or
    recently shown from appearing again.
    """
    template_id: str
    times_shown: int = 0
    last_shown_at: str = ""
    first_shown_at: str = ""
    last_status: Literal[
        "pending", "accepted", "rejected",
        "completed", "failed", "deferred", "expired"
    ] = "pending"
    rejection_count: int = 0
    completion_count: int = 0


class BehaviorFeedbackRequest(BaseModel):
    """Request body for behavioral feedback submission."""
    recommendation_id: str
    action: Literal["accepted", "rejected", "completed", "failed", "deferred"]


class BehaviorFeedbackResult(BaseModel):
    """Response after behavioral feedback processing."""
    recommendation_id: str
    action: str
    weight_updated: bool
    new_category_weight: float
    message: str


class BehavioralWeights(BaseModel):
    """
    Current behavioral weights per category and sub-type.

    Category weights (0-1) influence candidate generation.
    Sub-type weights (0-1) influence adoption probability scoring.
    Weights below 0.2 trigger filtering from candidate pool.
    """
    transport: float = Field(ge=0, le=1, default=0.7)
    energy: float = Field(ge=0, le=1, default=0.7)
    food: float = Field(ge=0, le=1, default=0.7)
    shopping: float = Field(ge=0, le=1, default=0.7)
    sub_weights: dict[str, float] = {}
    updated_at: str = ""


class BehavioralEvent(BaseModel):
    """Record of a single behavioral interaction with a recommendation."""
    id: str = ""
    recommendation_id: str
    recommendation_category: str
    recommendation_sub_type: str
    action: str
    previous_weight: float
    new_weight: float
    timestamp: str = ""