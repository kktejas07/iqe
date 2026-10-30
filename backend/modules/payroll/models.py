from __future__ import annotations
from typing import Optional
from datetime import datetime
from beanie import Document
from pydantic import Field


class SalaryStructure(Document):
    """What a person is paid, monthly, before attendance.

    Payroll used to give everyone the same hard-coded structure. Pay is a
    per-person fact set by HR, so it is data: append-only, each change
    superseding the last, so a past payslip can be explained.
    """
    structure_id: str                       # SAL-YYYY-NNNN
    person_id: str
    site_id: str = "SITE-01"
    basic: float
    hra: float = 0.0
    conveyance: float = 0.0
    special_allowance: float = 0.0
    other_earnings: float = 0.0
    #: Tax deducted at source each month, as worked out for this person's
    #: declared investments. Not guessed by payroll.
    monthly_tds: float = 0.0
    effective_from: datetime = Field(default_factory=datetime.now)
    status: str = "active"                  # active | superseded
    reason: str
    set_by: str
    superseded_on: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)

    @property
    def gross(self) -> float:
        return self.basic + self.hra + self.conveyance + self.special_allowance + self.other_earnings

    class Settings:
        name = "salary_structures"
        indexes = ["site_id", "person_id", "status"]


class PayrollRun(Document):
    run_id: str  # PR-YYYY-MM
    site_id: str = "SITE-01"
    region_code: Optional[str] = None
    period_month: int
    period_year: int
    status: str = "draft"  # draft, processing, approved, disbursed
    total_gross: float = 0.0
    total_deductions: float = 0.0
    total_net: float = 0.0
    headcount: int = 0
    processed_by: Optional[str] = None
    processed_on: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_on: Optional[datetime] = None
    disbursed_on: Optional[datetime] = None
    remarks: Optional[str] = None
    #: People left out of this run and why (no salary structure, timesheet
    #: not approved). Approval needs these acknowledged, not silently dropped.
    held: list[dict] = []
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "payroll_runs"
        indexes = ["site_id", "period_year", "period_month", "status"]


class Payslip(Document):
    payslip_id: str
    run_id: str
    person_id: str
    site_id: str = "SITE-01"
    period_month: int
    period_year: int
    # Earnings
    basic_salary: float = 0.0
    hra: float = 0.0
    conveyance: float = 0.0
    special_allowance: float = 0.0
    other_earnings: float = 0.0
    gross_salary: float = 0.0
    # Statutory deductions
    pf_employee: float = 0.0
    pf_employer: float = 0.0
    esi_employee: float = 0.0
    esi_employer: float = 0.0
    professional_tax: float = 0.0
    tds: float = 0.0
    other_deductions: float = 0.0
    total_deductions: float = 0.0
    net_salary: float = 0.0
    # Attendance-derived
    days_present: float = 0.0
    days_absent: float = 0.0
    leaves_taken: float = 0.0
    loss_of_pay_days: float = 0.0
    # Payment
    payment_mode: Optional[str] = None
    payment_ref: Optional[str] = None
    paid_on: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "payslips"
        indexes = ["site_id", "run_id", "person_id", "period_year", "period_month"]
