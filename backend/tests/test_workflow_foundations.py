"""Foundations the IQEIPL workflow depends on.

Each group guards a rule that was wrong or absent:

* every audit() call is well-formed (13 modules could not write at all);
* a closed NCR counts as closed when a release note checks it;
* IQE claims no accreditation, and the mark appears only where allowed;
* a J.No is continued by a new PO / renewal / new year and opened by a new
  project / site / client / scope;
* nobody signs off work they did.
"""
import ast
import sys
from pathlib import Path

import pytest
import pytest_asyncio
from beanie import init_beanie
from fastapi import HTTPException
from mongomock_motor import AsyncMongoMockClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from core import claims  # noqa: E402
from core.audit import AuditEntry  # noqa: E402
from core.sequences import Sequence  # noqa: E402
from modules.enquiries.models import Enquiry, EnquiryStatus  # noqa: E402
from modules.job_handoff import jno  # noqa: E402
from modules.job_handoff.models import JobConversion  # noqa: E402
from modules.job_handoff.service import JobHandoffService  # noqa: E402
from modules.jobs.models import Job  # noqa: E402
from modules.ncr.models import NCR  # noqa: E402
from modules.punch_list.models import PunchItem  # noqa: E402
from modules.release_notes.models import InspectionReleaseNote  # noqa: E402
from modules.release_notes.service import ReleaseNoteService  # noqa: E402
from modules.rfi.models import RFI  # noqa: E402
from modules.signoff.models import ReportSignoff  # noqa: E402
from modules.signoff.service import SignoffService  # noqa: E402
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


@pytest_asyncio.fixture
async def db():
    _patch_mongomock()
    client = AsyncMongoMockClient()
    await init_beanie(
        database=client["foundations_test"],
        document_models=[
            AuditEntry, Sequence, NCR, PunchItem, RFI, InspectionReleaseNote,
            Enquiry, Job, JobConversion, ReportSignoff, Visit,
        ],
    )
    yield client


# --------------------------------------------------------------- audit calls

def test_every_audit_call_has_a_valid_shape():
    """audit() is core.audit.record: (entity_type, entity_id, action, *, ...).
    A wrong shape raises TypeError before the call's own try/except, which
    turned every write endpoint of the affected modules into a 500."""
    allowed = {"actor", "changes", "before", "after", "note", "context", "site_id"}
    problems = []
    for path in (ROOT / "modules").rglob("*.py"):
        tree = ast.parse(path.read_text())
        aliased = any(
            isinstance(n, ast.ImportFrom) and n.module == "core.audit"
            and any(a.name == "record" and a.asname == "audit" for a in n.names)
            for n in ast.walk(tree)
        )
        if not aliased:
            continue
        for n in ast.walk(tree):
            if isinstance(n, ast.Call) and getattr(n.func, "id", None) == "audit":
                where = f"{path.relative_to(ROOT)}:{n.lineno}"
                if len(n.args) != 3:
                    problems.append(f"{where}: needs exactly 3 positional args, has {len(n.args)}")
                if n.args and isinstance(n.args[0], ast.Attribute) and getattr(n.args[0].value, "id", None) == "AuditAction":
                    problems.append(f"{where}: action passed first")
                for k in n.keywords:
                    if k.arg not in allowed:
                        problems.append(f"{where}: unknown keyword {k.arg!r}")
                    if k.arg == "changes" and isinstance(k.value, ast.Dict):
                        problems.append(f"{where}: changes must be a list of ChangedField, not a dict")
    assert not problems, "\n".join(problems)


# ---------------------------------------------------------- release-note gate

async def _ncr(ncr_id, status, job="JOB-X"):
    n = NCR.model_construct(
        ncr_id=ncr_id, site_id=SITE, job_id=job, status=status,
        title="t", description="d",
    )
    await n.insert()


@pytest.mark.asyncio
async def test_a_closed_ncr_does_not_block_a_release_note(db):
    await _ncr("NCR-1", "CLOSED")
    await RFI(rfi_id="RFI-1", job_id="JOB-X", description="d", status="inspected").insert()
    irn = await ReleaseNoteService.create({"job_id": "JOB-X", "description": "d"}, SITE, "U")
    out = await ReleaseNoteService.check_preconditions(irn["irn_id"], SITE, "U")
    assert out["ncrs_closed"] is True
    assert out["ncr_closed_count"] == 1
    assert out["preconditions_met"] is True


