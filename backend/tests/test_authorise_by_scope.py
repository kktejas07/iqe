"""H8 (authorise by scope) and H10 (monitor and appraise yearly).

The Technical Manager recommends; the Country Manager authorises. What a
person is authorised for is the service lines on their record, and only while
the record is in force: authorised, unexpired, and appraised within the year.
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
from modules.jobs.service import JobService  # noqa: E402
from modules.people import scope  # noqa: E402
from modules.people.models import (  # noqa: E402
    Authorization, CompetenceProfile, ImpartialityDeclaration, Person,
)
from modules.people.service import PeopleService  # noqa: E402
from modules.assignments.models import Assignment  # noqa: E402
from modules.assignments.service import AssignmentService  # noqa: E402
from modules.work_packages.models import WorkPackage  # noqa: E402
from modules.work_packages.service import WorkPackageService  # noqa: E402
from modules.work_types.models import WorkTypeDefinition  # noqa: E402
from modules.work_types.service import WorkTypeService  # noqa: E402

SITE = "SITE-01"


def u(uid, role):
    return {"user_id": uid, "role_id": int(role), "site_id": SITE}


MD = u("USR-MD", Role.ADMIN)
MD2 = u("USR-MD2", Role.ADMIN)
TM = u("USR-TM", Role.TECHNICAL_MANAGER)
INSP = u("USR-IN", Role.INSPECTOR)

COMPLETE = {
    "qualification_verified": True, "training_completed": True,
    "supervised_inspections_count": 3, "supervised_required": 3,
    "witnessed_assessment_passed": True,
}


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
        database=c["scope_test"],
        document_models=[Person, Authorization, CompetenceProfile, ImpartialityDeclaration,
                         Job, UserLogin, AuditEntry, Sequence, Assignment, WorkPackage, WorkTypeDefinition],
    )
    await WorkTypeService.seed_catalogue(SITE, "USR-T")
    yield c


async def _person(name="Asha", code="EMP-A"):
    p = await PeopleService.create(
        {"full_name": name, "category": "TECHNICAL_INSPECTION", "engagement_type": "PERMANENT",
         "employment_status": "active", "employee_code": code}, SITE, "USR-HR")
    return p


async def _auth(person, lines=("PART_B",), **kw):
    data = {"inspection_types": ["CODE_INSPECTION"], "service_lines": list(lines),
            **COMPLETE, **kw}
    return await PeopleService.create_authorization(person.person_id, data, SITE, "USR-HR")


async def _grant(person, lines=("PART_B",), **kw):
    a = await _auth(person, lines, **kw)
    await PeopleService.recommend_authorization(a.authorization_id, SITE, TM)
    await PeopleService.decide_authorization(a.authorization_id, "authorized", SITE, "USR-MD", None, MD)
    return await Authorization.find_one({"authorization_id": a.authorization_id})


# ------------------------------------------------------------ H8: who decides

@pytest.mark.asyncio
async def test_authorising_needs_the_tm_recommendation_first(db):
    a = await _auth(await _person())
    with pytest.raises(HTTPException) as e:
        await PeopleService.decide_authorization(a.authorization_id, "authorized", SITE, "USR-MD", None, MD)
    assert e.value.status_code == 409 and "recommend" in e.value.detail


@pytest.mark.asyncio
async def test_only_the_country_manager_authorises(db):
    a = await _auth(await _person())
    await PeopleService.recommend_authorization(a.authorization_id, SITE, TM)
    for who in (TM, INSP):
        with pytest.raises(HTTPException) as e:
            await PeopleService.decide_authorization(a.authorization_id, "authorized", SITE, who["user_id"], None, who)
        assert e.value.status_code == 403
    with pytest.raises(HTTPException) as e:
        await PeopleService.decide_authorization(a.authorization_id, "authorized", SITE, "x", None, None)
    assert e.value.status_code == 403


@pytest.mark.asyncio
async def test_an_inspector_cannot_recommend(db):
    a = await _auth(await _person())
    with pytest.raises(HTTPException) as e:
        await PeopleService.recommend_authorization(a.authorization_id, SITE, INSP)
    assert e.value.status_code == 403


@pytest.mark.asyncio
async def test_whoever_recommended_cannot_also_authorise(db):
    a = await _auth(await _person())
    await PeopleService.recommend_authorization(a.authorization_id, SITE, MD)   # management may recommend
    with pytest.raises(HTTPException) as e:
        await PeopleService.decide_authorization(a.authorization_id, "authorized", SITE, "USR-MD", None, MD)
    assert e.value.status_code == 403 and "cannot also authorise" in e.value.detail
    out = await PeopleService.decide_authorization(a.authorization_id, "authorized", SITE, "USR-MD2", None, MD2)
    assert out.status == "authorized"


@pytest.mark.asyncio
async def test_the_evidence_must_be_complete_before_it_is_even_recommended(db):
    p = await _person()
    a = await PeopleService.create_authorization(
        p.person_id, {"inspection_types": ["CODE_INSPECTION"], "service_lines": ["PART_B"],
                      "qualification_verified": True}, SITE, "USR-HR")
    with pytest.raises(HTTPException) as e:
        await PeopleService.recommend_authorization(a.authorization_id, SITE, TM)
    assert e.value.status_code == 409 and "training not completed" in e.value.detail


@pytest.mark.asyncio
async def test_a_recommendation_must_state_the_scope(db):
    p = await _person()
    a = await PeopleService.create_authorization(p.person_id, dict(COMPLETE), SITE, "USR-HR")
    with pytest.raises(HTTPException) as e:
        await PeopleService.recommend_authorization(a.authorization_id, SITE, TM)
    assert e.value.status_code == 409 and "scope" in e.value.detail


@pytest.mark.asyncio
async def test_authorising_grants_a_year_and_sets_the_review_date(db):
    a = await _grant(await _person())
    assert a.status == "authorized" and a.authorized_by == "USR-MD"
    assert a.recommended_by == "USR-TM"
    assert 360 <= (a.valid_until - datetime.now()).days <= 366
    assert 360 <= (a.next_surveillance_due - datetime.now()).days <= 366


@pytest.mark.asyncio
async def test_either_may_suspend_but_withdrawing_needs_a_reason(db):
    a = await _grant(await _person())
    out = await PeopleService.decide_authorization(a.authorization_id, "suspended", SITE, "USR-TM", "complaint", TM)
    assert out.status == "suspended"
    with pytest.raises(HTTPException) as e:
        await PeopleService.decide_authorization(a.authorization_id, "withdrawn", SITE, "USR-MD", None, MD)
    assert e.value.status_code == 422
    with pytest.raises(HTTPException) as e:
        await PeopleService.decide_authorization(a.authorization_id, "withdrawn", SITE, "USR-IN", "x", INSP)
    assert e.value.status_code == 403


# ------------------------------------------------------------ scope by line

@pytest.mark.asyncio
async def test_a_person_is_authorised_only_for_the_lines_on_their_record(db):
    p = await _person()
    await _grant(p, ["PART_B", "EXPEDITING"])
    assert (await scope.check_line(p.person_id, "PART_B", SITE))["authorised"]
    assert (await scope.check_line(p.person_id, "EXPEDITING", SITE))["authorised"]
    no = await scope.check_line(p.person_id, "PART_C", SITE)
    assert not no["authorised"] and "PART_C" in no["reason"]


@pytest.mark.asyncio
async def test_a_record_made_before_service_lines_covers_inspection_only(db):
    p = await _person()
    a = await Authorization(authorization_id="ATH-OLD", person_id=p.person_id, site_id=SITE,
                            status="authorized", inspection_types=["CODE_INSPECTION"],
                            valid_until=datetime.now() + timedelta(days=100)).insert()
    assert (await scope.check_line(p.person_id, "PART_B", SITE))["authorised"]
    assert not (await scope.check_line(p.person_id, "PART_C", SITE))["authorised"]


@pytest.mark.asyncio
async def test_two_records_add_up(db):
    p = await _person()
    await _grant(p, ["PART_B"])
    await _grant(p, ["TRAINING"])
    assert (await scope.check_line(p.person_id, "TRAINING", SITE))["authorised"]
    assert (await scope.check_line(p.person_id, "PART_B", SITE))["authorised"]


@pytest.mark.asyncio
async def test_a_person_can_be_found_by_employee_code(db):
    p = await _person(code="EMP-ZED")
    await _grant(p)
    assert (await scope.check_line("EMP-ZED", "PART_B", SITE))["authorised"]
    unknown = await scope.check_line("EMP-NOBODY", "PART_B", SITE)
    assert not unknown["authorised"] and "no person record" in unknown["reason"]


# ------------------------------------------------------------ job register

@pytest.mark.asyncio
async def test_a_job_will_not_take_an_inspector_not_authorised_for_its_line(db):
    p = await _person()
    await _grant(p, ["PART_B"])
    await Job(job_id="JOB-B", title="t", service_line="PART_B").insert()
    await Job(job_id="JOB-C", title="t", service_line="PART_C").insert()
    ok = await JobService.assign_inspector_for_approval("JOB-B", p.person_id, "Asha", [], 5, SITE)
    assert ok.client_approval_status == "pending_client_approval"
    with pytest.raises(HTTPException) as e:
        await JobService.assign_inspector_for_approval("JOB-C", p.person_id, "Asha", [], 5, SITE)
    assert e.value.status_code == 409 and "PART_C" in e.value.detail


@pytest.mark.asyncio
async def test_a_job_will_not_take_an_inspector_with_no_authorisation(db):
    p = await _person()
    await Job(job_id="JOB-B", title="t").insert()
    with pytest.raises(HTTPException) as e:
        await JobService.assign_inspector_for_approval("JOB-B", p.person_id, "Asha", [], 5, SITE)
    assert e.value.status_code == 409


# ------------------------------------------------------------ H10: yearly

@pytest.mark.asyncio
async def test_an_overdue_annual_review_takes_the_authorisation_out_of_force(db):
    p = await _person()
    a = await _grant(p)
    a.next_surveillance_due = datetime.now() - timedelta(days=1)
    await a.save()
    res = await scope.check_line(p.person_id, "PART_B", SITE)
    assert not res["authorised"] and "annual review" in res["reason"]
    out = await PeopleService.refresh_deployability(p.person_id, SITE)
    assert out["deployable"] is False


@pytest.mark.asyncio
async def test_lapse_overdue_marks_them_expired_and_records_it(db):
    p, q = await _person(), await _person("Bo", "EMP-B")
    a, b = await _grant(p), await _grant(q)
    a.valid_until = datetime.now() - timedelta(days=2)
    await a.save()
    out = await PeopleService.lapse_overdue(SITE, MD)
    assert out["lapsed"] == [a.authorization_id]
    assert (await Authorization.find_one({"authorization_id": a.authorization_id})).status == "expired"
    assert (await Authorization.find_one({"authorization_id": b.authorization_id})).status == "authorized"
    assert (await PeopleService.get(p.person_id, SITE)).deployable is False
    assert (await PeopleService.lapse_overdue(SITE, MD))["count"] == 0   # safe to repeat


@pytest.mark.asyncio
async def test_renewal_needs_the_tm_appraisal_then_a_different_country_manager(db):
    p = await _person()
    a = await _grant(p)
    before = a.valid_until
    with pytest.raises(HTTPException) as e:
        await PeopleService.renew_authorization(a.authorization_id, SITE, MD)
    assert e.value.status_code == 409 and "appraise" in e.value.detail
    with pytest.raises(HTTPException) as e:
        await PeopleService.recommend_renewal(a.authorization_id, SITE, TM, "  ")
    assert e.value.status_code == 422
    await PeopleService.recommend_renewal(a.authorization_id, SITE, TM, "Reviewed 12 reports, no findings")
    with pytest.raises(HTTPException) as e:
        await PeopleService.renew_authorization(a.authorization_id, SITE, TM)
    assert e.value.status_code == 403
    out = await PeopleService.renew_authorization(a.authorization_id, SITE, MD)
    assert out.renewal_count == 1 and out.valid_until > before
    assert out.last_review_on is not None and out.review_note.startswith("Reviewed")


@pytest.mark.asyncio
async def test_a_tm_who_is_also_management_cannot_appraise_and_renew_alone(db):
    a = await _grant(await _person())
    await PeopleService.recommend_renewal(a.authorization_id, SITE, MD, "ok")
    with pytest.raises(HTTPException) as e:
        await PeopleService.renew_authorization(a.authorization_id, SITE, MD)
    assert e.value.status_code == 403


@pytest.mark.asyncio
async def test_a_lapsed_authorisation_comes_back_through_the_review(db):
    p = await _person()
    a = await _grant(p)
    a.valid_until = datetime.now() - timedelta(days=3)
    await a.save()
    await PeopleService.lapse_overdue(SITE, MD)
    assert not (await scope.check_line(p.person_id, "PART_B", SITE))["authorised"]
    await PeopleService.recommend_renewal(a.authorization_id, SITE, TM, "back in good standing")
    out = await PeopleService.renew_authorization(a.authorization_id, SITE, MD)
    assert out.status == "authorized" and out.valid_until > datetime.now() + timedelta(days=300)
    assert (await scope.check_line(p.person_id, "PART_B", SITE))["authorised"]


@pytest.mark.asyncio
async def test_a_withdrawn_authorisation_cannot_be_renewed(db):
    a = await _grant(await _person())
    await PeopleService.recommend_renewal(a.authorization_id, SITE, TM, "ok")
    await PeopleService.decide_authorization(a.authorization_id, "withdrawn", SITE, "USR-MD", "left", MD)
    with pytest.raises(HTTPException) as e:
        await PeopleService.renew_authorization(a.authorization_id, SITE, MD)
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_due_for_review_lists_what_is_coming_up(db):
    p, q = await _person(), await _person("Bo", "EMP-B")
    a, b = await _grant(p), await _grant(q)
    a.next_surveillance_due = datetime.now() + timedelta(days=20)
    await a.save()
    due = await PeopleService.due_for_review(SITE, 60)
    assert [d["authorization_id"] for d in due] == [a.authorization_id]
    assert due[0]["overdue"] is False and due[0]["service_lines"] == ["PART_B"]


@pytest.mark.asyncio
async def test_the_decisions_are_on_the_audit_trail(db):
    from core.audit import history

    a = await _grant(await _person())
    entries = await history("authorization", a.authorization_id, SITE)
    assert {e.actor_user_id for e in entries} == {"USR-TM", "USR-MD"}


# ------------------------------------------------------- assignment engine

async def _package(job_id, line):
    await Job(job_id=job_id, site_id=SITE, title="J", client_name="C", status="active",
              service_line=line).insert()
    return await WorkPackageService.create(
        {"job_id": job_id, "work_type_code": "CODE_INSP", "title": "Weld inspection",
         "planned_start": datetime.now() + timedelta(days=2),
         "planned_finish": datetime.now() + timedelta(days=5)}, SITE, "USR-T")


@pytest.mark.asyncio
async def test_the_engine_excludes_someone_authorised_for_another_line(db):
    p = await _person()
    await _grant(p, ["PART_B"])
    wp_b = await _package("JOB-PB", "PART_B")
    wp_c = await _package("JOB-PC", "PART_C")

    got = await AssignmentService.recommend(wp_b.work_package_id, SITE)
    assert [r["person_id"] for r in got["recommendations"]] == [p.person_id], got

    got = await AssignmentService.recommend(wp_c.work_package_id, SITE)
    assert got["recommendations"] == []
    assert any(x["person_id"] == p.person_id and "PART_C" in x["reason"] for x in got["excluded"]), got

    with pytest.raises(HTTPException) as e:                  # and assigning re-checks
        await AssignmentService.assign(wp_c.work_package_id, p.person_id, SITE, "USR-T")
    assert e.value.status_code == 409 and "PART_C" in e.value.detail


@pytest.mark.asyncio
async def test_the_engine_stops_offering_someone_overdue_their_review(db):
    p = await _person()
    a = await _grant(p)
    wp = await _package("JOB-PB", "PART_B")
    a.next_surveillance_due = datetime.now() - timedelta(days=1)
    await a.save()
    got = await AssignmentService.recommend(wp.work_package_id, SITE)
    assert got["recommendations"] == []
