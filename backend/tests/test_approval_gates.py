"""Approval gates: who may take Go/No-Go and who may issue a quotation.

The workflow has the Regional Head approve within a limit and the MD above it,
with the four-point contract review inside the Go/No-Go. These guard:

* nobody approves above their limit, and with no limit set only the MD can,
* the preparer does not approve their own quotation,
* Part A / Part C enquiries are the Country Manager's, Part B the RH's,
* a "go" needs scope, competence, impartiality and capacity all assessed.
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
from modules.approvals.models import ApprovalLimit  # noqa: E402
from modules.approvals.service import ApprovalService  # noqa: E402
from modules.auth.models import UserLogin  # noqa: E402
from modules.enquiries.models import (  # noqa: E402
    Enquiry, GoNoGoDecision, ProposalRevision,
)
from modules.enquiries.reason_codes import ReasonCode  # noqa: E402
from modules.enquiries.service import DEFAULT_CRITERIA, EnquiryService  # noqa: E402
from modules.jobs.models import Job  # noqa: E402
from modules.regions.models import DeputyCoverage, Region  # noqa: E402

SITE = "SITE-01"
MD = {"user_id": "USR-MD", "role_id": int(Role.ADMIN), "site_id": SITE}
RH = {"user_id": "USR-RH", "role_id": int(Role.COORDINATOR), "site_id": SITE}
DEPUTY = {"user_id": "USR-DEP", "role_id": int(Role.COORDINATOR), "site_id": SITE}
OTHER = {"user_id": "USR-OTH", "role_id": int(Role.COORDINATOR), "site_id": SITE}


def _patch_mongomock():
    from mongomock_motor import AsyncMongoMockDatabase

    original = AsyncMongoMockDatabase.list_collection_names

    async def patched(self, *a, **k):
        k.pop("authorizedCollections", None)
        k.pop("nameOnly", None)
        return await original(self, *a, **k)

    AsyncMongoMockDatabase.list_collection_names = patched


@pytest_asyncio.fixture
async def db():
    _patch_mongomock()
    client = AsyncMongoMockClient()
    await init_beanie(
        database=client["approvals_test"],
        document_models=[
            ApprovalLimit, Enquiry, GoNoGoDecision, ProposalRevision, ReasonCode,
            Job, AuditEntry, Sequence, Region, DeputyCoverage, UserLogin,
        ],
    )
    for uid, code in (("USR-RH", "EMP-RH"), ("USR-DEP", "EMP-DEP"), ("USR-OTH", "EMP-OTH")):
        await UserLogin(
            user_id=uid, site_id=SITE, login_name=uid.lower(), login_password="x",
            email=f"{uid}@x", full_name=uid, role_id=int(Role.COORDINATOR),
            employee_code=code,
        ).insert()
    await Region(region_code="S", name="South", regional_head_person_id="EMP-RH").insert()
    await Region(region_code="N", name="North", regional_head_person_id="EMP-OTH").insert()
    yield client


def _scorecard(**overrides) -> list[dict]:
    out = []
    for code, label, weight in DEFAULT_CRITERIA:
        out.append({"code": code, "label": label, "weight": weight,
                    "score": overrides.get(code, 4)})
    return out


async def _limits(rh=None, md=None):
    if rh:
        await ApprovalService.set_limit(
            {"level": "RH", "max_value": rh, "reason": "test"}, SITE, "USR-MD")
    if md:
        await ApprovalService.set_limit(
            {"level": "MD", "max_value": md, "reason": "test"}, SITE, "USR-MD")


async def _go(service_line="PART_B", region="S") -> Enquiry:
    eq = await EnquiryService.create(
        {"client_id": "CLI-1", "service_line": service_line, "region_code": region},
        SITE, "EMP-PREP")
    await EnquiryService.build_scorecard(eq.enquiry_id, SITE, "EMP-PREP", auto_score=False)
    await EnquiryService.decide(
        eq.enquiry_id, {"decision": "go", "criteria": _scorecard()}, SITE, "USR-MD", MD)
    return await EnquiryService.get(eq.enquiry_id, SITE)


async def _draft(eq: Enquiry, value: float, preparer="EMP-PREP") -> dict:
    rev = await EnquiryService.create_proposal(
        eq.enquiry_id, {"inspector_cost": value}, SITE, preparer)
    return rev


async def _issue(rev, user, ref=None):
    return await EnquiryService.issue_revision(
        rev["proposal_id"], 0, SITE, user["user_id"], user, beyond_limit_reference=ref)


# ------------------------------------------------------------- limits

@pytest.mark.asyncio
async def test_no_limits_configured_means_only_the_md_can_issue(db):
    eq = await _go()
    rev = await _draft(eq, 1000)
    with pytest.raises(HTTPException) as e:
        await _issue(rev, RH)
    assert e.value.status_code == 403
    assert "No approval limits" in e.value.detail
    out = await _issue(rev, MD)
    assert out["approved_as"] == "MD"


@pytest.mark.asyncio
async def test_rh_issues_within_limit_and_not_above(db):
    await _limits(rh=100000, md=1000000)
    eq = await _go()
    small = await _draft(eq, 90000)
    assert (await _issue(small, RH))["approved_as"] == "RH"

    eq2 = await _go()
    big = await _draft(eq2, 500000)
    with pytest.raises(HTTPException) as e:
        await _issue(big, RH)
    assert e.value.status_code == 403
    assert (await _issue(big, MD))["approved_as"] == "MD"


@pytest.mark.asyncio
async def test_limit_is_inclusive(db):
    await _limits(rh=100000, md=1000000)
    eq = await _go()
    rev = await _draft(eq, 100000)
    assert (await _issue(rev, RH))["approved_as"] == "RH"


@pytest.mark.asyncio
async def test_rh_of_another_region_cannot_approve(db):
    await _limits(rh=100000, md=1000000)
    eq = await _go(region="S")
    rev = await _draft(eq, 1000)
    with pytest.raises(HTTPException):
        await _issue(rev, OTHER)   # RH of North, not South


@pytest.mark.asyncio
async def test_arranged_deputy_covers_the_absent_rh_only_while_valid(db):
    await _limits(rh=100000, md=1000000)
    cov = DeputyCoverage(
        coverage_id="DEP-1", absent_role="RH", region_code="S",
        deputy_person_id="EMP-DEP", deputy_role="RH",
        valid_until=datetime.now() + timedelta(days=3),
    )
    await cov.insert()
    eq = await _go()
    rev = await _draft(eq, 1000)
    assert (await _issue(rev, DEPUTY))["approved_as"] == "RH"

    cov.valid_until = datetime.now() - timedelta(days=1)
    await cov.save()
    eq2 = await _go()
    rev2 = await _draft(eq2, 1000)
    with pytest.raises(HTTPException):
        await _issue(rev2, DEPUTY)


@pytest.mark.asyncio
async def test_above_the_md_limit_needs_a_recorded_authority(db):
    await _limits(rh=100000, md=1000000)
    eq = await _go()
    rev = await _draft(eq, 5000000)
    with pytest.raises(HTTPException) as e:
        await _issue(rev, MD)
    assert "beyond_limit_reference" in e.value.detail
    with pytest.raises(HTTPException):
        await _issue(rev, RH, ref="Board minute 14")   # RH cannot, reference or not
    out = await _issue(rev, MD, ref="Board minute 14")
    assert out["approved_as"] == "BEYOND_MD"
    assert out["beyond_limit_reference"] == "Board minute 14"


@pytest.mark.asyncio
async def test_preparer_cannot_approve_their_own_quotation_but_md_can(db):
    await _limits(rh=100000, md=1000000)
    eq = await _go()
    rev = await _draft(eq, 1000, preparer="EMP-RH")   # RH wrote it
    with pytest.raises(HTTPException) as e:
        await _issue(rev, RH)
    assert "prepared this quotation" in e.value.detail
    assert (await _issue(rev, MD))["approved_as"] == "MD"


@pytest.mark.asyncio
async def test_setting_limits_is_append_only_and_ordered(db):
    await _limits(rh=100000, md=1000000)
    await ApprovalService.set_limit(
        {"level": "RH", "max_value": 200000, "reason": "raised"}, SITE, "USR-MD")
    hist = await ApprovalService.history(SITE)
    rh = [h for h in hist if h["level"] == "RH"]
    assert len(rh) == 2 and {h["status"] for h in rh} == {"active", "superseded"}
    assert (await ApprovalService.active_limits(SITE))["RH"] == 200000
    with pytest.raises(HTTPException) as e:   # RH may not exceed MD
        await ApprovalService.set_limit(
            {"level": "RH", "max_value": 2000000, "reason": "x"}, SITE, "USR-MD")
    assert e.value.status_code == 409
    with pytest.raises(HTTPException):        # a reason is required
        await ApprovalService.set_limit({"level": "MD", "max_value": 5}, SITE, "USR-MD")


# ----------------------------------------------------------- gate 1

@pytest.mark.asyncio
async def test_part_a_and_part_c_are_the_country_managers(db):
    for line in ("PART_A", "PART_C"):
        eq = await EnquiryService.create(
            {"client_id": "C", "service_line": line, "region_code": "S"}, SITE, "EMP-PREP")
        await EnquiryService.build_scorecard(eq.enquiry_id, SITE, "EMP-PREP", auto_score=False)
        with pytest.raises(HTTPException) as e:
            await EnquiryService.decide(
                eq.enquiry_id, {"decision": "go", "criteria": _scorecard()},
                SITE, "USR-RH", RH)
        assert e.value.status_code == 403
        assert "Country Manager" in e.value.detail


@pytest.mark.asyncio
async def test_part_b_is_the_rh_of_that_region(db):
    eq = await EnquiryService.create(
        {"client_id": "C", "region_code": "S"}, SITE, "EMP-PREP")
    await EnquiryService.build_scorecard(eq.enquiry_id, SITE, "EMP-PREP", auto_score=False)
    with pytest.raises(HTTPException):
        await EnquiryService.decide(
            eq.enquiry_id, {"decision": "go", "criteria": _scorecard()},
            SITE, "USR-OTH", OTHER)
    out = await EnquiryService.decide(
        eq.enquiry_id, {"decision": "go", "criteria": _scorecard()}, SITE, "USR-RH", RH)
    assert out["decision"] == "go"


@pytest.mark.asyncio
async def test_an_enquiry_with_no_region_is_the_country_managers(db):
    eq = await EnquiryService.create({"client_id": "C"}, SITE, "EMP-PREP")
    await EnquiryService.build_scorecard(eq.enquiry_id, SITE, "EMP-PREP", auto_score=False)
    with pytest.raises(HTTPException):
        await EnquiryService.decide(
            eq.enquiry_id, {"decision": "go", "criteria": _scorecard()},
            SITE, "USR-RH", RH)


@pytest.mark.asyncio
async def test_a_go_needs_all_four_points_assessed(db):
    for missing in ("SCOPE_FIT", "COMPETENCE", "IMPARTIALITY", "CAPACITY"):
        eq = await EnquiryService.create(
            {"client_id": "C", "region_code": "S"}, SITE, "EMP-PREP")
        await EnquiryService.build_scorecard(eq.enquiry_id, SITE, "EMP-PREP", auto_score=False)
        card = _scorecard()
        for c in card:
            if c["code"] == missing:
                c["score"] = None
        with pytest.raises(HTTPException) as e:
            await EnquiryService.decide(
                eq.enquiry_id, {"decision": "go", "criteria": card}, SITE, "USR-MD", MD)
        assert e.value.status_code == 400 and missing in e.value.detail


@pytest.mark.asyncio
async def test_a_go_over_a_zero_capacity_needs_a_reason(db):
    eq = await EnquiryService.create({"client_id": "C", "region_code": "S"}, SITE, "EMP-PREP")
    await EnquiryService.build_scorecard(eq.enquiry_id, SITE, "EMP-PREP", auto_score=False)
    card = _scorecard(CAPACITY=0)
    with pytest.raises(HTTPException) as e:
        await EnquiryService.decide(
            eq.enquiry_id, {"decision": "go", "criteria": card}, SITE, "USR-MD", MD)
    assert "CAPACITY" in e.value.detail
    out = await EnquiryService.decide(
        eq.enquiry_id,
        {"decision": "go", "criteria": card, "override_reason": "Subcontract capacity arranged."},
        SITE, "USR-MD", MD)
    assert out["decision"] == "go"


@pytest.mark.asyncio
async def test_a_no_go_does_not_need_every_point_assessed(db):
    eq = await EnquiryService.create({"client_id": "C", "region_code": "S"}, SITE, "EMP-PREP")
    await EnquiryService.build_scorecard(eq.enquiry_id, SITE, "EMP-PREP", auto_score=False)
    card = _scorecard(SCOPE_FIT=0)
    for c in card:
        if c["code"] == "CAPACITY":
            c["score"] = None
    out = await EnquiryService.decide(
        eq.enquiry_id,
        {"decision": "no_go", "criteria": card, "reason_codes": ["IMPARTIALITY_CONFLICT"]},
        SITE, "USR-RH", RH)
    assert out["decision"] == "no_go"


@pytest.mark.asyncio
async def test_service_line_is_normalised_and_bad_values_refused(db):
    eq = await EnquiryService.create(
        {"client_id": "C", "service_line": "MANPOWER", "region_code": "s"}, SITE, "E")
    assert eq.service_line == "PART_A" and eq.region_code == "S"
    with pytest.raises(HTTPException) as e:
        await EnquiryService.create({"client_id": "C", "service_line": "BOGUS"}, SITE, "E")
    assert e.value.status_code == 422
