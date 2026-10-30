from typing import Optional

from fastapi import APIRouter, Depends

from core.auth import get_current_user
from modules.approvals.service import ApprovalService

router = APIRouter(prefix="/approvals", tags=["Approval limits"])


@router.get("/limits")
async def active_limits(user: dict = Depends(get_current_user)):
    return await ApprovalService.active_limits(user.get("site_id", "SITE-01"))


@router.get("/limits/history")
async def limit_history(user: dict = Depends(get_current_user)):
    return await ApprovalService.history(user.get("site_id", "SITE-01"))


@router.post("/limits")
async def set_limit(data: dict, user: dict = Depends(get_current_user)):
    return await ApprovalService.set_limit(
        data, user.get("site_id", "SITE-01"), user.get("user_id", "USR-001")
    )


@router.get("/quotation-gate")
async def quotation_gate(
    value: float, region_code: Optional[str] = None, user: dict = Depends(get_current_user)
):
    """Would I be allowed to issue a quotation of this value? A preview for
    the screen; the same check runs again when it is actually issued."""
    return await ApprovalService.quotation_gate(
        value, user, region_code, user.get("site_id", "SITE-01")
    )
