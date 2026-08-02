from typing import Optional
from datetime import datetime
from beanie import Document

class CustomerComplaint(Document):
    complaint_id: str; client_id: str; site_id: str
    identification_no: str; description: str
    received_date: Optional[datetime] = None; issue_no: Optional[str] = None
    po_wo_number: Optional[str] = None; root_cause: Optional[str] = None
    proposed_action: Optional[str] = None; action_by: Optional[str] = None
    closing_date: Optional[datetime] = None; remarks: Optional[str] = None
    complaint_mode: Optional[str] = None; complaint_type: Optional[str] = None
    status: str = "open"; responsible_party: Optional[str] = None
    is_active: bool = True; created_by: Optional[str] = None
    created_at: datetime = datetime.now(); updated_at: datetime = datetime.now()
    class Settings: name = "complaints"
