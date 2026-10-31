"""Runs the scenario seeder for real, against an in-memory MongoDB.

The seeder drives the real services and aborts if any scenario that should be
refused is allowed, so a clean run is itself a check that the rules hold. This
test runs it, then asserts the states a person would open the screens to see.
"""
import importlib.util
import sys
from pathlib import Path

import pytest
import pytest_asyncio
from beanie import init_beanie
from mongomock_motor import AsyncMongoMockClient

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from core.config import settings  # noqa: E402


def _load():
    spec = importlib.util.spec_from_file_location("seed_scenarios", BACKEND / "scripts" / "seed_scenarios.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


seeder = _load()


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
    await init_beanie(database=c["scenarios_test"], document_models=seeder.MODELS)
    yield c


def quiet(_):
    pass


@pytest.mark.asyncio
async def test_seed_runs_clean_and_every_expected_refusal_happens(db, monkeypatch):
    monkeypatch.setattr(settings, "iqe_gstin", None)
    monkeypatch.setattr(settings, "rbi_bank_rate_pct", 5.75)
    out = await seeder.run_seed(quiet)
    assert out["refusals_demonstrated"] >= 78
    assert out["engagements"] == 26
    assert settings.iqe_gstin is None, "the demo GSTIN must never be left in configuration"


@pytest.mark.asyncio
async def test_training_engagements_are_in_every_state(db, monkeypatch):
    monkeypatch.setattr(settings, "rbi_bank_rate_pct", 5.75)
    await seeder.run_seed(quiet)
    from modules.engagements.models import Engagement

    def done(e):
        return [s.code for s in e.steps if s.status == "done"]

    by_job = {e.job_id: e for e in await Engagement.find({"service_line": "TRAINING"}).to_list()}
    assert done(by_job["JOB-SCN-TRN-01"]) == ["T1"]
    assert done(by_job["JOB-SCN-TRN-02"]) == ["T1", "T2"]
    assert done(by_job["JOB-SCN-TRN-04"]) == ["T1", "T2", "T3"]
    assert done(by_job["JOB-SCN-TRN-05"]) == ["T1", "T2", "T3", "T4"]
    assert done(by_job["JOB-SCN-TRN-06"]) == ["T1", "T2", "T3", "T4", "T5"]
    assert by_job["JOB-SCN-TRN-07"].status == "closed"
    # nobody passed: assessed but no certificate can follow
    assert done(by_job["JOB-SCN-TRN-08"]) == ["T1", "T2", "T3", "T4"] and by_job["JOB-SCN-TRN-08"].status == "open"
    # only those who passed were certificated
    t5 = next(s for s in by_job["JOB-SCN-TRN-06"].steps if s.code == "T5")
    assert t5.data["participants"] == ["Anil", "Bhavna", "Chetan"]


@pytest.mark.asyncio
async def test_other_lines_reach_blocked_and_closed(db, monkeypatch):
    monkeypatch.setattr(settings, "rbi_bank_rate_pct", 5.75)
    await seeder.run_seed(quiet)
    from modules.engagements.models import Engagement

    rows = {e.job_id: e for e in await Engagement.find({}).to_list()}
    assert rows["JOB-SCN-DS-01"].status == "blocked" and rows["JOB-SCN-DS-02"].status == "blocked"
    for k in ("EXP-04", "VA-03", "VA-04", "AI-05", "DS-05", "TRN-07"):
        assert rows[f"JOB-SCN-{k}"].status == "closed", k
    assert rows["JOB-SCN-EXP-03"].status == "open"      # report unsigned: cannot close


@pytest.mark.asyncio
async def test_authorisations_cover_every_state(db, monkeypatch):
    monkeypatch.setattr(settings, "rbi_bank_rate_pct", 5.75)
    await seeder.run_seed(quiet)
    from modules.people.models import Authorization
    from modules.people import scope

    states = {a.status for a in await Authorization.find({}).to_list()}
    assert {"pending", "recommended", "authorized", "suspended", "withdrawn", "expired"} <= states
    auths = await Authorization.find({}).to_list()
    assert any(a.renewal_count == 1 for a in auths)
    assert any(a.renewal_recommended_by and a.renewal_count == 0 for a in auths)
    assert any(a.status == "authorized" and not scope.currency(a)[0] for a in auths), "a review-overdue record"
    assert any(not a.service_lines for a in auths), "a legacy inspection-only record"


@pytest.mark.asyncio
async def test_payables_cover_gst_tds_and_msme_cases(db, monkeypatch):
    monkeypatch.setattr(settings, "rbi_bank_rate_pct", 5.75)
    await seeder.run_seed(quiet)
    from modules.finance.models import AccountPayable
    from modules.purchasing.models import VendorPayment

    bills = await VendorPayment.find({}).to_list()
    by = {b.vendor_name.split(" (")[0] + str(b.taxable_value): b for b in bills}
    assert any(b.cgst and b.sgst and not b.igst for b in bills)            # intra-state
    assert any(b.igst and not b.cgst for b in bills)                       # inter-state
    assert any(b.reverse_charge and b.amount == b.taxable_value for b in bills)
    assert {b.tds_section for b in bills} >= {"194C", "194J", "194J_TECH", "194H", None}
    assert any(b.tds_rate_pct == 20.0 for b in bills)                      # no PAN
    assert any(b.tds_rate_pct == 0.5 for b in bills)                       # lower-deduction certificate
    assert any(b.tds_section == "194H" and b.tds_deducted == 0 for b in bills)   # below threshold
    thresh = sorted((b for b in bills if "crosses the threshold" in b.vendor_name), key=lambda b: b.vp_id)
    assert [b.tds_deducted for b in thresh[:3]] == [0.0, 0.0, 0.0] and thresh[3].tds_deducted > 0
    assert {b.status for b in bills} == {"pending", "approved", "paid"}
    late = [b for b in bills if b.status == "paid" and b.msme_late_days]
    assert late and all(b.msme_interest and b.msme_interest > 0 for b in late)
    assert any(b.status == "paid" and b.msme_category == "micro" and not b.msme_late_days for b in bills)
    assert await AccountPayable.find({}).count() == len(bills)


@pytest.mark.asyncio
async def test_running_twice_changes_nothing_and_wipe_removes_everything(db, monkeypatch):
    monkeypatch.setattr(settings, "rbi_bank_rate_pct", 5.75)
    from modules.engagements.models import Engagement
    from modules.purchasing.models import Vendor, VendorPayment
    from modules.people.models import Person

    await seeder.run_seed(quiet)
    before = (await Engagement.find({}).count(), await VendorPayment.find({}).count())
    again = await seeder.run_seed(quiet)
    assert again == {"already_seeded": True}
    assert (await Engagement.find({}).count(), await VendorPayment.find({}).count()) == before

    await seeder.run_wipe(quiet)
    for m in (Engagement, VendorPayment, Vendor, Person):
        assert await m.find({}).count() == 0, m.__name__
    assert (await seeder.run_seed(quiet)).get("engagements")     # and it can be seeded again
