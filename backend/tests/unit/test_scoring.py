"""
Unit Tests: Recommendation Scoring Algorithms

Tests the five-dimension scoring system for recommendations.
All functions are pure so these tests require no mocking.
"""

import pytest
from domain.algorithms.scoring import (
    score_carbon_impact,
    score_adoption_probability,
    score_cost,
    score_convenience,
    score_lifestyle_compatibility,
    calculate_composite_score,
    COMPOSITE_WEIGHTS,
)


class TestScoreCarbonImpact:
    """Tests for carbon impact score (0-100)."""

    def test_zero_reduction_scores_zero(self):
        assert score_carbon_impact(0, 100) == 0.0

    def test_zero_category_scores_zero(self):
        """Cannot score impact against a zero-emission category."""
        assert score_carbon_impact(10, 0) == 0.0

    def test_small_reduction_low_score(self):
        """2% reduction (< 5%) should score in 0-40 range."""
        score = score_carbon_impact(2, 100)
        assert 0 <= score <= 40

    def test_moderate_reduction_mid_score(self):
        """10% reduction (5-15%) should score in 40-75 range."""
        score = score_carbon_impact(10, 100)
        assert 40 < score <= 75

    def test_large_reduction_high_score(self):
        """20% reduction (> 15%) should score in 75-100 range."""
        score = score_carbon_impact(20, 100)
        assert score > 75

    def test_score_bounded_0_to_100(self):
        """Score must always be between 0 and 100."""
        assert 0 <= score_carbon_impact(0, 100) <= 100
        assert 0 <= score_carbon_impact(50, 100) <= 100
        assert 0 <= score_carbon_impact(1000, 100) <= 100

    def test_higher_reduction_gives_higher_score(self):
        """Higher monthly reduction should always give higher score."""
        score_low = score_carbon_impact(5, 100)
        score_mid = score_carbon_impact(15, 100)
        score_high = score_carbon_impact(30, 100)
        assert score_low < score_mid < score_high


class TestScoreAdoptionProbability:
    """Tests for adoption probability score (0-100)."""

    def test_high_weights_give_high_score(self):
        """High category and sub-type weights should produce high adoption score."""
        score = score_adoption_probability(0.9, 0.9)
        assert score >= 80

    def test_low_weights_give_low_score(self):
        """Low weights should produce low adoption score."""
        score = score_adoption_probability(0.1, 0.1)
        assert score <= 20

    def test_sub_type_weight_matters_more(self):
        """Sub-type weight has 60% influence vs category 40%."""
        # Same category weight, different sub-type weights
        score_low_sub = score_adoption_probability(0.8, 0.2)
        score_high_sub = score_adoption_probability(0.8, 0.8)
        assert score_high_sub > score_low_sub

    def test_score_bounded_0_to_100(self):
        """Score must always be between 0 and 100."""
        assert 0 <= score_adoption_probability(0, 0) <= 100
        assert 0 <= score_adoption_probability(1, 1) <= 100
        assert 0 <= score_adoption_probability(0.5, 0.5) <= 100


class TestScoreCost:
    """Tests for cost score (0-100, higher = more affordable)."""

    def test_free_scores_highest(self):
        """Free recommendations should score 100."""
        assert score_cost("free") == 100

    def test_investment_scores_lowest(self):
        """Major investment should score very low."""
        assert score_cost("investment") == 10

    def test_cost_order(self):
        """Scores should decrease as cost increases."""
        assert score_cost("free") > score_cost("low")
        assert score_cost("low") > score_cost("medium")
        assert score_cost("medium") > score_cost("high")
        assert score_cost("high") > score_cost("investment")

    def test_student_penalty_for_expensive(self):
        """Students should receive additional penalty for high/investment costs."""
        moderate_high = score_cost("high", "moderate")
        student_high = score_cost("high", "student")
        assert student_high < moderate_high

    def test_free_not_penalized_for_students(self):
        """Free recommendations should not be penalized for any income level."""
        assert score_cost("free", "student") == 100
        assert score_cost("free", "moderate") == 100

    def test_score_bounded(self):
        """All scores must be between 0 and 100."""
        for level in ("free", "low", "medium", "high", "investment"):
            for income in ("student", "moderate", "comfortable"):
                score = score_cost(level, income)
                assert 0 <= score <= 100


