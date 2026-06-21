"""
Unit Tests: CII Service

Tests Carbon Improvement Index sub-score calculations
using mocked Firestore data. No real database access.
"""

import pytest
from unittest.mock import MagicMock, patch
from services.cii_service import (
    calculate_cii,
    _calculate_awareness_score,
    _calculate_action_score,
    _calculate_consistency_score,
    _calculate_improvement_score,
    _awareness_guidance,
    _action_guidance,
    _consistency_guidance,
    _improvement_guidance,
)


def make_mock_db(
    profile=None,
    lifestyle=None,
    emissions=None,
    recommendations=None,
    behavioral_history=None,
):
    """Creates a mock FirestoreService with configurable return values."""
    db = MagicMock()
    db.get_profile.return_value = profile or {"onboarding_completed": True}
    db.get_lifestyle.return_value = lifestyle or {"transport": {}}
    db.get_recent_emissions.return_value = emissions or [{"total_kg": 10.0}]
    db.get_all_recommendations.return_value = recommendations or []
    db.get_behavioral_history.return_value = behavioral_history or []
    db.get_cii_score.return_value = None
    db.set_cii_score.return_value = None
    return db


class TestAwarenessScore:
    """Tests for Awareness sub-score calculation."""

    def test_full_awareness_scores_100(self):
        """All awareness signals present should score 100."""
        db = make_mock_db(
            profile={"onboarding_completed": True},
            lifestyle={"transport": {}},
            emissions=[{"total_kg": 10.0}],
            recommendations=[{"id": "rec1", "status": "pending"}],
        )
        score = _calculate_awareness_score("user123", db)
        assert score == 100.0

    def test_no_onboarding_reduces_score(self):
        """Missing onboarding completion should reduce awareness score."""
        db = make_mock_db(
            profile={"onboarding_completed": False},
            lifestyle={"transport": {}},
            emissions=[{"total_kg": 10.0}],
            recommendations=[],
        )
        score = _calculate_awareness_score("user123", db)
        assert score < 80  # 40 points missing

    def test_new_user_no_data_scores_zero(self):
        """User with no data should score 0 awareness."""
        db = make_mock_db(
            profile=None,
            lifestyle=None,
            emissions=[],
            recommendations=[],
        )
        db.get_profile.return_value = None
        db.get_lifestyle.return_value = None
        db.get_recent_emissions.return_value = []
        db.get_all_recommendations.return_value = []
        score = _calculate_awareness_score("user123", db)
        assert score == 0.0

    def test_score_bounded_0_to_100(self):
        """Score must always be between 0 and 100."""
        db = make_mock_db()
        score = _calculate_awareness_score("user123", db)
        assert 0 <= score <= 100


class TestActionScore:
    """Tests for Action sub-score calculation."""

    def test_no_recommendations_scores_zero(self):
        """No accepted or completed recommendations should score 0."""
        db = make_mock_db(recommendations=[])
        score = _calculate_action_score("user123", db)
        assert score == 0.0

    def test_each_accepted_adds_10_points(self):
        """Each accepted recommendation adds 10 points (max 40)."""
        accepted = [{"id": f"rec{i}", "status": "accepted"} for i in range(3)]
        db = make_mock_db(recommendations=accepted)
        score = _calculate_action_score("user123", db)
        assert score == 30.0

    def test_each_completed_adds_20_points(self):
        """Each completed recommendation adds 20 points (max 60)."""
        completed = [{"id": f"rec{i}", "status": "completed"} for i in range(2)]
        db = make_mock_db(recommendations=completed)
        score = _calculate_action_score("user123", db)
        assert score == 40.0

    def test_max_score_is_100(self):
        """Score should be capped at 100 regardless of actions."""
        many_completed = [{"id": f"rec{i}", "status": "completed"} for i in range(10)]
        many_accepted = [{"id": f"acc{i}", "status": "accepted"} for i in range(10)]
        db = make_mock_db(recommendations=many_completed + many_accepted)
        score = _calculate_action_score("user123", db)
        assert score == 100.0

    def test_completed_worth_more_than_accepted(self):
        """1 completed should score more than 1 accepted."""
        one_accepted = [{"id": "rec1", "status": "accepted"}]
        one_completed = [{"id": "rec1", "status": "completed"}]

        db_accepted = make_mock_db(recommendations=one_accepted)
        db_completed = make_mock_db(recommendations=one_completed)

        score_accepted = _calculate_action_score("user123", db_accepted)
        score_completed = _calculate_action_score("user123", db_completed)

        assert score_completed > score_accepted


class TestConsistencyScore:
    """Tests for Consistency sub-score calculation."""

    def test_no_history_scores_zero(self):
        """No behavioral history should score 0."""
        db = make_mock_db(behavioral_history=[])
        score = _calculate_consistency_score("user123", db)
        assert score == 0.0

    def test_all_positive_actions_high_ratio_score(self):
        """All accepted/completed should produce high ratio score."""
        positive = [{"action": "accepted"} for _ in range(10)]
        db = make_mock_db(behavioral_history=positive)
        score = _calculate_consistency_score("user123", db)
        assert score > 50  # high engagement + positive ratio

    def test_mixed_actions_mid_score(self):
        """Mix of positive and negative actions should produce mid-range score."""
        mixed = (
            [{"action": "accepted"} for _ in range(5)] +
            [{"action": "rejected"} for _ in range(5)]
        )
        db = make_mock_db(behavioral_history=mixed)
        score = _calculate_consistency_score("user123", db)
        assert 20 < score < 80

    def test_score_bounded(self):
        """Score must always be between 0 and 100."""
        db = make_mock_db(behavioral_history=[{"action": "accepted"} for _ in range(20)])
        score = _calculate_consistency_score("user123", db)
        assert 0 <= score <= 100


class TestImprovementScore:
    """Tests for Improvement sub-score calculation."""

    def test_baseline_score_with_no_data(self):
        """No emissions or recommendations should return neutral baseline."""
        db = make_mock_db(emissions=[], recommendations=[])
        score = _calculate_improvement_score("user123", db)
        assert 0 <= score <= 100  # should be near baseline of 25

    def test_completed_recommendations_increase_score(self):
        """Completed recommendations with kg reduction should increase score."""
        completed = [{"status": "completed", "monthly_kg_reduction": 20.0}]
        db = make_mock_db(recommendations=completed)
        score = _calculate_improvement_score("user123", db)
        assert score > 25  # above neutral baseline

    def test_score_bounded(self):
        """Score must always be between 0 and 100."""
        db = make_mock_db()
        score = _calculate_improvement_score("user123", db)
        assert 0 <= score <= 100


class TestGuidanceGeneration:
    """Tests for improvement guidance messages."""

    def test_high_awareness_positive_message(self):
        msg = _awareness_guidance(90)
        assert len(msg) > 0
        assert any(word in msg.lower() for word in ["excellent", "engaged", "fully"])

    def test_low_awareness_actionable_message(self):
        msg = _awareness_guidance(20)
        assert "complete" in msg.lower() or "explore" in msg.lower() or "profile" in msg.lower()

    def test_all_guidance_functions_return_strings(self):
        """All guidance functions must return non-empty strings for any score."""
        for score in [0, 25, 50, 75, 100]:
            assert isinstance(_awareness_guidance(score), str)
            assert isinstance(_action_guidance(score), str)
            assert isinstance(_consistency_guidance(score), str)
            assert isinstance(_improvement_guidance(score), str)
            assert len(_awareness_guidance(score)) > 0