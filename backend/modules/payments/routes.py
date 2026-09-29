from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.payments.service import PaymentService

router = APIRouter(prefix="/payments", tags=["Payments"])
@router.get("/")
async def list(invoice_id: str = "", page: int = 1, per_page: int = 25, user: dict = Depends(get_current_user)):
    return await PaymentService.list(user["site_id"], invoice_id, page, per_page)
@router.post("/")
async def create(data: dict, user: dict = Depends(get_current_user)):
    return await PaymentService.create(data, user["site_id"], user["user_id"])
