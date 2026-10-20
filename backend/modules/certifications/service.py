from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException

from modules.certifications.models import (
    Certification,
    CertificationLineItem,
    CertificationStatus,
    DeductionReason,
)
from modules.work_packages.models import WorkPackage
from modules.work_packages.service import WorkPackageService
from modules.work_types.models import WorkTypeDefinition

VALID_DEDUCTION_REASONS = {r.value for r in DeductionReason}


async def _next_certification_id(site_id: str) -> str:
    year = datetime.now().year
    prefix = f"CERT-{year}-"
    latest = (
        await Certification.find(
            Certification.site_id == site_id,
            {"certification_id": {"$regex": f"^{prefix}"}},
        )
        .sort(-Certification.certification_id)
        .limit(1)
        .to_list()
    )
    seq = 1
    if latest:
        try:
            seq = int(latest[0].certification_id.rsplit("-", 1)[1]) + 1
        except (IndexError, ValueError):
            seq = await Certification.find(Certification.site_id == site_id).count() + 1
    return f"{prefix}{seq:04d}"


def _round2(v: float) -> float:
    return round(v + 0.0, 2)


def compute_totals(
    line_items: list[CertificationLineItem], retention_pct: float = 0.0
) -> dict:
    """Roll line items into certification totals.

    Pure arithmetic, deliberately free of the ODM so it can be reasoned about and
    tested on its own - this is the money calculation, and it should not need a
    database connection to verify.

    Note on deductions: the deduction value is the arithmetic gap between claimed
    and certified. Deduction lines explain that gap; they do not subtract from it
    again, or the same money would be deducted twice.
    """
    claimed_qty = certified_qty = 0.0
    claimed_val = certified_val = 0.0

    for li in line_items:
        claimed_qty += li.claimed_quantity
        certified_qty += li.certified_quantity
        claimed_val += li.claimed_quantity * li.rate
        certified_val += li.certified_quantity * li.rate

    certified_value = _round2(certified_val)
    retention_value = _round2(certified_value * (retention_pct / 100.0))

    return {
        "claimed_quantity": round(claimed_qty, 4),
        "certified_quantity": round(certified_qty, 4),
        "rejected_quantity": round(claimed_qty - certified_qty, 4),
        "claimed_value": _round2(claimed_val),
        "certified_value": certified_value,
        "deduction_value": _round2(claimed_val - certified_val),
        "retention_value": retention_value,
        "net_payable_value": _round2(certified_value - retention_value),
    }


def recalculate(cert: Certification) -> Certification:
    """Write computed totals onto the document.

    Stored rather than computed on read: a certification is a financial record,
    so its figures must stay fixed even if a rate master changes afterwards.
    """
    for field, value in compute_totals(cert.line_items, cert.retention_pct).items():
        setattr(cert, field, value)
    return cert


def _validate_lines(line_items: list[dict]) -> None:
    for i, li in enumerate(line_items, start=1):
        claimed = float(li.get("claimed_quantity") or 0)
        certified = float(li.get("certified_quantity") or 0)
        rate = float(li.get("rate") or 0)
        if claimed < 0 or certified < 0 or rate < 0:
            raise HTTPException(400, f"Line {i}: quantities and rate cannot be negative")
        if certified > claimed:
            raise HTTPException(
                400,
                f"Line {i}: certified quantity ({certified}) cannot exceed claimed ({claimed}). "
                "Certify an extra item as its own line or approved variation.",
            )


def _validate_deductions(deductions: list[dict]) -> None:
    for d in deductions:
        code = d.get("reason_code")
        if code not in VALID_DEDUCTION_REASONS:
            raise HTTPException(
                400,
                f"Invalid deduction reason_code '{code}'. "
                f"Expected one of: {sorted(VALID_DEDUCTION_REASONS)}",
            )


