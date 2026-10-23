"""Endpoints for the commercial envelope and its amendments."""
from fastapi import APIRouter, Body, Depends

from core.auth import get_current_user
from modules.commercial.service import CommercialService

router = APIRouter(prefix="/commercial", tags=["commercial"])


def _ctx(user: dict) -> tuple[str, str]:
    return user.get("site_id", "SITE-01"), user.get("user_id", "USR-001")


# ------------------------------------------------------------------ envelope

@router.get("/orders/{so_id}/state")
async def order_state(so_id: str, user: dict = Depends(get_current_user)):
    """Where this order stands against its ceiling and its period."""
    site_id, _ = _ctx(user)
    state = await CommercialService.state(so_id, site_id)
    return state.model_dump()


@router.put("/orders/{so_id}/terms")
async def set_terms(
    so_id: str, data: dict = Body(...), user: dict = Depends(get_current_user)
):
    site_id, user_id = _ctx(user)
    return await CommercialService.set_terms(so_id, data, site_id, user_id)


@router.get("/orders/{so_id}/can-draw")
async def can_draw(
    so_id: str, amount: float = 0.0, user: dict = Depends(get_current_user)
):
    """Whether work of this value may be raised against the order."""
    site_id, _ = _ctx(user)
    return await CommercialService.check_draw(so_id, amount, site_id)


@router.post("/orders/{so_id}/successor")
async def successor(
    so_id: str, data: dict = Body(default={}),
    user: dict = Depends(get_current_user),
):
    """A draft new order for new scope from the same client."""
    site_id, user_id = _ctx(user)
    return await CommercialService.propose_successor(so_id, data, site_id, user_id)


# ---------------------------------------------------------------- amendments

@router.get("/amendments")
async def list_amendments(
    so_id: str = "", status: str = "", user: dict = Depends(get_current_user)
):
    site_id, _ = _ctx(user)
    return await CommercialService.list_amendments(so_id, site_id, status)


@router.post("/amendments")
async def propose(data: dict = Body(...), user: dict = Depends(get_current_user)):
    site_id, user_id = _ctx(user)
    return await CommercialService.propose(data, site_id, user_id)


@router.get("/amendments/{amendment_id}")
async def get_amendment(
    amendment_id: str, user: dict = Depends(get_current_user)
):
    site_id, _ = _ctx(user)
    record = await CommercialService.get_amendment(amendment_id, site_id)
    return record.model_dump(exclude={"id"})


@router.post("/amendments/{amendment_id}/approve")
async def approve(
    amendment_id: str, data: dict = Body(default={}),
    user: dict = Depends(get_current_user),
):
    site_id, user_id = _ctx(user)
    return await CommercialService.approve(amendment_id, data, site_id, user_id)


@router.post("/amendments/{amendment_id}/reject")
async def reject(
    amendment_id: str, data: dict = Body(default={}),
    user: dict = Depends(get_current_user),
):
    site_id, user_id = _ctx(user)
    return await CommercialService.reject(amendment_id, data, site_id, user_id)


# --------------------------------------------------------------------- sweep

@router.get("/sweep")
async def sweep(user: dict = Depends(get_current_user)):
    """Renewals due, extensions indicated, ceilings breached, value at risk."""
    site_id, _ = _ctx(user)
    return await CommercialService.sweep(site_id)
