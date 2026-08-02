from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.control_numbers.service import ControlNumberService

router = APIRouter(prefix="/control-numbers", tags=["Control Numbers"])


@router.get("/")
async def list(job_id: str = "", page: int = 1, per_page: int = 25, user: dict = Depends(get_current_user)):
    return await ControlNumberService.list(user["site_id"], job_id, page, per_page)


@router.get("/{cn_id}")
async def get(cn_id: str, user: dict = Depends(get_current_user)):
    return await ControlNumberService.get(cn_id)


@router.post("/")
async def create(data: dict, user: dict = Depends(get_current_user)):
    return await ControlNumberService.create(data, user["site_id"])


@router.post("/{cn_id}/reassign")
async def reassign(cn_id: str, new_cn_id: str, reason: str, user: dict = Depends(get_current_user)):
    return await ControlNumberService.reassign(cn_id, new_cn_id, reason, user["user_id"])
