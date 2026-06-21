"""
Integration Test Configuration

Provides shared fixtures for all API integration tests.

Critical patching strategy:
- Each route module calls get_firestore_service() at request time
- We must patch the function at every location it is imported/called
- The safest approach is to patch at the infrastructure module level
  AND ensure the patch propagates by using the correct target path

Authentication patching:
- auth.py calls firebase_admin.auth.verify_id_token
- We patch firebase_admin.auth directly since that is what auth.py uses
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# ─── Test Constants ───────────────────────────────────────────────────

TEST_USER_ID = "test_user_uid_123"
MOCK_TOKEN = "mock_firebase_jwt_token"
VALID_HEADERS = {"Authorization": f"Bearer {MOCK_TOKEN}"}


# ─── Lifestyle and Profile Data ───────────────────────────────────────

@pytest.fixture
def valid_lifestyle_dict() -> dict:
    return {
        "transport": {
            "primary_mode": "car_petrol",
            "daily_distance_km": 15.0,
            "weekly_flight_hours": 0.5,
            "car_passengers_avg": 1,
        },
        "energy": {
            "household_size": 2,
            "energy_source": "grid_average",
            "monthly_kwh": 300.0,
            "heating_type": "electric",
        },
        "food": {
            "diet_type": "omnivore",
            "local_food_percentage": 30.0,
            "food_waste_level": "medium",
        },
        "shopping": {
            "monthly_spend_category": "moderate",
            "second_hand_percentage": 10.0,
            "electronics_yearly": 2,
        },
    }


@pytest.fixture
def valid_profile_dict() -> dict:
    return {
        "uid": TEST_USER_ID,
        "onboarding_completed": True,
        "last_profile_review": "2024-01-01T00:00:00+00:00",
        "created_at": "2024-01-01T00:00:00+00:00",
        "updated_at": "2024-01-01T00:00:00+00:00",
    }


@pytest.fixture
def sample_recommendation() -> dict:
    return {
        "id": "rec_abc123",
        "template_id": "transport_public_transit_01",
        "title": "Use public transport for commuting",
        "description": "Replace car trips with public transport.",
        "category": "transport",
        "sub_type": "public_transport",
        "scores": {
            "carbon_impact": 75.0,
            "adoption_probability": 80.0,
            "cost_score": 80.0,
            "convenience_score": 50.0,
            "lifestyle_score": 80.0,
        },
        "composite_score": 77.5,
        "reasoning": "High adoption probability based on your profile.",
        "monthly_kg_reduction": 19.5,
        "annual_kg_reduction": 234.0,
        "impact_percentage": 4.1,
        "cost_level": "low",
        "disruption_level": "medium",
        "status": "pending",
        "created_at": "2024-01-15T10:00:00+00:00",
        "updated_at": "2024-01-15T10:00:00+00:00",
    }


# ─── Mock Firestore Service ───────────────────────────────────────────

@pytest.fixture
def mock_db(valid_lifestyle_dict, valid_profile_dict, sample_recommendation):
    """
    Fully configured mock FirestoreService.
    All methods return sensible defaults.
    Individual tests can override specific return values.
    """
    db = MagicMock()

    db.get_profile.return_value = valid_profile_dict
    db.set_profile.return_value = None

    db.get_lifestyle.return_value = valid_lifestyle_dict
    db.set_lifestyle.return_value = None

    db.get_recent_emissions.return_value = [
        {
            "date": f"2024-01-{str(i).zfill(2)}",
            "total_kg": 15.88,
            "breakdown": {
                "transport_kg": 6.3,
                "energy_kg": 1.75,
                "food_kg": 6.36,
                "shopping_kg": 1.47,
            },
            "breakdown_percentage": {
                "transport": 39.7,
                "energy": 11.0,
                "food": 40.1,
                "shopping": 9.3,
            },
            "primary_contributor": "food",
        }
        for i in range(1, 15)
    ]
    db.set_emission.return_value = None
    db.get_emissions_range.return_value = []

    db.get_recommendations.return_value = [sample_recommendation]
    db.get_all_recommendations.return_value = [sample_recommendation]
    db.set_recommendation.return_value = None
    db.update_recommendation_status.return_value = None

    db.get_recommendation_history.return_value = []
    db.get_recommendation_history_record.return_value = None
    db.set_recommendation_history_record.return_value = None
    db.update_recommendation_history_status.return_value = None

    db.get_behavioral_weights.return_value = {
        "transport": 0.7,
        "energy": 0.7,
        "food": 0.7,
        "shopping": 0.7,
        "sub_weights": {
            "public_transport": 0.5,
            "cycling": 0.5,
            "remote_work": 0.5,
            "diet_change": 0.5,
            "energy_efficiency": 0.5,
            "second_hand": 0.5,
        },
        "updated_at": "2024-01-15T10:00:00+00:00",
    }
    db.set_behavioral_weights.return_value = None
    db.add_behavioral_event.return_value = "event_id_123"
    db.get_behavioral_history.return_value = []

    db.get_cii_score.return_value = {
        "month": "2024-01",
        "composite_score": 42.0,
        "sub_scores": {
            "awareness_score": 80.0,
            "action_score": 30.0,
            "consistency_score": 25.0,
            "improvement_score": 33.0,
        },
    }
    db.set_cii_score.return_value = None
    db.get_cii_history.return_value = []

    db.get_conversation.return_value = None
    db.set_conversation.return_value = None
    db.get_conversations.return_value = []

    db.get_streak.return_value = None
    db.set_streak.return_value = None
    db.get_all_streaks.return_value = []

    db.get_carbon_budget.return_value = None
    db.set_carbon_budget.return_value = None

    db.get_weekly_narrative.return_value = None
    db.set_weekly_narrative.return_value = None

    return db


# ─── Test Client ──────────────────────────────────────────────────────

@pytest.fixture
def test_client(mock_db):
    """
    Creates a FastAPI TestClient with all external dependencies mocked.

    Patching strategy:
    1. Firebase token verification: patch firebase_admin.auth.verify_id_token
       This is what api/middleware/auth.py calls via `from firebase_admin import auth`
    2. FirestoreService singleton: patch the singleton directly so all
       calls to get_firestore_service() return mock_db
    3. Vertex AI initialized flag: prevent re-initialization attempts
    """
    # Replace the singleton in the module that owns it
    import infrastructure.firestore_client as fc_module
    original_singleton = fc_module._firestore_service

    # Inject our mock as the singleton
    fc_module._firestore_service = mock_db

    try:
        with patch(
            "firebase_admin.auth.verify_id_token",
            return_value={"uid": TEST_USER_ID},
        ), patch(
            "infrastructure.vertex_ai_client._vertex_initialized",
            True,
        ):
            from main import app
            with TestClient(app, raise_server_exceptions=False) as client:
                yield client
    finally:
        # Restore the original singleton after each test
        fc_module._firestore_service = original_singleton