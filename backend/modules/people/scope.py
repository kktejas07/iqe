"""Authorisation by scope (H8) and whether it is still in force (H10).

A person is authorised for the service lines on their authorisation records
(Part A/B/C, expediting, vendor assessment, asset integrity, equipment design,
training), only while a record is current: authorised, not past its valid-until
date, and not overdue its annual review. The Job Register check at step 5 and
every other gate that asks "may this person do this work" goes through here, so
there is one answer instead of five slightly different ones.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException

from core.claims import ServiceLine, normalise_service_line

#: Records made before service lines existed covered inspection only.
LEGACY_LINES = {ServiceLine.PART_B.value}


def lines_of(auth) -> set[str]:
    declared = {normalise_service_line(x).value for x in (auth.service_lines or [])}
    return declared or set(LEGACY_LINES)


def currency(auth, now: Optional[datetime] = None) -> tuple[bool, Optional[str]]:
    """(in force, why not)."""
    now = now or datetime.now()
    if auth.status != "authorized":
        return False, f"authorisation is {auth.status}"
    if auth.valid_until and auth.valid_until <= now:
        return False, f"authorisation lapsed on {auth.valid_until:%d %b %Y}"
    if auth.next_surveillance_due and auth.next_surveillance_due <= now:
        return False, (f"annual review was due {auth.next_surveillance_due:%d %b %Y}; "
                       "it is not in force until renewed")
    return True, None


async def resolve_person_id(key: Optional[str], site_id: str) -> Optional[str]:
    """People are identified by person id, employee code or inspector code
    depending on which screen created the record."""
    if not key:
        return None
    from modules.auth.models import UserLogin
    from modules.people.models import Person

    p = await Person.find_one({"person_id": key, "site_id": site_id})
    if p:
        return p.person_id
    p = await Person.find_one({"employee_code": key, "site_id": site_id})
    if p:
        return p.person_id
    u = await UserLogin.find_one({"$or": [{"inspector_code": key}, {"employee_code": key},
                                          {"user_id": key}]})
    if u and u.employee_code:
        p = await Person.find_one({"person_id": u.employee_code, "site_id": site_id})
        if not p:
            p = await Person.find_one({"employee_code": u.employee_code, "site_id": site_id})
        return p.person_id if p else u.employee_code
    return None


async def records(person_id: str, site_id: str) -> list:
    from modules.people.models import Authorization

    return await Authorization.find({"person_id": person_id, "site_id": site_id}).to_list()


async def current_records(person_id: str, site_id: str, now: Optional[datetime] = None) -> list:
    return [a for a in await records(person_id, site_id) if currency(a, now)[0]]


async def merged(person_id: str, site_id: str, now: Optional[datetime] = None) -> Optional[dict]:
    """One view of everything a person is currently authorised for: the union
    of their current records. The earliest expiry governs, so work is never
    planned past the first lapse."""
    cur = await current_records(person_id, site_id, now)
    if not cur:
        return None
    base = cur[0].model_dump()
    base["inspection_types"] = sorted({t for a in cur for t in (a.inspection_types or [])})
    base["service_lines"] = sorted({ln for a in cur for ln in lines_of(a)})
    expiries = [a.valid_until for a in cur if a.valid_until]
    base["valid_until"] = min(expiries) if expiries else None
    return base


async def check_line(person_key: str, line: Optional[str], site_id: str,
                     now: Optional[datetime] = None) -> dict:
    """Non-raising answer for screens: the Job Register's flag."""
    line = normalise_service_line(line).value
    pid = await resolve_person_id(person_key, site_id)
    if not pid:
        return {"authorised": False, "person_id": None, "service_line": line,
                "reason": f"{person_key} has no person record, so no authorisation"}
    allrecs = await records(pid, site_id)
    cur = [a for a in allrecs if currency(a, now)[0]]
    if not cur:
        why = "; ".join(sorted({currency(a, now)[1] for a in allrecs if currency(a, now)[1]})) \
            or "no authorisation on record"
        return {"authorised": False, "person_id": pid, "service_line": line, "reason": why}
    covered = {ln for a in cur for ln in lines_of(a)}
    if line not in covered:
        return {"authorised": False, "person_id": pid, "service_line": line,
                "reason": f"authorised for {', '.join(sorted(covered))}, not {line}"}
    return {"authorised": True, "person_id": pid, "service_line": line, "reason": None}


async def require_line(person_key: str, line: Optional[str], site_id: str,
                       what: str = "this work") -> str:
    res = await check_line(person_key, line, site_id)
    if not res["authorised"]:
        raise HTTPException(
            409, f"{person_key} is not authorised for {what} ({res['service_line']}): {res['reason']}. "
                 "Authorisation is by scope and renewed every year.")
    return res["person_id"]
