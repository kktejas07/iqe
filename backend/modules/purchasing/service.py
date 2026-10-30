from typing import Optional
from fastapi import HTTPException
from core.audit import AuditAction, record as audit
from core.sequences import next_identifier
from modules.purchasing import statutory as st
from modules.purchasing.models import PurchaseRequisition, VendorPayment
from datetime import datetime, timedelta


class PurchasingService:

    # --- Requisitions ---

    @staticmethod
    async def list_requisitions(
        site_id: str = "SITE-01",
        status: str = "",
        vendor_type: str = "",
        page: int = 1,
        per_page: int = 50,
    ):
        query: dict = {"site_id": site_id}
        if status:
            query["status"] = status
        if vendor_type:
            query["vendor_type"] = vendor_type

        total = await PurchaseRequisition.find(query).count()
        items = (
            await PurchaseRequisition.find(query)
            .sort(-PurchaseRequisition.created_at)
            .skip((page - 1) * per_page)
            .limit(per_page)
            .to_list()
        )
        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "data": [r.dict() for r in items],
        }

    @staticmethod
    async def get_requisition(requisition_id: str, site_id: str = "SITE-01"):
        r = await PurchaseRequisition.find_one(
            PurchaseRequisition.requisition_id == requisition_id,
            PurchaseRequisition.site_id == site_id,
        )
        if not r:
            raise HTTPException(404, "Purchase requisition not found")
        return r.dict()

    @staticmethod
    async def create_requisition(data: dict, site_id: str, user_id: str):
        if not data.get("requisition_id"):
            total = await PurchaseRequisition.find_all().count()
            data["requisition_id"] = f"PRQ-2026-{(total + 1):04d}"

        data["site_id"] = site_id
        data["created_by"] = user_id
        data["requested_by"] = data.get("requested_by", user_id)

        if data.get("is_msme") and not data.get("msme_due_date"):
            data["msme_due_date"] = datetime.now() + timedelta(days=45)

        req = PurchaseRequisition(**data)
        await req.insert()

        await audit(
            "purchase_requisition", req.requisition_id, AuditAction.CREATE,
            actor={"user_id": user_id}, site_id=site_id,
        )
        return req.dict()

    @staticmethod
    async def approve_requisition(requisition_id: str, data: dict, site_id: str, user_id: str):
        r = await PurchaseRequisition.find_one(
            PurchaseRequisition.requisition_id == requisition_id,
            PurchaseRequisition.site_id == site_id,
        )
        if not r:
            raise HTTPException(404, "Purchase requisition not found")

        r.status = "approved"
        r.approved_by = data.get("approved_by", user_id)
        r.approved_on = datetime.now()
        r.updated_at = datetime.now()
        await r.save()

        await audit(
            "purchase_requisition", requisition_id, AuditAction.UPDATE,
            actor={"user_id": user_id}, site_id=site_id,
            note="Approved",
        )
        return r.dict()

    @staticmethod
    async def reject_requisition(requisition_id: str, data: dict, site_id: str, user_id: str):
        r = await PurchaseRequisition.find_one(
            PurchaseRequisition.requisition_id == requisition_id,
            PurchaseRequisition.site_id == site_id,
        )
        if not r:
            raise HTTPException(404, "Purchase requisition not found")

        r.status = "rejected"
        r.rejection_reason = data.get("reason", "")
        r.updated_at = datetime.now()
        await r.save()
        return r.dict()

    # --- Vendor payments ---

    @staticmethod
    async def list_vendor_payments(
        site_id: str = "SITE-01",
        vendor_type: str = "",
        status: str = "",
        page: int = 1,
        per_page: int = 50,
    ):
        query: dict = {"site_id": site_id}
        if vendor_type:
            query["vendor_type"] = vendor_type
        if status:
            query["status"] = status

        total = await VendorPayment.find(query).count()
        items = (
            await VendorPayment.find(query)
            .sort(-VendorPayment.created_at)
            .skip((page - 1) * per_page)
            .limit(per_page)
            .to_list()
        )
        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "data": [v.dict() for v in items],
        }

    @staticmethod
    async def create_vendor_payment(data: dict, site_id: str, user_id: str):
        """Record a vendor bill with its GST, TDS and (for micro and small
        enterprises) its MSMED Act due date worked out here.

        The tax figures are computed, never typed: a hand-entered TDS amount
        that differs from the computed one is refused.
        """
        from core.config import settings

        data = dict(data)
        for k in ("vp_id", "net_payable", "gst_total", "cgst", "sgst", "igst", "tds_rate_pct",
                  "tm_approved", "tm_approved_by", "status", "paid_date", "created_by"):
            data.pop(k, None)
        typed_tds = data.pop("tds_deducted", None)

        taxable = float(data.get("taxable_value") or data.get("amount") or 0)
        if taxable <= 0:
            raise HTTPException(422, "taxable_value (the amount before GST) must be greater than zero")
        pan = (data.get("pan") or "").strip().upper() or None
        if pan and not st.valid_pan(pan):
            raise HTTPException(422, f"PAN {pan} is not a valid PAN")
        gstin = (data.get("gstin") or "").strip().upper() or None
        reverse = bool(data.get("reverse_charge", False))
        gst = st.gst_split(taxable, float(data.get("gst_rate_pct") or 0), gstin,
                           settings.iqe_gstin, reverse_charge=reverse)
        invoice_total = round(taxable + (0.0 if reverse else gst["gst_total"]), 2)

        # Cumulative to this vendor this financial year, for the threshold.
        fy_start, fy_end = st.financial_year(datetime.now())
        prior_q: dict = {"site_id": site_id, "created_at": {"$gte": fy_start, "$lt": fy_end},
                         "status": {"$ne": "cancelled"}}
        if pan:
            prior_q["pan"] = pan
        else:
            prior_q["vendor_name"] = data.get("vendor_name")
        prior = await VendorPayment.find(prior_q).to_list()
        section = (data.get("tds_section") or "NONE")
        same = [p for p in prior if (p.tds_section or "NONE").upper() == str(section).upper()]
        tds = st.tds_for(
            section, taxable, pan,
            prior_in_fy=sum(p.taxable_value for p in same),
            prior_tds_in_fy=sum(p.tds_deducted for p in same),
            lower_rate_pct=data.get("lower_rate_pct"), lower_cert_ref=data.get("lower_cert_ref"),
        )
        if typed_tds not in (None, 0, 0.0) and abs(float(typed_tds) - tds["tds"]) > 0.5:
            raise HTTPException(
                409, f"TDS on this bill is {tds['tds']:,.2f} ({tds['rate_pct']}% under {tds['section']}), "
                     f"not the {float(typed_tds):,.2f} entered. Tax is computed, not typed.")

        msme = {}
        if data.get("is_msme"):
            cat = (data.get("msme_category") or "").lower()
            if cat not in ("micro", "small", "medium"):
                raise HTTPException(422, "msme_category must be micro, small or medium")
            if not st.valid_udyam(data.get("udyam_number")):
                raise HTTPException(422, "A valid Udyam registration number is required (UDYAM-XX-00-0000000)")
            if cat in ("micro", "small"):
                accepted = data.get("acceptance_date")
                if not accepted:
                    raise HTTPException(
                        422, "acceptance_date (when the goods or services were accepted) is required "
                             "for a micro or small enterprise; the 45 days run from it")
                if isinstance(accepted, str):
                    accepted = datetime.fromisoformat(accepted)
                data["acceptance_date"] = accepted
                msme["due_date"] = st.msme_due_date(accepted, data.get("written_agreement_days"))

        data["due_date"] = msme.get("due_date") or data.get("due_date")
        data.update(
            vp_id=await next_identifier(VendorPayment, "vp_id", site_id, "VP"),
            site_id=site_id, created_by=user_id, pan=pan, gstin=gstin,
            taxable_value=taxable, amount=invoice_total, reverse_charge=reverse,
            gst_rate_pct=float(data.get("gst_rate_pct") or 0),
            cgst=gst["cgst"], sgst=gst["sgst"], igst=gst["igst"], gst_total=gst["gst_total"],
            tds_section=tds["section"], tds_deducted=tds["tds"], tds_rate_pct=tds["rate_pct"],
            tds_note=tds.get("note") or tds.get("reason"),
            net_payable=round(invoice_total - tds["tds"], 2),
        )
        vp = VendorPayment(**data)
        await vp.insert()
        await audit(
            "vendor_payment", vp.vp_id, AuditAction.CREATE,
            actor={"user_id": user_id}, site_id=site_id,
            context={"taxable": taxable, "gst": gst["gst_total"], "tds": tds["tds"],
                     "rules_as_of": st.RULES_AS_OF},
        )
        return vp.dict()

    @staticmethod
    async def approve_vendor_payment(vp_id: str, data: dict, site_id: str, user: dict):
        from core.auth import Role
        from core.identity import own_identifiers, person_id_of

        vp = await VendorPayment.find_one(
            VendorPayment.vp_id == vp_id, VendorPayment.site_id == site_id,
        )
        if not vp:
            raise HTTPException(404, "Vendor payment not found")
        if vp.status != "pending":
            raise HTTPException(409, f"A {vp.status} vendor payment cannot be approved")
        if int(user.get("role_id") or 0) not in (int(Role.ADMIN), int(Role.TECHNICAL_MANAGER)):
            raise HTTPException(403, "Vendor payments are approved by the Technical Manager or management.")
        if vp.created_by and vp.created_by in await own_identifiers(user):
            raise HTTPException(403, "You entered this payment and cannot approve it.")

        who = await person_id_of(user)
        vp.tm_approved = True
        vp.tm_approved_by = who          # the logged-in person, never a name from the request
        vp.approved_by = user.get("user_id")
        vp.tm_approved_on = datetime.now()
        vp.status = "approved"
        vp.updated_at = datetime.now()
        await vp.save()
        await audit("vendor_payment", vp_id, AuditAction.AUTHORIZE,
                    actor={"user_id": user.get("user_id")}, site_id=site_id)
        return vp.dict()

    @staticmethod
    async def pay_vendor(vp_id: str, data: dict, site_id: str, user: dict):
        from core.config import settings

        vp = await VendorPayment.find_one(
            VendorPayment.vp_id == vp_id, VendorPayment.site_id == site_id,
        )
        if not vp:
            raise HTTPException(404, "Vendor payment not found")
        if vp.status == "paid":
            raise HTTPException(409, "This vendor payment has already been paid")
        if vp.status != "approved":
            raise HTTPException(409, f"A {vp.status} vendor payment cannot be paid; it must be approved first")
        if vp.approved_by and vp.approved_by == user.get("user_id"):
            raise HTTPException(403, "You approved this payment; a different person releases the money.")

        vp.paid_date = datetime.now()
        vp.paid_by = user.get("user_id")
        vp.payment_mode = data.get("payment_mode", "NEFT")
        vp.payment_ref = data.get("payment_ref")
        vp.status = "paid"
        if vp.tds_deducted:
            vp.tds_deposit_due = st.tds_deposit_due(vp.paid_date)

        if vp.is_msme and vp.due_date and vp.msme_category in ("micro", "small"):
            # s.15 / s.43B(h): paid within the due date, which already carries
            # the 45-day (or 15-day) limit from acceptance.
            late = st.msme_interest(vp.net_payable + vp.tds_deducted, vp.due_date, vp.paid_date,
                                    settings.rbi_bank_rate_pct)
            vp.msme_45day_compliant = late["late_days"] == 0
            vp.msme_late_days = late["late_days"]
            vp.msme_interest = late["interest"]
            vp.msme_interest_note = late.get("note")

        vp.updated_at = datetime.now()
        await vp.save()
        await audit("vendor_payment", vp_id, AuditAction.UPDATE,
                    actor={"user_id": user.get("user_id")}, site_id=site_id,
                    after={"status": "paid", "tds": vp.tds_deducted, "msme_late_days": vp.msme_late_days})
        return vp.dict()

    @staticmethod
    async def msme_alerts(site_id: str = "SITE-01"):
        now = datetime.now()
        approaching = await VendorPayment.find(
            VendorPayment.site_id == site_id,
            VendorPayment.is_msme == True,
            VendorPayment.status.is_in(["pending", "approved"]),
        ).to_list()

        alerts = []
        for vp in approaching:
            if vp.due_date:
                days_remaining = (vp.due_date - now).days
                if days_remaining <= 45:
                    alerts.append({
                        "vp_id": vp.vp_id,
                        "vendor_name": vp.vendor_name,
                        "amount": vp.net_payable,
                        "due_date": vp.due_date.isoformat() if vp.due_date else None,
                        "days_remaining": days_remaining,
                        "severity": "critical" if days_remaining <= 7 else "warning" if days_remaining <= 20 else "info",
                    })
        return {"total": len(alerts), "data": sorted(alerts, key=lambda x: x["days_remaining"])}
