from __future__ import annotations
from fastapi import HTTPException
from modules.visits.models import Visit, Expense, Photo, Finding
from datetime import datetime


class VisitService:

    @staticmethod
    async def list(site_id: str, status: str = "", job_id: str = "", inspector_id: str = "", page: int = 1, per_page: int = 25):
        query = {"site_id": site_id}
        if status: query["status"] = status
        if job_id: query["job_id"] = job_id
        if inspector_id: query["inspector_id"] = inspector_id
        total = await Visit.find(query).count()
        items = await Visit.find(query).sort(-Visit.created_at).skip((page - 1) * per_page).limit(per_page).to_list()
        return {"total": total, "page": page, "per_page": per_page, "data": [v.dict() for v in items]}

    @staticmethod
    async def get(visit_id: str):
        visit = await Visit.find_one(Visit.visit_id == visit_id)
        if not visit: raise HTTPException(404, "Visit not found")
        return visit

    @staticmethod
    async def create(data: dict, site_id: str, user_id: str):
        existing = await Visit.find_one(Visit.visit_id == data.get("visit_id"))
        if existing: raise HTTPException(400, "Visit ID already exists")
        visit = Visit(**data, site_id=site_id, created_by=user_id)
        await visit.insert()
        return visit

    @staticmethod
    async def update_status(visit_id: str, status: str, allowed_from: list[str] = None):
        visit = await Visit.find_one(Visit.visit_id == visit_id)
        if not visit: raise HTTPException(404, "Visit not found")
        if allowed_from and visit.status not in allowed_from:
            raise HTTPException(400, f"Cannot transition from {visit.status}")
        visit.status = status
        visit.updated_at = datetime.now()
        await visit.save()
        return visit

    @staticmethod
    async def submit(visit_id: str, data: dict):
        visit = await Visit.find_one(Visit.visit_id == visit_id)
        if not visit: raise HTTPException(404, "Visit not found")
        if visit.status not in ("initiated", "in_progress"):
            raise HTTPException(400, "Visit must be initiated to submit")
        if data.get("inspection_report_no"): visit.inspection_report_no = data["inspection_report_no"]
        if data.get("comments"): visit.comments = data["comments"]
        if data.get("visited_from"): visit.visited_from = data["visited_from"]
        if data.get("visited_to"): visit.visited_to = data["visited_to"]
        visit.status = "completed"
        visit.updated_at = datetime.now()
        await visit.save()
        return visit

    @staticmethod
    async def quality_check(visit_id: str, status: str, comments: str, user_id: str):
        visit = await Visit.find_one(Visit.visit_id == visit_id)
        if not visit: raise HTTPException(404, "Visit not found")
        if visit.status != "completed": raise HTTPException(400, "Visit must be completed for QC")
        visit.quality_check_status = status
        visit.quality_check_comments = comments
        visit.quality_check_by = user_id
        visit.quality_check_on = datetime.now()
        visit.status = "quality_check_completed"
        visit.updated_at = datetime.now()
        await visit.save()
        return visit

    @staticmethod
    async def finance_approval(visit_id: str, status: str, comments: str, user_id: str):
        visit = await Visit.find_one(Visit.visit_id == visit_id)
        if not visit: raise HTTPException(404, "Visit not found")
        if visit.status != "quality_check_completed":
            raise HTTPException(400, "Visit must clear QC for finance approval")
        visit.finance_status = status
        visit.finance_comments = comments
        visit.finance_by = user_id
        visit.finance_on = datetime.now()
        visit.status = "finance_check_completed"
        visit.updated_at = datetime.now()
        await visit.save()
        return visit

    @staticmethod
    async def add_expense(visit_id: str, expense: Expense):
        visit = await Visit.find_one(Visit.visit_id == visit_id)
        if not visit: raise HTTPException(404, "Visit not found")
        visit.expenses.append(expense)
        visit.updated_at = datetime.now()
        await visit.save()
        return expense

    @staticmethod
    async def add_photo(visit_id: str, photo: Photo):
        visit = await Visit.find_one(Visit.visit_id == visit_id)
        if not visit: raise HTTPException(404, "Visit not found")
        visit.photos.append(photo)
        visit.updated_at = datetime.now()
        await visit.save()
        return photo

    @staticmethod
    async def add_finding(visit_id: str, finding: Finding):
        visit = await Visit.find_one(Visit.visit_id == visit_id)
        if not visit: raise HTTPException(404, "Visit not found")
        visit.findings.append(finding)
        visit.updated_at = datetime.now()
        await visit.save()
        return finding