@pytest.mark.asyncio
async def test_an_open_ncr_blocks_and_is_named(db):
    await _ncr("NCR-1", "CLOSED")
    await _ncr("NCR-2", "AWAITING_VERIFICATION")
    irn = await ReleaseNoteService.create({"job_id": "JOB-X", "description": "d"}, SITE, "U")
    out = await ReleaseNoteService.check_preconditions(irn["irn_id"], SITE, "U")
    assert out["ncrs_closed"] is False
    assert out["ncr_open_ids"] == ["NCR-2"]


@pytest.mark.asyncio
async def test_a_void_ncr_raised_in_error_does_not_block(db):
    await _ncr("NCR-1", "VOID")
    irn = await ReleaseNoteService.create({"job_id": "JOB-X", "description": "d"}, SITE, "U")
    out = await ReleaseNoteService.check_preconditions(irn["irn_id"], SITE, "U")
    assert out["ncrs_closed"] is True
    assert out["ncr_total"] == 0, "a void NCR is not a finding"


# ------------------------------------------------------------------- claims

def test_part_definitions_follow_the_workflow():
    assert claims.normalise_service_line("MANPOWER") is claims.ServiceLine.PART_A
    assert claims.normalise_service_line("part_b") is claims.ServiceLine.PART_B
    assert claims.normalise_service_line(None) is claims.ServiceLine.PART_B
    assert "manpower" in claims.LABELS[claims.ServiceLine.PART_A]
    assert "inspection" in claims.LABELS[claims.ServiceLine.PART_B]
    with pytest.raises(ValueError):
        claims.normalise_service_line("PART_Z")


def test_no_mark_while_iqe_holds_no_accreditation():
    out = claims.accreditation_mark("PART_B", in_accredited_scope=True)
    assert out["permitted"] is False
    assert "no accreditation" in out["reason"]


def test_mark_only_for_part_b_inside_scope(monkeypatch):
    monkeypatch.setattr(claims, "holds_accreditation", lambda: True)
    assert claims.accreditation_mark("PART_B", True)["permitted"] is True
    assert claims.accreditation_mark("PART_B", False)["permitted"] is False
    for line in ("PART_A", "MANPOWER", "PART_C"):
        r = claims.accreditation_mark(line, True)
        assert r["permitted"] is False, line
        assert "never carries" in r["reason"]


@pytest.mark.asyncio
async def test_release_note_mark_is_decided_by_the_rule_not_the_request(db, monkeypatch):
    monkeypatch.setattr(claims, "holds_accreditation", lambda: True)
    forged = await ReleaseNoteService.create(
        {"job_id": "J", "description": "d", "service_line": "PART_C",
         "accreditation_mark": True, "in_accredited_scope": True}, SITE, "U")
    assert forged["accreditation_mark"] is False, "Part C release notes never carry the mark"
    ok = await ReleaseNoteService.create(
        {"job_id": "J", "description": "d", "service_line": "PART_B",
         "in_accredited_scope": True}, SITE, "U")
    assert ok["accreditation_mark"] is True


@pytest.mark.asyncio
async def test_release_note_refuses_an_unknown_service_line(db):
    with pytest.raises(HTTPException) as e:
        await ReleaseNoteService.create({"job_id": "J", "description": "d", "service_line": "Q"}, SITE, "U")
    assert e.value.status_code == 422


def test_no_source_file_claims_an_accreditation_iqe_does_not_hold():
    """The wording is checked in source because it ends up on client-facing
    PDFs and screens, where nobody re-reads it."""
    banned = ["9001:2026", "Accredited Type A", "17020:2026 Type A", "IQE Type A"]
    hits = []
    for base, pattern in ((ROOT / "modules", "*.py"), (ROOT.parent / "apps" / "web" / "src", "*.tsx")):
        for path in base.rglob(pattern):
            text = path.read_text()
            for b in banned:
                if b in text:
                    hits.append(f"{path}: {b}")
    assert not hits, "\n".join(hits)


# --------------------------------------------------------------------- J.No

def test_financial_year_code_rolls_over_in_april():
    from datetime import datetime

    assert jno.financial_year_code(datetime(2026, 4, 1)) == "2627"
    assert jno.financial_year_code(datetime(2027, 3, 31)) == "2627"
    assert jno.financial_year_code(datetime(2027, 4, 1)) == "2728"


