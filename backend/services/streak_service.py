"""
Streak Service — Feature 1: Behavioral Streak and Commitment Tracking

Manages behavioral streaks for accepted recommendations.

A streak is a consecutive weekly check-in record for a specific
recommendation sub-type. When a user accepts a recommendation,
a streak record is initialized. Each week, the user is prompted
to check in (Did you follow through?).

Streak rules:
- Starts at 0 on recommendation acceptance
- Increments by 1 on each successful weekly check-in
- Resets to 0 on a failed check-in (but record persists)
- Status is 'at_risk' when check-in is due within 24 hours

Behavioral science basis:
BJ Fogg's Tiny Habits research demonstrates that visible
streak counters are among the most effective commitment
devices for sustaining behavior change over time.
"""

from datetime import datetime, timezone, timedelta
from typing import Any

from infrastructure.firestore_client import get_firestore_service


# ─── Streak Status Thresholds ─────────────────────────────────────────

CHECKIN_INTERVAL_DAYS = 7
AT_RISK_HOURS = 24  # Hours before due date when status becomes 'at_risk'

MILESTONE_STREAKS = [1, 4, 8, 12, 26, 52]  # Weeks worth celebrating


def initialize_streak(
    user_id: str,
    recommendation_id: str,
    sub_type: str,
) -> dict[str, Any]:
    """
    Initializes a streak record when a recommendation is accepted.

    Called by the behavioral learning engine when action == 'accepted'.

    Args:
        user_id: Firebase UID
        recommendation_id: ID of the accepted recommendation
        sub_type: Recommendation sub-type (used as the streak key)

    Returns:
        New streak record dict
    """
    db = get_firestore_service()
    now = datetime.now(timezone.utc)
    due_by = now + timedelta(days=CHECKIN_INTERVAL_DAYS)

    streak_data = {
        "sub_type": sub_type,
        "recommendation_id": recommendation_id,
        "current_streak": 0,
        "longest_streak": 0,
        "last_checkin_at": None,
        "checkin_due_by": due_by.isoformat(),
        "status": "active",
        "started_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    db.set_streak(user_id, sub_type, streak_data)
    return streak_data


def process_checkin(
    user_id: str,
    sub_type: str,
    completed: bool,
) -> dict[str, Any]:
    """
    Processes a weekly streak check-in.

    Args:
        user_id: Firebase UID
        sub_type: Streak sub-type identifier
        completed: True if user maintained the behavior, False if not

    Returns:
        Updated streak record with message

    Raises:
        ValueError: If no streak record found for sub_type
    """
    db = get_firestore_service()
    now = datetime.now(timezone.utc)

    streak = db.get_streak(user_id, sub_type)
    if not streak:
        raise ValueError(f"No streak found for sub_type: {sub_type}")

    previous_streak = streak.get("current_streak", 0)

    if completed:
        new_streak = previous_streak + 1
        longest = max(streak.get("longest_streak", 0), new_streak)
        status = "active"
    else:
        new_streak = 0
        longest = streak.get("longest_streak", 0)
        status = "active"  # Reset but keep active — not broken permanently

    next_due = now + timedelta(days=CHECKIN_INTERVAL_DAYS)

    updated = {
        **streak,
        "current_streak": new_streak,
        "longest_streak": longest,
        "last_checkin_at": now.isoformat(),
        "checkin_due_by": next_due.isoformat(),
        "status": status,
        "updated_at": now.isoformat(),
    }

    db.set_streak(user_id, sub_type, updated)

    message = _generate_streak_message(completed, new_streak, previous_streak)
    return {**updated, "message": message}


def get_streak_summary(user_id: str) -> dict[str, Any]:
    """
    Retrieves all streaks and computes summary statistics.

    Updates streak statuses based on current time before returning.

    Args:
        user_id: Firebase UID

    Returns:
        StreakSummary with list of streaks and aggregate stats
    """
    db = get_firestore_service()
    streaks = db.get_all_streaks(user_id)

    now = datetime.now(timezone.utc)
    updated_streaks = []

    for streak in streaks:
        # Update status based on due date
        due_by_str = streak.get("checkin_due_by")
        if due_by_str:
            try:
                due_by = datetime.fromisoformat(due_by_str)
                if due_by.tzinfo is None:
                    due_by = due_by.replace(tzinfo=timezone.utc)

                hours_until_due = (due_by - now).total_seconds() / 3600

                if hours_until_due < 0:
                    # Overdue — mark as broken if not already checked in
                    last_checkin = streak.get("last_checkin_at")
                    if not last_checkin:
                        streak["status"] = "broken"
                    elif hours_until_due < -24:
                        streak["status"] = "broken"
                elif hours_until_due <= AT_RISK_HOURS:
                    streak["status"] = "at_risk"
                else:
                    streak["status"] = "active"
            except (ValueError, TypeError):
                pass

        updated_streaks.append(streak)

    total_active = sum(1 for s in updated_streaks if s.get("status") == "active")
    longest_current = max(
        (s.get("current_streak", 0) for s in updated_streaks),
        default=0
    )

    return {
        "streaks": updated_streaks,
        "total_active": total_active,
        "longest_current": longest_current,
    }


def _generate_streak_message(
    completed: bool,
    new_streak: int,
    previous_streak: int,
) -> str:
    """
    Generates a motivating message for a streak check-in.

    Args:
        completed: Whether the user completed the action
        new_streak: New streak count after this check-in
        previous_streak: Streak count before this check-in

    Returns:
        Human-readable motivating message
    """
    if not completed:
        if previous_streak > 0:
            return (
                f"Streak reset. You had a {previous_streak}-week streak — "
                f"that's still great progress! Start fresh this week. 💪"
            )
        return "No worries! Try again this week — every action counts."

    if new_streak in MILESTONE_STREAKS:
        milestone_messages = {
            1: "First week complete! You've started a new habit. 🌱",
            4: "One month streak! You're building real momentum. 🔥",
            8: "Two months strong! This is becoming second nature. ⭐",
            12: "Three months! You've created a lasting habit. 🏆",
            26: "Six months! Your impact is truly measurable now. 🌍",
            52: "One full year! You're an ACIA sustainability champion! 🎖️",
        }
        return milestone_messages.get(new_streak, f"🎉 {new_streak}-week streak!")

    message_suffix = "Keep it up! 🌱" if new_streak < 4 else "You're on fire! 🔥"
    return f"Week {new_streak} complete! {message_suffix}"