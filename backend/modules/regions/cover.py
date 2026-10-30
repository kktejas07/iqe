"""Absence cover: who stands in for a post, and until when.

The workflow's matrix (IC, TM, RH, BD, recruiter absent) is recorded as
DeputyCoverage rows arranged by management. This answers one question for the
gates that need it: is this caller the arranged deputy for that post, in that
region, right now?
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from core.identity import own_identifiers


async def covering(user: dict, absent_role: str, region_code: Optional[str]) -> bool:
    if not region_code:
        return False
    from modules.regions.models import DeputyCoverage

    ids = await own_identifiers(user)
    now = datetime.now()
    rows = await DeputyCoverage.find(
        {"region_code": region_code.upper(), "absent_role": absent_role.upper(),
         "is_active": True}
    ).to_list()
    return any(
        r.deputy_person_id in ids
        and r.valid_from <= now
        and (r.valid_until is None or r.valid_until > now)
        for r in rows
    )
