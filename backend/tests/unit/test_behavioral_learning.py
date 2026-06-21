"""
Unit Tests: Behavioral Weight Adaptation Algorithm

Tests weight update rules and boundary conditions.
All functions are pure domain logic — no database, no mocking needed.
"""

import pytest
from domain.algorithms.adaptation import (
    calculate_weight_update,
    clamp_weight,
    is_sub_type_filtered,
    apply_weekly_decay,
    generate_feedback_message,
    WEIGHT_ADJUSTMENTS,
    FILTERING_THRESHOLD,
    WEIGHT_MIN,
    WEIGHT_MAX,
)


class TestClampWeight:
    """Tests for weight clamping to [0.0, 1.0]."""

    def test_clamps_above_max(self):
        assert clamp_weight(1.5) == 1.0

    def test_clamps_below_min(self):
        assert clamp_weight(-0.3) == 0.0

    def test_preserves_valid_value(self):
        assert clamp_weight(0.7) == 0.7

    def test_clamps_exactly_at_boundaries(self):
        assert clamp_weight(0.0) == 0.0
        assert clamp_weight(1.0) == 1.0


class TestCalculateWeightUpdate:
    """Tests for behavioral weight update rules."""

    def test_accepted_increases_both_weights(self):
        """Accepting a recommendation increases both category and sub-type weights."""
        new_cat, new_sub = calculate_weight_update(0.7, 0.5, "accepted")
        assert new_cat > 0.7
        assert new_sub > 0.5

    def test_rejected_decreases_both_weights(self):
        """Rejecting decreases both weights."""
        new_cat, new_sub = calculate_weight_update(0.7, 0.5, "rejected")
        assert new_cat < 0.7
        assert new_sub < 0.5

    def test_completed_increases_more_than_accepted(self):
        """Completion should increase weights more than acceptance."""
        _, accepted_sub = calculate_weight_update(0.7, 0.5, "accepted")
        _, completed_sub = calculate_weight_update(0.7, 0.5, "completed")
        assert completed_sub > accepted_sub

    def test_rejected_decreases_more_than_failed(self):
        """Rejection should decrease weights more than failure."""
        _, rejected_sub = calculate_weight_update(0.7, 0.5, "rejected")
        _, failed_sub = calculate_weight_update(0.7, 0.5, "failed")
        assert rejected_sub < failed_sub

    def test_deferred_no_change(self):
        """Deferring should not change any weights."""
        new_cat, new_sub = calculate_weight_update(0.7, 0.5, "deferred")
        assert new_cat == 0.7
        assert new_sub == 0.5

    def test_weights_clamped_at_minimum(self):
        """Repeated rejections should not drive weight below 0.0."""
        weight = 0.1
        for _ in range(10):
            weight, _ = calculate_weight_update(weight, 0.5, "rejected")
        assert weight >= WEIGHT_MIN

    def test_weights_clamped_at_maximum(self):
        """Repeated completions should not drive weight above 1.0."""
        weight = 0.9
        for _ in range(10):
            weight, _ = calculate_weight_update(weight, 0.5, "completed")
        assert weight <= WEIGHT_MAX

    def test_unknown_action_raises(self):
        """Unknown action should raise ValueError."""
        with pytest.raises(ValueError, match="Unknown behavioral action"):
            calculate_weight_update(0.7, 0.5, "indifferent")

    def test_category_delta_positive_for_accepted(self):
        """Category delta for accepted must be positive."""
        assert WEIGHT_ADJUSTMENTS["accepted"]["category_delta"] > 0

    def test_category_delta_negative_for_rejected(self):
        """Category delta for rejected must be negative."""
        assert WEIGHT_ADJUSTMENTS["rejected"]["category_delta"] < 0

    def test_completed_has_largest_positive_delta(self):
        """Completed should have the largest positive sub-type delta."""
        deltas = {
            action: config["sub_type_delta"]
            for action, config in WEIGHT_ADJUSTMENTS.items()
            if config["sub_type_delta"] > 0
        }
        assert max(deltas.values()) == WEIGHT_ADJUSTMENTS["completed"]["sub_type_delta"]

    def test_rejected_has_largest_negative_delta(self):
        """Rejected should have the largest negative delta."""
        assert (
            WEIGHT_ADJUSTMENTS["rejected"]["sub_type_delta"]
            < WEIGHT_ADJUSTMENTS["failed"]["sub_type_delta"]
        )


