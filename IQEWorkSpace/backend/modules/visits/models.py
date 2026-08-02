from __future__ import annotations
from typing import Optional
from datetime import datetime
from beanie import Document
from pydantic import BaseModel


class Expense(BaseModel):
    expense_id: str; type: str = "travel"
    description: Optional[str] = None; amount: float = 0.0
    km: Optional[float] = None; currency: str = "INR"
    notes: Optional[str] = None


class Photo(BaseModel):
    photo_id: str; url: str; thumbnail_url: Optional[str] = None
    caption: Optional[str] = None; category: str = "visual"
    ai_tags: list[str] = []; defect_found: Optional[bool] = None
    captured_at: Optional[datetime] = None


class Finding(BaseModel):
    finding_id: str; description: str
    severity: str = "observation"; category: str = "visual"
    photo_ids: list[str] = []; inspector_notes: Optional[str] = None
    ai_suggested: bool = False


class Visit(Document):
    visit_id: str; job_id: str; control_number_id: str
    so_id: str; site_id: str
    status: str = "scheduled"
    planned_date: Optional[datetime] = None
    rfi_date: Optional[datetime] = None
    visited_from: Optional[datetime] = None
    visited_to: Optional[datetime] = None
    inspector_id: Optional[str] = None
    inspector_name: Optional[str] = None
    inspection_report_no: Optional[str] = None
    comments: Optional[str] = None
    expenses: list[Expense] = []
    photos: list[Photo] = []
    findings: list[Finding] = []
    po_item_ids: list[str] = []
    quality_check_status: Optional[str] = None
    quality_check_comments: Optional[str] = None
    quality_check_by: Optional[str] = None
    quality_check_on: Optional[datetime] = None
    finance_status: Optional[str] = None
    finance_comments: Optional[str] = None
    finance_by: Optional[str] = None
    finance_on: Optional[datetime] = None
    is_invoiced: bool = False
    invoice_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings: name = "visits"


class ManufacturerVisitLocation(Document):
    visit_id: str; manufacturer_id: str
    location_details: str; is_sub_manufacturer: bool = False
    sub_manufacturer_details: Optional[str] = None
    contact_no: Optional[str] = None; cost: float = 0.0
    created_at: datetime = datetime.now()
    class Settings: name = "manufacturer_visit_locations"
