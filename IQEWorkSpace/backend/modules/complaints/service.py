from typing import Optional
from fastapi import HTTPException
from modules.complaints.models import CustomerComplaint
from datetime import datetime


class ComplaintService:

    @staticmethod
    async def list(
        site_id: str = "SITE-01", 
        search: str = "", 
        alpha: str = "", 
        is_active: Optional[bool] = None, 
        page: int = 1, 
        per_page: int = 100
    ):
        query = {"site_id": site_id}
        if is_active is not None:
            query["is_active"] = is_active

        if alpha and alpha.upper() != "ALL":
            query["$or"] = [
                {"customer_name": {"$regex": f"^{alpha}", "$options": "i"}},
                {"manufacturer_name": {"$regex": f"^{alpha}", "$options": "i"}},
            ]

        if search:
            search_query = {
                "$or": [
                    {"complaint_id": {"$regex": search, "$options": "i"}},
                    {"identification_no": {"$regex": search, "$options": "i"}},
                    {"customer_name": {"$regex": search, "$options": "i"}},
                    {"manufacturer_name": {"$regex": search, "$options": "i"}},
                    {"po_wo_number": {"$regex": search, "$options": "i"}},
                    {"equipment_name": {"$regex": search, "$options": "i"}},
                    {"job_tag_no": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}},
                    {"root_cause": {"$regex": search, "$options": "i"}},
                ]
            }
            if "$or" in query:
                alpha_query = query.pop("$or")
                query["$and"] = [{"$or": alpha_query}, search_query]
            else:
                query.update(search_query)

        total = await CustomerComplaint.find(query).count()
        items = await CustomerComplaint.find(query).skip((page - 1) * per_page).limit(per_page).sort(-CustomerComplaint.created_at).to_list()

        # Auto-seed if empty so user always sees sample Customer Complaints
        if not items and not search and not alpha and is_active is None:
            sample_cmps = [
                CustomerComplaint(
                    complaint_id="CMP-2026-001",
                    site_id=site_id,
                    identification_no="CID-RIL-901",
                    client_id="C-001",
                    customer_name="Reliance Industries Ltd",
                    client_unit_id="C-001-U01",
                    client_unit_name="Reliance - Unit 1 (Hazira Heavy Fabrication Yard)",
                    manufacturer_id="M-001",
                    manufacturer_name="BHEL Trichy Boilers",
                    manufacturer_unit_id="M-001-U01",
                    manufacturer_unit_name="BHEL - Works 1 (Heavy Forging & Casting Shop)",
                    equipment_name="90 Degree Forged Pipe Elbows (DN150 PN40)",
                    job_tag_no="TAG-ELB-901 / Heat No H-8891",
                    po_wo_number="PO/RIL/2026/094",
                    received_date=datetime(2026, 7, 20),
                    severity="Major",
                    description="Surface pitting observed on bevel end preparation during pre-weld fitup inspection at Hazira yard.",
                    root_cause="Improper protective plastic cap sealing during transit storage resulting in atmospheric moisture exposure.",
                    proposed_action="Re-machining of bevel ends to ASME B16.25 standards under TPI engineer supervision.",
                    action_by="BHEL Quality Team Lead",
                    closing_date=datetime(2026, 7, 28),
                    resolution_notes="Bevel re-machined & 100% PT verified. Inspection Release Note issued.",
                    remarks="CAPA verified and closed satisfactorily.",
                    file_name="NCR_Bevel_Defect_Report.pdf",
                    complaint_mode="Email",
                    complaint_type="Quality",
                    status="closed",
                    is_active=True,
                ),
                CustomerComplaint(
                    complaint_id="CMP-2026-002",
                    site_id=site_id,
                    identification_no="CID-LNT-904",
                    client_id="C-002",
                    customer_name="L&T Heavy Engineering",
                    client_unit_id="C-002-U02",
                    client_unit_name="L&T - Unit 2 (Jamnagar Refinery Expansion Site)",
                    manufacturer_id="M-002",
                    manufacturer_name="Godrej Heavy Engineering",
                    manufacturer_unit_id="M-002-U02",
                    manufacturer_unit_name="Godrej - Works 2 (High Pressure Boiler & Vessel Shop)",
                    equipment_name="High Pressure Seamless Heat Exchanger Tubes",
                    job_tag_no="TAG-TB-102 / Spool S-441",
                    po_wo_number="PO/LNT/2026/441",
                    received_date=datetime(2026, 8, 1),
                    severity="Critical",
                    description="Wall thickness variation detected below minimum ASME Sec VIII Div 1 design tolerance during Eddy Current audit.",
                    root_cause="Tooling calibration drift during final tube drawing pass at manufacturing works.",
                    proposed_action="Hold batch shipment; 100% ultrasonic thickness re-audit for all 250 tubes in batch.",
                    action_by="Godrej Metallurgical Head",
                    remarks="Under investigation by senior TPI metallurgist.",
                    file_name="Eddy_Current_Audit_Deviation.pdf",
                    complaint_mode="Inspection Audit",
                    complaint_type="Dimensional",
                    status="in_progress",
                    is_active=True,
                ),
                CustomerComplaint(
                    complaint_id="CMP-2026-003",
                    site_id=site_id,
                    identification_no="CID-ONGC-910",
                    client_id="C-003",
                    customer_name="ONGC Offshore Project",
                    client_unit_id="C-003-U03",
                    client_unit_name="ONGC - Unit 3 (Chennai Subsea Integration Works)",
                    manufacturer_id="M-003",
                    manufacturer_name="ISGEC Heavy Engineering",
                    manufacturer_unit_id="M-003-U01",
                    manufacturer_unit_name="ISGEC - Works 1 (Heavy Forging & Casting Shop)",
                    equipment_name="Offshore Subsea Manifolds & Valve Assemblies",
                    job_tag_no="TAG-VAL-990 / Skid 03",
                    po_wo_number="PO/ONGC/2026/812",
                    received_date=datetime(2026, 8, 5),
                    severity="Minor",
                    description="Delay in submitting Hydrotest Witnessing Records & Material Test Reports (MTR).",
                    root_cause="Documentation back-log at vendor quality documentation desk.",
                    proposed_action="Deploy dedicated digital document coordinator to expedite MTR compilation.",
                    action_by="ISGEC Documentation Lead",
                    remarks="Draft MTRs received; awaiting final signature stamp.",
                    file_name="MTR_Delay_Notice.pdf",
                    complaint_mode="Official Letter",
                    complaint_type="Documentation",
                    status="open",
                    is_active=True,
                ),
            ]
            for c in sample_cmps:
                try:
                    await c.insert()
                except Exception:
                    pass
            items = sample_cmps
            total = len(sample_cmps)

        return {"total": total, "page": page, "per_page": per_page, "data": [c.dict() for c in items]}

    @staticmethod
    async def get(complaint_id: str):
        c = await CustomerComplaint.find_one(CustomerComplaint.complaint_id == complaint_id)
        if not c:
            raise HTTPException(status_code=404, detail="Customer Complaint not found")
        return c.dict()

    @staticmethod
    async def create(data: dict, site_id: str, user_id: str):
        if not data.get("complaint_id"):
            total_cmps = await CustomerComplaint.find_all().count()
            data["complaint_id"] = f"CMP-2026-{(total_cmps + 1):03d}"

        existing = await CustomerComplaint.find_one(CustomerComplaint.complaint_id == data["complaint_id"])
        if existing:
            raise HTTPException(status_code=400, detail="Complaint ID already exists")

        c = CustomerComplaint(**data, site_id=site_id, created_by=user_id)
        await c.insert()
        return c

    @staticmethod
    async def update(complaint_id: str, data: dict):
        c = await CustomerComplaint.find_one(CustomerComplaint.complaint_id == complaint_id)
        if not c:
            raise HTTPException(status_code=404, detail="Customer Complaint not found")

        for k, v in data.items():
            if hasattr(c, k) and k not in ("complaint_id", "site_id", "created_at", "created_by"):
                setattr(c, k, v)

        c.updated_at = datetime.now()
        await c.save()
        return c

    @staticmethod
    async def toggle_status(complaint_id: str, is_active: bool):
        c = await CustomerComplaint.find_one(CustomerComplaint.complaint_id == complaint_id)
        if not c:
            raise HTTPException(status_code=404, detail="Customer Complaint not found")
        c.is_active = is_active
        if not is_active:
            c.status = "closed"
            c.closing_date = datetime.now()
        c.updated_at = datetime.now()
        await c.save()
        return c
