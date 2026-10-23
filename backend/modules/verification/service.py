"""Public scan-to-verify: does this document exist, and is it in force.

What was here before was not verification. The /verify page read seven fields
out of the URL query string and rendered them under IQE branding with a green
"Scanned from an IQE report" badge, querying nothing. Anyone could type

    /verify?t=Inspection+Release+Note&ref=IRN-2026-9999&status=Issued

and get a page indistinguishable from a genuine scan. The short-link registry
behind /v/<code> was real, but nothing forced arrival through it and the page
could not tell the two apart.

So the question this module answers is the only one worth asking at a QR
code: **IQE, do you stand behind this document right now?** The answer comes
from the database or it is "no".

Three constraints shape the response:

**Minimal disclosure.** This endpoint is open to the internet and a reference
on a certificate is not a secret, so the answer says whether the document is
real and in force - and almost nothing else. No values, no rates, no
deductions, no personnel. A verification page that leaked the certified value
of a bill would be a commercial problem handed to whoever scanned it.

**One shape for every answer.** A reference that does not exist gets the same
response shape as one that does, so the endpoint cannot be used to work out
which reference formats are real by watching what changes.

**Caution by default.** The public wording comes from a table, not from the
raw status, because "superseded" tells a layperson nothing about whether to
rely on the paper in their hand. Anything not plainly in force says so.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Optional

from modules.certifications.models import (
    NOT_IN_FORCE,
    PUBLIC_MEANING,
    Certification,
    CertificationStatus,
)

#: Accepted reference shapes. Not a security control - it keeps obviously
#: malformed input out of the query layer and bounds the length.
REFERENCE_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9/_-]{2,63}$")

ISSUING_BODY = "Ideal Quality Engineers (I) Pvt Ltd"


def _unknown(reference: str) -> dict:
    """The answer for anything not found, in the same shape as a hit.

    Deliberately not an error: a 404 with a different body teaches an
    enumerator which references exist.
    """
    return {
        "found": False,
        "reference": reference,
        "in_force": False,
        "status": None,
        "meaning": (
            "No IQE document with this reference was found. If you are holding "
            "a document that shows it, treat the document as unverified and "
            "contact IQE."
        ),
        "document_type": None,
        "title": None,
        "issued_on": None,
        "client": None,
        "issuing_body": ISSUING_BODY,
        "checked_at": datetime.now(),
    }


async def _find_certification(reference: str, site_id: Optional[str]) -> Optional[Any]:
    query = {"certification_id": reference}
    if site_id:
        query["site_id"] = site_id
    return await Certification.find_one(query)


async def _find_tpi_report(reference: str, site_id: Optional[str]) -> Optional[Any]:
    from modules.tpi.models import TpiReport

    query = {"report_no": reference}
    if site_id:
        query["site_id"] = site_id
    return await TpiReport.find_one(query)


async def _find_control_number(reference: str, site_id: Optional[str]) -> Optional[Any]:
    from modules.control_numbers.models import ControlNumber

    query = {"control_number": reference}
    if site_id:
        query["site_id"] = site_id
    return await ControlNumber.find_one(query)


#: TpiReport statuses that mean the document is a live, issued one. Anything
#: else - a draft, a superseded revision - is not something to rely on.
TPI_IN_FORCE = {"ISSUED", "SIGNED"}

TPI_MEANING = {
    "DRAFT": "Not issued. This is not a valid IQE report.",
    "SUBMITTED": "Submitted for review but not yet issued. Do not rely on it.",
    "SIGNED": "Signed and in force.",
    "ISSUED": "Issued and in force.",
    "SUPERSEDED": "Replaced by a later revision. Ask the holder for the current one.",
}


class VerificationService:
    @staticmethod
    async def verify(reference: str, site_id: Optional[str] = None) -> dict:
        """Look a reference up and say whether IQE stands behind it."""
        reference = (reference or "").strip()
        if not REFERENCE_PATTERN.match(reference):
            return _unknown(reference[:64])

        cert = await _find_certification(reference, site_id)
        if cert is not None:
            return VerificationService._from_certification(cert)

        report = await _find_tpi_report(reference, site_id)
        if report is not None:
            return VerificationService._from_tpi_report(report)

        control = await _find_control_number(reference, site_id)
        if control is not None:
            return VerificationService._from_control_number(control)

        return _unknown(reference)

    # Each shaper returns the same keys. The public contract is the shape, so
    # a new document type cannot quietly start disclosing a different set of
    # fields.

    @staticmethod
    def _from_certification(cert: Certification) -> dict:
        status = cert.status
        in_force = status not in NOT_IN_FORCE and status != CertificationStatus.DISPUTED
        meaning = PUBLIC_MEANING.get(status, "Status unclear. Contact IQE.")
        # A suspension or withdrawal reason is IQE's internal reasoning and
        # may name people or commercial terms, so the public answer says that
        # it is not in force without saying why.
        return {
            "found": True,
            "reference": cert.certification_id,
            "in_force": in_force,
            "status": status,
            "meaning": meaning,
            "document_type": "Inspection certification",
            "title": f"Certification {cert.certification_id}"
                     + (f" rev {cert.revision_no}" if cert.revision_no else ""),
            "issued_on": cert.certified_at,
            "client": None,
            "issuing_body": ISSUING_BODY,
            "checked_at": datetime.now(),
        }

    @staticmethod
    def _from_tpi_report(report: Any) -> dict:
        status = (report.status or "").upper()
        return {
            "found": True,
            "reference": report.report_no,
            "in_force": status in TPI_IN_FORCE,
            "status": status,
            "meaning": TPI_MEANING.get(status, "Status unclear. Contact IQE."),
            "document_type": f"{report.form_code} inspection report",
            "title": report.report_no,
            "issued_on": getattr(report, "created_at", None),
            "client": None,
            "issuing_body": ISSUING_BODY,
            "checked_at": datetime.now(),
        }

    @staticmethod
    def _from_control_number(control: Any) -> dict:
        active = bool(getattr(control, "is_active", True))
        return {
            "found": True,
            "reference": control.control_number,
            "in_force": active,
            "status": "active" if active else "inactive",
            "meaning": (
                "This control number is live."
                if active
                else "This control number has been reassigned or closed. "
                     "Ask the holder for the current one."
            ),
            "document_type": "Inspection control number",
            "title": control.control_number,
            "issued_on": getattr(control, "created_at", None),
            # Printed on the document the holder already has, so disclosing it
            # back to them reveals nothing, and it is what makes the answer
            # checkable against the paper rather than merely reassuring.
            "client": getattr(control, "client_name", None),
            "issuing_body": ISSUING_BODY,
            "checked_at": datetime.now(),
        }
