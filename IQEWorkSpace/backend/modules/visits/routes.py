from typing import Optional
from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.visits.service import VisitService
from modules.visits.models import Expense, Photo, Finding
from pydantic import BaseModel

router = APIRouter(prefix="/visits", tags=["Visits"])


class QCReq(BaseModel): status: str; comments: str = ""
class FinReq(BaseModel): status: str; comments: str = ""
class SubmitReq(BaseModel):
    inspection_report_no: Optional[str] = None; comments: Optional[str] = None
    visited_from: Optional[str] = None; visited_to: Optional[str] = None


@router.get("/")
async def list(status: str = "", job_id: str = "", inspector_id: str = "", page: int = 1, per_page: int = 25, user: dict = Depends(get_current_user)):
    return await VisitService.list(user["site_id"], status, job_id, inspector_id, page, per_page)


@router.get("/{visit_id}")
async def get(visit_id: str, user: dict = Depends(get_current_user)):
    return await VisitService.get(visit_id)


@router.post("/")
async def create(data: dict, user: dict = Depends(get_current_user)):
    return await VisitService.create(data, user["site_id"], user["user_id"])


@router.patch("/{visit_id}/accept")
async def accept(visit_id: str, user: dict = Depends(get_current_user)):
    return await VisitService.update_status(visit_id, "initiated", ["scheduled"])


@router.patch("/{visit_id}/submit")
async def submit(visit_id: str, data: SubmitReq, user: dict = Depends(get_current_user)):
    return await VisitService.submit(visit_id, data.dict(exclude_none=True))


@router.patch("/{visit_id}/quality-check")
async def quality_check(visit_id: str, data: QCReq, user: dict = Depends(get_current_user)):
    return await VisitService.quality_check(visit_id, data.status, data.comments, user["user_id"])


@router.patch("/{visit_id}/finance-approval")
async def finance_approval(visit_id: str, data: FinReq, user: dict = Depends(get_current_user)):
    return await VisitService.finance_approval(visit_id, data.status, data.comments, user["user_id"])


@router.post("/{visit_id}/expenses")
async def add_expense(visit_id: str, expense: Expense, user: dict = Depends(get_current_user)):
    return await VisitService.add_expense(visit_id, expense)


@router.post("/{visit_id}/photos")
async def add_photo(visit_id: str, photo: Photo, user: dict = Depends(get_current_user)):
    return await VisitService.add_photo(visit_id, photo)


@router.post("/{visit_id}/findings")
async def add_finding(visit_id: str, finding: Finding, user: dict = Depends(get_current_user)):
    return await VisitService.add_finding(visit_id, finding)
