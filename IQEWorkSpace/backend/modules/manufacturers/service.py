from fastapi import HTTPException
from modules.manufacturers.models import Manufacturer, ManufacturerUnit
from datetime import datetime


class ManufacturerService:

    @staticmethod
    async def list(site_id: str, search: str = "", page: int = 1, per_page: int = 25):
        query = {"site_id": site_id}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"code": {"$regex": search, "$options": "i"}},
                {"manufacturer_id": {"$regex": search, "$options": "i"}},
            ]
        total = await Manufacturer.find(query).count()
        items = await Manufacturer.find(query).skip((page - 1) * per_page).limit(per_page).sort(-Manufacturer.created_at).to_list()
        return {"total": total, "page": page, "per_page": per_page, "data": [m.dict() for m in items]}

    @staticmethod
    async def get(mfr_id: str, site_id: str):
        mfr = await Manufacturer.find_one(Manufacturer.manufacturer_id == mfr_id, Manufacturer.site_id == site_id)
        if not mfr:
            raise HTTPException(status_code=404, detail="Manufacturer not found")
        units = await ManufacturerUnit.find(ManufacturerUnit.manufacturer_id == mfr_id).to_list()
        return {**mfr.dict(), "units": [u.dict() for u in units]}

    @staticmethod
    async def create(data: dict, site_id: str):
        if not data.get("manufacturer_id"):
            total_mfrs = await Manufacturer.find_all().count()
            data["manufacturer_id"] = f"M-{(total_mfrs + 1):03d}"

        existing = await Manufacturer.find_one(Manufacturer.manufacturer_id == data["manufacturer_id"])
        if existing:
            raise HTTPException(status_code=400, detail="Manufacturer ID already exists")
        mfr = Manufacturer(**data, site_id=site_id)
        await mfr.insert()
        return mfr

    @staticmethod
    async def update(mfr_id: str, data: dict, site_id: str):
        mfr = await Manufacturer.find_one(Manufacturer.manufacturer_id == mfr_id, Manufacturer.site_id == site_id)
        if not mfr:
            raise HTTPException(status_code=404, detail="Manufacturer not found")
        for k, v in data.items():
            if hasattr(mfr, k) and k not in ("manufacturer_id", "site_id", "created_at"):
                setattr(mfr, k, v)
        await mfr.save()
        return mfr
