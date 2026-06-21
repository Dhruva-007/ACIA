"""
Explainer API Routes — Feature 7: Carbon Footprint Explainer Mode

Endpoints:
- POST /explainer/category — Get AI explanation for an emission category
"""

from fastapi import APIRouter, Depends

from api.middleware.auth import get_current_user
from services.assistant_service import generate_category_explainer
from main import success_response, error_response

router = APIRouter(tags=["Explainer"])

VALID_CATEGORIES = {"transport", "energy", "food", "shopping"}


@router.post("/explainer/category")
async def explain_category(
    body: dict,
    user_id: str = Depends(get_current_user),
):
    """
    Returns an AI-generated explanation for a specific emission category.

    Shows the user exactly how their category emissions were calculated,
    which emission factors were used, and where those factors come from.

    Builds trust through full calculation transparency.

    Request body:
    {
        "category": "transport" | "energy" | "food" | "shopping"
    }
    """
    category = body.get("category", "").strip().lower()

    if category not in VALID_CATEGORIES:
        return error_response(
            code="INVALID_CATEGORY",
            message=f"Category must be one of: {', '.join(sorted(VALID_CATEGORIES))}",
            status_code=400,
        )

    explanation = generate_category_explainer(user_id=user_id, category=category)

    return success_response(
        data=explanation,
        message=f"Explainer generated for {category}.",
    )