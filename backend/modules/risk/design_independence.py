"""Independence check for equipment-design engagements (workflow step D1).

IQE inspects equipment for clients. Designing the same equipment - or
something that competes with an item IQE inspected - would mean marking its
own work, so the workflow narrows what IQE may do:

* conflicted (IQE inspected the item, or it is a similar/competitive item):
  design is **refused**; IQE may only *appraise* the client's design, as an
  inspection (Part B) engagement;
* not conflicted: design is a project-support (Part C) engagement.

The conflict facts are supplied by the person raising the engagement and
recorded with the decision; this module does not guess them from job titles.
"""
from __future__ import annotations

from typing import Optional

from fastapi import HTTPException

from core.claims import LABELS, ServiceLine

DESIGN = "DESIGN"
APPRAISAL = "APPRAISAL"


def decide(
    requested: str,
    *,
    inspected_by_iqe: bool,
    similar_competitive: bool,
    item: Optional[str] = None,
) -> dict:
    requested = (requested or "").strip().upper()
    if requested not in (DESIGN, APPRAISAL):
        raise HTTPException(422, "requested must be DESIGN or APPRAISAL")

    reasons = []
    if inspected_by_iqe:
        reasons.append("IQE has inspected this item")
    if similar_competitive:
        reasons.append("it is similar to, or competes with, an item IQE inspected")
    conflicted = bool(reasons)

    if conflicted:
        permitted, line = APPRAISAL, ServiceLine.PART_B
    else:
        permitted, line = requested, (
            ServiceLine.PART_C if requested == DESIGN else ServiceLine.PART_B
        )

    out = {
        "item": item,
        "requested": requested,
        "conflicted": conflicted,
        "permitted_engagement": permitted,
        "service_line": line.value,
        "service_line_label": LABELS[line],
        "reason": ("; ".join(reasons) + ": IQE may appraise the client's design but not produce one"
                   if conflicted else "No inspection conflict recorded"),
        "allowed": requested == permitted,
    }
    return out


def enforce(requested: str, **facts) -> dict:
    """decide(), refusing when the request itself is not permitted."""
    out = decide(requested, **facts)
    if not out["allowed"]:
        raise HTTPException(
            409,
            f"Design is not permitted: {out['reason']}. "
            f"Raise it as an appraisal under {out['service_line_label']}.",
        )
    return out
