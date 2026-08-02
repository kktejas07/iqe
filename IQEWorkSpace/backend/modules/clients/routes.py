from fastapi import APIRouter, Depends
from core.auth import get_current_user
from modules.clients.service import ClientService

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("/")
async def list_clients(search: str = "", page: int = 1, per_page: int = 25, user: dict = Depends(get_current_user)):
    return await ClientService.list(user["site_id"], search, page, per_page)


@router.get("/{client_id}")
async def get_client(client_id: str, user: dict = Depends(get_current_user)):
    return await ClientService.get(client_id, user["site_id"])


@router.post("/")
async def create_client(data: dict, user: dict = Depends(get_current_user)):
    return await ClientService.create(data, user["site_id"])


@router.put("/{client_id}")
async def update_client(client_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await ClientService.update(client_id, data, user["site_id"])
