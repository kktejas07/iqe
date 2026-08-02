from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.reports.service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/visits")
async def visit_report(from_date: str = "", to_date: str = "", client_id: str = "",
                      status: str = "", engineer_id: str = "",
                      page: int = 1, per_page: int = 50, user: dict = Depends(get_current_user)):
    return await ReportService.visit_report(user["site_id"], from_date, to_date, client_id, status, engineer_id, page, per_page)


@router.get("/expenses")
async def expense_report(from_date: str = "", to_date: str = "",
                         page: int = 1, per_page: int = 50, user: dict = Depends(get_current_user)):
    return await ReportService.expense_report(user["site_id"], from_date, to_date, page, per_page)


@router.get("/invoices")
async def invoice_report(from_date: str = "", to_date: str = "", status: str = "",
                         page: int = 1, per_page: int = 50, user: dict = Depends(get_current_user)):
    return await ReportService.invoice_report(user["site_id"], from_date, to_date, status, page, per_page)
