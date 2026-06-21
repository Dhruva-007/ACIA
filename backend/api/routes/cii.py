"""
Carbon Improvement Index API Routes

Endpoints:
- GET /cii/current   — Get current CII score
- GET /cii/history   — Get CII score history
- GET /cii/breakdown — Get CII with sub-scores and guidance
"""

from fastapi import APIRouter, Depends, Query

from api.middleware.auth import get_current_user
from services.cii_service import calculate_cii, get_cii_breakdown, get_cii_history
from main import success_response

router = APIRouter(tags=["CII"])


@router.get("/cii/current")
async def get_current_cii(
    user_id: str = Depends(get_current_user),
):
    """
    Returns current Carbon Improvement Index score.

    Recalculates the CII from current data to ensure
    it reflects the latest state.
    """
    score = calculate_cii(user_id)

    return success_response(
        data=score,
        message="CII score calculated.",
    )


@router.get("/cii/history")
async def get_cii_history_endpoint(
    months: int = Query(default=6, ge=1, le=12),
    user_id: str = Depends(get_current_user),
):
    """
    Returns CII score history over past months.

    Used by the CII trend chart.
    """
    history = get_cii_history(user_id, months)

    return success_response(
        data=history,
        message=f"Retrieved {len(history)} months of CII history.",
    )


@router.get("/cii/breakdown")
async def get_cii_breakdown_endpoint(
    user_id: str = Depends(get_current_user),
):
    """
    Returns CII with full sub-score breakdown and
    improvement guidance for each dimension.

    Used by the CII page sub-score panel.
    """
    breakdown = get_cii_breakdown(user_id)

    return success_response(
        data=breakdown,
        message="CII breakdown retrieved.",
    )