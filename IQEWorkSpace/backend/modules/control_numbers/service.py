from fastapi import HTTPException
from modules.control_numbers.models import ControlNumber, Reassignment
from datetime import datetime


class ControlNumberService:

    @staticmethod
    async def list(site_id: str, job_id: str = "", page: int = 1, per_page: int = 25):
        query = {"site_id": site_id}
        if job_id: query["job_id"] = job_id
        total = await ControlNumber.find(query).count()
        items = await ControlNumber.find(query).sort(-ControlNumber.created_at).skip((page - 1) * per_page).limit(per_page).to_list()
        return {"total": total, "page": page, "per_page": per_page, "data": [c.dict() for c in items]}

    @staticmethod
    async def get(cn_id: str):
        cn = await ControlNumber.find_one(ControlNumber.control_number_id == cn_id)
        if not cn: raise HTTPException(404, "Control Number not found")
        return cn

    @staticmethod
    async def create(data: dict, site_id: str):
        existing = await ControlNumber.find_one(ControlNumber.control_number_id == data["control_number_id"])
        if existing: raise HTTPException(400, "Control Number ID already exists")
        cn = ControlNumber(**data, site_id=site_id)
        await cn.insert()
        return cn

    @staticmethod
    async def reassign(cn_id: str, new_cn_id: str, reason: str, user_id: str):
        cn = await ControlNumber.find_one(ControlNumber.control_number_id == cn_id)
        if not cn: raise HTTPException(404, "Control Number not found")
        new_cn = await ControlNumber.find_one(ControlNumber.control_number_id == new_cn_id)
        if not new_cn: raise HTTPException(404, "New Control Number not found")
        reassign = Reassignment(old_control_number_id=cn_id, new_control_number_id=new_cn_id, changed_by=user_id, reason=reason)
        cn.reassignment_history.append(reassign)
        cn.is_active = False
        cn.updated_at = datetime.now()
        await cn.save()
        from modules.visits.models import Visit
        await Visit.find(Visit.control_number_id == cn_id).update({"$set": {"control_number_id": new_cn_id}})
        return {"message": "Reassignment successful"}
