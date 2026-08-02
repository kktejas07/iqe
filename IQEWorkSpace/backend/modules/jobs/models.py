from __future__ import annotations
from typing import Optional
from datetime import datetime
from beanie import Document


class Job(Document):
    job_id: str; site_id: str; status: str = "draft"
    client_id: Optional[str] = None; client_name: Optional[str] = None
    client_unit_id: Optional[str] = None
    title: str; description: Optional[str] = None
    job_type: str = "inspection"; po_number: Optional[str] = None
    budget: float = 0.0; currency: str = "INR"
    requested_start: Optional[datetime] = None
    requested_end: Optional[datetime] = None
    location_address: Optional[str] = None
    requires_qc: bool = True; requires_finance: bool = True
    tags: list[str] = []
    created_by: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings: name = "jobs"
