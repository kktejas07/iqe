from __future__ import annotations
from typing import Optional
from datetime import datetime
from beanie import Document
from pydantic import BaseModel


class POItemDetail(BaseModel):
    po_item_id: str; item_no: int; description: str
    quantity: float = 0.0; uom: Optional[str] = None
    inspection_activity: Optional[str] = None
    number_of_visits: Optional[int] = None
    rate: float = 0.0; amount: float = 0.0; remarks: Optional[str] = None


class PurchaseOrder(Document):
    po_id: str; job_id: str; site_id: str
    po_number: str; po_date: Optional[datetime] = None
    client_id: Optional[str] = None; client_name: Optional[str] = None
    manufacturer_id: Optional[str] = None; manufacturer_name: Optional[str] = None
    comments: Optional[str] = None
    items: list[POItemDetail] = []
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings: name = "purchase_orders"
