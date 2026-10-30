"""Release is a technical authorisation; audits are not done by your own region.

* recommend: Technical Manager (or arranged TM deputy), or management
* approve: management only, never the person who recommended it
* release: management for Part C; management or the TM for Part B
* nobody in finance, coordination or the client path can release a report
* an auditor holding a post in the region is refused, deputies included
"""
import sys
from datetime import datetime, timedelta
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
from modules.jobs.models import Job  # noqa: E402
from modules.regions.models import DeputyCoverage, Region  # noqa: E402
from modules.regions.service import RegionService  # noqa: E402
from modules.release_notes.models import InspectionReleaseNote  # noqa: E402
from modules.release_notes.service import ReleaseNoteService  # noqa: E402

SITE = "SITE-01"


def u(uid, role):
    return {"user_id": uid, "role_id": int(role), "site_id": SITE}


MD = u("USR-MD", Role.ADMIN)
TM = u("USR-TM", Role.TECHNICAL_MANAGER)
COORD = u("USR-CO", Role.COORDINATOR)
FIN = u("USR-FI", Role.FINANCE)
DEP = u("USR-DEP", Role.COORDINATOR)


def _patch():
    from mongomock_motor import AsyncMongoMockDatabase

    original = AsyncMongoMockDatabase.list_collection_names

    async def patched(self, *a, **k):
        k.pop("authorizedCollections", None)
        k.pop("nameOnly", None)
        return await original(self, *a, **k)

    AsyncMongoMockDatabase.list_collection_names = patched


@pytest_asyncio.fixture
async def db():
    _patch()
    c = AsyncMongoMockClient()
    await init_beanie(
        database=c["release_auth"],
        document_models=[InspectionReleaseNote, Job, Region, DeputyCoverage,
                         UserLogin, AuditEntry, Sequence],
    )
    await UserLogin(user_id="USR-DEP", site_id=SITE, login_name="dep", login_password="x",
                    email="d@x", full_name="Dep", role_id=int(Role.COORDINATOR),
                    employee_code="EMP-DEP").insert()
    await UserLogin(user_id="USR-TM", site_id=SITE, login_name="tm", login_password="x",
                    email="t@x", full_name="TM", role_id=int(Role.TECHNICAL_MANAGER),
                    employee_code="EMP-TM").insert()
    await Region(region_code="S", name="South", regional_head_person_id="EMP-RH",
                 technical_manager_person_id="EMP-TMS",
                 inspection_coordinator_person_id="EMP-IC").insert()
    await Job(job_id="JOB-1", site_id=SITE, client_id="C", title="t", region_code="S").insert()
    yield c


async def _irn(status, line="PART_B", recommended_by=None) -> str:
    irn = InspectionReleaseNote(
        irn_id=f"IRN-{status}-{line}", job_id="JOB-1", description="d",
        service_line=line, status=status, recommended_by=recommended_by,
    )
    await irn.insert()
    return irn.irn_id


async def _call(fn, *a):
    with pytest.raises(HTTPException) as e:
        await fn(*a)
    return e.value


@pytest.mark.asyncio
async def test_only_tm_or_management_recommend(db):
    irn = await _irn("preconditions_checked")
    for who in (COORD, FIN):
        err = await _call(ReleaseNoteService.recommend, irn, SITE, who["user_id"], who)
        assert err.status_code == 403
    out = await ReleaseNoteService.recommend(irn, SITE, "USR-TM", TM)
    assert out["status"] == "recommended"


@pytest.mark.asyncio
async def test_arranged_tm_deputy_recommends_only_while_cover_lasts(db):
    cov = DeputyCoverage(coverage_id="D1", absent_role="TM", region_code="S",
                         deputy_person_id="EMP-DEP", deputy_role="RH",
                         valid_until=datetime.now() + timedelta(days=2))
    await cov.insert()
    irn = await _irn("preconditions_checked")
    assert (await ReleaseNoteService.recommend(irn, SITE, "USR-DEP", DEP))["status"] == "recommended"

    cov.valid_until = datetime.now() - timedelta(hours=1)
    await cov.save()
    irn2 = await _irn("preconditions_checked", line="PART_A")
    assert (await _call(ReleaseNoteService.recommend, irn2, SITE, "USR-DEP", DEP)).status_code == 403


@pytest.mark.asyncio
async def test_approval_is_management_only_and_not_your_own_recommendation(db):
    irn = await _irn("recommended", recommended_by="USR-TM")
    for who in (TM, COORD, FIN):
        assert (await _call(ReleaseNoteService.approve, irn, SITE, who["user_id"], who)).status_code == 403
    # management who recommended it cannot approve it too
    own = await _irn("recommended", line="PART_A", recommended_by="USR-MD")
    err = await _call(ReleaseNoteService.approve, own, SITE, "USR-MD", MD)
    assert err.status_code == 403 and "recommended" in err.detail
    assert (await ReleaseNoteService.approve(irn, SITE, "USR-MD", MD))["status"] == "approved"


@pytest.mark.asyncio
async def test_part_c_is_released_by_the_country_manager_only(db):
    c = await _irn("approved", line="PART_C")
    err = await _call(ReleaseNoteService.release, c, {}, SITE, "USR-TM", TM)
    assert err.status_code == 403 and "Country Manager" in err.detail
    assert (await ReleaseNoteService.release(c, {}, SITE, "USR-MD", MD))["released"] is True


@pytest.mark.asyncio
async def test_part_b_release_is_technical_not_finance_or_coordination(db):
    b = await _irn("approved", line="PART_B")
    for who in (FIN, COORD):
        assert (await _call(ReleaseNoteService.release, b, {}, SITE, who["user_id"], who)).status_code == 403
    assert (await ReleaseNoteService.release(b, {}, SITE, "USR-TM", TM))["released"] is True


@pytest.mark.asyncio
async def test_auditor_holding_a_post_in_the_region_is_refused(db):
    for person in ("EMP-RH", "EMP-TMS", "EMP-IC"):
        with pytest.raises(HTTPException) as e:
            await RegionService.require_cross_region_audit(person, "S")
        assert e.value.status_code == 403
    ok = await RegionService.require_cross_region_audit("EMP-OTHER", "S")
    assert ok["allowed"] is True


@pytest.mark.asyncio
async def test_a_deputy_covering_the_region_cannot_audit_it(db):
    await DeputyCoverage(coverage_id="D2", absent_role="RH", region_code="S",
                         deputy_person_id="EMP-DEP", deputy_role="CM").insert()
    with pytest.raises(HTTPException) as e:
        await RegionService.require_cross_region_audit("EMP-DEP", "S")
    assert e.value.status_code == 403
