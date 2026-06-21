"""
Integration Tests: Carbon API Endpoints

Tests /carbon/summary and /carbon/history endpoints.
Verifies response structure, HTTP status codes, and
authentication enforcement.
"""

import pytest
from tests.integration.conftest import VALID_HEADERS, TEST_USER_ID


class TestHealthEndpoint:
    """Tests for the health check endpoint."""

    def test_health_returns_200(self, test_client):
        """Health endpoint should return 200 without authentication."""
        response = test_client.get("/health")
        assert response.status_code == 200

    def test_health_response_structure(self, test_client):
        """Health response must follow standard envelope."""
        response = test_client.get("/health")
        body = response.json()
        assert body["success"] is True
        assert "data" in body
        assert body["data"]["status"] == "healthy"
        assert "version" in body["data"]

    def test_health_no_auth_required(self, test_client):
        """Health endpoint must work without Authorization header."""
        response = test_client.get("/health")
        assert response.status_code == 200


class TestAuthEnforcement:
    """Tests that all protected endpoints reject unauthenticated requests."""

    PROTECTED_ENDPOINTS = [
        ("GET", "/api/v1/carbon/summary"),
        ("GET", "/api/v1/carbon/history"),
        ("GET", "/api/v1/profile"),
        ("GET", "/api/v1/recommendations"),
        ("GET", "/api/v1/behavior/weights"),
        ("GET", "/api/v1/cii/current"),
        ("GET", "/api/v1/prediction/trajectory"),
        ("GET", "/api/v1/streaks"),
        ("GET", "/api/v1/budget/current"),
        ("GET", "/api/v1/narrative/weekly"),
    ]

    @pytest.mark.parametrize("method,endpoint", PROTECTED_ENDPOINTS)
    def test_endpoint_requires_auth(self, test_client, method, endpoint):
        """All protected endpoints must return 401 without Authorization header."""
        if method == "GET":
            response = test_client.get(endpoint)
        else:
            response = test_client.post(endpoint, json={})

        assert response.status_code == 401, (
            f"Expected 401 for {method} {endpoint}, got {response.status_code}"
        )


class TestCarbonSummaryEndpoint:
    """Tests for GET /api/v1/carbon/summary."""

    def test_returns_200_with_valid_auth(self, test_client):
        """Authenticated request should return 200."""
        response = test_client.get(
            "/api/v1/carbon/summary",
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200

    def test_response_envelope_structure(self, test_client):
        """Response must follow standard success envelope."""
        response = test_client.get(
            "/api/v1/carbon/summary",
            headers=VALID_HEADERS,
        )
        body = response.json()
        assert body["success"] is True
        assert "data" in body
        assert "message" in body
        assert "timestamp" in body

    def test_summary_data_contains_required_fields(self, test_client):
        """Summary data must contain all required fields."""
        response = test_client.get(
            "/api/v1/carbon/summary",
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]

        required_fields = [
            "today_kg",
            "this_week_kg",
            "this_month_kg",
            "this_year_kg",
            "breakdown",
            "breakdown_percentage",
            "primary_contributor",
            "trend",
            "trend_message",
            "vs_global_average_percentage",
            "global_average_kg",
            "paris_target_kg",
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"

    def test_summary_values_are_positive(self, test_client):
        """All emission values in the summary must be positive."""
        response = test_client.get(
            "/api/v1/carbon/summary",
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]
        assert data["today_kg"] > 0
        assert data["this_week_kg"] > 0
        assert data["this_month_kg"] > 0
        assert data["this_year_kg"] > 0

    def test_breakdown_percentages_sum_to_100(self, test_client):
        """Category percentages in breakdown must sum to 100."""
        response = test_client.get(
            "/api/v1/carbon/summary",
            headers=VALID_HEADERS,
        )
        pct = response.json()["data"]["breakdown_percentage"]
        total = pct["transport"] + pct["energy"] + pct["food"] + pct["shopping"]
        assert abs(total - 100.0) < 0.5

    def test_trend_is_valid_value(self, test_client):
        """Trend must be one of the four valid values."""
        response = test_client.get(
            "/api/v1/carbon/summary",
            headers=VALID_HEADERS,
        )
        trend = response.json()["data"]["trend"]
        valid_trends = {"increasing", "stable", "decreasing", "new_user"}
        assert trend in valid_trends

    def test_benchmark_values_correct(self, test_client):
        """Global average and Paris target must match domain constants."""
        response = test_client.get(
            "/api/v1/carbon/summary",
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]
        assert data["global_average_kg"] == 375.0
        assert data["paris_target_kg"] == 167.0

    def test_no_lifestyle_data_returns_404(self, test_client, mock_db):
        """Missing lifestyle data should return 404."""
        mock_db.get_lifestyle.return_value = None
        response = test_client.get(
            "/api/v1/carbon/summary",
            headers=VALID_HEADERS,
        )
        assert response.status_code == 404

    def test_404_response_structure(self, test_client, mock_db):
        """404 response must follow error envelope."""
        mock_db.get_lifestyle.return_value = None
        response = test_client.get(
            "/api/v1/carbon/summary",
            headers=VALID_HEADERS,
        )
        body = response.json()
        assert body["success"] is False
        assert "error" in body
        assert "code" in body["error"]


class TestCarbonHistoryEndpoint:
    """Tests for GET /api/v1/carbon/history."""

    def test_returns_200_for_valid_period(self, test_client):
        """Valid period parameter should return 200."""
        for period in ("daily", "weekly", "monthly", "yearly"):
            response = test_client.get(
                f"/api/v1/carbon/history?period={period}",
                headers=VALID_HEADERS,
            )
            assert response.status_code == 200, f"Failed for period={period}"

    def test_history_response_structure(self, test_client):
        """History response must contain required fields."""
        response = test_client.get(
            "/api/v1/carbon/history?period=daily",
            headers=VALID_HEADERS,
        )
        data = response.json()["data"]
        assert "period" in data
        assert "data_points" in data
        assert "average_kg" in data
        assert "total_kg" in data

    def test_invalid_period_returns_422(self, test_client):
        """Invalid period parameter should return 422 Unprocessable Entity."""
        response = test_client.get(
            "/api/v1/carbon/history?period=hourly",
            headers=VALID_HEADERS,
        )
        assert response.status_code == 422

    def test_default_period_is_daily(self, test_client):
        """Request without period parameter should default to daily."""
        response = test_client.get(
            "/api/v1/carbon/history",
            headers=VALID_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["period"] == "daily"