def test_j_no_parse_rejects_nonsense():
    assert jno.parse("S-2627-0001")["region"] == "S"
    with pytest.raises(HTTPException):
        jno.parse("JOB-2026-001")


async def _won(enq_id, client="CLI-1"):
    e = Enquiry.model_construct(
        enquiry_id=enq_id, site_id=SITE, client_id=client,
        status=EnquiryStatus.WON.value, pipeline_value=100000.0,
        current_proposal_id=None, current_revision_no=None, won_job_id=None,
    )
    await e.insert()


@pytest.mark.asyncio
async def test_a_new_project_opens_a_j_no_in_its_region(db):
    await _won("ENQ-1")
    out = await JobHandoffService.convert_enquiry_to_job(
        {"enquiry_id": "ENQ-1", "region_code": "s", "po_number": "PO-1"}, SITE, "U")
    assert out["j_no"].startswith("S-") and out["j_no"].endswith("-0001")
    assert out["conversion"]["trigger"] == "NEW_PROJECT"


@pytest.mark.asyncio
async def test_a_second_project_in_the_region_gets_the_next_number(db):
    await _won("ENQ-1")
    await _won("ENQ-2")
    a = await JobHandoffService.convert_enquiry_to_job({"enquiry_id": "ENQ-1", "region_code": "S"}, SITE, "U")
    b = await JobHandoffService.convert_enquiry_to_job({"enquiry_id": "ENQ-2", "region_code": "S"}, SITE, "U")
    assert a["j_no"] != b["j_no"]
    assert b["j_no"].endswith("-0002")


@pytest.mark.asyncio
@pytest.mark.parametrize("trigger", ["NEW_PO", "RENEWAL", "NEW_YEAR"])
async def test_new_po_renewal_and_new_year_stay_under_the_same_j_no(db, trigger):
    await _won("ENQ-1")
    await _won("ENQ-2")
    first = await JobHandoffService.convert_enquiry_to_job(
        {"enquiry_id": "ENQ-1", "region_code": "S", "po_number": "PO-1"}, SITE, "U")
    again = await JobHandoffService.convert_enquiry_to_job(
        {"enquiry_id": "ENQ-2", "region_code": "S", "po_number": "PO-2",
         "trigger": trigger, "existing_j_no": first["j_no"]}, SITE, "U")
    assert again["j_no"] == first["j_no"]
    assert again["job"]["job_id"] == first["job"]["job_id"], "no second job is opened"
    assert again["job"]["po_references"] == ["PO-1", "PO-2"]
    assert again["conversion"]["conversion_id"].endswith("-02")
    assert await Job.find({"j_no": first["j_no"]}).count() == 1


@pytest.mark.asyncio
async def test_a_reuse_trigger_without_a_j_no_is_refused(db):
    await _won("ENQ-1")
    with pytest.raises(HTTPException) as e:
        await JobHandoffService.convert_enquiry_to_job(
            {"enquiry_id": "ENQ-1", "region_code": "S", "trigger": "RENEWAL"}, SITE, "U")
    assert e.value.status_code == 422 and "existing_j_no" in e.value.detail


@pytest.mark.asyncio
async def test_reusing_a_j_no_for_another_client_is_refused(db):
    """One client's invoices would land on another's trail."""
    await _won("ENQ-1", client="CLI-1")
    await _won("ENQ-2", client="CLI-2")
    first = await JobHandoffService.convert_enquiry_to_job({"enquiry_id": "ENQ-1", "region_code": "S"}, SITE, "U")
    with pytest.raises(HTTPException) as e:
        await JobHandoffService.convert_enquiry_to_job(
            {"enquiry_id": "ENQ-2", "region_code": "S", "trigger": "NEW_PO",
             "existing_j_no": first["j_no"]}, SITE, "U")
    assert e.value.status_code == 409 and "another client" in e.value.detail


@pytest.mark.asyncio
async def test_reusing_a_j_no_across_regions_is_refused(db):
    await _won("ENQ-1")
    await _won("ENQ-2")
    first = await JobHandoffService.convert_enquiry_to_job({"enquiry_id": "ENQ-1", "region_code": "S"}, SITE, "U")
    with pytest.raises(HTTPException) as e:
        await JobHandoffService.convert_enquiry_to_job(
            {"enquiry_id": "ENQ-2", "region_code": "N", "trigger": "NEW_PO",
             "existing_j_no": first["j_no"]}, SITE, "U")
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_an_unknown_trigger_is_refused(db):
    await _won("ENQ-1")
    with pytest.raises(HTTPException) as e:
        await JobHandoffService.convert_enquiry_to_job(
            {"enquiry_id": "ENQ-1", "region_code": "S", "trigger": "WHIM"}, SITE, "U")
    assert e.value.status_code == 422


