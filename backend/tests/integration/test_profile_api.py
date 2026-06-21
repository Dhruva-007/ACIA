"""
Integration Tests: Profile API Endpoints

Tests profile setup, retrieval, and update endpoints.
"""

import pytest
from tests.integration.conftest import VALID_HEADERS, TEST_USER_ID


VALID_LIFESTYLE_PAYLOAD = {
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


class TestProfileSetupEndpoint:
    """Tests for POST /api/v1/profile/setup."""

    def test_setup_returns_200(self, test_client):
        """Valid profile setup should return 200."""
        response = test_client.post(
            "/api/v1/profile/setup",
            json=VALID_LIFESTYLE_PAYLOAD,
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200

    def test_setup_returns_carbon_breakdown(self, test_client):
        """Setup response should include the initial carbon breakdown."""
        response = test_client.post(
            "/api/v1/profile/setup",
            json=VALID_LIFESTYLE_PAYLOAD,
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]
        assert "total_kg" in data
        assert "daily_kg" in data
        assert "breakdown" in data
        assert "breakdown_percentage" in data
        assert "primary_contributor" in data

    def test_setup_breakdown_values_positive(self, test_client):
        """All emission values from setup must be positive."""
        response = test_client.post(
            "/api/v1/profile/setup",
            json=VALID_LIFESTYLE_PAYLOAD,
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]
        assert data["total_kg"] > 0
        assert data["daily_kg"] > 0

    def test_setup_stores_lifestyle(self, test_client, mock_db):
        """Setup should call set_lifestyle with the provided data."""
        test_client.post(
            "/api/v1/profile/setup",
            json=VALID_LIFESTYLE_PAYLOAD,
            headers=VALID_HEADERS,
        )
        assert mock_db.set_lifestyle.called

    def test_setup_stores_emission_record(self, test_client, mock_db):
        """Setup should call set_emission for today's record."""
        test_client.post(
            "/api/v1/profile/setup",
            json=VALID_LIFESTYLE_PAYLOAD,
            headers=VALID_HEADERS,
        )
        assert mock_db.set_emission.called

    def test_setup_marks_onboarding_complete(self, test_client, mock_db):
        """Setup should call set_profile with onboarding_completed=True."""
        test_client.post(
            "/api/v1/profile/setup",
            json=VALID_LIFESTYLE_PAYLOAD,
            headers=VALID_HEADERS,
        )
        assert mock_db.set_profile.called
        call_args = mock_db.set_profile.call_args
        profile_data = call_args[0][1]  # second positional arg
        assert profile_data.get("onboarding_completed") is True

    def test_setup_initializes_behavioral_weights(self, test_client, mock_db):
        """Setup should initialize behavioral weights."""
        test_client.post(
            "/api/v1/profile/setup",
            json=VALID_LIFESTYLE_PAYLOAD,
            headers=VALID_HEADERS,
        )
        assert mock_db.set_behavioral_weights.called

    def test_setup_invalid_transport_mode_returns_422(self, test_client):
        """Invalid transport mode should return 422."""
        invalid_payload = {
            **VALID_LIFESTYLE_PAYLOAD,
            "transport": {**VALID_LIFESTYLE_PAYLOAD["transport"], "primary_mode": "hoverboard"},
        }
        response = test_client.post(
            "/api/v1/profile/setup",
            json=invalid_payload,
            headers=VALID_HEADERS,
        )
        assert response.status_code == 422

    def test_setup_negative_distance_returns_422(self, test_client):
        """Negative commute distance should return 422."""
        invalid_payload = {
            **VALID_LIFESTYLE_PAYLOAD,
            "transport": {**VALID_LIFESTYLE_PAYLOAD["transport"], "daily_distance_km": -5.0},
        }
        response = test_client.post(
            "/api/v1/profile/setup",
            json=invalid_payload,
            headers=VALID_HEADERS,
        )
        assert response.status_code == 422


class TestGetProfileEndpoint:
    """Tests for GET /api/v1/profile."""

    def test_returns_200_with_existing_profile(self, test_client):
        """Request for existing profile should return 200."""
        response = test_client.get(
            "/api/v1/profile",
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200

    def test_response_contains_profile_and_lifestyle(self, test_client):
        """Response must include profile, lifestyle, and review status."""
        response = test_client.get(
            "/api/v1/profile",
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]
        assert "profile" in data
        assert "lifestyle" in data
        assert "profile_review_due" in data

    def test_profile_review_due_is_boolean(self, test_client):
        """profile_review_due must be a boolean value."""
        response = test_client.get(
            "/api/v1/profile",
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]
        assert isinstance(data["profile_review_due"], bool)

    def test_no_profile_returns_404(self, test_client, mock_db):
        """Missing profile should return 404."""
        mock_db.get_profile.return_value = None
        response = test_client.get(
            "/api/v1/profile",
            headers=VALID_HEADERS,
        )
        assert response.status_code == 404

    def test_404_error_envelope(self, test_client, mock_db):
        """404 must follow standard error envelope."""
        mock_db.get_profile.return_value = None
        response = test_client.get(
            "/api/v1/profile",
            headers=VALID_HEADERS,
        )
        body = response.json()
        assert body["success"] is False
        assert body["error"]["code"] == "PROFILE_NOT_FOUND"


class TestQuickUpdateEndpoint:
    """Tests for PUT /api/v1/profile/quick-update."""

    def test_valid_transport_update_returns_200(self, test_client):
        """Valid single-category update should return 200."""
        response = test_client.put(
            "/api/v1/profile/quick-update",
            json={
                "category": "transport",
                "data": {
                    "primary_mode": "public_transport",
                    "daily_distance_km": 20.0,
                    "weekly_flight_hours": 0.0,
                    "car_passengers_avg": 1,
                },
            },
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200

    def test_response_contains_updated_category_and_breakdown(self, test_client):
        """Response must include updated_category and new breakdown."""
        response = test_client.put(
            "/api/v1/profile/quick-update",
            json={
                "category": "food",
                "data": {
                    "diet_type": "vegan",
                    "local_food_percentage": 50.0,
                    "food_waste_level": "low",
                },
            },
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]
        assert "updated_category" in data
        assert "breakdown" in data
        assert data["updated_category"] == "food"

    def test_invalid_category_returns_400(self, test_client):
        """Invalid category name should return 400."""
        response = test_client.put(
            "/api/v1/profile/quick-update",
            json={"category": "fitness", "data": {}},
            headers=VALID_HEADERS,
        )
        assert response.status_code == 400

    def test_resets_profile_review_timestamp(self, test_client, mock_db):
        """Quick update should reset the last_profile_review timestamp."""
        test_client.put(
            "/api/v1/profile/quick-update",
            json={
                "category": "transport",
                "data": {
                    "primary_mode": "bicycle",
                    "daily_distance_km": 5.0,
                    "weekly_flight_hours": 0.0,
                    "car_passengers_avg": 1,
                },
            },
            headers=VALID_HEADERS,
        )
        assert mock_db.set_profile.called
        call_args = mock_db.set_profile.call_args[0][1]
        assert "last_profile_review" in call_args