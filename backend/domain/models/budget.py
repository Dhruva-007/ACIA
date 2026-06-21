"""
Budget Domain Models — Feature 2

Pydantic models for the Carbon Budget System.
All kg values are in kg CO₂e.
"""

from pydantic import BaseModel
from typing import Literal


class CarbonBudget(BaseModel):
    """
    Current month carbon budget and progress.
    All kg values are in kg CO₂e.
    """
    month: str
    budget_kg: float
    used_kg: float
    daily_rate_kg: float
    status: Literal["on_track", "slightly_over", "significantly_over"]
    days_remaining: int
    percentage_used: float