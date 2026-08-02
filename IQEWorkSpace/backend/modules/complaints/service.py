from fastapi import HTTPException
from modules.complaints.models import CustomerComplaint
from datetime import datetime

class ComplaintService:
    @staticmethod
    async def list(site_id: str, status: str = "", page: int = 1, per_page: int = 25):
        query = {"site_id": site_id}
        if status: query["status"] = status
        total = await CustomerComplaint.find(query).count()
        items = await CustomerComplaint.find(query).sort(-CustomerComplaint.created_at).skip((page - 1) * per_page).limit(per_page).to_list()
        return {"total": total, "page": page, "per_page": per_page, "data": [c.dict() for c in items]}

    @staticmethod
    async def create(data: dict, site_id: str, user_id: str):
        data["site_id"] = site_id; data["created_by"] = user_id
        cc = CustomerComplaint(**data); await cc.insert(); return cc
