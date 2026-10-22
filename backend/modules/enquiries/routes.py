from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.enquiries.service import EnquiryService

router = APIRouter(prefix="/enquiries", tags=["Enquiries"])
@router.get("/")
async def list(status: str = "", page: int = 1, per_page: int = 25, user: dict = Depends(get_current_user)):
    return await EnquiryService.list(user["site_id"], status, page, per_page)
@router.get("/{enquiry_id}")
async def get(enquiry_id: str, user: dict = Depends(get_current_user)):
    return await EnquiryService.get(enquiry_id, user.get("site_id", "SITE-01"))
@router.post("/")
async def create(data: dict, user: dict = Depends(get_current_user)):
    return await EnquiryService.create(data, user["site_id"], user["user_id"])
