from typing import Optional

from fastapi import APIRouter, Depends

from core.auth import get_current_user
from modules.certifications.service import CertificationService

router = APIRouter(prefix="/certifications", tags=["Certifications"])


@router.get("/")
async def list_certifications(
    work_package_id: str = "",
    job_id: str = "",
    status: str = "",
    unbilled_only: bool = False,
    page: int = 1,
    per_page: int = 100,
    user: dict = Depends(get_current_user),
):
    return await CertificationService.list(
        user.get("site_id", "SITE-01"), work_package_id, job_id, status,
        unbilled_only, page, per_page,
    )


@router.get("/summary")
async def certification_summary(job_id: str = "", user: dict = Depends(get_current_user)):
    """Claimed vs certified position, including certified-but-unbilled value."""
    return await CertificationService.summary(user.get("site_id", "SITE-01"), job_id)


@router.get("/deduction-reasons")
async def deduction_reasons(user: dict = Depends(get_current_user)):
    return await CertificationService.deduction_reasons()


@router.get("/eligibility/{work_package_id}")
async def billing_eligibility(work_package_id: str, user: dict = Depends(get_current_user)):
    """Whether this work package can be invoiced yet, and for how much."""
    return await CertificationService.billing_eligibility(
        work_package_id, user.get("site_id", "SITE-01")
    )


@router.get("/{certification_id}")
async def get_certification(certification_id: str, user: dict = Depends(get_current_user)):
    return await CertificationService.get(certification_id, user.get("site_id", "SITE-01"))


@router.post("/")
async def create_certification(data: dict, user: dict = Depends(get_current_user)):
    return await CertificationService.create(
        data, user.get("site_id", "SITE-01"), user.get("user_id", "USR-001")
    )


@router.put("/{certification_id}")
async def update_certification(
    certification_id: str, data: dict, user: dict = Depends(get_current_user)
):
    """Drafts only. An issued certification is revised, not edited."""
    return await CertificationService.update(
        certification_id, data, user.get("site_id", "SITE-01")
    )


@router.post("/{certification_id}/issue")
async def issue_certification(
    certification_id: str,
    certified_by_person_id: str,
    user: dict = Depends(get_current_user),
):
    return await CertificationService.issue(
        certification_id, certified_by_person_id,
        user.get("site_id", "SITE-01"), user.get("user_id", "USR-001"),
    )


@router.post("/{certification_id}/revise")
async def revise_certification(
    certification_id: str, data: dict, user: dict = Depends(get_current_user)
):
    """Supersede an issued certification with a new revision."""
    return await CertificationService.revise(
        certification_id, data, user.get("site_id", "SITE-01"), user.get("user_id", "USR-001")
    )


@router.post("/{certification_id}/dispute")
async def dispute_certification(
    certification_id: str, note: str, user: dict = Depends(get_current_user)
):
    return await CertificationService.dispute(
        certification_id, note, user.get("site_id", "SITE-01")
    )


@router.post("/{certification_id}/mark-billed")
async def mark_certification_billed(
    certification_id: str, invoice_id: str, user: dict = Depends(get_current_user)
):
    """Consume a certification into an invoice. Rejects double billing."""
    return await CertificationService.mark_billed(
        certification_id, invoice_id, user.get("site_id", "SITE-01")
    )
