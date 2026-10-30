from typing import Optional
from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.payroll.service import PayrollService

router = APIRouter(prefix="/payroll", tags=["Payroll"])


@router.post("/runs")
async def create_run(data: dict, user: dict = Depends(get_current_user)):
    return await PayrollService.create_run(data, user.get("site_id", "SITE-01"), user.get("user_id", "USR-001"))


@router.get("/runs")
async def list_runs(
    period_month: Optional[int] = None, period_year: Optional[int] = None,
    status: Optional[str] = None, page: int = 1, per_page: int = 50,
    user: dict = Depends(get_current_user),
):
    return await PayrollService.list_runs(user.get("site_id", "SITE-01"), period_month, period_year, status, page, per_page)


@router.get("/runs/{run_id}")
async def get_run(run_id: str, user: dict = Depends(get_current_user)):
    return await PayrollService.get_run(run_id, user.get("site_id", "SITE-01"))


@router.post("/runs/{run_id}/process")
async def process_run(run_id: str, user: dict = Depends(get_current_user)):
    return await PayrollService.process_run(run_id, user.get("site_id", "SITE-01"), user.get("user_id", "USR-001"))


@router.patch("/runs/{run_id}/approve")
async def approve_run(run_id: str, acknowledge_held: bool = False, user: dict = Depends(get_current_user)):
    return await PayrollService.approve_run(
        run_id, user.get("site_id", "SITE-01"), user.get("user_id", "USR-001"), acknowledge_held
    )


@router.patch("/runs/{run_id}/disburse")
async def disburse_run(run_id: str, user: dict = Depends(get_current_user)):
    return await PayrollService.disburse_run(run_id, user.get("site_id", "SITE-01"), user.get("user_id", "USR-001"))


@router.post("/salary-structures/{person_id}")
async def set_salary_structure(person_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await PayrollService.set_salary_structure(person_id, data, user.get("site_id", "SITE-01"), user)


@router.get("/salary-structures/{person_id}")
async def salary_history(person_id: str, user: dict = Depends(get_current_user)):
    return await PayrollService.salary_history(person_id, user.get("site_id", "SITE-01"))


@router.get("/payslips")
async def list_payslips(
    person_id: Optional[str] = None, period_month: Optional[int] = None,
    period_year: Optional[int] = None, page: int = 1, per_page: int = 100,
    user: dict = Depends(get_current_user),
):
    return await PayrollService.list_payslips(user.get("site_id", "SITE-01"), person_id, period_month, period_year, page, per_page)


@router.get("/payslips/{payslip_id}")
async def get_payslip(payslip_id: str, user: dict = Depends(get_current_user)):
    return await PayrollService.get_payslip(payslip_id, user.get("site_id", "SITE-01"))


# ── Self-service: a person's own payslips ───────────────────────────────
# Under /payroll/me so the RBAC rule can open it to every internal role while
# the rest of /payroll stays Finance and Admin. The person comes from the
# login; there is deliberately no person_id parameter.

@router.get("/me/payslips")
async def my_payslips(
    period_month: Optional[int] = None, period_year: Optional[int] = None,
    page: int = 1, per_page: int = 24, user: dict = Depends(get_current_user),
):
    return await PayrollService.my_payslips(
        user.get("site_id", "SITE-01"), user, period_month, period_year, page, per_page
    )


@router.get("/me/payslips/{payslip_id}")
async def my_payslip(payslip_id: str, user: dict = Depends(get_current_user)):
    return await PayrollService.my_payslip(payslip_id, user.get("site_id", "SITE-01"), user)

