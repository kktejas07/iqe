from typing import Optional
from fastapi import HTTPException
from core.audit import AuditAction, record as audit
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

        return {"total": total, "page": page, "per_page": per_page, "data": [c.dict() for c in items]}

    @staticmethod
    async def get(complaint_id: str, site_id: str = "SITE-01"):
        c = await CustomerComplaint.find_one(CustomerComplaint.complaint_id == complaint_id, CustomerComplaint.site_id == site_id)
        if not c:
            raise HTTPException(status_code=404, detail="Customer Complaint not found")
        return c.dict()

    @staticmethod
    async def create(data: dict, site_id: str, user_id: str):
        if not data.get("complaint_id"):
            total_cmps = await CustomerComplaint.find_all().count()
            data["complaint_id"] = f"CMP-2026-{(total_cmps + 1):03d}"

        existing = await CustomerComplaint.find_one(CustomerComplaint.complaint_id == data["complaint_id"], CustomerComplaint.site_id == site_id)
        if existing:
            raise HTTPException(status_code=400, detail="Complaint ID already exists")

        c = CustomerComplaint(**data, site_id=site_id, created_by=user_id)
        await c.insert()
        return c

    @staticmethod
    async def update(complaint_id: str, data: dict):
        c = await CustomerComplaint.find_one(CustomerComplaint.complaint_id == complaint_id, CustomerComplaint.site_id == site_id)
        if not c:
            raise HTTPException(status_code=404, detail="Customer Complaint not found")

        for k, v in data.items():
            if hasattr(c, k) and k not in ("complaint_id", "site_id", "created_at", "created_by"):
                setattr(c, k, v)

        c.updated_at = datetime.now()
        await c.save()
        return c

    #: A complaint's severity is evidence of how bad a recurrence would be.
    #: Likelihood is not inferred - it defaults to "it has happened once and
    #: could again" and the person raising it adjusts, because only they know
    #: whether this was a one-off or the third time this quarter.
    SEVERITY_IMPACT = {"Critical": 5, "Major": 4, "Minor": 2}

    @staticmethod
    async def escalate_to_risk(
        complaint_id: str, payload: dict, site_id: str = "SITE-01",
        user_id: str = "USR-001",
    ):
        """Raise the preventive half of a complaint as a risk.

        ISO/IEC 17020:2026 abolished preventive action in favour of risk
        management, which leaves a gap rather than closing one: a complaint
        still records what fixed the instance, and "stop it recurring" has
        nowhere to live unless it lands in the register with an owner, a
        review date and a place in the audit plan.

        The complaint is evidence that the thing can happen, so the risk it
        raises carries that provenance in `source` - a register entry with no
        traceable origin tends to be one invented for the assessor.
        """
        from modules.risk.service import RiskService

        # The document, not ComplaintService.get() - that returns a dict, and
        # this needs to save a field back.
        complaint = await CustomerComplaint.find_one(
            CustomerComplaint.complaint_id == complaint_id,
            CustomerComplaint.site_id == site_id,
        )
        if not complaint:
            raise HTTPException(404, f"Complaint {complaint_id} not found")
        if complaint.raised_risk_id:
            raise HTTPException(
                409,
                f"{complaint_id} already raised {complaint.raised_risk_id}. "
                f"Review that risk rather than raising a second one for the "
                f"same cause.",
            )

        description = (payload.get("description") or "").strip()
        if not description:
            # Not defaulted to the complaint text: the complaint says what
            # happened once, and a risk has to say what could happen again.
            # Copying one into the other produces a register of incidents.
            raise HTTPException(
                400,
                "Say what could recur and what it would mean. The complaint "
                "describes what happened once; a risk describes what could "
                "happen again, which is a different sentence.",
            )
        owner = (payload.get("owner") or complaint.action_by or "").strip()
        if not owner:
            raise HTTPException(400, "The risk needs an owner")

        impact = int(
            payload.get("inherent_impact")
            or ComplaintService.SEVERITY_IMPACT.get(complaint.severity, 3)
        )
        likelihood = int(payload.get("inherent_likelihood") or 3)

        risk = await RiskService.create(
            {
                "title": payload.get("title") or f"Recurrence: {complaint.description[:60]}",
                "description": description,
                "category": payload.get("category") or "OPERATIONAL",
                "source": f"Complaint {complaint_id}",
                "owner": owner,
                "treatment": payload.get("treatment") or "MITIGATE",
                "inherent_likelihood": likelihood,
                "inherent_impact": impact,
                "residual_likelihood": int(
                    payload.get("residual_likelihood") or likelihood
                ),
                "residual_impact": int(payload.get("residual_impact") or impact),
                "related_entity_type": "complaint",
                "related_entity_id": complaint_id,
            },
            site_id, user_id,
        )

        complaint.raised_risk_id = risk["risk_id"]
        complaint.updated_at = datetime.now()
        await complaint.save()

        await audit(
            "complaint", complaint_id, AuditAction.UPDATE,
            actor={"user_id": user_id}, site_id=site_id,
            note=f"Preventive action raised as risk {risk['risk_id']}",
            context={"risk_id": risk["risk_id"], "severity": complaint.severity},
        )
        return {"risk": risk, "complaint_id": complaint_id}

    @staticmethod
    async def toggle_status(complaint_id: str, is_active: bool, site_id: str = "SITE-01"):
        c = await CustomerComplaint.find_one(CustomerComplaint.complaint_id == complaint_id, CustomerComplaint.site_id == site_id)
        if not c:
            raise HTTPException(status_code=404, detail="Customer Complaint not found")
        c.is_active = is_active
        if not is_active:
            c.status = "closed"
            c.closing_date = datetime.now()
        c.updated_at = datetime.now()
        await c.save()
        return c
