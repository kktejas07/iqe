from typing import Optional

from fastapi import APIRouter, Depends

from core.auth import get_current_user
from modules.reporting.service import ReportingService

router = APIRouter(prefix="/reporting", tags=["Reporting"])


@router.get("/formats")
async def list_formats(
    work_type_code: str = "",
    kind: str = "",
    is_active: Optional[bool] = True,
    user: dict = Depends(get_current_user),
):
    return await ReportingService.list_formats(
        user.get("site_id", "SITE-01"), work_type_code, kind, is_active
    )


@router.post("/formats/seed")
async def seed_formats(user: dict = Depends(get_current_user)):
    """Load the standard format registry. Idempotent per site."""
    return await ReportingService.seed_formats(user.get("site_id", "SITE-01"))


@router.get("/formats/for-work-type/{work_type_code}")
async def formats_for_work_type(work_type_code: str, user: dict = Depends(get_current_user)):
    """Which reports a package of this work type can produce."""
    return await ReportingService.formats_for_work_type(
        work_type_code, user.get("site_id", "SITE-01")
    )


@router.get("/formats/{format_code}")
async def get_format(format_code: str, user: dict = Depends(get_current_user)):
    return await ReportingService.get_format(format_code, user.get("site_id", "SITE-01"))


@router.get("/project-report/{job_id}")
async def project_report(job_id: str, user: dict = Depends(get_current_user)):
    """End-to-end project report, composed from the execution spine."""
    return await ReportingService.project_report(job_id, user.get("site_id", "SITE-01"))
