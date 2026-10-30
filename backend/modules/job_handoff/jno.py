"""The J.No: one identity from order to invoice.

Format `{region}-{FY}-{NNNN}`, e.g. `S-2627-0001`. The workflow's rule about
*when a new one is opened* is the part that matters:

* A new PO, a renewal, or a new financial year for the same client, region and
  work **stays under the existing J.No**. The Job Trail, inter-office
  settlement and the authorisation check all hang off it, so splitting one
  relationship across several J.Nos breaks all three.
* A new project, a new site, a new client or a new scope **opens a new J.No**.

A request that contradicts the rule is refused rather than quietly obeyed:
reusing a J.No for a different client would attach one client's invoices to
another's trail.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from fastapi import HTTPException

from core.sequences import next_value

#: Continue under the existing J.No.
REUSE_TRIGGERS = {"NEW_PO", "RENEWAL", "NEW_YEAR"}
#: Open a new J.No.
NEW_TRIGGERS = {"NEW_PROJECT", "NEW_SITE", "NEW_CLIENT", "NEW_SCOPE"}

_REGION = re.compile(r"^[A-Z]{1,3}$")
_J_NO = re.compile(r"^(?P<region>[A-Z]{1,3})-(?P<fy>\d{4})-(?P<seq>\d{4,})$")


def financial_year_code(now: Optional[datetime] = None) -> str:
    """'2627' for April 2026 - March 2027."""
    now = now or datetime.now()
    start = now.year if now.month >= 4 else now.year - 1
    return f"{str(start)[-2:]}{str(start + 1)[-2:]}"


def parse(j_no: str) -> dict:
    m = _J_NO.match(j_no or "")
    if not m:
        raise HTTPException(422, f"{j_no!r} is not a J.No (expected e.g. S-2627-0001)")
    return m.groupdict()


def normalise_region(region: Optional[str]) -> str:
    code = (region or "").strip().upper()
    if not _REGION.match(code):
        raise HTTPException(422, "region_code is required to allocate a J.No (e.g. N, S, E, W)")
    return code


async def allocate(region: str, site_id: str, now: Optional[datetime] = None) -> str:
    region = normalise_region(region)
    fy = financial_year_code(now)
    seq = await next_value(f"{site_id}:JNO:{region}-{fy}", seed=0)
    return f"{region}-{fy}-{seq:04d}"


def check_trigger(trigger: Optional[str]) -> str:
    t = (trigger or "NEW_PROJECT").strip().upper()
    if t not in REUSE_TRIGGERS | NEW_TRIGGERS:
        raise HTTPException(
            422,
            f"trigger must be one of {sorted(REUSE_TRIGGERS | NEW_TRIGGERS)}; got {trigger!r}",
        )
    return t


def check_reuse(trigger: str, existing_job, client_id: Optional[str], region: str) -> None:
    """Refuse a reuse that the rule does not allow."""
    if existing_job is None:
        raise HTTPException(
            404, f"{trigger} continues an existing J.No; existing_j_no was not found"
        )
    if client_id and existing_job.client_id and existing_job.client_id != client_id:
        raise HTTPException(
            409,
            f"J.No {existing_job.j_no} belongs to another client; a different client "
            "opens a new J.No (trigger NEW_CLIENT)",
        )
    if parse(existing_job.j_no)["region"] != region:
        raise HTTPException(
            409,
            f"J.No {existing_job.j_no} is a {parse(existing_job.j_no)['region']} region job; "
            f"work in region {region} opens a new J.No",
        )
