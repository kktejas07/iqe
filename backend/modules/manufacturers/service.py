from typing import Optional
from fastapi import HTTPException
from modules.manufacturers.models import Manufacturer, ManufacturerUnit
from datetime import datetime


class ManufacturerService:

    @staticmethod
    async def list(site_id: str, search: str = "", alpha: str = "", is_active: Optional[bool] = None, page: int = 1, per_page: int = 100):
        query = {"site_id": site_id}
        if is_active is not None:
            query["is_active"] = is_active
        if alpha and alpha.upper() != "ALL":
            query["name"] = {"$regex": f"^{alpha}", "$options": "i"}
        if search:
            search_query = {
                "$or": [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"code": {"$regex": search, "$options": "i"}},
                    {"manufacturer_id": {"$regex": search, "$options": "i"}},
                    {"equipment_category": {"$regex": search, "$options": "i"}},
                    {"city": {"$regex": search, "$options": "i"}},
                ]
            }
            if "name" in query:
                alpha_regex = query.pop("name")
                query["$and"] = [
                    {"name": alpha_regex},
                    search_query
                ]
            else:
                query.update(search_query)

        total = await Manufacturer.find(query).count()
        items = await Manufacturer.find(query).skip((page - 1) * per_page).limit(per_page).sort(-Manufacturer.created_at).to_list()
        
        results = [{**m.dict(), "total_units": m.total_units or 0} for m in items]
        return {"total": total, "page": page, "per_page": per_page, "data": results}

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

        existing = await Manufacturer.find_one(Manufacturer.manufacturer_id == data["manufacturer_id"], Manufacturer.site_id == site_id)
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
        mfr.updated_at = datetime.now()
        await mfr.save()
        return mfr

    @staticmethod
    async def toggle_status(mfr_id: str, is_active: bool, site_id: str):
        mfr = await Manufacturer.find_one(Manufacturer.manufacturer_id == mfr_id, Manufacturer.site_id == site_id)
        if not mfr:
            raise HTTPException(status_code=404, detail="Manufacturer not found")
        mfr.is_active = is_active
        mfr.updated_at = datetime.now()
        await mfr.save()
        return mfr

    @staticmethod
    async def list_units(mfr_id: str, site_id: str, region: str = "", unit_type: str = ""):
        query = {"manufacturer_id": mfr_id}
        if region and region.upper() != "ALL":
            query["region"] = region
        if unit_type and unit_type.upper() != "ALL":
            query["unit_type"] = unit_type
        units = await ManufacturerUnit.find(query).to_list()

        return [u.dict() for u in units]

    @staticmethod
    async def create_unit(mfr_id: str, data: dict, site_id: str):
        mfr = await Manufacturer.find_one(Manufacturer.manufacturer_id == mfr_id, Manufacturer.site_id == site_id)
        if not mfr:
            raise HTTPException(status_code=404, detail="Manufacturer not found")
        
        if not data.get("manufacturer_unit_id"):
            total_u = await ManufacturerUnit.find(ManufacturerUnit.manufacturer_id == mfr_id).count()
            data["manufacturer_unit_id"] = f"{mfr_id}-U{(total_u + 1):02d}"
        
        unit = ManufacturerUnit(**data, manufacturer_id=mfr_id, site_id=site_id)
        await unit.insert()
        
        mfr.total_units = (mfr.total_units or 0) + 1
        await mfr.save()
        return unit
