"""Report sign-off: who signs is who is logged in, routed to them, and not the
person who did the work.

Before this, `signed_by_person_id`, the deputy flag, the role and even
`arranged_by` came from the request body, so anyone could sign as the
Technical Manager and 'arrange' their own cover.
"""
import sys
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
from modules.signoff.models import ReportSignoff  # noqa: E402
from modules.signoff.service import SignoffService as S  # noqa: E402
from modules.visits.models import Visit  # noqa: E402

SITE = "SITE-01"


def _patch_mongomock():
    from mongomock_motor import AsyncMongoMockDatabase

    original = AsyncMongoMockDatabase.list_collection_names

    async def patched(self, *args, **kwargs):
        kwargs.pop("authorizedCollections", None)
        kwargs.pop("nameOnly", None)
        return await original(self, *args, **kwargs)

    AsyncMongoMockDatabase.list_collection_names = patched


def _u(uid, role):
    return {"user_id": uid, "role_id": int(role), "site_id": SITE}


INSP = _u("USR-INSP", Role.INSPECTOR)        # EMP-INSP, did the work
TM = _u("USR-TM", Role.TECHNICAL_MANAGER)    # EMP-TM
TM2 = _u("USR-TM2", Role.TECHNICAL_MANAGER)  # EMP-TM2, another region
RH = _u("USR-RH", Role.COORDINATOR)          # EMP-RH, deputy
CM = _u("USR-CM", Role.ADMIN)                # EMP-CM, Country Manager
OTHER = _u("USR-OTH", Role.INSPECTOR)


@pytest_asyncio.fixture
async def db():
    _patch_mongomock()
    client = AsyncMongoMockClient()
    await init_beanie(
        database=client["signoff_test"],
        document_models=[ReportSignoff, Job, Visit, UserLogin, AuditEntry, Sequence],
    )
    for uid, code, role in [
        ("USR-INSP", "EMP-INSP", Role.INSPECTOR), ("USR-TM", "EMP-TM", Role.TECHNICAL_MANAGER),
        ("USR-TM2", "EMP-TM2", Role.TECHNICAL_MANAGER), ("USR-RH", "EMP-RH", Role.COORDINATOR),
        ("USR-CM", "EMP-CM", Role.ADMIN), ("USR-OTH", "EMP-OTH", Role.INSPECTOR),
    ]:
        await UserLogin(user_id=uid, site_id=SITE, login_name=uid.lower(), login_password="x",
                        email=f"{uid}@x", full_name=uid, role_id=int(role), employee_code=code).insert()
    yield client


async def _signoff(**kw):
    await Job(job_id="JOB-X", title="t", assigned_inspector_id="EMP-INSP").insert()
    return await S.create({"job_id": "JOB-X", **kw}, SITE, "USR-IC")


APPROVE = {"result": "approved"}


# --------------------------------------------------- signing as yourself

@pytest.mark.asyncio
async def test_you_cannot_sign_as_someone_else(db):
    s = await _signoff(assigned_tm_person_id="EMP-TM")
    with pytest.raises(HTTPException) as e:
        await S.submit_review(s["signoff_id"], {**APPROVE, "signed_by_person_id": "EMP-TM"}, SITE, OTHER)
    assert e.value.status_code == 403 and "as yourself" in e.value.detail


@pytest.mark.asyncio
async def test_the_assigned_tm_signs_as_themselves(db):
    s = await _signoff(assigned_tm_person_id="EMP-TM")
    out = await S.submit_review(s["signoff_id"], APPROVE, SITE, TM)
    assert out["status"] == "approved" and out["signed_by_person_id"] == "EMP-TM"


@pytest.mark.asyncio
async def test_naming_yourself_in_the_body_is_accepted(db):
    s = await _signoff(assigned_tm_person_id="EMP-TM")
    out = await S.submit_review(s["signoff_id"], {**APPROVE, "signed_by_person_id": "EMP-TM"}, SITE, TM)
    assert out["signed_by_person_id"] == "EMP-TM"


# ------------------------------------------------------------- routing

@pytest.mark.asyncio
async def test_another_tm_cannot_sign_a_report_assigned_to_someone_else(db):
    s = await _signoff(assigned_tm_person_id="EMP-TM")
    with pytest.raises(HTTPException) as e:
        await S.submit_review(s["signoff_id"], APPROVE, SITE, TM2)
    assert e.value.status_code == 403 and "EMP-TM" in e.value.detail


@pytest.mark.asyncio
async def test_an_unassigned_report_is_signed_by_a_technical_manager_only(db):
    s = await _signoff()
    with pytest.raises(HTTPException):
        await S.submit_review(s["signoff_id"], APPROVE, SITE, OTHER)
    assert (await S.submit_review(s["signoff_id"], APPROVE, SITE, TM))["status"] == "approved"


# ------------------------------------------------------- never self-review

@pytest.mark.asyncio
async def test_whoever_did_the_work_cannot_sign_it_even_if_assigned(db):
    s = await _signoff(assigned_tm_person_id="EMP-INSP")
    with pytest.raises(HTTPException) as e:
        await S.submit_review(s["signoff_id"], APPROVE, SITE, INSP)
    assert e.value.status_code == 409 and "never self-review" in e.value.detail


