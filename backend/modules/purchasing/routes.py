from typing import Optional
from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.purchasing.service import PurchasingService

router = APIRouter(prefix="/purchasing", tags=["Purchasing & Vendor Payments"])


# --- Requisitions ---

@router.get("/")
async def list_requisitions(
    status: str = "",
    vendor_type: str = "",
    page: int = 1,
    per_page: int = 50,
    user: dict = Depends(get_current_user),
):
    return await PurchasingService.list_requisitions(
        user.get("site_id", "SITE-01"), status, vendor_type, page, per_page,
    )


@router.get("/{requisition_id}")
async def get_requisition(requisition_id: str, user: dict = Depends(get_current_user)):
    return await PurchasingService.get_requisition(
        requisition_id, user.get("site_id", "SITE-01"),
    )


@router.post("/")
async def create_requisition(data: dict, user: dict = Depends(get_current_user)):
    return await PurchasingService.create_requisition(
        data, user.get("site_id", "SITE-01"), user.get("user_id", "USR-001"),
    )


@router.patch("/{requisition_id}/approve")
async def approve_requisition(
    requisition_id: str, data: dict = {}, user: dict = Depends(get_current_user),
):
    return await PurchasingService.approve_requisition(
        requisition_id, data,
        user.get("site_id", "SITE-01"), user.get("user_id", "USR-001"),
    )


@router.patch("/{requisition_id}/reject")
async def reject_requisition(
    requisition_id: str, data: dict = {}, user: dict = Depends(get_current_user),
):
    return await PurchasingService.reject_requisition(
        requisition_id, data,
        user.get("site_id", "SITE-01"), user.get("user_id", "USR-001"),
    )


# --- Vendor payments ---

@router.get("/vendor-payments/")
async def list_vendor_payments(
    vendor_type: str = "",
    status: str = "",
    page: int = 1,
    per_page: int = 50,
    user: dict = Depends(get_current_user),
):
    return await PurchasingService.list_vendor_payments(
        user.get("site_id", "SITE-01"), vendor_type, status, page, per_page,
    )


@router.post("/vendor-payments/")
async def create_vendor_payment(data: dict, user: dict = Depends(get_current_user)):
    return await PurchasingService.create_vendor_payment(
        data, user.get("site_id", "SITE-01"), user.get("user_id", "USR-001"),
    )


@router.patch("/vendor-payments/{vp_id}/approve")
async def approve_vendor_payment(
    vp_id: str, data: dict = {}, user: dict = Depends(get_current_user),
):
    return await PurchasingService.approve_vendor_payment(
        vp_id, data, user.get("site_id", "SITE-01"), user,
    )


@router.patch("/vendor-payments/{vp_id}/pay")
async def pay_vendor(
    vp_id: str, data: dict = {}, user: dict = Depends(get_current_user),
):
    return await PurchasingService.pay_vendor(
        vp_id, data, user.get("site_id", "SITE-01"), user,
    )


@router.get("/vendor-payments/statutory/rules")
async def statutory_rules(user: dict = Depends(get_current_user)):
    """The TDS sections and thresholds in force in this system, and when they
    were last confirmed. Shown so an accountant can check them."""
    from core.config import settings
    from modules.purchasing import statutory as st

    return {"as_of": st.RULES_AS_OF, "no_pan_rate_pct": st.NO_PAN_RATE, "no_pan_ref": st.NO_PAN_REF,
            "verification": st.VERIFICATION,
            "config": st.config_status(settings.iqe_gstin, settings.rbi_bank_rate_pct),
            "sections": {k: {"individual_pct": v[0], "other_pct": v[1],
                             "annual_threshold": v[2], "single_payment_threshold": v[3],
                             "act_2025_ref": st.ACT_2025_REFS.get(k)}
                         for k, v in st.TDS_SECTIONS.items()}}


@router.get("/vendor-payments/msme-alerts")
async def msme_alerts(user: dict = Depends(get_current_user)):
    return await PurchasingService.msme_alerts(user.get("site_id", "SITE-01"))


# --- Vendor master: tax identity held once -----------------------------------

@router.get("/vendors")
async def list_vendors(search: str = "", include_inactive: bool = False,
                       user: dict = Depends(get_current_user)):
    return await PurchasingService.list_vendors(user.get("site_id", "SITE-01"), search, not include_inactive)


@router.post("/vendors")
async def create_vendor(data: dict, user: dict = Depends(get_current_user)):
    return await PurchasingService.create_vendor(data, user.get("site_id", "SITE-01"), user.get("user_id", "USR-001"))


@router.get("/vendors/{vendor_id}")
async def get_vendor(vendor_id: str, user: dict = Depends(get_current_user)):
    return await PurchasingService.get_vendor(vendor_id, user.get("site_id", "SITE-01"))


@router.patch("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await PurchasingService.update_vendor(
        vendor_id, data, user.get("site_id", "SITE-01"), user.get("user_id", "USR-001"))
