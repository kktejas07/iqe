"""Where the workflow's modules meet: RFI <-> ITP hold points, the release-note
gate that reads them, inter-region loans priced from the rate card, record ids
the region module never assigned, and the design-independence check.
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
from core.sequences import Sequence  # noqa: E402
from modules.itp.models import InspectionCall, InspectionTestPlan  # noqa: E402
from modules.itp.service import ITPService  # noqa: E402
from modules.ncr.models import NCR  # noqa: E402
from modules.punch_list.models import PunchItem  # noqa: E402
from modules.rates.models import RateCard, RateFloor  # noqa: E402
from modules.rates.service import RateService  # noqa: E402
from modules.regions.models import (  # noqa: E402
    DeputyCoverage, InspectorLoan, InterOfficeSettlement, Office, Region,
)
from modules.regions.service import RegionService  # noqa: E402
from modules.release_notes.models import InspectionReleaseNote  # noqa: E402
from modules.release_notes.service import ReleaseNoteService  # noqa: E402
from modules.rfi.models import RFI  # noqa: E402
from modules.rfi.service import RFIService  # noqa: E402
from modules.risk import design_independence as di  # noqa: E402

SITE = "SITE-01"
USER = "EMP-COORD"
JOB = "JOB-2026-0003"


def _patch_mongomock():
    from mongomock_motor import AsyncMongoMockDatabase

    original = AsyncMongoMockDatabase.list_collection_names

    async def patched(self, *args, **kwargs):
        kwargs.pop("authorizedCollections", None)
        kwargs.pop("nameOnly", None)
        return await original(self, *args, **kwargs)

    AsyncMongoMockDatabase.list_collection_names = patched


@pytest_asyncio.fixture
async def db():
    _patch_mongomock()
    client = AsyncMongoMockClient()
    await init_beanie(
        database=client["links_test"],
        document_models=[
            AuditEntry, Sequence, InspectionTestPlan, InspectionCall, RFI, NCR,
            PunchItem, InspectionReleaseNote, RateCard, RateFloor, Region, Office,
            InterOfficeSettlement, InspectorLoan, DeputyCoverage,
        ],
    )
    yield client


HOLD = {
    "point_id": "4.3.2", "activity": "Concrete pour", "discipline": "Civil",
    "intervention": "H", "reference_document": "SHMIC/STR/104",
    "reference_revision": "Rev C", "acceptance_criteria": "Cover 40mm +/- 5mm.",
}


async def _plan():
    plan = await ITPService.create(
        {"job_id": JOB, "title": "Block B", "client_reference": "ITP/07",
         "revision": "Rev 1", "points": [HOLD]}, SITE, USER)
    await ITPService.approve(plan["itp_id"], SITE, USER)
    return plan


async def _rfi(plan, **kw):
    return await RFIService.create(
        {"description": "Pour ready", "itp_id": plan["itp_id"], "itp_line_ref": "4.3.2",
         "requested_date": datetime.now() + timedelta(days=7),
         "inspection_point_type": "surveillance",   # a lie the plan overrides
         **kw}, SITE, "CONTRACTOR")


# ------------------------------------------------------- RFI <-> ITP link

@pytest.mark.asyncio
async def test_an_rfi_against_an_itp_point_creates_the_inspection_call(db):
    plan = await _plan()
    rfi = await _rfi(plan)
    assert rfi["inspection_call_id"]
    call = await ITPService.get_call(rfi["inspection_call_id"], SITE)
    assert call.itp_id == plan["itp_id"] and call.point_id == "4.3.2"
    assert rfi["job_id"] == JOB, "the job comes from the plan, not the request"


@pytest.mark.asyncio
async def test_the_plan_decides_the_intervention_not_the_requester(db):
    plan = await _plan()
    rfi = await _rfi(plan)
    assert rfi["inspection_point_type"] == "hold"


@pytest.mark.asyncio
async def test_the_request_cannot_name_its_own_call(db):
    plan = await _plan()
    rfi = await _rfi(plan, inspection_call_id="ICN-FAKE")
    assert rfi["inspection_call_id"] != "ICN-FAKE"


@pytest.mark.asyncio
async def test_an_rfi_against_a_draft_plan_is_refused(db):
    plan = await ITPService.create(
        {"job_id": JOB, "title": "t", "points": [HOLD]}, SITE, USER)
    with pytest.raises(HTTPException) as e:
        await _rfi(plan)
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_an_rfi_against_a_point_needs_a_date(db):
    plan = await _plan()
    with pytest.raises(HTTPException) as e:
        await RFIService.create(
            {"description": "x", "job_id": JOB, "itp_id": plan["itp_id"], "itp_line_ref": "4.3.2"},
            SITE, "C")
    assert e.value.status_code == 422


@pytest.mark.asyncio
async def test_recording_the_rfi_result_releases_the_call(db):
    plan = await _plan()
    rfi = await _rfi(plan)
    await RFIService.record_result(rfi["rfi_id"], {"result": "accepted"}, SITE, "INSP")
    call = await ITPService.get_call(rfi["inspection_call_id"], SITE)
    assert call.status == "ATTENDED" and call.outcome == "ACCEPTED"


@pytest.mark.asyncio
async def test_a_rejected_rfi_result_needs_a_note_like_the_call_does(db):
    plan = await _plan()
    rfi = await _rfi(plan)
    with pytest.raises(HTTPException):
        await RFIService.record_result(rfi["rfi_id"], {"result": "rejected"}, SITE, "INSP")


@pytest.mark.asyncio
async def test_an_unknown_result_is_refused_for_a_linked_rfi(db):
    plan = await _plan()
    rfi = await _rfi(plan)
    with pytest.raises(HTTPException) as e:
        await RFIService.record_result(rfi["rfi_id"], {"result": "meh"}, SITE, "INSP")
    assert e.value.status_code == 422


@pytest.mark.asyncio
async def test_an_unlinked_rfi_still_works_as_before(db):
    rfi = await RFIService.create({"job_id": JOB, "description": "Ad hoc"}, SITE, "C")
    assert rfi["inspection_call_id"] is None
    out = await RFIService.record_result(rfi["rfi_id"], {"result": "accepted"}, SITE, "I")
    assert out["status"] == "inspected"


# ------------------------------------------------- release-note hold gate

async def _irn_check():
    irn = await ReleaseNoteService.create({"job_id": JOB, "description": "d"}, SITE, "U")
    return await ReleaseNoteService.check_preconditions(irn["irn_id"], SITE, "U")


@pytest.mark.asyncio
async def test_an_open_hold_point_blocks_the_release_note(db):
    plan = await _plan()
    await _rfi(plan)
    out = await _irn_check()
    assert out["hold_points_count"] == 1 and out["hold_points_signed"] is False


@pytest.mark.asyncio
async def test_an_accepted_hold_point_releases_the_gate(db):
    plan = await _plan()
    rfi = await _rfi(plan)
    await RFIService.record_result(rfi["rfi_id"], {"result": "accepted"}, SITE, "INSP")
    out = await _irn_check()
    assert out["hold_points_signed"] is True
    assert out["hold_points_count"] == 1, "the RFI and its call are one hold point, not two"


@pytest.mark.asyncio
async def test_a_rejected_hold_point_does_not_release_the_gate(db):
    plan = await _plan()
    rfi = await _rfi(plan)
    await RFIService.record_result(
        rfi["rfi_id"], {"result": "rejected", "note": "Cover short"}, SITE, "INSP")
    out = await _irn_check()
    assert out["hold_points_signed"] is False


@pytest.mark.asyncio
async def test_a_call_raised_directly_without_an_rfi_still_counts(db):
    plan = await _plan()
    call = await ITPService.raise_call(
        {"itp_id": plan["itp_id"], "point_id": "4.3.2",
         "requested_date": datetime.now() + timedelta(days=7)}, SITE, USER)
    out = await _irn_check()
    assert out["hold_points_count"] == 1 and out["hold_points_signed"] is False
    await ITPService.record_attendance(call["call_id"], {"outcome": "ACCEPTED"}, SITE, USER)
    assert (await _irn_check())["hold_points_signed"] is True


# --------------------------------------------------- loans and region ids

async def _house_loan_rate(rate=9000.0):
    c = await RateService.create_card(
        {"name": "Internal", "lines": [
            {"work_type_code": "INSPECTOR_LOAN", "rate_basis": "PER_DAY", "rate": rate}]},
        SITE, "FIN")
    await RateService.activate(c["card_id"], {}, SITE, "FIN")
    return c


LOAN = {"inspector_person_id": "PER-1", "home_region": "n", "borrowing_region": "s"}


@pytest.mark.asyncio
async def test_a_loan_is_priced_from_the_internal_rate_card(db):
    card = await _house_loan_rate(9000.0)
    loan = await RegionService.create_loan(dict(LOAN), "CM")
    assert loan.rate_card_rate == 9000.0
    assert loan.rate_card_id == card["card_id"]
    assert loan.loan_id.startswith("LOAN-")
    assert (loan.home_region, loan.borrowing_region) == ("N", "S")


@pytest.mark.asyncio
async def test_a_loan_without_a_priced_rate_is_refused_not_guessed(db):
    with pytest.raises(HTTPException) as e:
        await RegionService.create_loan(dict(LOAN), "CM")
    assert e.value.status_code == 422 and "No internal rate card" in e.value.detail


@pytest.mark.asyncio
async def test_a_hand_typed_loan_rate_that_differs_from_the_card_is_refused(db):
    await _house_loan_rate(9000.0)
    with pytest.raises(HTTPException) as e:
        await RegionService.create_loan({**LOAN, "rate_card_rate": 5000}, "CM")
    assert e.value.status_code == 409
    ok = await RegionService.create_loan({**LOAN, "rate_card_rate": 9000}, "CM")
    assert ok.rate_card_rate == 9000.0


@pytest.mark.asyncio
async def test_loan_ids_do_not_collide(db):
    await _house_loan_rate()
    a = await RegionService.create_loan(dict(LOAN), "CM")
    b = await RegionService.create_loan(dict(LOAN), "CM")
    assert a.loan_id != b.loan_id


@pytest.mark.asyncio
async def test_a_loan_within_one_region_is_still_refused(db):
    await _house_loan_rate()
    with pytest.raises(HTTPException):
        await RegionService.create_loan({**LOAN, "borrowing_region": "N"}, "CM")


@pytest.mark.asyncio
async def test_office_settlement_and_deputy_ids_are_assigned(db):
    await RegionService.create_region(
        {"region_code": "s", "name": "South"}, "CM")
    office = await RegionService.create_office("S", {"name": "Hyderabad"}, "CM")
    assert office.office_id.startswith("OFF-S-")
    st = await RegionService.create_settlement(
        {"from_region": "S", "to_region": "HO", "period_year": 2026, "period_month": 9,
         "fee_collected": 100000.0}, "FIN")
    assert st.settlement_id.startswith("IOS-")
    assert st.ho_pool_share == 25000.0
    dep = await RegionService.set_deputy(
        {"region_code": "s", "absent_role": "TM", "absent_person_id": "P1",
         "deputy_person_id": "P2", "deputy_role": "RH"}, "CM")
    assert dep.coverage_id.startswith("DEP-")


# ------------------------------------------------- design independence (D1)

def test_design_of_an_item_iqe_inspected_is_refused():
    with pytest.raises(HTTPException) as e:
        di.enforce("DESIGN", inspected_by_iqe=True, similar_competitive=False, item="V-101")
    assert e.value.status_code == 409 and "appraisal" in e.value.detail.lower()


def test_design_of_a_similar_competitive_item_is_refused():
    with pytest.raises(HTTPException):
        di.enforce("DESIGN", inspected_by_iqe=False, similar_competitive=True)


def test_a_conflicted_item_may_still_be_appraised_under_part_b():
    out = di.enforce("APPRAISAL", inspected_by_iqe=True, similar_competitive=False)
    assert out["permitted_engagement"] == "APPRAISAL" and out["service_line"] == "PART_B"


def test_design_without_a_conflict_is_project_support():
    out = di.enforce("DESIGN", inspected_by_iqe=False, similar_competitive=False)
    assert out["service_line"] == "PART_C" and out["conflicted"] is False


def test_dry_run_reports_the_decision_without_refusing():
    out = di.decide("DESIGN", inspected_by_iqe=True, similar_competitive=False)
    assert out["allowed"] is False and out["permitted_engagement"] == "APPRAISAL"


def test_an_unknown_engagement_is_refused():
    with pytest.raises(HTTPException) as e:
        di.decide("CONSULT", inspected_by_iqe=False, similar_competitive=False)
    assert e.value.status_code == 422