class CertificationService:

    @staticmethod
    async def list(
        site_id: str = "SITE-01",
        work_package_id: str = "",
        job_id: str = "",
        status: str = "",
        unbilled_only: bool = False,
        page: int = 1,
        per_page: int = 100,
    ):
        query: dict = {"site_id": site_id}
        if work_package_id:
            query["work_package_id"] = work_package_id
        if job_id:
            query["job_id"] = job_id
        if status:
            query["status"] = status
        if unbilled_only:
            query["status"] = CertificationStatus.ISSUED.value
            query["billed_invoice_id"] = None

        total = await Certification.find(query).count()
        items = (
            await Certification.find(query)
            .sort(-Certification.created_at)
            .skip((page - 1) * per_page)
            .limit(per_page)
            .to_list()
        )
        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "data": [i.model_dump(exclude={"id"}) for i in items],
        }

    @staticmethod
    async def get(certification_id: str, site_id: str = "SITE-01") -> Certification:
        cert = await Certification.find_one(
            Certification.certification_id == certification_id,
            Certification.site_id == site_id,
        )
        if not cert:
            raise HTTPException(404, f"Certification '{certification_id}' not found")
        return cert

    @staticmethod
    async def create(data: dict, site_id: str = "SITE-01", user_id: str = "USR-001"):
        wp_id = data.get("work_package_id")
        if not wp_id:
            raise HTTPException(400, "work_package_id is required")

        wp = await WorkPackage.find_one(
            WorkPackage.work_package_id == wp_id, WorkPackage.site_id == site_id
        )
        if not wp:
            raise HTTPException(400, f"Work package '{wp_id}' not found")

        line_items = data.get("line_items") or []
        _validate_lines(line_items)
        _validate_deductions(data.get("deductions") or [])

        data["site_id"] = site_id
        data["job_id"] = wp.job_id
        data["created_by"] = user_id
        data["prepared_by"] = data.get("prepared_by") or user_id
        data["currency"] = data.get("currency") or wp.currency
        data["certification_id"] = data.get("certification_id") or await _next_certification_id(site_id)
        data["status"] = CertificationStatus.DRAFT.value
        data["revision_no"] = 0

        cert = Certification(**data)
        recalculate(cert)
        await cert.insert()
        return cert

    @staticmethod
    async def update(certification_id: str, data: dict, site_id: str = "SITE-01"):
        cert = await CertificationService.get(certification_id, site_id)
        if cert.status != CertificationStatus.DRAFT.value:
            raise HTTPException(
                409,
                f"Certification {certification_id} is {cert.status} and cannot be edited. "
                "Raise a revision instead.",
            )

        if "line_items" in data:
            _validate_lines(data["line_items"])
        if "deductions" in data:
            _validate_deductions(data["deductions"])

        for immutable in (
            "certification_id", "site_id", "job_id", "work_package_id", "status",
            "revision_no", "created_by", "created_at", "billed_invoice_id", "billed_at", "id",
        ):
            data.pop(immutable, None)

        for key, value in data.items():
            if key == "line_items":
                cert.line_items = [CertificationLineItem(**li) for li in value]
            elif hasattr(cert, key):
                setattr(cert, key, value)

        recalculate(cert)
        cert.updated_at = datetime.now()
        await cert.save()
        return cert

    @staticmethod
    async def issue(
        certification_id: str,
        certified_by_person_id: str,
        site_id: str = "SITE-01",
        user_id: str = "USR-001",
    ):
        """Issue the certification and move its work package to certified.

        Separating who prepared from who certified keeps the two-person control
        the RBAC matrix assumes. Whether the performing inspector may certify
        their own measurement is open decision 3 in the architecture; until that
        is settled this only records both identities rather than enforcing a
        split.
        """
        cert = await CertificationService.get(certification_id, site_id)
        if cert.status != CertificationStatus.DRAFT.value:
            raise HTTPException(409, f"Only a draft can be issued; this one is {cert.status}")
        if not cert.line_items:
            raise HTTPException(400, "Cannot issue a certification with no line items")

        cert.status = CertificationStatus.ISSUED.value
        cert.certified_by_person_id = certified_by_person_id
        cert.certified_at = datetime.now()
        cert.updated_at = datetime.now()
        recalculate(cert)
        await cert.save()

        # Move the package to certified if the lifecycle allows it from here.
        wp = await WorkPackage.find_one(
            WorkPackage.work_package_id == cert.work_package_id,
            WorkPackage.site_id == site_id,
        )
        if wp and wp.status == "under_qc":
            await WorkPackageService.transition(
                wp.work_package_id, "certified", site_id, user_id,
                f"certification {cert.certification_id} issued",
            )
        return cert

    @staticmethod
    async def revise(
        certification_id: str,
        data: dict,
        site_id: str = "SITE-01",
        user_id: str = "USR-001",
    ):
        """Supersede an issued certification with a new revision.

        The original is kept and marked superseded rather than edited, so the
        figures a client was shown at the time remain recoverable.
        """
        original = await CertificationService.get(certification_id, site_id)
        if original.status == CertificationStatus.SUPERSEDED.value:
            raise HTTPException(409, "That certification has already been superseded")
        if original.billed_invoice_id:
            raise HTTPException(
                409,
                f"Certification {certification_id} is billed on {original.billed_invoice_id}. "
                "Credit the invoice before revising.",
            )

        line_items = data.get("line_items", [li.model_dump() for li in original.line_items])
        _validate_lines(line_items)
        _validate_deductions(data.get("deductions") or [])

        payload = original.model_dump(exclude={"id"})
        payload.update(data)
        payload.update({
            "certification_id": await _next_certification_id(site_id),
            "revision_no": original.revision_no + 1,
            "supersedes_certification_id": original.certification_id,
            "status": CertificationStatus.DRAFT.value,
            "certified_by_person_id": None,
            "certified_at": None,
            "billed_invoice_id": None,
            "billed_at": None,
            "created_by": user_id,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        })
        payload["line_items"] = line_items

        revision = Certification(**payload)
        recalculate(revision)
        await revision.insert()

        original.status = CertificationStatus.SUPERSEDED.value
        original.updated_at = datetime.now()
        await original.save()

        return revision

    @staticmethod
    async def dispute(certification_id: str, note: str, site_id: str = "SITE-01"):
        cert = await CertificationService.get(certification_id, site_id)
        if cert.status != CertificationStatus.ISSUED.value:
            raise HTTPException(409, f"Only an issued certification can be disputed; this one is {cert.status}")
        if not (note or "").strip():
            raise HTTPException(400, "A dispute needs a note explaining what is contested")
        cert.status = CertificationStatus.DISPUTED.value
        cert.dispute_note = note.strip()
        cert.updated_at = datetime.now()
        await cert.save()
        return cert

    @staticmethod
    async def mark_billed(
        certification_id: str, invoice_id: str, site_id: str = "SITE-01"
    ):
        """Consume a certification into an invoice. Guards double billing."""
        cert = await CertificationService.get(certification_id, site_id)
        if cert.status != CertificationStatus.ISSUED.value:
            raise HTTPException(
                409,
                f"Certification {certification_id} is {cert.status}. Only an issued "
                "certification can be billed.",
            )
        if cert.billed_invoice_id:
            raise HTTPException(
                409,
                f"Already billed on invoice {cert.billed_invoice_id}.",
            )
        cert.billed_invoice_id = invoice_id
        cert.billed_at = datetime.now()
        cert.updated_at = datetime.now()
        await cert.save()
        return cert

    @staticmethod
    async def billing_eligibility(work_package_id: str, site_id: str = "SITE-01"):
        """Can this work package be invoiced yet?

        Answers the question the billing gate asks: the work type decides whether
        certification is required at all, and if so there must be an issued,
        unbilled certification.
        """
        wp = await WorkPackage.find_one(
            WorkPackage.work_package_id == work_package_id,
            WorkPackage.site_id == site_id,
        )
        if not wp:
            raise HTTPException(404, f"Work package '{work_package_id}' not found")

        wt = await WorkTypeDefinition.find_one(
            WorkTypeDefinition.work_type_code == wp.work_type_code,
            WorkTypeDefinition.site_id == site_id,
        )
        requires_cert = bool(wt.certification_required_before_billing) if wt else True

        issued = await Certification.find(
            Certification.work_package_id == work_package_id,
            Certification.site_id == site_id,
            Certification.status == CertificationStatus.ISSUED.value,
        ).to_list()
        unbilled = [c for c in issued if not c.billed_invoice_id]

        if not requires_cert:
            return {
                "work_package_id": work_package_id,
                "eligible": True,
                "requires_certification": False,
                "reason": "This work type bills without certification.",
                "billable_value": 0.0,
                "certification_ids": [],
            }

        if not unbilled:
            return {
                "work_package_id": work_package_id,
                "eligible": False,
                "requires_certification": True,
                "reason": (
                    "No issued certification is waiting to be billed."
                    if not issued
                    else "Every issued certification here is already billed."
                ),
                "billable_value": 0.0,
                "certification_ids": [],
            }

        return {
            "work_package_id": work_package_id,
            "eligible": True,
            "requires_certification": True,
            "reason": f"{len(unbilled)} certification(s) issued and not yet billed.",
            "billable_value": _round2(sum(c.net_payable_value for c in unbilled)),
            "certification_ids": [c.certification_id for c in unbilled],
        }

    @staticmethod
    async def summary(site_id: str = "SITE-01", job_id: str = ""):
        """Certified value position - including certified-but-unbilled."""
        query: dict = {"site_id": site_id}
        if job_id:
            query["job_id"] = job_id
        certs = await Certification.find(query).to_list()

        issued = [c for c in certs if c.status == CertificationStatus.ISSUED.value]
        unbilled = [c for c in issued if not c.billed_invoice_id]
        billed = [c for c in issued if c.billed_invoice_id]
        disputed = [c for c in certs if c.status == CertificationStatus.DISPUTED.value]

        claimed_total = sum(c.claimed_value for c in issued)
        certified_total = sum(c.certified_value for c in issued)

        return {
            "total_certifications": len(certs),
            "draft": len([c for c in certs if c.status == CertificationStatus.DRAFT.value]),
            "issued": len(issued),
            "disputed": len(disputed),
            "superseded": len([c for c in certs if c.status == CertificationStatus.SUPERSEDED.value]),
            "claimed_value": _round2(claimed_total),
            "certified_value": _round2(certified_total),
            "deduction_value": _round2(claimed_total - certified_total),
            "deduction_pct": round((claimed_total - certified_total) / claimed_total * 100, 2)
            if claimed_total
            else 0.0,
            "certified_not_billed_value": _round2(sum(c.net_payable_value for c in unbilled)),
            "certified_not_billed_count": len(unbilled),
            "billed_value": _round2(sum(c.net_payable_value for c in billed)),
            "retention_held": _round2(sum(c.retention_value for c in issued)),
        }

    @staticmethod
    async def deduction_reasons():
        return {"deduction_reasons": sorted(VALID_DEDUCTION_REASONS)}
