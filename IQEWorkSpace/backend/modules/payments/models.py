from typing import Optional
from datetime import datetime
from beanie import Document

class Payment(Document):
    payment_id: str; invoice_id: str; site_id: str
    payment_mode: str; receipt_number: Optional[str] = None
    payment_date: Optional[datetime] = None; challan_number: Optional[str] = None
    amount: float = 0.0; is_credit_note: bool = False
    comments: Optional[str] = None; created_by: Optional[str] = None
    created_at: datetime = datetime.now()
    class Settings: name = "payments"
