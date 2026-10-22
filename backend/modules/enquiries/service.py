from fastapi import HTTPException
from modules.enquiries.models import Enquiry
from datetime import datetime

class EnquiryService:
    @staticmethod
    async def list(site_id: str, status: str = "", page: int = 1, per_page: int = 25):
        query = {"site_id": site_id}
        if status: query["status"] = status
        total = await Enquiry.find(query).count()
        items = await Enquiry.find(query).sort(-Enquiry.created_at).skip((page - 1) * per_page).limit(per_page).to_list()
        return {"total": total, "page": page, "per_page": per_page, "data": [e.dict() for e in items]}

    @staticmethod
    async def get(enquiry_id: str, site_id: str = "SITE-01"):
        eq = await Enquiry.find_one(Enquiry.enquiry_id == enquiry_id, Enquiry.site_id == site_id)
        if not eq: raise HTTPException(404, "Enquiry not found")
        return eq

    @staticmethod
    async def create(data: dict, site_id: str, user_id: str):
        data["site_id"] = site_id; data["created_by"] = user_id
        eq = Enquiry(**data); await eq.insert(); return eq
