from fastapi import APIRouter, Depends

from core.auth import get_current_user
from modules.migration import service

router = APIRouter(prefix="/migration", tags=["Migration"])


@router.post("/tpi")
async def migrate_tpi(
    dry_run: bool = True,
    limit: int = 0,
    user: dict = Depends(get_current_user),
):
    """Promote TPI reports onto the execution spine. Dry run by default."""
    return await service.migrate_tpi_reports(
        user.get("site_id", "SITE-01"), user.get("user_id", "USR-MIGRATION"), dry_run, limit
    )


@router.post("/schedule-m")
async def migrate_schedule_m(dry_run: bool = True, user: dict = Depends(get_current_user)):
    """Promote Schedule M pharma EPC projects. Dry run by default."""
    return await service.migrate_schedule_m_projects(
        user.get("site_id", "SITE-01"), user.get("user_id", "USR-MIGRATION"), dry_run
    )


@router.post("/construction-bill-verification")
async def migrate_cbv(dry_run: bool = True, user: dict = Depends(get_current_user)):
    """Promote construction bill verification records. Dry run by default."""
    return await service.migrate_construction_bill_verifications(
        user.get("site_id", "SITE-01"), user.get("user_id", "USR-MIGRATION"), dry_run
    )


@router.post("/all")
async def migrate_all(dry_run: bool = True, user: dict = Depends(get_current_user)):
    """All three verticals in one pass. Dry run by default.

    Safe to re-run: everything written is idempotent on migrated_from_ref.
    """
    return await service.migrate_all(
        user.get("site_id", "SITE-01"), user.get("user_id", "USR-MIGRATION"), dry_run
    )
