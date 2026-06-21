"""
Firebase Admin SDK Initialization

Initializes the Firebase Admin SDK with service account credentials.
This module is imported once at application startup and provides
the initialized app instance for all Firebase operations.

Security:
- Credentials loaded from environment variable path
- Never hardcoded in source
- Service account key file is in .gitignore
"""

import firebase_admin
from firebase_admin import credentials, auth, firestore
from config import get_settings


def initialize_firebase() -> firebase_admin.App:
    """
    Initializes Firebase Admin SDK if not already initialized.

    Returns the Firebase app instance. Safe to call multiple times;
    subsequent calls return the existing instance.

    Raises:
        ValueError: If credentials file is not found or invalid
    """
    if firebase_admin._apps:
        return firebase_admin.get_app()

    settings = get_settings()

    if settings.google_application_credentials:
        cred = credentials.Certificate(settings.google_application_credentials)
    else:
        # In Cloud Run, uses the attached service account automatically
        cred = credentials.ApplicationDefault()

    app = firebase_admin.initialize_app(cred, {
        "projectId": settings.firebase_project_id,
    })

    return app


def get_auth_client():
    """Returns Firebase Auth client for token verification."""
    initialize_firebase()
    return auth


def get_firestore_client() -> firestore.client:
    """Returns Firestore client for database operations."""
    initialize_firebase()
    return firestore.client()