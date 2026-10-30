"""Appraisals hold ratings and authorisation decisions about one person.

Before this: any internal role could list everyone's appraisals, write someone
else's self-review, review their own appraisal, and open appraisals at will;
and GET /appraisals/witnessed was unreachable because /{appraisal_id} was
declared first and swallowed it.
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
from modules.appraisal.models import Appraisal, WitnessedInspection  # noqa: E402
from modules.appraisal.routes import router  # noqa: E402
from modules.appraisal.service import AppraisalService as S  # noqa: E402
from modules.auth.models import UserLogin  # noqa: E402

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


A = _u("USR-A", Role.INSPECTOR)       # EMP-A
B = _u("USR-B", Role.INSPECTOR)       # EMP-B
TM = _u("USR-TM", Role.TECHNICAL_MANAGER)   # EMP-TM
ADM = _u("USR-ADM", Role.ADMIN)       # EMP-ADM
FIN = _u("USR-FIN", Role.FINANCE)


@pytest_asyncio.fixture
async def db():
    _patch_mongomock()
    client = AsyncMongoMockClient()
    await init_beanie(
        database=client["appraisal_test"],
        document_models=[Appraisal, WitnessedInspection, UserLogin, AuditEntry, Sequence],
    )
    for uid, code, role in [
        ("USR-A", "EMP-A", Role.INSPECTOR), ("USR-B", "EMP-B", Role.INSPECTOR),
        ("USR-TM", "EMP-TM", Role.TECHNICAL_MANAGER), ("USR-ADM", "EMP-ADM", Role.ADMIN),
        ("USR-FIN", "EMP-FIN", Role.FINANCE),
    ]:
        await UserLogin(user_id=uid, site_id=SITE, login_name=uid.lower(), login_password="x",
                        email=f"{uid}@x", full_name=uid, role_id=int(role), employee_code=code).insert()
    yield client


async def _open(person, aid, by=TM):
    return await S.create_appraisal(
        {"appraisal_id": aid, "person_id": person, "appraisal_period": "2026-2027"}, SITE, by)


# ----------------------------------------------------------- visibility

@pytest.mark.asyncio
async def test_a_person_lists_only_their_own_appraisals(db):
    await _open("EMP-A", "APR-A")
    await _open("EMP-B", "APR-B")
    out = await S.list_appraisals(SITE, A)
    assert [i.appraisal_id for i in out["items"]] == ["APR-A"]
    assert out["total"] == 1


@pytest.mark.asyncio
async def test_asking_for_someone_elses_list_is_refused_not_silently_emptied(db):
    await _open("EMP-B", "APR-B")
    with pytest.raises(HTTPException) as e:
        await S.list_appraisals(SITE, A, person_id="EMP-B")
    assert e.value.status_code == 403


@pytest.mark.asyncio
async def test_managers_see_everyone(db):
    await _open("EMP-A", "APR-A")
    await _open("EMP-B", "APR-B")
    for u in (TM, ADM):
        assert (await S.list_appraisals(SITE, u))["total"] == 2


@pytest.mark.asyncio
async def test_a_colleague_cannot_open_someone_elses_appraisal(db):
    await _open("EMP-B", "APR-B")
    with pytest.raises(HTTPException) as e:
        await S.get_appraisal("APR-B", SITE, A)
    assert e.value.status_code == 403
    assert (await S.get_appraisal("APR-B", SITE, B)).person_id == "EMP-B"


@pytest.mark.asyncio
async def test_finance_has_no_view_of_appraisals(db):
    await _open("EMP-A", "APR-A")
    with pytest.raises(HTTPException):
        await S.get_appraisal("APR-A", SITE, FIN)
    assert (await S.list_appraisals(SITE, FIN))["total"] == 0


# ------------------------------------------------------- who may act

@pytest.mark.asyncio
async def test_only_managers_open_appraisals(db):
    with pytest.raises(HTTPException) as e:
        await _open("EMP-A", "APR-X", by=A)
    assert e.value.status_code == 403


@pytest.mark.asyncio
async def test_the_self_review_is_written_by_the_person_appraised(db):
    await _open("EMP-A", "APR-A")
    with pytest.raises(HTTPException) as e:
        await S.self_review("APR-A", {"employee_comments": "x"}, SITE, B)
    assert e.value.status_code == 403
    with pytest.raises(HTTPException):
        await S.self_review("APR-A", {"employee_comments": "x"}, SITE, TM)   # not even the manager
    out = await S.self_review("APR-A", {"employee_comments": "My year"}, SITE, A)
    assert out.status == "self_review" and out.employee_comments == "My year"


@pytest.mark.asyncio
async def test_a_colleague_cannot_do_the_manager_review(db):
    await _open("EMP-A", "APR-A")
    await S.self_review("APR-A", {}, SITE, A)
    with pytest.raises(HTTPException) as e:
        await S.manager_review("APR-A", {"overall_rating": 5}, SITE, B)
    assert e.value.status_code == 403


@pytest.mark.asyncio
async def test_a_manager_cannot_review_or_complete_their_own_appraisal(db):
    await _open("EMP-TM", "APR-TM", by=ADM)
    await S.self_review("APR-TM", {}, SITE, TM)
    with pytest.raises(HTTPException) as e:
        await S.manager_review("APR-TM", {"overall_rating": 5}, SITE, TM)
    assert e.value.status_code == 409 and "own appraisal" in e.value.detail
    out = await S.manager_review("APR-TM", {"overall_rating": 4}, SITE, ADM)
    with pytest.raises(HTTPException):
        await S.complete_appraisal("APR-TM", SITE, TM)
    assert (await S.complete_appraisal("APR-TM", SITE, ADM)).status == "completed"


@pytest.mark.asyncio
async def test_the_reviewer_is_recorded_as_a_person_not_a_login(db):
    await _open("EMP-A", "APR-A")
    await S.self_review("APR-A", {}, SITE, A)
    out = await S.manager_review("APR-A", {"overall_rating": 4}, SITE, TM)
    assert out.reviewer_person_id == "EMP-TM"


# -------------------------------------------------------- witnessed

W = {"witness_id": "WI-1", "person_id": "EMP-A", "date": "2026-10-01T00:00:00",
     "witnessed_by": "EMP-TM", "inspection_type": "visual"}


@pytest.mark.asyncio
async def test_witnessed_inspections_are_recorded_by_managers_only(db):
    with pytest.raises(HTTPException):
        await S.create_witnessed(dict(W), SITE, B)


@pytest.mark.asyncio
async def test_you_cannot_record_a_witnessed_inspection_of_yourself(db):
    with pytest.raises(HTTPException) as e:
        await S.create_witnessed({**W, "person_id": "EMP-TM"}, SITE, TM)
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_witnessed_inspections_are_visible_to_the_person_and_managers_only(db):
    await S.create_witnessed(dict(W), SITE, TM)
    assert (await S.get_witnessed_for_person("EMP-A", SITE, A))["total"] == 1
    assert (await S.get_witnessed_for_person("EMP-A", SITE, ADM))["total"] == 1
    with pytest.raises(HTTPException):
        await S.get_witnessed_for_person("EMP-A", SITE, B)
    assert (await S.list_witnessed(SITE, B))["total"] == 0
    with pytest.raises(HTTPException):
        await S.list_witnessed(SITE, B, person_id="EMP-A")


# ------------------------------------------------------------- routing

def test_the_witnessed_routes_are_declared_before_the_catch_all():
    """FastAPI matches in declaration order; /{appraisal_id} first meant
    GET /appraisals/witnessed was read as an appraisal with that id."""
    gets = [r.path for r in router.routes if "GET" in getattr(r, "methods", set())]
    catch_all = gets.index("/appraisals/{appraisal_id}")
    assert gets.index("/appraisals/witnessed") < catch_all
    assert gets.index("/appraisals/witnessed/{person_id}") < catch_all