@pytest.mark.asyncio
async def test_a_visit_inspector_is_also_barred(db):
    await Visit.model_construct(visit_id="V-1", job_id="JOB-X", site_id=SITE, inspector_id="EMP-OTH").insert()
    s = await _signoff(assigned_tm_person_id="EMP-OTH")
    assert "EMP-OTH" in s["prepared_by_person_ids"]
    with pytest.raises(HTTPException) as e:
        await S.submit_review(s["signoff_id"], APPROVE, SITE, OTHER)
    assert e.value.status_code == 409


# ------------------------------------------------------------- deputies

@pytest.mark.asyncio
async def test_only_management_arranges_a_deputy(db):
    s = await _signoff(assigned_tm_person_id="EMP-TM")
    with pytest.raises(HTTPException) as e:
        await S.assign_deputy(s["signoff_id"], {"deputy_person_id": "EMP-RH"}, SITE, TM)
    assert e.value.status_code == 403
    out = await S.assign_deputy(s["signoff_id"], {"deputy_person_id": "EMP-RH"}, SITE, CM)
    assert out["arranged_by"] == "EMP-CM"


@pytest.mark.asyncio
async def test_arranged_by_comes_from_the_caller_not_the_body(db):
    s = await _signoff()
    out = await S.assign_deputy(
        s["signoff_id"], {"deputy_person_id": "EMP-RH", "arranged_by": "EMP-SOMEONE-ELSE"}, SITE, CM)
    assert out["arranged_by"] == "EMP-CM"


@pytest.mark.asyncio
async def test_management_cannot_arrange_themselves_as_the_deputy(db):
    s = await _signoff()
    with pytest.raises(HTTPException) as e:
        await S.assign_deputy(s["signoff_id"], {"deputy_person_id": "EMP-CM"}, SITE, CM)
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_only_the_arranged_deputy_signs_once_one_is_arranged(db):
    s = await _signoff(assigned_tm_person_id="EMP-TM", sold_by_person_id="EMP-X")
    await S.assign_deputy(s["signoff_id"], {"deputy_person_id": "EMP-RH", "role": "deputy_rh"}, SITE, CM)
    with pytest.raises(HTTPException) as e:
        await S.submit_review(s["signoff_id"], APPROVE, SITE, TM)   # the absent TM
    assert e.value.status_code == 403 and "arranged deputy" in e.value.detail


@pytest.mark.asyncio
async def test_a_deputy_rh_must_confirm_scope_and_conflicts(db):
    s = await _signoff(sold_by_person_id="EMP-X")
    await S.assign_deputy(s["signoff_id"], {"deputy_person_id": "EMP-RH", "role": "deputy_rh"}, SITE, CM)
    with pytest.raises(HTTPException) as e:
        await S.submit_review(s["signoff_id"], APPROVE, SITE, RH)
    assert "authorised scope" in e.value.detail
    out = await S.submit_review(
        s["signoff_id"], {**APPROVE, "scope_verified": True, "coi_checked": True}, SITE, RH)
    assert out["status"] == "approved" and out["signed_by_role"] == "deputy_rh"


@pytest.mark.asyncio
async def test_a_deputy_rh_cannot_be_arranged_on_a_job_they_sold(db):
    s = await _signoff(sold_by_person_id="EMP-RH")
    with pytest.raises(HTTPException) as e:
        await S.assign_deputy(s["signoff_id"], {"deputy_person_id": "EMP-RH", "role": "deputy_rh"}, SITE, CM)
    assert "did not sell" in e.value.detail


@pytest.mark.asyncio
async def test_another_regions_tm_signs_only_when_arranged(db):
    s = await _signoff(assigned_tm_person_id="EMP-TM")
    with pytest.raises(HTTPException):
        await S.submit_review(s["signoff_id"], APPROVE, SITE, TM2)   # nobody arranged it
    await S.assign_deputy(
        s["signoff_id"], {"deputy_person_id": "EMP-TM2", "role": "cross_region_tm",
                          "cross_region_code": "N"}, SITE, CM)
    out = await S.submit_review(s["signoff_id"], APPROVE, SITE, TM2)
    assert out["status"] == "approved" and out["signed_by_role"] == "cross_region_tm"


@pytest.mark.asyncio
async def test_the_review_body_cannot_declare_itself_a_deputy(db):
    s = await _signoff(assigned_tm_person_id="EMP-TM")
    with pytest.raises(HTTPException):
        await S.submit_review(
            s["signoff_id"],
            {**APPROVE, "is_deputy": True, "signed_by_role": "cross_region_tm",
             "cross_region_code": "N", "arranged_by": "EMP-CM"}, SITE, TM2)


# --------------------------------------------------------- finality

@pytest.mark.asyncio
async def test_an_approved_signoff_is_not_re_decided(db):
    s = await _signoff(assigned_tm_person_id="EMP-TM")
    await S.submit_review(s["signoff_id"], APPROVE, SITE, TM)
    with pytest.raises(HTTPException) as e:
        await S.submit_review(s["signoff_id"], {"result": "rejected"}, SITE, TM)
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_rework_can_be_resubmitted(db):
    s = await _signoff(assigned_tm_person_id="EMP-TM")
    out = await S.submit_review(s["signoff_id"], {"result": "rework_required", "rework_notes": "n"}, SITE, TM)
    assert out["status"] == "rework" and out["rework_count"] == 1
    assert (await S.submit_review(s["signoff_id"], APPROVE, SITE, TM))["status"] == "approved"
