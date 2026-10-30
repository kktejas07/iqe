"""What IQE may say about itself, and which line of business a job is in.

The workflow document is explicit: IQE is certified to ISO 9001:2015 and
claims **no accreditation**. Records were stamped with an "ISO/IEC 17020:2026"
protocol and the AI prompts described IQE as "accredited", which asserts on
client-facing documents something the business does not hold. Everything that
makes a statement about IQE's standing now comes from here, so there is one
place to change on the day an accreditation is actually granted.

Two rules, kept together because they are the same kind of rule:

* The accreditation mark appears only when IQE holds an accreditation
  (`holds_accreditation`), only on a Part B job, and only for work inside the
  accredited scope. Part A (manpower) and Part C (project support) never
  carry it - on those lines IQE is supplying people or support, not
  inspecting.
* Part A / B / C are the document's definitions: A manpower or secondment,
  B inspection, C EPC project support. The code had Part A as "TPI/accredited"
  and a separate MANPOWER value, so A was inverted and then duplicated.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

from core.config import settings

QMS_STATEMENT = "ISO 9001:2015 certified quality management system"
INSPECTION_PROTOCOL = "IQE Quality Inspection Protocol (" + QMS_STATEMENT + ")"
BODY_DESCRIPTION = "an independent third-party inspection organisation operating a " + QMS_STATEMENT


class ServiceLine(str, Enum):
    PART_A = "PART_A"  # manpower / secondment
    PART_B = "PART_B"  # inspection
    PART_C = "PART_C"  # EPC project support


#: Values stored before the definitions were corrected.
_LEGACY = {"MANPOWER": ServiceLine.PART_A, "SECONDMENT": ServiceLine.PART_A}

LABELS = {
    ServiceLine.PART_A: "Part A - manpower / secondment",
    ServiceLine.PART_B: "Part B - inspection",
    ServiceLine.PART_C: "Part C - EPC project support",
}


def normalise_service_line(value: Optional[str]) -> ServiceLine:
    """Map a stored or submitted value onto the corrected vocabulary."""
    if value is None or str(value).strip() == "":
        return ServiceLine.PART_B
    key = str(value).strip().upper()
    if key in _LEGACY:
        return _LEGACY[key]
    try:
        return ServiceLine(key)
    except ValueError:
        raise ValueError(
            f"service_line must be PART_A (manpower), PART_B (inspection) or "
            f"PART_C (project support); got {value!r}"
        )


def holds_accreditation() -> bool:
    return bool(getattr(settings, "iqe_holds_accreditation", False))


def accreditation_mark(service_line: Optional[str], in_accredited_scope: bool = False) -> dict:
    """Whether the mark may appear, and why not when it may not."""
    line = normalise_service_line(service_line)
    if not holds_accreditation():
        return {"permitted": False, "reason": "IQE holds no accreditation; the mark may not be shown"}
    if line is not ServiceLine.PART_B:
        return {"permitted": False, "reason": f"{LABELS[line]} never carries the accreditation mark"}
    if not in_accredited_scope:
        return {"permitted": False, "reason": "work is outside the accredited scope"}
    return {"permitted": True, "reason": None}
