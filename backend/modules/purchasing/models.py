from __future__ import annotations
from typing import Optional
from datetime import datetime
from beanie import Document
from pydantic import BaseModel, Field


class PurchaseItem(BaseModel):
    item_no: int = 1
    description: str
    quantity: float = 1.0
    uom: Optional[str] = None
    rate: float = 0.0
    amount: float = 0.0


class PurchaseRequisition(Document):
    requisition_id: str
    site_id: str = "SITE-01"
    vendor_id: Optional[str] = None
    vendor_name: str
    vendor_type: str = "manufacturer"
    purpose: str
    job_id: Optional[str] = None

    items: list[PurchaseItem] = []
    total_amount: float = 0.0

    requested_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_on: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    status: str = "draft"

    is_msme: bool = False
    msme_registration: Optional[str] = None
    msme_due_date: Optional[datetime] = None

    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "purchase_requisitions"


class VendorPayment(Document):
    vp_id: str
    site_id: str = "SITE-01"
    vendor_id: Optional[str] = None
    vendor_name: str
    vendor_type: str = "manufacturer"
    requisition_id: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[datetime] = None
    job_id: Optional[str] = None

    report_id: Optional[str] = None
    tm_approved: bool = False
    tm_approved_by: Optional[str] = None
    tm_approved_on: Optional[datetime] = None

    #: Invoice total including GST (what the vendor billed).
    amount: float = 0.0
    #: Before GST. TDS is deducted on this, not on the GST charged separately.
    taxable_value: float = 0.0
    pan: Optional[str] = None
    gstin: Optional[str] = None
    gst_rate_pct: float = 0.0
    cgst: float = 0.0
    sgst: float = 0.0
    igst: float = 0.0
    gst_total: float = 0.0
    reverse_charge: bool = False
    tds_deducted: float = 0.0
    tds_section: Optional[str] = "194J"
    tds_rate_pct: float = 0.0
    tds_note: Optional[str] = None
    lower_rate_pct: Optional[float] = None
    lower_cert_ref: Optional[str] = None
    tds_deposit_due: Optional[datetime] = None
    net_payable: float = 0.0

    due_date: Optional[datetime] = None
    paid_date: Optional[datetime] = None
    payment_mode: Optional[str] = None
    payment_ref: Optional[str] = None
    status: str = "pending"

    is_msme: bool = False
    msme_category: Optional[str] = None            # micro | small | medium
    udyam_number: Optional[str] = None
    acceptance_date: Optional[datetime] = None     # of the goods or services
    written_agreement_days: Optional[int] = None
    msme_45day_compliant: bool = True
    msme_late_days: int = 0
    msme_interest: Optional[float] = None
    msme_interest_note: Optional[str] = None

    approved_by: Optional[str] = None
    paid_by: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "vendor_payments"
