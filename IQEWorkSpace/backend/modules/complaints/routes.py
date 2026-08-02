from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.complaints.service import ComplaintService

router = APIRouter(prefix="/complaints", tags=["Complaints"])
@router.get("/")
async def list(status: str = "", page: int = 1, per_page: int = 25, user: dict = Depends(get_current_user)):
    return await ComplaintService.list(user["site_id"], status, page, per_page)
@router.post("/")
async def create(data: dict, user: dict = Depends(get_current_user)):
    return await ComplaintService.create(data, user["site_id"], user["user_id"])
