"""
Streak Domain Models — Feature 1

Pydantic models for behavioral streak tracking.
"""

from pydantic import BaseModel
from typing import Literal


class StreakRecord(BaseModel):
    """Record of a behavioral streak for a specific recommendation sub-type."""
    sub_type: str
    recommendation_id: str
    current_streak: int
    longest_streak: int
    last_checkin_at: str | None = None
    checkin_due_by: str | None = None
    status: Literal["active", "at_risk", "broken"] = "active"
    started_at: str = ""
    updated_at: str = ""


class StreakSummary(BaseModel):
    """Summary of all streaks for a user."""
    streaks: list[StreakRecord]
    total_active: int
    longest_current: int


class StreakCheckinRequest(BaseModel):
    """Request body for streak check-in submission."""
    sub_type: str
    completed: bool