@pytest.mark.asyncio
async def test_a_job_created_directly_with_a_region_gets_a_j_no(db):
    from modules.jobs.service import JobService

    job = await JobService.create(
        {"title": "Direct", "region_code": "E", "service_line": "MANPOWER"}, SITE, "U")
    assert job.j_no.startswith("E-")
    assert job.service_line == "PART_A", "legacy MANPOWER maps to Part A"


# ------------------------------------------------------------------ sign-off

async def _signoff(**kw):
    await Job(job_id="JOB-X", title="t", assigned_inspector_id="PER-INSP").insert()
    return await SignoffService.create({"job_id": "JOB-X", **kw}, SITE, "U")


@pytest.mark.asyncio
async def test_the_inspector_cannot_sign_off_their_own_work(db):
    s = await _signoff()
    assert "PER-INSP" in s["prepared_by_person_ids"]
    with pytest.raises(HTTPException) as e:
        await SignoffService.submit_review(
            s["signoff_id"], {"result": "approved", "signed_by_person_id": "PER-INSP"}, SITE, "U")
    assert e.value.status_code == 409 and "never self-review" in e.value.detail


@pytest.mark.asyncio
async def test_a_visit_inspector_is_also_barred(db):
    await Visit.model_construct(
        visit_id="V-1", job_id="JOB-X", site_id=SITE, inspector_id="PER-VIS").insert()
    s = await _signoff()
    assert "PER-VIS" in s["prepared_by_person_ids"]
    with pytest.raises(HTTPException):
        await SignoffService.submit_review(
            s["signoff_id"], {"result": "approved", "signed_by_person_id": "PER-VIS"}, SITE, "U")


@pytest.mark.asyncio
async def test_a_deputy_rh_cannot_sign_a_job_they_sold(db):
    s = await _signoff(sold_by_person_id="PER-RH")
    with pytest.raises(HTTPException) as e:
        await SignoffService.assign_deputy(
            s["signoff_id"], {"deputy_person_id": "PER-RH", "role": "deputy_rh"}, SITE, "U")
    assert "did not sell" in e.value.detail


@pytest.mark.asyncio
async def test_a_deputy_rh_must_confirm_scope_and_conflicts_first(db):
    s = await _signoff(sold_by_person_id="PER-OTHER")
    await SignoffService.assign_deputy(
        s["signoff_id"], {"deputy_person_id": "PER-RH", "role": "deputy_rh"}, SITE, "U")
    with pytest.raises(HTTPException) as e:
        await SignoffService.submit_review(s["signoff_id"], {"result": "approved"}, SITE, "PER-RH")
    assert "authorised scope" in e.value.detail
    out = await SignoffService.submit_review(
        s["signoff_id"], {"result": "approved", "scope_verified": True, "coi_checked": True},
        SITE, "PER-RH")
    assert out["status"] == "approved" and out["signed_by_role"] == "deputy_rh"


@pytest.mark.asyncio
async def test_another_regions_tm_needs_the_country_manager_to_have_arranged_it(db):
    s = await _signoff()
    with pytest.raises(HTTPException) as e:
        await SignoffService.submit_review(
            s["signoff_id"],
            {"result": "approved", "signed_by_person_id": "PER-TM2", "signed_by_role": "cross_region_tm"},
            SITE, "U")
    assert "Country Manager" in e.value.detail
    out = await SignoffService.submit_review(
        s["signoff_id"],
        {"result": "approved", "signed_by_person_id": "PER-TM2", "signed_by_role": "cross_region_tm",
         "cross_region_code": "N", "arranged_by": "PER-CM"}, SITE, "U")
    assert out["status"] == "approved"


@pytest.mark.asyncio
async def test_the_assigned_tm_can_approve_normally(db):
    s = await _signoff(assigned_tm_person_id="PER-TM")
    out = await SignoffService.submit_review(
        s["signoff_id"], {"result": "approved", "signed_by_person_id": "PER-TM"}, SITE, "U")
    assert out["status"] == "approved"
