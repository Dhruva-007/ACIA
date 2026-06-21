"""
ACIA Backend Configuration

Manages all application configuration through environment variables.
Uses Pydantic Settings for validation and type safety.
All sensitive values must be set in .env file, never hardcoded.

Constants that are scientific/domain values (not secret) are
defined here as module-level constants rather than environment
variables, since they are appropriate to keep in source control.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


# ─── Domain Constants ───────────────────────────────────────────────
# Scientific reference values used across multiple services.
# Centralized here to ensure consistency.

# Global average personal carbon footprint per month in kg CO₂e
# Source: Our World in Data (2023), ~4.5 tonnes CO₂e/year globally
GLOBAL_AVERAGE_MONTHLY_KG: float = 375.0

# Paris Agreement 1.5°C target per person per month in kg CO₂e
# Source: IPCC SR1.5, ~2 tonnes CO₂e/year by 2050
PARIS_TARGET_MONTHLY_KG: float = 167.0


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    All fields are required unless a default is provided.
    Pydantic validates types and raises clear errors on startup
    if any required variable is missing or has the wrong type.
    """

    # ─── Application ────────────────────────────────────────────────
    app_name: str = "ACIA - Adaptive Carbon Intelligence Assistant"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "development"

    # ─── API ────────────────────────────────────────────────────────
    api_prefix: str = "/api/v1"
    allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "https://acia-carbon-assistant.web.app",
        "https://acia-carbon-assistant.firebaseapp.com",
    ]

    # Firebase
    firebase_project_id: str = "acia-carbon-assistant"
    google_application_credentials: str = ""

    # Vertex AI
    vertex_ai_project_id: str = "acia-carbon-assistant"
    vertex_ai_location: str = "us-central1"
    # gemini-2.5-flash: optimal balance of cost, latency, and quality
    # for conversational sustainability assistance
    vertex_ai_model: str = "gemini-2.5-flash"

    # ─── Rate Limiting ──────────────────────────────────────────────
    rate_limit_ai_per_hour: int = 20
    rate_limit_api_per_minute: int = 100

    # ─── Carbon Calculation ─────────────────────────────────────────
    days_for_trend_analysis: int = 30
    prediction_confidence_threshold: float = 0.7

    # ─── Adaptive Re-Onboarding ─────────────────────────────────────
    # Number of days before the system prompts the user to review
    # their lifestyle profile. Ensures calculations stay accurate
    # as user habits evolve over time.
    profile_review_days: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Returns cached settings instance.

    Uses lru_cache to ensure Settings is only instantiated once
    per application lifecycle, avoiding repeated .env file reads
    and environment variable parsing on every request.
    """
    return Settings()