from __future__ import annotations
from typing import Optional
from datetime import datetime
from beanie import Document
from pydantic import BaseModel


class Reassignment(BaseModel):
    old_control_number_id: str; new_control_number_id: str
    changed_by: str; reason: Optional[str] = None; changed_on: datetime = datetime.now()


class ControlNumber(Document):
    control_number_id: str; job_id: str; so_id: str; site_id: str
    control_number: str; equipment_name: Optional[str] = None
    client_id: Optional[str] = None; client_name: Optional[str] = None
    manufacturer_id: Optional[str] = None; manufacturer_name: Optional[str] = None
    location: Optional[str] = None; work_scope: Optional[str] = None
    po_item_ids: list[str] = []
    is_active: bool = True
    reassignment_history: list[Reassignment] = []
    created_by: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings: name = "control_numbers"