class TestScoreConvenience:
    """Tests for convenience score (0-100, higher = less disruption)."""

    def test_minimal_disruption_scores_100(self):
        """Minimal disruption should score 100."""
        assert score_convenience("minimal") == 100

    def test_high_disruption_scores_low(self):
        """High disruption should score 25 for moderate schedule."""
        assert score_convenience("high") == 25

    def test_disruption_order(self):
        """Lower disruption should always score higher."""
        assert score_convenience("minimal") > score_convenience("low")
        assert score_convenience("low") > score_convenience("medium")
        assert score_convenience("medium") > score_convenience("high")

    def test_demanding_schedule_penalizes_disruptive(self):
        """Demanding schedule users should be penalized more for disruptive actions."""
        moderate_score = score_convenience("high", "moderate")
        demanding_score = score_convenience("high", "demanding")
        assert demanding_score < moderate_score

    def test_minimal_not_penalized(self):
        """Minimal disruption should not be penalized regardless of schedule."""
        assert score_convenience("minimal", "demanding") == 100


class TestScoreLifestyleCompatibility:
    """Tests for lifestyle compatibility score (0-100)."""

    def test_public_transport_high_for_car_user(self):
        """Public transport recommendation highly compatible for car drivers."""
        score = score_lifestyle_compatibility(
            "transport", "public_transport",
            user_transport_mode="car_petrol"
        )
        assert score > 60

    def test_public_transport_low_for_existing_transit_user(self):
        """Public transport recommendation less relevant if user already uses it."""
        score = score_lifestyle_compatibility(
            "transport", "public_transport",
            user_transport_mode="public_transport"
        )
        assert score < 50

    def test_diet_change_high_for_high_meat_eater(self):
        """Diet change highly compatible for high meat consumers."""
        score = score_lifestyle_compatibility(
            "food", "diet_change",
            user_diet_type="high_meat"
        )
        assert score > 70

    def test_diet_change_low_for_vegan(self):
        """Diet change recommendation not relevant for existing vegans."""
        score = score_lifestyle_compatibility(
            "food", "diet_change",
            user_diet_type="vegan"
        )
        assert score < 40

    def test_energy_efficiency_high_for_gas_heavy(self):
        """Energy efficiency highly compatible for gas-heavy users."""
        score = score_lifestyle_compatibility(
            "energy", "energy_efficiency",
            user_energy_source="gas_heavy"
        )
        assert score > 60

    def test_neutral_baseline_for_unrelated(self):
        """Unrelated category combinations return neutral baseline."""
        score = score_lifestyle_compatibility("shopping", "second_hand")
        assert 20 <= score <= 80  # neutral range

    def test_score_bounded(self):
        """Score must always be between 0 and 100."""
        for category in ("transport", "energy", "food", "shopping"):
            score = score_lifestyle_compatibility(category, "general")
            assert 0 <= score <= 100


class TestCalculateCompositeScore:
    """Tests for weighted composite score calculation."""

    def test_all_high_scores_give_high_composite(self):
        """All 100s should give composite of 100."""
        result = calculate_composite_score(100, 100, 100, 100, 100)
        assert result == 100.0

    def test_all_zero_scores_give_zero(self):
        """All zeros should give composite of 0."""
        result = calculate_composite_score(0, 0, 0, 0, 0)
        assert result == 0.0

    def test_weights_sum_to_one(self):
        """All composite weights must sum to exactly 1.0."""
        total = sum(COMPOSITE_WEIGHTS.values())
        assert abs(total - 1.0) < 0.001

    def test_adoption_probability_highest_weight(self):
        """
        Adoption probability should have the highest weight.
        Test: boosting only adoption score should have more impact
        than boosting only carbon impact score.
        """
        base = calculate_composite_score(50, 50, 50, 50, 50)

        boost_adoption = calculate_composite_score(50, 100, 50, 50, 50)
        boost_impact = calculate_composite_score(100, 50, 50, 50, 50)

        adoption_gain = boost_adoption - base
        impact_gain = boost_impact - base

        assert adoption_gain > impact_gain

    def test_result_bounded(self):
        """Composite score must always be between 0 and 100."""
        assert 0 <= calculate_composite_score(0, 0, 0, 0, 0) <= 100
        assert 0 <= calculate_composite_score(100, 100, 100, 100, 100) <= 100
        assert 0 <= calculate_composite_score(50, 50, 50, 50, 50) <= 100

    def test_partial_scores_produce_weighted_result(self):
        """
        Only adoption_probability = 100, rest = 0.
        Expected: 100 × 0.35 = 35.0
        """
        result = calculate_composite_score(0, 100, 0, 0, 0)
        assert abs(result - 35.0) < 0.1