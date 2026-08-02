from fastapi import HTTPException
from modules.purchase_orders.models import PurchaseOrder
from datetime import datetime


class PurchaseOrderService:

    @staticmethod
    async def list(site_id: str, job_id: str = "", page: int = 1, per_page: int = 25):
        query = {"site_id": site_id}
        if job_id: query["job_id"] = job_id
        total = await PurchaseOrder.find(query).count()
        items = await PurchaseOrder.find(query).sort(-PurchaseOrder.created_at).skip((page - 1) * per_page).limit(per_page).to_list()
        return {"total": total, "page": page, "per_page": per_page, "data": [p.dict() for p in items]}

    @staticmethod
    async def get(po_id: str):
        po = await PurchaseOrder.find_one(PurchaseOrder.po_id == po_id)
        if not po: raise HTTPException(404, "Purchase Order not found")
        return po

    @staticmethod
    async def create(data: dict, site_id: str, user_id: str):
        data["site_id"] = site_id; data["created_by"] = user_id
        po = PurchaseOrder(**data)
        await po.insert()
        return po

    @staticmethod
    async def update(po_id: str, data: dict):
        po = await PurchaseOrder.find_one(PurchaseOrder.po_id == po_id)
        if not po: raise HTTPException(404, "Purchase Order not found")
        for k, v in data.items():
            if hasattr(po, k) and k not in ("po_id", "site_id", "created_at"):
                setattr(po, k, v)
        po.updated_at = datetime.now()
        await po.save()
        return po
