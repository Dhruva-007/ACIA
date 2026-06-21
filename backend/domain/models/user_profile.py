"""
User Profile Domain Models

Pydantic models for user profile data, lifestyle inputs,
and onboarding request/response schemas.

All models use strict validation to reject invalid data
at the API boundary before it reaches any business logic.
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional


# ─── Lifestyle Input Models ──────────────────────────────────────────

class TransportInput(BaseModel):
    """Transportation lifestyle inputs."""
    primary_mode: Literal[
        "car_petrol", "car_diesel", "car_electric",
        "motorcycle", "public_transport", "bicycle", "walking"
    ]
    daily_distance_km: float = Field(ge=0, le=2000, description="One-way daily commute in km")
    weekly_flight_hours: float = Field(ge=0, le=168, description="Average weekly flight hours")
    car_passengers_avg: int = Field(ge=1, le=10, default=1, description="Average passengers including driver")


class EnergyInput(BaseModel):
    """Energy consumption lifestyle inputs."""
    household_size: int = Field(ge=1, le=20, description="Number of people in household")
    energy_source: Literal["grid_average", "renewable", "gas_heavy"]
    monthly_kwh: float = Field(ge=0, le=99999, description="Monthly electricity consumption in kWh")
    heating_type: str = Field(default="electric", description="Heating system type")


class FoodInput(BaseModel):
    """Food and diet lifestyle inputs."""
    diet_type: Literal[
        "vegan", "vegetarian", "pescatarian",
        "flexitarian", "omnivore", "high_meat"
    ]
    local_food_percentage: float = Field(ge=0, le=100, description="Percentage of locally sourced food")
    food_waste_level: Literal["low", "medium", "high"]


class ShoppingInput(BaseModel):
    """Shopping habit lifestyle inputs."""
    monthly_spend_category: Literal["minimal", "moderate", "frequent"]
    second_hand_percentage: float = Field(ge=0, le=100, description="Percentage of second-hand purchases")
    electronics_yearly: int = Field(ge=0, le=100, description="Electronics devices purchased per year")


class UserLifestyleInput(BaseModel):
    """Complete lifestyle input combining all four categories."""
    transport: TransportInput
    energy: EnergyInput
    food: FoodInput
    shopping: ShoppingInput


# ─── Profile Models ──────────────────────────────────────────────────

class UserSettings(BaseModel):
    """User application settings."""
    units: Literal["metric", "imperial"] = "metric"
    notifications_enabled: bool = True
    theme: Literal["light", "dark"] = "light"


class UserProfile(BaseModel):
    """User profile data."""
    uid: str
    email: str
    display_name: str = ""
    created_at: str = ""
    updated_at: str = ""
    onboarding_completed: bool = False
    settings: UserSettings = UserSettings()


class ProfileSetupRequest(BaseModel):
    """Request body for initial profile setup (onboarding)."""
    transport: TransportInput
    energy: EnergyInput
    food: FoodInput
    shopping: ShoppingInput