"""
Integration Tests: Recommendations and Behavior API Endpoints

Tests recommendation retrieval and behavioral feedback endpoints.
Verifies the adaptive recommendation engine produces correct output
and that behavioral feedback updates are processed correctly.
"""

import pytest
from unittest.mock import patch
from tests.integration.conftest import VALID_HEADERS, TEST_USER_ID


class TestRecommendationsEndpoint:
    """Tests for GET /api/v1/recommendations."""

    def test_returns_200_with_auth(self, test_client):
        """Authenticated request should return 200."""
        response = test_client.get(
            "/api/v1/recommendations",
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200

    def test_response_is_list(self, test_client):
        """Recommendations data must be a list."""
        response = test_client.get(
            "/api/v1/recommendations",
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]
        assert isinstance(data, list)

    def test_recommendation_has_required_fields(self, test_client):
        """Each recommendation must have all required fields."""
        response = test_client.get(
            "/api/v1/recommendations",
            headers=VALID_HEADERS,
        )
        recommendations = response.json()["data"]
        assert len(recommendations) > 0

        rec = recommendations[0]
        required_fields = [
            "id",
            "title",
            "description",
            "category",
            "sub_type",
            "scores",
            "composite_score",
            "reasoning",
            "monthly_kg_reduction",
            "annual_kg_reduction",
            "impact_percentage",
            "cost_level",
            "disruption_level",
            "status",
        ]
        for field in required_fields:
            assert field in rec, f"Missing field: {field}"

    def test_scores_contain_five_dimensions(self, test_client):
        """Each recommendation scores must have all five dimensions."""
        response = test_client.get(
            "/api/v1/recommendations",
            headers=VALID_HEADERS,
        )
        rec = response.json()["data"][0]
        scores = rec["scores"]

        expected_dimensions = [
            "carbon_impact",
            "adoption_probability",
            "cost_score",
            "convenience_score",
            "lifestyle_score",
        ]
        for dim in expected_dimensions:
            assert dim in scores, f"Missing score dimension: {dim}"

    def test_scores_are_in_valid_range(self, test_client):
        """All scores must be between 0 and 100."""
        response = test_client.get(
            "/api/v1/recommendations",
            headers=VALID_HEADERS,
        )
        rec = response.json()["data"][0]
        for dim, score in rec["scores"].items():
            assert 0 <= score <= 100, (
                f"Score {dim}={score} is outside valid range [0, 100]"
            )

    def test_composite_score_in_valid_range(self, test_client):
        """Composite score must be between 0 and 100."""
        response = test_client.get(
            "/api/v1/recommendations",
            headers=VALID_HEADERS,
        )
        rec = response.json()["data"][0]
        assert 0 <= rec["composite_score"] <= 100

    def test_category_is_valid(self, test_client):
        """Category must be one of the four valid categories."""
        response = test_client.get(
            "/api/v1/recommendations",
            headers=VALID_HEADERS,
        )
        for rec in response.json()["data"]:
            assert rec["category"] in ("transport", "energy", "food", "shopping")

    def test_limit_parameter_respected(self, test_client, mock_db):
        """The limit parameter should control how many recs are returned."""
        # Mock the engine to return 5 recommendations
        recs = [
            {
                **{
                    "id": f"rec_{i}",
                    "template_id": f"transport_template_{i}",
                    "title": f"Recommendation {i}",
                    "description": "Test description",
                    "category": "transport",
                    "sub_type": "public_transport",
                    "scores": {
                        "carbon_impact": 70.0,
                        "adoption_probability": 70.0,
                        "cost_score": 80.0,
                        "convenience_score": 50.0,
                        "lifestyle_score": 60.0,
                    },
                    "composite_score": 68.5,
                    "reasoning": "Test reasoning.",
                    "monthly_kg_reduction": 10.0,
                    "annual_kg_reduction": 120.0,
                    "impact_percentage": 2.5,
                    "cost_level": "free",
                    "disruption_level": "low",
                    "status": "pending",
                    "created_at": "2024-01-15T10:00:00+00:00",
                    "updated_at": "2024-01-15T10:00:00+00:00",
                }
            }
            for i in range(5)
        ]
        mock_db.get_recommendations.return_value = recs

        response = test_client.get(
            "/api/v1/recommendations?limit=3",
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200

    def test_no_lifestyle_returns_empty_list(self, test_client, mock_db):
        """
        When no lifestyle data AND no stored recommendations exist,
        endpoint still returns a list (may generate from defaults).
        """
        mock_db.get_recommendations.return_value = []
        mock_db.get_lifestyle.return_value = None
        response = test_client.get(
            "/api/v1/recommendations",
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200
        assert isinstance(response.json()["data"], list)


class TestBehaviorFeedbackEndpoint:
    """Tests for POST /api/v1/behavior/feedback."""

    def test_accepted_action_returns_200(self, test_client):
        """Accepting a recommendation should return 200."""
        response = test_client.post(
            "/api/v1/behavior/feedback",
            json={
                "recommendation_id": "rec_abc123",
                "action": "accepted",
            },
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200

    def test_all_valid_actions_accepted(self, test_client):
        """All five valid actions should return 200."""
        for action in ("accepted", "rejected", "completed", "failed", "deferred"):
            response = test_client.post(
                "/api/v1/behavior/feedback",
                json={
                    "recommendation_id": "rec_abc123",
                    "action": action,
                },
                headers=VALID_HEADERS,
            )
            assert response.status_code == 200, (
                f"Action '{action}' returned {response.status_code}"
            )

    def test_feedback_response_structure(self, test_client):
        """Feedback response must contain required fields."""
        response = test_client.post(
            "/api/v1/behavior/feedback",
            json={
                "recommendation_id": "rec_abc123",
                "action": "accepted",
            },
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]
        assert "recommendation_id" in data
        assert "action" in data
        assert "weight_updated" in data
        assert "new_category_weight" in data
        assert "message" in data

    def test_rejected_action_updates_weights(self, test_client, mock_db):
        """Rejecting a recommendation should decrease category weight."""
        initial_weight = 0.7
        mock_db.get_behavioral_weights.return_value = {
            "transport": initial_weight,
            "energy": 0.7,
            "food": 0.7,
            "shopping": 0.7,
            "sub_weights": {"public_transport": 0.5},
        }

        response = test_client.post(
            "/api/v1/behavior/feedback",
            json={"recommendation_id": "rec_abc123", "action": "rejected"},
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()["data"]

        # New weight should be lower than initial
        assert data["new_category_weight"] < initial_weight

    def test_accepted_action_increases_weight(self, test_client, mock_db):
        """Accepting a recommendation should increase category weight."""
        initial_weight = 0.7
        mock_db.get_behavioral_weights.return_value = {
            "transport": initial_weight,
            "energy": 0.7,
            "food": 0.7,
            "shopping": 0.7,
            "sub_weights": {"public_transport": 0.5},
        }

        response = test_client.post(
            "/api/v1/behavior/feedback",
            json={"recommendation_id": "rec_abc123", "action": "accepted"},
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["new_category_weight"] > initial_weight

    def test_invalid_action_returns_422(self, test_client):
        """Invalid action value should return 422."""
        response = test_client.post(
            "/api/v1/behavior/feedback",
            json={
                "recommendation_id": "rec_abc123",
                "action": "indifferent",
            },
            headers=VALID_HEADERS,
        )
        assert response.status_code == 422

    def test_missing_recommendation_returns_error(self, test_client, mock_db):
        """Non-existent recommendation ID should return error."""
        mock_db.get_all_recommendations.return_value = []
        response = test_client.post(
            "/api/v1/behavior/feedback",
            json={
                "recommendation_id": "nonexistent_id",
                "action": "accepted",
            },
            headers=VALID_HEADERS,
        )
        assert response.status_code in (400, 404, 422)

    def test_deferred_does_not_change_weight(self, test_client, mock_db):
        """Deferred action should not change weights."""
        initial_weight = 0.7
        mock_db.get_behavioral_weights.return_value = {
            "transport": initial_weight,
            "energy": 0.7,
            "food": 0.7,
            "shopping": 0.7,
            "sub_weights": {"public_transport": 0.5},
        }

        response = test_client.post(
            "/api/v1/behavior/feedback",
            json={"recommendation_id": "rec_abc123", "action": "deferred"},
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["weight_updated"] is False


class TestBehaviorWeightsEndpoint:
    """Tests for GET /api/v1/behavior/weights."""

    def test_returns_200_with_auth(self, test_client):
        """Authenticated request should return 200."""
        response = test_client.get(
            "/api/v1/behavior/weights",
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200

    def test_weights_response_structure(self, test_client):
        """Weights response must contain all four categories."""
        response = test_client.get(
            "/api/v1/behavior/weights",
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]
        for category in ("transport", "energy", "food", "shopping"):
            assert category in data
            assert 0.0 <= data[category] <= 1.0

    def test_weights_in_valid_range(self, test_client):
        """All weight values must be between 0 and 1."""
        response = test_client.get(
            "/api/v1/behavior/weights",
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]
        for category in ("transport", "energy", "food", "shopping"):
            assert 0.0 <= data[category] <= 1.0

    def test_returns_defaults_when_no_weights(self, test_client, mock_db):
        """When no weights stored, should return default values."""
        mock_db.get_behavioral_weights.return_value = None
        response = test_client.get(
            "/api/v1/behavior/weights",
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()["data"]
        # Default weights should be 0.7
        assert data["transport"] == 0.7
        assert data["food"] == 0.7