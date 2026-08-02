from __future__ import annotations
from typing import Optional
from datetime import datetime
from beanie import Document
from pydantic import BaseModel


class ChargeItem(BaseModel):
    sno: Optional[int] = None; category: str; description: str
    uom: Optional[str] = None; rate: float = 0.0; amount: float = 0.0


class AnnexureItem(BaseModel):
    visit_id: str; inspector_name: Optional[str] = None
    po_number: Optional[str] = None; visit_date: Optional[datetime] = None
    mileage_cost: float = 0.0; food_allowance: float = 0.0
    travel_fare: float = 0.0; hotel: float = 0.0
    service_charge: float = 0.0; other_expenses: float = 0.0
    total: float = 0.0; remarks: Optional[str] = None


class Invoice(Document):
    invoice_id: str; job_id: str; site_id: str
    status: str = "draft"
    client_id: Optional[str] = None; client_name: Optional[str] = None
    invoice_type: str = "customer"
    invoice_number: str; invoice_date: Optional[datetime] = None
    visit_ids: list[str] = []
    consolidated_charges: list[ChargeItem] = []
    annexure: list[AnnexureItem] = []
    subtotal: float = 0.0; cgst: float = 0.0; sgst: float = 0.0
    igst: float = 0.0; tds: float = 0.0; grand_total: float = 0.0
    gst_percentage: float = 0.0
    pdf_path: Optional[str] = None
    frozen: bool = False
    cancelled: bool = False; cancellation_reason: Optional[str] = None
    cancelled_by: Optional[str] = None; cancelled_on: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings: name = "invoices"
