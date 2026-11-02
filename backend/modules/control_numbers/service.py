from typing import Optional
from fastapi import HTTPException
from modules.control_numbers.models import ControlNumber, Reassignment
from modules.visits.models import Visit
from datetime import datetime


class ControlNumberService:

    @staticmethod
    async def list(
        site_id: str = "SITE-01", 
        search: str = "", 
        alpha: str = "", 
        is_active: Optional[bool] = None, 
        page: int = 1, 
        per_page: int = 100
    ):
        query = {"site_id": site_id}
        if is_active is not None:
            query["is_active"] = is_active

        if alpha and alpha.upper() != "ALL":
            query["$or"] = [
                {"client_name": {"$regex": f"^{alpha}", "$options": "i"}},
                {"manufacturer_name": {"$regex": f"^{alpha}", "$options": "i"}},
            ]

        if search:
            search_query = {
                "$or": [
                    {"control_number_id": {"$regex": search, "$options": "i"}},
                    {"control_number": {"$regex": search, "$options": "i"}},
                    {"enquiry_no": {"$regex": search, "$options": "i"}},
                    {"client_name": {"$regex": search, "$options": "i"}},
                    {"manufacturer_name": {"$regex": search, "$options": "i"}},
                    {"loi_no": {"$regex": search, "$options": "i"}},
                    {"so_number": {"$regex": search, "$options": "i"}},
                    {"work_scope": {"$regex": search, "$options": "i"}},
                    {"location": {"$regex": search, "$options": "i"}},
                ]
            }
            if "$or" in query:
                alpha_query = query.pop("$or")
                query["$and"] = [{"$or": alpha_query}, search_query]
            else:
                query.update(search_query)

        total = await ControlNumber.find(query).count()
        items = await ControlNumber.find(query).skip((page - 1) * per_page).limit(per_page).sort(-ControlNumber.created_at).to_list()

        return {"total": total, "page": page, "per_page": per_page, "data": [c.dict() for c in items]}

    @staticmethod
    async def get(cn_id: str, site_id: str = "SITE-01"):
        cn = await ControlNumber.find_one(ControlNumber.control_number_id == cn_id, ControlNumber.site_id == site_id)
        if not cn:
            raise HTTPException(status_code=404, detail="Control Number not found")
        return cn.dict()

    @staticmethod
    async def create(data: dict, site_id: str, user_id: str):
        if not data.get("control_number_id"):
            total_cns = await ControlNumber.find_all().count()
            data["control_number_id"] = f"CN-2026-{(total_cns + 1):03d}"
            data["control_number"] = data["control_number_id"]

        existing = await ControlNumber.find_one(ControlNumber.control_number_id == data["control_number_id"], ControlNumber.site_id == site_id)
        if existing:
            raise HTTPException(status_code=400, detail="Control Number ID already exists")

        cn = ControlNumber(**data, site_id=site_id, created_by=user_id)
        await cn.insert()
        return cn

    @staticmethod
    async def update(cn_id: str, data: dict):
        cn = await ControlNumber.find_one(ControlNumber.control_number_id == cn_id, ControlNumber.site_id == site_id)
        if not cn:
            raise HTTPException(status_code=404, detail="Control Number not found")

        for k, v in data.items():
            if hasattr(cn, k) and k not in ("control_number_id", "site_id", "created_at", "created_by"):
                setattr(cn, k, v)

        cn.updated_at = datetime.now()
        await cn.save()
        return cn

    @staticmethod
    async def toggle_status(cn_id: str, is_active: bool, site_id: str = "SITE-01"):
        cn = await ControlNumber.find_one(ControlNumber.control_number_id == cn_id, ControlNumber.site_id == site_id)
        if not cn:
            raise HTTPException(status_code=404, detail="Control Number not found")
        cn.is_active = is_active
        cn.updated_at = datetime.now()
        await cn.save()
        return cn

    @staticmethod
    async def reassign(cn_id: str, new_cn_id: str, reason: str, user_id: str, site_id: str = "SITE-01"):
        cn = await ControlNumber.find_one(ControlNumber.control_number_id == cn_id, ControlNumber.site_id == site_id)
        if not cn:
            raise HTTPException(status_code=404, detail="Control Number not found")
        
        reassign = Reassignment(
            old_control_number_id=cn_id,
            new_control_number_id=new_cn_id,
            changed_by=user_id,
            reason=reason
        )
        cn.reassignment_history.append(reassign)
        cn.is_active = False
        cn.updated_at = datetime.now()
        await cn.save()

        await Visit.find(Visit.control_number_id == cn_id).update({"$set": {"control_number_id": new_cn_id}})
        return {"message": "Reassignment successful", "control_number": cn.dict()}
