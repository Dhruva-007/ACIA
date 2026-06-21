"""
Unit Tests: Prediction Algorithms

Tests trend slope calculation, trajectory projection,
and reduction path generation. Critical test: green line
must never be zero.
"""

import pytest
from domain.algorithms.prediction import (
    calculate_trend_slope,
    classify_trend,
    project_trajectory,
    project_reduction_path,
    calculate_potential_savings,
)


class TestCalculateTrendSlope:
    """Tests for linear regression slope calculation."""

    def test_flat_emissions_zero_slope(self):
        """Constant emissions should produce near-zero slope."""
        flat = [10.0] * 14
        slope = calculate_trend_slope(flat)
        assert abs(slope) < 0.001

    def test_increasing_emissions_positive_slope(self):
        """Rising emissions should produce positive slope."""
        rising = [float(i) for i in range(1, 15)]
        slope = calculate_trend_slope(rising)
        assert slope > 0

    def test_decreasing_emissions_negative_slope(self):
        """Falling emissions should produce negative slope."""
        falling = [float(14 - i) for i in range(14)]
        slope = calculate_trend_slope(falling)
        assert slope < 0

    def test_insufficient_data_returns_zero(self):
        """Single value or empty list should return 0.0."""
        assert calculate_trend_slope([]) == 0.0
        assert calculate_trend_slope([10.0]) == 0.0

    def test_two_values_returns_valid_slope(self):
        """Minimum valid input (2 values) should return a slope."""
        slope = calculate_trend_slope([5.0, 10.0])
        assert slope > 0


class TestClassifyTrend:
    """Tests for trend classification."""

    def test_positive_slope_increasing(self):
        assert classify_trend(0.05) == "increasing"

    def test_negative_slope_decreasing(self):
        assert classify_trend(-0.05) == "decreasing"

    def test_near_zero_slope_stable(self):
        assert classify_trend(0.01) == "stable"
        assert classify_trend(-0.01) == "stable"
        assert classify_trend(0.0) == "stable"

    def test_threshold_boundary(self):
        """Values at exactly the threshold should be classified correctly."""
        assert classify_trend(0.02) == "stable"   # at threshold, not above
        assert classify_trend(0.021) == "increasing"


class TestProjectTrajectory:
    """Tests for trajectory projection."""

    def test_returns_correct_number_of_months(self):
        """Should return exactly horizon_months data points."""
        result = project_trajectory(10.0, 0.0, 6)
        assert len(result) == 6

        result = project_trajectory(10.0, 0.0, 12)
        assert len(result) == 12

    def test_flat_trend_constant_projection(self):
        """Zero slope should produce same monthly value each month."""
        result = project_trajectory(10.0, 0.0, 6)
        values = [p["projected_kg"] for p in result]
        assert max(values) - min(values) < 0.1  # all approximately equal

    def test_positive_slope_increases_over_time(self):
        """Positive slope should produce increasing projections."""
        result = project_trajectory(10.0, 0.1, 6)
        values = [p["projected_kg"] for p in result]
        assert values[-1] > values[0]

    def test_negative_slope_decreases_over_time(self):
        """Negative slope should produce decreasing projections."""
        result = project_trajectory(10.0, -0.05, 6)
        values = [p["projected_kg"] for p in result]
        assert values[-1] < values[0]

    def test_projected_values_never_negative(self):
        """Projected monthly values must never be negative."""
        result = project_trajectory(1.0, -0.5, 12)  # very aggressive negative slope
        for point in result:
            assert point["projected_kg"] >= 0

    def test_data_point_structure(self):
        """Each data point must have month, projected_kg, and label keys."""
        result = project_trajectory(10.0, 0.0, 3)
        for point in result:
            assert "month" in point
            assert "projected_kg" in point
            assert "label" in point


