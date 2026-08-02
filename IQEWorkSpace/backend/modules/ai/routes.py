from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.ai.service import AIService

router = APIRouter(prefix="/ai", tags=["AI"])
ai_service = AIService()


@router.post("/generate-report/{visit_id}")
async def generate_report(visit_id: str, user: dict = Depends(get_current_user)):
    return await ai_service.generate_inspection_report(visit_id)


@router.get("/search")
async def search(query: str, limit: int = 10, user: dict = Depends(get_current_user)):
    return {"data": await ai_service.vector_search(query, user["site_id"], limit)}


@router.get("/detect-anomalies/{visit_id}")
async def detect_anomalies(visit_id: str, user: dict = Depends(get_current_user)):
    return await ai_service.detect_anomalies(visit_id)


@router.get("/suggest-inspector")
async def suggest_inspector(job_type: str = "inspection", location: str = "",
                            user: dict = Depends(get_current_user)):
    return {"data": await ai_service.suggest_inspector(job_type, location, user["site_id"])}
