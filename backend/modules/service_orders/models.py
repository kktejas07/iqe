from __future__ import annotations
from typing import Optional
from datetime import datetime
from beanie import Document
from pydantic import BaseModel, Field


class POItem(BaseModel):
    description: str; quantity: float = 0.0
    uom: Optional[str] = None; inspection_activity: Optional[str] = None
    number_of_visits: Optional[int] = None
    rate: float = 0.0; amount: float = 0.0; remarks: Optional[str] = None


class ServiceOrder(Document):
    so_id: str; job_id: str; site_id: str; status: str = "active"
    client_id: Optional[str] = None; client_name: Optional[str] = None
    client_unit_id: Optional[str] = None
    manufacturer_id: Optional[str] = None; manufacturer_name: Optional[str] = None
    manufacturer_unit_id: Optional[str] = None
    so_type: str = "SO"; so_number: str
    so_date: Optional[datetime] = None; due_date: Optional[datetime] = None
    amount: float = 0.0; currency: str = "INR"
    po_items: list[POItem] = []
    project_number: Optional[str] = None; project_name: Optional[str] = None
    comments: Optional[str] = None
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings: name = "service_orders"