class TestIsSubTypeFiltered:
    """Tests for sub-type filtering threshold."""

    def test_weight_above_threshold_not_filtered(self):
        """Weight above threshold should not be filtered."""
        assert not is_sub_type_filtered(0.5)
        assert not is_sub_type_filtered(FILTERING_THRESHOLD)

    def test_weight_below_threshold_filtered(self):
        """Weight below threshold should be filtered."""
        assert is_sub_type_filtered(FILTERING_THRESHOLD - 0.01)
        assert is_sub_type_filtered(0.0)

    def test_filtering_threshold_value(self):
        """Filtering threshold should be 0.2 as documented."""
        assert FILTERING_THRESHOLD == 0.2


class TestApplyWeeklyDecay:
    """Tests for weekly weight decay toward neutral."""

    def test_high_weight_decays_toward_neutral(self):
        """Weight above 0.5 should decrease toward 0.5."""
        result = apply_weekly_decay({"transport": 0.9})
        assert result["transport"] < 0.9
        assert result["transport"] > 0.5

    def test_low_weight_increases_toward_neutral(self):
        """Weight below 0.5 should increase toward 0.5."""
        result = apply_weekly_decay({"transport": 0.1})
        assert result["transport"] > 0.1
        assert result["transport"] < 0.5

    def test_neutral_weight_unchanged(self):
        """Weight at 0.5 (neutral) should not change after decay."""
        result = apply_weekly_decay({"transport": 0.5})
        assert result["transport"] == 0.5

    def test_all_keys_preserved(self):
        """All keys in input dict should be present in output."""
        weights = {"transport": 0.3, "food": 0.8, "energy": 0.5}
        result = apply_weekly_decay(weights)
        assert set(result.keys()) == set(weights.keys())

    def test_decay_rate_is_5_percent(self):
        """Decay should move weight 5% toward neutral (0.5)."""
        # weight = 0.9 → new = 0.9 + (0.5 - 0.9) × 0.05 = 0.9 - 0.02 = 0.88
        result = apply_weekly_decay({"transport": 0.9})
        assert abs(result["transport"] - 0.88) < 0.001


class TestGenerateFeedbackMessage:
    """Tests for user-facing feedback message generation."""

    def test_accepted_message_contains_category(self):
        """Accepted message should mention the category."""
        msg = generate_feedback_message("accepted", "transport", 0.7)
        assert "transport" in msg.lower()

    def test_completed_message_positive(self):
        """Completed action should produce a positive message."""
        msg = generate_feedback_message("completed", "food", 0.8)
        assert any(word in msg.lower() for word in ["excellent", "completed", "action"])

    def test_rejected_message_present(self):
        """Rejected action should produce a message."""
        msg = generate_feedback_message("rejected", "shopping", 0.4)
        assert len(msg) > 0

    def test_low_weight_adds_warning(self):
        """Very low category weight should add filtering warning to message."""
        msg = generate_feedback_message("rejected", "transport", 0.1)
        assert "reduced" in msg.lower() or "transport" in msg.lower()

    def test_all_actions_produce_non_empty_messages(self):
        """All valid actions should produce non-empty messages."""
        for action in ("accepted", "rejected", "completed", "failed", "deferred"):
            msg = generate_feedback_message(action, "energy", 0.6)
            assert isinstance(msg, str)
            assert len(msg) > 0