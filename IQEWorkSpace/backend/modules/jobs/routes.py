from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.jobs.service import JobService

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/")
async def list(search: str = "", status: str = "", page: int = 1, per_page: int = 25, user: dict = Depends(get_current_user)):
    return await JobService.list(user["site_id"], search, status, page, per_page)


@router.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    return await JobService.dashboard(user["site_id"])


@router.get("/{job_id}")
async def get(job_id: str, include: str = "", user: dict = Depends(get_current_user)):
    return await JobService.get(job_id, user["site_id"], include)


@router.post("/")
async def create(data: dict, user: dict = Depends(get_current_user)):
    return await JobService.create(data, user["site_id"], user["user_id"])


@router.put("/{job_id}")
async def update(job_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await JobService.update(job_id, data, user["site_id"])


@router.patch("/{job_id}/status")
async def update_status(job_id: str, status: str, user: dict = Depends(get_current_user)):
    return await JobService.update_status(job_id, status, user["site_id"])
