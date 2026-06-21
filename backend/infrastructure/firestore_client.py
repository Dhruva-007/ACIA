"""
Firestore Data Access Layer

Provides typed methods for all Firestore CRUD operations.
Every method requires a user_id parameter to enforce data isolation.
No method can access another user's data by architectural design.

Collections:
- users/{uid}/profile/data
- users/{uid}/lifestyle/data
- users/{uid}/emissions/{YYYY-MM-DD}
- users/{uid}/recommendations/{id}
- users/{uid}/recommendation_history/{template_id}
- users/{uid}/behavioral_weights/data
- users/{uid}/behavioral_history/{auto_id}
- users/{uid}/cii_scores/{YYYY-MM}
- users/{uid}/conversations/{session_id}

Security model:
All Firestore Security Rules enforce that only the authenticated
user whose UID matches the document path can read or write.
This service mirrors that isolation — user_id is always required
and is extracted from the verified Firebase JWT, never from
user-controlled request parameters.
"""

from datetime import datetime, timezone
from typing import Any, Optional

from google.cloud.firestore_v1 import FieldFilter

from infrastructure.firebase_admin import get_firestore_client


class FirestoreService:
    """
    Centralized Firestore data access service.

    All methods are scoped to a specific user_id passed as the
    first argument. This makes cross-user data access physically
    impossible through this service by design.

    The singleton instance is obtained via get_firestore_service().
    Do not instantiate directly in route handlers.
    """

    def __init__(self) -> None:
        self._db = get_firestore_client()

    def _user_ref(self, user_id: str):
        """Returns the Firestore document reference for a user's root."""
        return self._db.collection("users").document(user_id)

    # ─── Profile Operations ──────────────────────────────────────────

    def get_profile(self, user_id: str) -> Optional[dict]:
        """
        Retrieves the user profile document.

        Returns None if the profile does not exist, indicating
        the user has not completed onboarding.
        """
        doc = (
            self._user_ref(user_id)
            .collection("profile")
            .document("data")
            .get()
        )
        return doc.to_dict() if doc.exists else None

    def set_profile(self, user_id: str, profile_data: dict) -> None:
        """
        Creates or merges the user profile document.

        Uses merge=True so partial updates do not overwrite
        existing fields not included in profile_data.
        """
        profile_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        (
            self._user_ref(user_id)
            .collection("profile")
            .document("data")
            .set(profile_data, merge=True)
        )

    # ─── Lifestyle Operations ────────────────────────────────────────

    def get_lifestyle(self, user_id: str) -> Optional[dict]:
        """Retrieves the user's lifestyle input document."""
        doc = (
            self._user_ref(user_id)
            .collection("lifestyle")
            .document("data")
            .get()
        )
        return doc.to_dict() if doc.exists else None

    def set_lifestyle(self, user_id: str, lifestyle_data: dict) -> None:
        """Creates or merges the user's lifestyle input document."""
        lifestyle_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        (
            self._user_ref(user_id)
            .collection("lifestyle")
            .document("data")
            .set(lifestyle_data, merge=True)
        )

    # ─── Emission Operations ─────────────────────────────────────────

    def get_emission(self, user_id: str, date_str: str) -> Optional[dict]:
        """Retrieves the emission record for a specific date (YYYY-MM-DD)."""
        doc = (
            self._user_ref(user_id)
            .collection("emissions")
            .document(date_str)
            .get()
        )
        return doc.to_dict() if doc.exists else None

    def set_emission(
        self, user_id: str, date_str: str, emission_data: dict
    ) -> None:
        """Creates or merges the emission record for a specific date."""
        emission_data["calculated_at"] = datetime.now(timezone.utc).isoformat()
        (
            self._user_ref(user_id)
            .collection("emissions")
            .document(date_str)
            .set(emission_data, merge=True)
        )

    def get_emissions_range(
        self, user_id: str, start_date: str, end_date: str
    ) -> list[dict]:
        """
        Retrieves emission records between two dates inclusive.

        Results are sorted by date ascending for chronological
        chart rendering.
        """
        docs = (
            self._user_ref(user_id)
            .collection("emissions")
            .where(filter=FieldFilter("date", ">=", start_date))
            .where(filter=FieldFilter("date", "<=", end_date))
            .order_by("date")
            .stream()
        )
        return [doc.to_dict() for doc in docs]

    def get_recent_emissions(
        self, user_id: str, limit: int = 30
    ) -> list[dict]:
        """
        Retrieves the most recent emission records.

        Returns results in ascending chronological order (oldest first)
        suitable for trend analysis and chart rendering.
        """
        docs = (
            self._user_ref(user_id)
            .collection("emissions")
            .order_by("date", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        results = [doc.to_dict() for doc in docs]
        results.reverse()
        return results

    # ─── Recommendation Operations ───────────────────────────────────

    def get_recommendations(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 10,
    ) -> list[dict]:
        """
        Retrieves recommendations, optionally filtered by status.

        Results are ordered by composite_score descending so
        the highest-ranked recommendations are returned first.
        """
        query = self._user_ref(user_id).collection("recommendations")

        if status:
            query = query.where(filter=FieldFilter("status", "==", status))

        query = query.order_by(
            "composite_score", direction="DESCENDING"
        ).limit(limit)

        return [doc.to_dict() for doc in query.stream()]

    def set_recommendation(
        self, user_id: str, recommendation_id: str, data: dict
    ) -> None:
        """Creates or merges a recommendation document."""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        (
            self._user_ref(user_id)
            .collection("recommendations")
            .document(recommendation_id)
            .set(data, merge=True)
        )

    def update_recommendation_status(
        self, user_id: str, recommendation_id: str, status: str
    ) -> None:
        """
        Updates only the status field of a recommendation.

        More efficient than a full document write when only
        the status needs to change.
        """
        (
            self._user_ref(user_id)
            .collection("recommendations")
            .document(recommendation_id)
            .update({
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
        )

    def get_all_recommendations(self, user_id: str) -> list[dict]:
        """
        Retrieves all recommendations regardless of status.

        Used by the behavioral learning engine and prediction engine
        where all statuses are needed for analysis.
        """
        docs = (
            self._user_ref(user_id)
            .collection("recommendations")
            .order_by("composite_score", direction="DESCENDING")
            .stream()
        )
        return [doc.to_dict() for doc in docs]

    # ─── Recommendation History Operations ───────────────────────────
    # Implements the recommendation memory system (Section 3).
    # Tracks per-template display and interaction history to prevent
    # re-showing rejected or recently shown recommendations.

    def get_recommendation_history(self, user_id: str) -> list[dict]:
        """
        Retrieves all template history records for a user.

        Used at the start of recommendation generation to build
        the filtering dictionary in O(n) time.
        """
        docs = (
            self._user_ref(user_id)
            .collection("recommendation_history")
            .stream()
        )
        return [doc.to_dict() for doc in docs]

    def get_recommendation_history_record(
        self, user_id: str, template_id: str
    ) -> Optional[dict]:
        """Retrieves the history record for a single template."""
        doc = (
            self._user_ref(user_id)
            .collection("recommendation_history")
            .document(template_id)
            .get()
        )
        return doc.to_dict() if doc.exists else None

    def set_recommendation_history_record(
        self, user_id: str, template_id: str, data: dict
    ) -> None:
        """
        Creates or merges a template history record.

        Called after recommendation generation to record that
        a template was shown, and called after behavioral feedback
        to update rejection/completion counts.
        """
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        (
            self._user_ref(user_id)
            .collection("recommendation_history")
            .document(template_id)
            .set(data, merge=True)
        )

    def update_recommendation_history_status(
        self,
        user_id: str,
        template_id: str,
        new_status: str,
    ) -> None:
        """
        Updates the status and relevant counters in a template history record.

        Called by the behavioral learning service after feedback is processed
        so the memory system knows the outcome of each template interaction.
        """
        now_iso = datetime.now(timezone.utc).isoformat()

        existing = self.get_recommendation_history_record(user_id, template_id)
        if not existing:
            # No history record yet — create a minimal one
            self.set_recommendation_history_record(
                user_id,
                template_id,
                {
                    "template_id": template_id,
                    "times_shown": 1,
                    "last_shown_at": now_iso,
                    "first_shown_at": now_iso,
                    "last_status": new_status,
                    "rejection_count": 1 if new_status == "rejected" else 0,
                    "completion_count": 1 if new_status == "completed" else 0,
                },
            )
            return

        updates: dict[str, Any] = {
            "last_status": new_status,
            "updated_at": now_iso,
        }

        if new_status == "rejected":
            updates["rejection_count"] = existing.get("rejection_count", 0) + 1
        elif new_status == "completed":
            updates["completion_count"] = existing.get("completion_count", 0) + 1

        (
            self._user_ref(user_id)
            .collection("recommendation_history")
            .document(template_id)
            .update(updates)
        )

    # ─── Behavioral Weight Operations ────────────────────────────────

    def get_behavioral_weights(self, user_id: str) -> Optional[dict]:
        """Retrieves current behavioral weights for all categories."""
        doc = (
            self._user_ref(user_id)
            .collection("behavioral_weights")
            .document("data")
            .get()
        )
        return doc.to_dict() if doc.exists else None

    def set_behavioral_weights(self, user_id: str, weights: dict) -> None:
        """Creates or merges behavioral weights."""
        weights["updated_at"] = datetime.now(timezone.utc).isoformat()
        (
            self._user_ref(user_id)
            .collection("behavioral_weights")
            .document("data")
            .set(weights, merge=True)
        )

    # ─── Behavioral History Operations ───────────────────────────────

    def add_behavioral_event(self, user_id: str, event_data: dict) -> str:
        """
        Appends a behavioral event to the user's interaction history.

        Returns the auto-generated Firestore document ID.
        """
        event_data["timestamp"] = datetime.now(timezone.utc).isoformat()
        _, doc_ref = (
            self._user_ref(user_id)
            .collection("behavioral_history")
            .add(event_data)
        )
        return doc_ref.id

    def get_behavioral_history(
        self, user_id: str, limit: int = 50
    ) -> list[dict]:
        """Retrieves behavioral history, most recent first."""
        docs = (
            self._user_ref(user_id)
            .collection("behavioral_history")
            .order_by("timestamp", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        return [doc.to_dict() for doc in docs]

    # ─── CII Score Operations ────────────────────────────────────────

    def get_cii_score(self, user_id: str, month: str) -> Optional[dict]:
        """Retrieves the CII score document for a specific month (YYYY-MM)."""
        doc = (
            self._user_ref(user_id)
            .collection("cii_scores")
            .document(month)
            .get()
        )
        return doc.to_dict() if doc.exists else None

    def set_cii_score(
        self, user_id: str, month: str, score_data: dict
    ) -> None:
        """Creates or merges the CII score for a specific month."""
        score_data["calculated_at"] = datetime.now(timezone.utc).isoformat()
        (
            self._user_ref(user_id)
            .collection("cii_scores")
            .document(month)
            .set(score_data, merge=True)
        )

    def get_cii_history(self, user_id: str, limit: int = 12) -> list[dict]:
        """Retrieves CII score history, most recent first."""
        docs = (
            self._user_ref(user_id)
            .collection("cii_scores")
            .order_by("month", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        return [doc.to_dict() for doc in docs]

    # ─── Conversation Operations ─────────────────────────────────────

    def get_conversation(
        self, user_id: str, session_id: str
    ) -> Optional[dict]:
        """Retrieves a conversation session by session ID."""
        doc = (
            self._user_ref(user_id)
            .collection("conversations")
            .document(session_id)
            .get()
        )
        return doc.to_dict() if doc.exists else None

    def set_conversation(
        self, user_id: str, session_id: str, conversation_data: dict
    ) -> None:
        """Creates or merges a conversation session."""
        conversation_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        (
            self._user_ref(user_id)
            .collection("conversations")
            .document(session_id)
            .set(conversation_data, merge=True)
        )

    def get_conversations(self, user_id: str, limit: int = 10) -> list[dict]:
        """Retrieves recent conversation sessions, most recent first."""
        docs = (
            self._user_ref(user_id)
            .collection("conversations")
            .order_by("updated_at", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        return [doc.to_dict() for doc in docs]

    # ─── Streak Operations (Feature 1) ──────────────────────────────────

    def get_streak(self, user_id: str, sub_type: str) -> Optional[dict]:
        """Retrieves a streak record for a specific sub-type."""
        doc = (
            self._user_ref(user_id)
            .collection("streaks")
            .document(sub_type)
            .get()
        )
        return doc.to_dict() if doc.exists else None

    def set_streak(self, user_id: str, sub_type: str, streak_data: dict) -> None:
        """Creates or updates a streak record."""
        streak_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._user_ref(user_id).collection("streaks").document(sub_type).set(
            streak_data, merge=True
        )

    def get_all_streaks(self, user_id: str) -> list[dict]:
        """Retrieves all streak records for a user."""
        docs = self._user_ref(user_id).collection("streaks").stream()
        return [doc.to_dict() for doc in docs]

    # ─── Carbon Budget Operations (Feature 2) ────────────────────────────

    def get_carbon_budget(self, user_id: str, month: str) -> Optional[dict]:
        """Retrieves carbon budget record for a specific month (YYYY-MM)."""
        doc = (
            self._user_ref(user_id)
            .collection("carbon_budget")
            .document(month)
            .get()
        )
        return doc.to_dict() if doc.exists else None

    def set_carbon_budget(self, user_id: str, month: str, budget_data: dict) -> None:
        """Creates or updates carbon budget for a specific month."""
        budget_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._user_ref(user_id).collection("carbon_budget").document(month).set(
            budget_data, merge=True
        )

    # ─── Narrative Operations (Feature 3) ────────────────────────────────

    def get_weekly_narrative(self, user_id: str, week: str) -> Optional[dict]:
        """Retrieves weekly narrative for a specific week (YYYY-WNN)."""
        doc = (
            self._user_ref(user_id)
            .collection("narratives")
            .document(week)
            .get()
        )
        return doc.to_dict() if doc.exists else None

    def set_weekly_narrative(
        self, user_id: str, week: str, narrative_data: dict
    ) -> None:
        """Creates or updates a weekly narrative."""
        narrative_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._user_ref(user_id).collection("narratives").document(week).set(
            narrative_data, merge=True
        )


# ─── Singleton Instance ──────────────────────────────────────────────

_firestore_service: Optional[FirestoreService] = None


def get_firestore_service() -> FirestoreService:
    """
    Returns the singleton FirestoreService instance.

    Creates the instance on first call and returns the same
    instance on subsequent calls. Thread-safe for the single-
    threaded async FastAPI context.
    """
    global _firestore_service
    if _firestore_service is None:
        _firestore_service = FirestoreService()
    return _firestore_service