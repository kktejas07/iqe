from __future__ import annotations
from typing import Optional
from datetime import datetime
from beanie import Document
from pydantic import BaseModel, Field

class EnquiryCategory(BaseModel):
    enquiry_category_id: str; sno: Optional[int] = None; details: str
    scope: Optional[str] = None; uom: Optional[str] = None
    qty: float = 0.0; applicable_codes: Optional[str] = None
    qualification: Optional[str] = None; experience: Optional[str] = None
    duration: Optional[str] = None; budget: float = 0.0; remarks: Optional[str] = None

class Enquiry(Document):
    enquiry_id: str; client_id: str; site_id: str
    enquiry_date: Optional[datetime] = None; category: Optional[str] = None
    quotation_no: Optional[str] = None; status: str = "pending"
    proposal_owner: Optional[str] = None
    categories: list[EnquiryCategory] = []
    is_active: bool = True; created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now); updated_at: datetime = Field(default_factory=datetime.now)
    class Settings: name = "enquiries"
