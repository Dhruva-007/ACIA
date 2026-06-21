"""
Authentication Middleware

Verifies Firebase ID tokens on every protected request.

Security flow:
1. Extract Bearer token from Authorization header
2. Verify token signature using Firebase Admin SDK
3. Validate token expiry and issuer
4. Extract uid from decoded token
5. Set uid on request.state for downstream use

If verification fails at any step, returns 401 Unauthorized.
The user_id is NEVER accepted as a request parameter —
it is ALWAYS extracted from the verified token.
"""

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from infrastructure.firebase_admin import initialize_firebase

# Initialize Firebase on module load
initialize_firebase()

security_scheme = HTTPBearer()


async def verify_firebase_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials,
) -> str:
    """
    Verifies a Firebase ID token and returns the user's uid.

    This function is used as a dependency in route handlers:
        user_id: str = Depends(get_current_user)

    Args:
        request: FastAPI request object
        credentials: Bearer token from Authorization header

    Returns:
        User's Firebase UID string

    Raises:
        HTTPException: 401 if token is invalid, expired, or missing
    """
    token = credentials.credentials

    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token["uid"]

        # Store uid on request state for logging middleware
        request.state.uid = uid

        return uid

    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=401,
            detail={
                "success": False,
                "error": {
                    "code": "TOKEN_EXPIRED",
                    "message": "Your session has expired. Please sign in again.",
                },
            },
        )
    except auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=401,
            detail={
                "success": False,
                "error": {
                    "code": "TOKEN_REVOKED",
                    "message": "Your session has been revoked. Please sign in again.",
                },
            },
        )
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=401,
            detail={
                "success": False,
                "error": {
                    "code": "INVALID_TOKEN",
                    "message": "Invalid authentication token.",
                },
            },
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail={
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Authentication failed. Please sign in again.",
                },
            },
        )


async def get_current_user(
    request: Request,
) -> str:
    """
    FastAPI dependency that extracts and verifies the current user.

    Usage in route handlers:
        @router.get("/endpoint")
        async def handler(user_id: str = Depends(get_current_user)):
            ...

    Returns:
        Verified user's Firebase UID
    """
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={
                "success": False,
                "error": {
                    "code": "MISSING_TOKEN",
                    "message": "Authentication required. Please sign in.",
                },
            },
        )

    token = auth_header.split("Bearer ")[1]
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    return await verify_firebase_token(request, credentials)