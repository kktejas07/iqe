"""Leave and timesheets: approval is managerial, and never on your own record.

Before this, any internal role could approve any leave request - including its
own - because the area was open to every internal role and the approving
endpoint checked nothing about who was calling.
"""
import sys
from datetime import datetime
from pathlib import Path

import pytest
import pytest_asyncio
from beanie import init_beanie
from fastapi import HTTPException
from mongomock_motor import AsyncMongoMockClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.audit import AuditEntry  # noqa: E402
from core.auth import Role  # noqa: E402
from core.sequences import Sequence  # noqa: E402
from modules.auth.models import UserLogin  # noqa: E402
from modules.leave_attendance.models import AttendanceRecord, LeaveRequest, Timesheet  # noqa: E402
from modules.leave_attendance.service import LeaveAttendanceService as S  # noqa: E402

SITE = "SITE-01"


def _patch_mongomock():
    from mongomock_motor import AsyncMongoMockDatabase

    original = AsyncMongoMockDatabase.list_collection_names

    async def patched(self, *args, **kwargs):
        kwargs.pop("authorizedCollections", None)
        kwargs.pop("nameOnly", None)
        return await original(self, *args, **kwargs)

    AsyncMongoMockDatabase.list_collection_names = patched


def _user(uid, role):
    return {"user_id": uid, "role_id": int(role), "site_id": SITE}


INSPECTOR = _user("USR-INSP", Role.INSPECTOR)
OTHER_INSPECTOR = _user("USR-INSP2", Role.INSPECTOR)
TM = _user("USR-TM", Role.TECHNICAL_MANAGER)
COORD = _user("USR-IC", Role.COORDINATOR)
ADMIN = _user("USR-ADM", Role.ADMIN)


@pytest_asyncio.fixture
async def db():
    _patch_mongomock()
    client = AsyncMongoMockClient()
    await init_beanie(
        database=client["leave_test"],
        document_models=[LeaveRequest, AttendanceRecord, Timesheet, UserLogin, AuditEntry, Sequence],
    )
    for uid, code, role in [
        ("USR-INSP", "EMP-INSP", Role.INSPECTOR), ("USR-INSP2", "EMP-INSP2", Role.INSPECTOR),
        ("USR-TM", "EMP-TM", Role.TECHNICAL_MANAGER), ("USR-IC", "EMP-IC", Role.COORDINATOR),
        ("USR-ADM", "EMP-ADM", Role.ADMIN),
    ]:
        await UserLogin(
            user_id=uid, site_id=SITE, login_name=uid.lower(), login_password="x",
            email=f"{uid}@x", full_name=uid, role_id=int(role), employee_code=code,
        ).insert()
    yield client


async def _leave(person="EMP-INSP", by=INSPECTOR, lid="LV-1"):
    return await S.create_leave(
        {"leave_id": lid, "person_id": person, "from_date": datetime(2026, 11, 3),
         "to_date": datetime(2026, 11, 4), "days": 2}, SITE, by)


async def _timesheet(person="EMP-INSP", by=INSPECTOR, tid="TS-1"):
    ts = await S.create_timesheet(
        {"timesheet_id": tid, "person_id": person, "period_month": 10, "period_year": 2026}, SITE, by)
    await S.submit_timesheet(tid, SITE, by.get("user_id"))
    return ts


# ------------------------------------------------------------- leave

@pytest.mark.asyncio
async def test_a_manager_can_approve_someone_elses_leave(db):
    await _leave()
    out = await S.approve_leave("LV-1", SITE, TM)
    assert out.status == "approved" and out.approved_by == "USR-TM"


@pytest.mark.asyncio
async def test_a_colleague_cannot_approve_leave(db):
    await _leave()
    with pytest.raises(HTTPException) as e:
        await S.approve_leave("LV-1", SITE, OTHER_INSPECTOR)
    assert e.value.status_code == 403


@pytest.mark.asyncio
async def test_you_cannot_approve_your_own_leave_even_as_a_manager(db):
    await _leave(person="EMP-TM", by=TM, lid="LV-TM")
    with pytest.raises(HTTPException) as e:
        await S.approve_leave("LV-TM", SITE, TM)
    assert e.value.status_code == 409 and "own" in e.value.detail


@pytest.mark.asyncio
async def test_you_cannot_reject_your_own_leave_either(db):
    await _leave(person="EMP-ADM", by=ADMIN, lid="LV-A")
    with pytest.raises(HTTPException) as e:
        await S.reject_leave("LV-A", SITE, ADMIN)
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_another_manager_can_approve_a_managers_leave(db):
    await _leave(person="EMP-TM", by=TM, lid="LV-TM")
    assert (await S.approve_leave("LV-TM", SITE, ADMIN)).status == "approved"


@pytest.mark.asyncio
async def test_an_inspector_cannot_file_leave_for_someone_else(db):
    with pytest.raises(HTTPException) as e:
        await _leave(person="EMP-INSP2", by=INSPECTOR)
    assert e.value.status_code == 403


@pytest.mark.asyncio
async def test_a_manager_can_file_leave_on_someones_behalf(db):
    out = await _leave(person="EMP-INSP", by=COORD)
    assert out.person_id == "EMP-INSP"


# --------------------------------------------------------- timesheets

@pytest.mark.asyncio
async def test_a_manager_approves_a_timesheet_and_the_owner_cannot(db):
    await _timesheet()
    with pytest.raises(HTTPException) as e:
        await S.approve_timesheet("TS-1", SITE, INSPECTOR)
    assert e.value.status_code == 403
    assert (await S.approve_timesheet("TS-1", SITE, COORD)).status == "approved"


@pytest.mark.asyncio
async def test_a_manager_cannot_approve_their_own_timesheet(db):
    await _timesheet(person="EMP-IC", by=COORD, tid="TS-IC")
    with pytest.raises(HTTPException) as e:
        await S.approve_timesheet("TS-IC", SITE, COORD)
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_an_inspector_cannot_file_a_timesheet_for_someone_else(db):
    with pytest.raises(HTTPException) as e:
        await S.create_timesheet(
            {"timesheet_id": "TS-X", "person_id": "EMP-INSP2", "period_month": 10, "period_year": 2026},
            SITE, INSPECTOR)
    assert e.value.status_code == 403


@pytest.mark.asyncio
async def test_a_login_with_no_person_record_is_still_recognised_by_user_id(db):
    """The anonymous dev admin has no UserLogin row; approving a leave filed
    under its own user id must still count as approving your own."""
    dev = _user("USR-001", Role.ADMIN)
    await S.create_leave(
        {"leave_id": "LV-D", "person_id": "USR-001", "from_date": datetime(2026, 11, 3),
         "to_date": datetime(2026, 11, 3)}, SITE, dev)
    with pytest.raises(HTTPException) as e:
        await S.approve_leave("LV-D", SITE, dev)
    assert e.value.status_code == 409
