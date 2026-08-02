from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.purchase_orders.service import PurchaseOrderService

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])


@router.get("/")
async def list(job_id: str = "", page: int = 1, per_page: int = 25, user: dict = Depends(get_current_user)):
    return await PurchaseOrderService.list(user["site_id"], job_id, page, per_page)


@router.get("/{po_id}")
async def get(po_id: str, user: dict = Depends(get_current_user)):
    return await PurchaseOrderService.get(po_id)


@router.post("/")
async def create(data: dict, user: dict = Depends(get_current_user)):
    return await PurchaseOrderService.create(data, user["site_id"], user["user_id"])


@router.put("/{po_id}")
async def update(po_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await PurchaseOrderService.update(po_id, data)
