from fastapi import HTTPException
from modules.clients.models import Client, ClientUnit
from datetime import datetime


class ClientService:

    @staticmethod
    async def list(site_id: str, search: str = "", page: int = 1, per_page: int = 25):
        query = {"site_id": site_id}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"code": {"$regex": search, "$options": "i"}},
                {"client_id": {"$regex": search, "$options": "i"}},
            ]
        total = await Client.find(query).count()
        items = await Client.find(query).skip((page - 1) * per_page).limit(per_page).sort(-Client.created_at).to_list()
        return {"total": total, "page": page, "per_page": per_page, "data": [c.dict() for c in items]}

    @staticmethod
    async def get(client_id: str, site_id: str):
        client = await Client.find_one(Client.client_id == client_id, Client.site_id == site_id)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        units = await ClientUnit.find(ClientUnit.client_id == client_id).to_list()
        return {**client.dict(), "units": [u.dict() for u in units]}

    @staticmethod
    async def create(data: dict, site_id: str):
        if not data.get("client_id"):
            total_clients = await Client.find_all().count()
            data["client_id"] = f"C-{(total_clients + 1):03d}"
        
        existing = await Client.find_one(Client.client_id == data["client_id"])
        if existing:
            raise HTTPException(status_code=400, detail="Client ID already exists")
        client = Client(**data, site_id=site_id)
        await client.insert()
        return client

    @staticmethod
    async def update(client_id: str, data: dict, site_id: str):
        client = await Client.find_one(Client.client_id == client_id, Client.site_id == site_id)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        for k, v in data.items():
            if hasattr(client, k) and k not in ("client_id", "site_id", "created_at"):
                setattr(client, k, v)
        client.updated_at = datetime.now()
        await client.save()
        return client
