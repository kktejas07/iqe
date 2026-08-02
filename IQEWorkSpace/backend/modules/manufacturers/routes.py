from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.manufacturers.service import ManufacturerService

router = APIRouter(prefix="/manufacturers", tags=["Manufacturers"])


@router.get("/")
async def list(search: str = "", page: int = 1, per_page: int = 25, user: dict = Depends(get_current_user)):
    return await ManufacturerService.list(user["site_id"], search, page, per_page)


@router.get("/{mfr_id}")
async def get(mfr_id: str, user: dict = Depends(get_current_user)):
    return await ManufacturerService.get(mfr_id, user["site_id"])


@router.post("/")
async def create(data: dict, user: dict = Depends(get_current_user)):
    return await ManufacturerService.create(data, user["site_id"])


@router.put("/{mfr_id}")
async def update(mfr_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await ManufacturerService.update(mfr_id, data, user["site_id"])
