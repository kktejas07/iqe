from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.jobs.service import JobService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    return await JobService.dashboard(user["site_id"])
