from fastapi import APIRouter, Body, Depends

from core.auth import get_current_user
from modules.engagements.service import EngagementService

router = APIRouter(prefix="/engagements", tags=["Service-line engagements"])


def _site(user: dict) -> str:
    return user.get("site_id", "SITE-01")


@router.post("")
async def open_engagement(body: dict = Body(...), user: dict = Depends(get_current_user)):
    return await EngagementService.open(body, _site(user), user)


@router.get("/job/{job_id}")
async def for_job(job_id: str, user: dict = Depends(get_current_user)):
    return await EngagementService.for_job(job_id, _site(user))


@router.get("/{engagement_id}")
async def detail(engagement_id: str, user: dict = Depends(get_current_user)):
    return await EngagementService.detail(engagement_id, _site(user))


@router.post("/{engagement_id}/steps/{code}")
async def complete_step(
    engagement_id: str, code: str, body: dict = Body(default_factory=dict),
    user: dict = Depends(get_current_user),
):
    return await EngagementService.complete_step(engagement_id, code.upper(), body, _site(user), user)
