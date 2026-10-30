"""The non-inspection service lines: expediting, vendor assessment, asset
integrity, equipment design, training.

Each test is a rule from the workflow's bottom band, not a happy path.
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
from core.claims import accreditation_mark, normalise_service_line  # noqa: E402
from core.sequences import Sequence  # noqa: E402
from modules.auth.models import UserLogin  # noqa: E402
from modules.engagements.models import Engagement  # noqa: E402
from modules.engagements.service import EngagementService  # noqa: E402
from modules.jobs.models import Job  # noqa: E402
from modules.people.models import Authorization, ImpartialityDeclaration, Person  # noqa: E402
from modules.providers.models import (  # noqa: E402
    ExternalProvider, SubcontractConsent, SubcontractDecision,
)
from modules.providers.service import ProviderService  # noqa: E402
from modules.regions.models import DeputyCoverage, Region  # noqa: E402
from modules.signoff.models import ReportSignoff  # noqa: E402

SITE = "SITE-01"


def u(uid, role):
    return {"user_id": uid, "role_id": int(role), "site_id": SITE}


MD = u("USR-MD", Role.ADMIN)
TM = u("USR-TM", Role.TECHNICAL_MANAGER)
EXP = u("USR-EX", Role.INSPECTOR)
OTHER = u("USR-OT", Role.INSPECTOR)
FIN = u("USR-FI", Role.FINANCE)


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
        database=c["engagements_test"],
        document_models=[Engagement, Job, Authorization, ImpartialityDeclaration, Person,
                         ExternalProvider, SubcontractConsent, SubcontractDecision,
                         ReportSignoff, Region, DeputyCoverage, UserLogin, AuditEntry, Sequence],
    )
    for uid, code, role in (("USR-TM", "EMP-TM", Role.TECHNICAL_MANAGER),
                            ("USR-EX", "EMP-EX", Role.INSPECTOR),
                            ("USR-OT", "EMP-OT", Role.INSPECTOR)):
        await UserLogin(user_id=uid, site_id=SITE, login_name=uid.lower(), login_password="x",
                        email=f"{uid}@x", full_name=uid, role_id=int(role),
                        employee_code=code).insert()
    yield c


async def _job(line, job_id="JOB-1", j_no="S-2627-0001") -> Job:
    j = Job(job_id=job_id, site_id=SITE, client_id="CLI-1", title="t", service_line=line,
            j_no=j_no, region_code="S")
    await j.insert()
    return j


async def _authorise_person(person, types, **kw):
    await Authorization(
        authorization_id=f"ATH-{person}", person_id=person, site_id=SITE,
        inspection_types=types, status="authorized",
        valid_until=datetime.now() + timedelta(days=90), **kw,
    ).insert()


async def _provider(category="OTHER", pid="PRV-1") -> ExternalProvider:
    p = ExternalProvider(
        provider_id=pid, site_id=SITE, name="Acme", category=category, status="APPROVED",
        approved_on=datetime.now(), next_review_on=datetime.now() + timedelta(days=200),
    )
    await p.insert()
    return p


async def _sign_report(job_id="JOB-1"):
    await ReportSignoff(signoff_id="SGN-1", site_id=SITE, job_id=job_id, status="approved").insert()


async def _open(line, job_id="JOB-1", user=MD):
    await _job(line, job_id)
    out = await EngagementService.open({"job_id": job_id, "service_line": line}, SITE, user)
    return out["engagement_id"]


async def _step(eid, code, body, user):
    return await EngagementService.complete_step(eid, code, body, SITE, user)


async def _refused(eid, code, body, user, status=None, text=None):
    with pytest.raises(HTTPException) as e:
        await _step(eid, code, body, user)
    if status:
        assert e.value.status_code == status, e.value.detail
    if text:
        assert text in e.value.detail, e.value.detail
    return e.value


# ------------------------------------------------------------------ open

@pytest.mark.asyncio
async def test_other_lines_are_known_and_never_carry_the_mark(db):
    for line in ("EXPEDITING", "VENDOR_ASSESSMENT", "ASSET_INTEGRITY",
                 "EQUIPMENT_DESIGN", "TRAINING"):
        assert normalise_service_line(line).value == line
        assert accreditation_mark(line, in_accredited_scope=True)["permitted"] is False


@pytest.mark.asyncio
async def test_engagement_needs_a_jno_and_a_matching_service_line(db):
    await _job("EXPEDITING", "JOB-A", j_no=None)
    with pytest.raises(HTTPException) as e:
        await EngagementService.open({"job_id": "JOB-A", "service_line": "EXPEDITING"}, SITE, MD)
    assert e.value.status_code == 409 and "J.No" in e.value.detail

    await _job("TRAINING", "JOB-B")
    with pytest.raises(HTTPException) as e:
        await EngagementService.open({"job_id": "JOB-B", "service_line": "EXPEDITING"}, SITE, MD)
    assert e.value.status_code == 409 and "registered as TRAINING" in e.value.detail

    with pytest.raises(HTTPException) as e:   # inspection lines are not staged here
        await EngagementService.open({"job_id": "JOB-B", "service_line": "PART_B"}, SITE, MD)
    assert e.value.status_code == 422


@pytest.mark.asyncio
async def test_one_open_engagement_per_job_and_line(db):
    await _open("EXPEDITING")
    with pytest.raises(HTTPException) as e:
        await EngagementService.open({"job_id": "JOB-1", "service_line": "EXPEDITING"}, SITE, MD)
    assert e.value.status_code == 409


# ------------------------------------------------------------- expediting

@pytest.mark.asyncio
async def test_steps_must_be_taken_in_order(db):
    eid = await _open("EXPEDITING")
    await _refused(eid, "E3", {}, MD, 409, "E2")


@pytest.mark.asyncio
async def test_authorising_needs_tm_scope_no_conflict_and_not_yourself(db):
    eid = await _open("EXPEDITING")
    body = {"person_id": "EMP-EX", "allocated_by": "EMP-IC"}
    await _refused(eid, "E2", body, OTHER, 403)            # not TM
    await _refused(eid, "E2", body, TM, 409, "not currently authorised")   # no authorisation
    await _authorise_person("EMP-EX", ["PART_B"])           # wrong scope
    await _refused(eid, "E2", body, TM, 409, "not currently authorised")
    await Authorization.find_one({"person_id": "EMP-EX"}).update({"$set": {"inspection_types": ["EXPEDITING"]}})
    await ImpartialityDeclaration(declaration_id="IMP-1", person_id="EMP-EX", site_id=SITE,
                                  conflicted_client_ids=["CLI-1"]).insert()
    await _refused(eid, "E2", body, TM, 409, "conflict of interest")
    await ImpartialityDeclaration.find_one({"person_id": "EMP-EX"}).delete()
    await _refused(eid, "E2", {"person_id": "EMP-EX"}, TM, 400, "allocated_by")
    out = await _step(eid, "E2", body, TM)
    assert out["authorised_person_id"] == "EMP-EX"


@pytest.mark.asyncio
async def test_tm_cannot_confirm_their_own_authorisation(db):
    eid = await _open("EXPEDITING")
    await _authorise_person("EMP-TM", ["EXPEDITING"])
    await _refused(eid, "E2", {"person_id": "EMP-TM", "allocated_by": "EMP-IC"}, TM, 403, "own")


@pytest.mark.asyncio
async def test_expediting_runs_through_to_close_and_needs_the_signed_report(db):
    eid = await _open("EXPEDITING")
    await _authorise_person("EMP-EX", ["EXPEDITING"])
    await _step(eid, "E2", {"person_id": "EMP-EX", "allocated_by": "EMP-IC"}, TM)

    await _refused(eid, "E3", {"covered": {"drawings": "chased"}}, EXP, 400, "quality plans")
    await _refused(eid, "E3", {"covered": {}}, OTHER, 403)   # not the authorised person
    await _step(eid, "E3", {"covered": {k: "done" for k in
                ("drawings", "quality plans", "delivery schedule", "sub-orders")}}, EXP)

    await _refused(eid, "E4", {}, EXP, 400, "note")
    await _step(eid, "E4", {"note": "Week 1: fabrication started"}, EXP)
    out = await _step(eid, "E4", {"note": "Week 2: painting"}, EXP)     # repeatable
    assert len(next(s for s in out["steps"] if s["code"] == "E4")["updates"]) == 2

    await _refused(eid, "E5", {"items": [{"description": "Delay in forgings"}]}, EXP, 400, "evidence")
    await _step(eid, "E5", {"items": [{"description": "Delay in forgings",
                                       "evidence_ids": ["DOC-1", "IMG-2"]}]}, EXP)
    await _refused(eid, "E4", {"note": "late"}, EXP, 409, "closed to updates")

    await _refused(eid, "E6", {}, MD, 409, "signed off")
    await _sign_report()
    out = await _step(eid, "E6", {"billing_reference": "INV-1"}, MD)
    assert out["status"] == "closed"
    await _refused(eid, "E6", {}, MD, 409)


# ------------------------------------------------------------ vendor assessment

@pytest.mark.asyncio
async def test_vendor_assessment_checklists_and_gaps_to_client(db):
    eid = await _open("VENDOR_ASSESSMENT")
    await _authorise_person("EMP-EX", ["VENDOR_ASSESSMENT"])
    await _step(eid, "V2", {"person_id": "EMP-EX", "allocated_by": "EMP-IC"}, TM)
    six = {k: "ok" for k in ("workload", "equipment", "QMS", "welding", "NDT", "safety")}
    six.pop("welding")
    await _refused(eid, "V3", {"covered": six}, EXP, 400, "welding")
    six["welding"] = "ok"
    await _step(eid, "V3", {"covered": six}, EXP)
    await _step(eid, "V4", {"covered": {"workshop": "ok", "storage": "ok",
                                        "personnel qualification": "ok"}}, EXP)
    await _refused(eid, "V5", {"gaps": []}, EXP, 403)          # TM signs, not the assessor
    await _refused(eid, "V5", {"gaps": []}, TM, 409, "signed off")
    await _sign_report()
    await _refused(eid, "V5", {}, TM, 400, "gaps")
    await _refused(eid, "V5", {"gaps": ["No NDT Level II"]}, TM, 409, "sent to the client")
    await _step(eid, "V5", {"gaps": ["No NDT Level II"], "gaps_sent_to_client": True}, TM)
    assert (await _step(eid, "V6", {}, MD))["status"] == "closed"


# ------------------------------------------------------------ asset integrity

@pytest.mark.asyncio
async def test_asset_integrity_needs_md_decision_consent_and_a_supervisor(db):
    eid = await _open("ASSET_INTEGRITY")
    p = await _provider(category="EQUIPMENT_HIRE")
    body = {"provider_id": p.provider_id, "coi_declared_by": "EMP-TM"}
    err = await _refused(eid, "A2", body, TM, 409)
    assert "MD has not approved" in err.detail and "client has not agreed" in err.detail

    await ProviderService.decide_subcontract(
        {"job_id": "JOB-1", "provider_id": p.provider_id, "special_case_reason": "Rope access"}, SITE, MD)
    await ProviderService.record_consent(
        {"job_id": "JOB-1", "provider_id": p.provider_id, "granted_by": "Client rep"}, SITE, "USR-MD")
    await _refused(eid, "A2", {"provider_id": p.provider_id}, TM, 400, "coi_declared_by")
    await _step(eid, "A2", body, TM)

    await _step(eid, "A3", {"covered": {"competence of personnel": "ok",
                                        "competence of equipment": "ok"}}, TM)
    await _refused(eid, "A4", {"note": "supervised"}, TM, 400, "supervisor_person_id")
    await _refused(eid, "A4", {"note": "x", "supervisor_person_id": "EMP-EX"}, TM, 409)
    await _authorise_person("EMP-EX", ["PART_B"])
    await _step(eid, "A4", {"note": "supervised", "supervisor_person_id": "EMP-EX"}, TM)

    await _sign_report()
    await _refused(eid, "A5", {}, TM, 400, "subcontracted_scope")
    await _step(eid, "A5", {"subcontracted_scope": "Rope access and NDT crew"}, TM)
    assert (await _step(eid, "A6", {}, MD))["status"] == "closed"


# ------------------------------------------------------------ equipment design

@pytest.mark.asyncio
async def test_design_is_blocked_when_iqe_inspects_the_item(db):
    eid = await _open("EQUIPMENT_DESIGN")
    await _refused(eid, "D2", {"inspected_by_iqe": True}, TM, 400, "similar_competitive")
    await _refused(eid, "D2", {"inspected_by_iqe": True, "similar_competitive": False}, TM, 409, "appraise")
    await _refused(eid, "D3", {}, TM, 409, "blocked")
    row = await EngagementService.get(eid, SITE)
    assert row.status == "blocked" and row.permitted_engagement == "APPRAISAL"


@pytest.mark.asyncio
async def test_design_runs_with_a_consultant_not_an_inspector_and_no_report(db):
    eid = await _open("EQUIPMENT_DESIGN")
    await _refused(eid, "D2", {"inspected_by_iqe": False, "similar_competitive": False}, EXP, 403)
    await _step(eid, "D2", {"inspected_by_iqe": False, "similar_competitive": False}, TM)

    insp = await _provider(category="INSPECTION_SUBCONTRACT", pid="PRV-I")
    await _refused(eid, "D3", {"provider_id": insp.provider_id, "coi_declared_by": "X"}, TM, 409, "not as an inspector")
    cons = await _provider(category="OTHER", pid="PRV-C")
    await _step(eid, "D3", {"provider_id": cons.provider_id, "coi_declared_by": "Acme MD"}, TM)

    await _step(eid, "D4", {"covered": {"design plan": "v1", "inputs: codes, specs, client needs": "ok",
                                        "stage verification": "ok"}}, TM)
    await _step(eid, "D5", {"covered": {"outputs checked": "ok", "changes controlled": "register"}}, TM)
    # no inspection report exists for design, and none is demanded
    assert (await _step(eid, "D6", {}, MD))["status"] == "closed"


# --------------------------------------------------------------- training

@pytest.mark.asyncio
async def test_certificates_only_for_participants_who_passed(db):
    eid = await _open("TRAINING")
    await _authorise_person("EMP-EX", ["TRAINING"])
    await _step(eid, "T2", {"person_id": "EMP-EX", "allocated_by": "EMP-IC"}, TM)
    await _step(eid, "T3", {"note": "NDT Level II, 5 days"}, EXP)
    await _refused(eid, "T4", {"items": [{"description": "Exam", "evidence_ids": ["D1"],
                                          "participant": "Asha"}]}, EXP, 400, "pass or fail")
    await _step(eid, "T4", {"items": [
        {"description": "Exam", "participant": "Asha", "result": "pass", "evidence_ids": ["D1"]},
        {"description": "Exam", "participant": "Ravi", "result": "fail", "evidence_ids": ["D2"]},
    ]}, EXP)
    await _refused(eid, "T5", {"certificate_ref": "TC-1", "participants": ["Asha", "Ravi"]}, EXP, 409, "Ravi")
    await _step(eid, "T5", {"certificate_ref": "TC-1", "participants": ["Asha"]}, EXP)
    assert (await _step(eid, "T6", {}, MD))["status"] == "closed"