class TestProjectReductionPath:
    """Tests for reduction path projection — critical green line tests."""

    def test_green_line_never_zero(self):
        """
        Critical: reduction path must never reach zero.
        The 20% floor should prevent this even with large reductions.
        """
        trajectory = project_trajectory(10.0, 0.0, 12)
        reduction_path = project_reduction_path(trajectory, 50.0)  # massive reduction

        for point in reduction_path:
            assert point["projected_kg"] > 0, (
                f"Green line reached zero at month {point['month']}: "
                f"{point['projected_kg']}"
            )

    def test_reduction_path_below_trajectory(self):
        """Green line must always be at or below the red line."""
        trajectory = project_trajectory(10.0, 0.0, 12)
        reduction_path = project_reduction_path(trajectory, 2.0)

        for traj, red in zip(trajectory, reduction_path):
            assert red["projected_kg"] <= traj["projected_kg"] + 0.01

    def test_zero_reduction_produces_meaningful_gap(self):
        """
        When monthly_reduction_kg is 0, the path should still show
        a 10% default potential (not identical to trajectory).
        """
        trajectory = project_trajectory(10.0, 0.0, 12)
        reduction_path = project_reduction_path(trajectory, 0.0)

        # Should be below trajectory due to 10% default
        for traj, red in zip(trajectory, reduction_path):
            assert red["projected_kg"] < traj["projected_kg"]

    def test_negative_reduction_produces_meaningful_gap(self):
        """Negative or zero reduction still shows 10% potential."""
        trajectory = project_trajectory(10.0, 0.0, 6)
        reduction_path = project_reduction_path(trajectory, -5.0)

        for traj, red in zip(trajectory, reduction_path):
            assert red["projected_kg"] < traj["projected_kg"]

    def test_floor_at_20_percent_of_trajectory(self):
        """Reduction path should not drop below 20% of trajectory value."""
        trajectory = project_trajectory(100.0, 0.0, 12)
        reduction_path = project_reduction_path(trajectory, 100.0)

        for traj, red in zip(trajectory, reduction_path):
            floor = traj["projected_kg"] * 0.20
            assert red["projected_kg"] >= floor - 0.01

    def test_empty_trajectory_returns_empty(self):
        """Empty trajectory should return empty reduction path."""
        result = project_reduction_path([], 5.0)
        assert result == []

    def test_same_structure_as_trajectory(self):
        """Reduction path should have same structure as trajectory."""
        trajectory = project_trajectory(10.0, 0.0, 6)
        reduction_path = project_reduction_path(trajectory, 2.0)

        assert len(reduction_path) == len(trajectory)
        for point in reduction_path:
            assert "month" in point
            assert "projected_kg" in point
            assert "label" in point


class TestCalculatePotentialSavings:
    """Tests for savings calculation."""

    def test_identical_paths_zero_savings(self):
        """If trajectory equals reduction path, savings should be zero."""
        trajectory = [{"projected_kg": 100.0}] * 6
        reduction_path = [{"projected_kg": 100.0}] * 6
        saving, pct = calculate_potential_savings(trajectory, reduction_path)
        assert saving == 0.0
        assert pct == 0.0

    def test_savings_positive_when_reduced(self):
        """Reduction path below trajectory should produce positive savings."""
        trajectory = [{"projected_kg": 100.0}] * 6
        reduction_path = [{"projected_kg": 80.0}] * 6
        saving, pct = calculate_potential_savings(trajectory, reduction_path)
        assert saving > 0
        assert pct > 0

    def test_percentage_calculation_correct(self):
        """
        600 total trajectory, 480 total reduction path.
        Saving = 120, percentage = 120/600 × 100 = 20%.
        """
        trajectory = [{"projected_kg": 100.0}] * 6
        reduction_path = [{"projected_kg": 80.0}] * 6
        saving, pct = calculate_potential_savings(trajectory, reduction_path)
        assert abs(saving - 120.0) < 0.1
        assert abs(pct - 20.0) < 0.1

    def test_empty_inputs_return_zeros(self):
        """Empty inputs should return zero savings."""
        saving, pct = calculate_potential_savings([], [])
        assert saving == 0.0
        assert pct == 0.0