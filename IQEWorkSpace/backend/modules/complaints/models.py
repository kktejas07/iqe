from __future__ import annotations
from typing import Optional
from datetime import datetime
from beanie import Document


class CustomerComplaint(Document):
    complaint_id: str  # e.g. CMP-2026-001
    site_id: str = "SITE-01"
    identification_no: Optional[str] = None  # Complaint Ref Identification No
    
    # Client / Customer Details & Unit Sites
    client_id: Optional[str] = None
    customer_name: Optional[str] = None
    client_unit_id: Optional[str] = None
    client_unit_name: Optional[str] = None
    
    # Supplier / Manufacturer Details & Vendor Sites
    manufacturer_id: Optional[str] = None
    manufacturer_name: Optional[str] = None
    manufacturer_unit_id: Optional[str] = None
    manufacturer_unit_name: Optional[str] = None
    
    equipment_name: Optional[str] = None  # Equipment Name / Defect Item
    job_tag_no: Optional[str] = None      # Job / Tag / Equipment Offered Qty
    po_wo_number: Optional[str] = None     # Customer PO / WO Number
    
    received_date: Optional[datetime] = None
    closing_date: Optional[datetime] = None
    severity: str = "Major"               # Critical, Major, Minor
    
    description: str                       # Detailed Complaint / Grievance Description
    root_cause: Optional[str] = None       # Root Cause Analysis (RCA)
    proposed_action: Optional[str] = None  # Corrective & Preventive Action (CAPA)
    action_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    remarks: Optional[str] = None
    
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    
    complaint_mode: Optional[str] = "Email"    # Email, Official Letter, Inspection Audit, Site Call
    complaint_type: Optional[str] = "Quality"  # Quality, Dimensional, Delay, NDT Defect, Documentation
    status: str = "open"                       # open, in_progress, capa_implemented, closed
    responsible_party: Optional[str] = None
    is_active: bool = True
    
    created_by: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        name = "complaints"
