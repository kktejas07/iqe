"""Payroll is fed by salary structures and approved timesheets, never a guess.

Before: every person got the same hard-coded ₹25,000 basic, pay was docked for
weekends, unapproved attendance counted, a second run for the same month was
allowed, and the person who processed a run could approve it.
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
from core.sequences import Sequence  # noqa: E402
from modules.leave_attendance.models import AttendanceRecord, LeaveRequest, Timesheet  # noqa: E402
from modules.payroll.models import PayrollRun, Payslip, SalaryStructure  # noqa: E402
from modules.payroll.service import PayrollService  # noqa: E402
from modules.people.models import Person  # noqa: E402

SITE = "SITE-01"
MD = {"user_id": "USR-MD", "role_id": 1}
FIN = {"user_id": "USR-FI", "role_id": 6}


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
        database=c["payroll_ts"],
        document_models=[PayrollRun, Payslip, SalaryStructure, Person, Timesheet,
                         LeaveRequest, AttendanceRecord, AuditEntry, Sequence],
    )
    yield c


async def _person(pid="EMP-1", status="active"):
    await Person(person_id=pid, site_id=SITE, full_name=pid, employment_status=status).insert()


async def _salary(pid="EMP-1", basic=30000, **kw):
    return await PayrollService.set_salary_structure(
        pid, {"basic": basic, "hra": 12000, "reason": "offer letter", **kw}, SITE, MD)


async def _sheet(pid="EMP-1", days=22, status="approved", month=10, region=None):
    await Timesheet(timesheet_id=f"TS-{pid}-{status}", person_id=pid, site_id=SITE,
                    period_month=month, period_year=2026, total_days=days,
                    status=status, home_region=region).insert()


async def _run(month=10, region=None):
    return await PayrollService.create_run(
        {"period_month": month, "period_year": 2026, "region_code": region}, SITE, "USR-FI")


# ------------------------------------------------------------- salaries

@pytest.mark.asyncio
async def test_only_management_sets_salaries_and_history_is_kept(db):
    await _person()
    with pytest.raises(HTTPException) as e:
        await PayrollService.set_salary_structure("EMP-1", {"basic": 1, "reason": "x"}, SITE, FIN)
    assert e.value.status_code == 403
    await _salary()
    await _salary(basic=35000)
    hist = await PayrollService.salary_history("EMP-1", SITE)
    assert [h.status for h in hist].count("active") == 1 and len(hist) == 2
    with pytest.raises(HTTPException):     # reason required
        await PayrollService.set_salary_structure("EMP-1", {"basic": 5}, SITE, MD)
    with pytest.raises(HTTPException):     # unknown person
        await PayrollService.set_salary_structure("EMP-X", {"basic": 5, "reason": "x"}, SITE, MD)


# --------------------------------------------------------------- pay

@pytest.mark.asyncio
async def test_pay_follows_the_persons_own_structure_and_approved_days(db):
    await _person()
    await _salary(basic=31000)   # gross 43000 (basic + hra 12000)
    await _sheet(days=31)        # October has 31 days
    run = await _run()
    out = await PayrollService.process_run(run.run_id, SITE, "USR-FI")
    slip = (await Payslip.find({"run_id": run.run_id}).to_list())[0]
    assert out["payslips_generated"] == 1 and slip.gross_salary == 43000.0
    assert slip.basic_salary == 31000.0     # not the old hard-coded 25,000

    # Half the month approved -> half the pay; weekends are not docked on top.
    await _sheet("EMP-1", days=0, status="draft")  # irrelevant row
    await Timesheet.find({"person_id": "EMP-1", "status": "approved"}).update({"$set": {"total_days": 15.5}})
    await PayrollService.process_run(run.run_id, SITE, "USR-FI")
    slip = (await Payslip.find({"run_id": run.run_id}).to_list())[0]
    assert slip.gross_salary == 21500.0 and slip.loss_of_pay_days == 15.5


@pytest.mark.asyncio
async def test_holidays_and_weekly_offs_and_paid_leave_count_unpaid_does_not(db):
    await _person()
    await _salary(basic=31000, hra=0)
    await _sheet(days=20)
    for d in (4, 5, 11, 12):   # weekend rows
        await AttendanceRecord(attendance_id=f"A{d}", person_id="EMP-1", site_id=SITE,
                               date=datetime(2026, 10, d), status="weekly_off").insert()
    await LeaveRequest(leave_id="L1", person_id="EMP-1", site_id=SITE, leave_type="casual",
                       from_date=datetime(2026, 10, 14), to_date=datetime(2026, 10, 15),
                       days=2, status="approved").insert()
    await LeaveRequest(leave_id="L2", person_id="EMP-1", site_id=SITE, leave_type="unpaid",
                       from_date=datetime(2026, 10, 20), to_date=datetime(2026, 10, 20),
                       days=1, status="approved").insert()
    await LeaveRequest(leave_id="L3", person_id="EMP-1", site_id=SITE, leave_type="casual",
                       from_date=datetime(2026, 10, 27), to_date=datetime(2026, 10, 28),
                       days=2, status="pending").insert()          # not approved: not paid
    run = await _run()
    await PayrollService.process_run(run.run_id, SITE, "USR-FI")
    slip = (await Payslip.find({"run_id": run.run_id}).to_list())[0]
    # 20 worked + 4 offs + 2 paid leave = 26 of 31 paid
    assert slip.loss_of_pay_days == 5 and slip.gross_salary == round(31000 * 26 / 31, 2)


# --------------------------------------------------------------- holds

@pytest.mark.asyncio
async def test_nobody_is_paid_without_a_structure_or_an_approved_timesheet(db):
    await _person("EMP-OK"); await _salary("EMP-OK"); await _sheet("EMP-OK", days=31)
    await _person("EMP-NOSAL"); await _sheet("EMP-NOSAL", days=31)
    await _person("EMP-DRAFT"); await _salary("EMP-DRAFT"); await _sheet("EMP-DRAFT", status="submitted")
    await _person("EMP-NONE"); await _salary("EMP-NONE")
    run = await _run()
    out = await PayrollService.process_run(run.run_id, SITE, "USR-FI")
    assert out["payslips_generated"] == 1
    reasons = {h["person_id"]: h["reason"] for h in out["held"]}
    assert "no salary structure" in reasons["EMP-NOSAL"]
    assert "not approved" in reasons["EMP-DRAFT"]
    assert "no timesheet" in reasons["EMP-NONE"]


@pytest.mark.asyncio
async def test_reprocessing_picks_up_a_late_approval_without_duplicating_slips(db):
    await _person(); await _salary(); await _sheet(status="submitted")
    run = await _run()
    assert (await PayrollService.process_run(run.run_id, SITE, "USR-FI"))["payslips_generated"] == 0
    await Timesheet.find({"person_id": "EMP-1"}).update({"$set": {"status": "approved", "total_days": 31}})
    await PayrollService.process_run(run.run_id, SITE, "USR-FI")
    await PayrollService.process_run(run.run_id, SITE, "USR-FI")
    assert await Payslip.find({"run_id": run.run_id}).count() == 1


# ----------------------------------------------------------- run control

@pytest.mark.asyncio
async def test_one_live_run_per_period(db):
    await _run()
    with pytest.raises(HTTPException) as e:
        await _run()
    assert e.value.status_code == 409
    with pytest.raises(HTTPException):     # a regional run beside the all-region one
        await _run(region="S")
    await _run(month=11)                    # another month is fine


@pytest.mark.asyncio
async def test_approver_is_not_the_processor_and_held_people_are_acknowledged(db):
    await _person("EMP-A"); await _salary("EMP-A"); await _sheet("EMP-A", days=31)
    await _person("EMP-B"); await _salary("EMP-B")      # no timesheet -> held
    run = await _run()
    await PayrollService.process_run(run.run_id, SITE, "USR-FI")
    with pytest.raises(HTTPException) as e:
        await PayrollService.approve_run(run.run_id, SITE, "USR-FI", acknowledge_held=True)
    assert e.value.status_code == 403
    with pytest.raises(HTTPException) as e:
        await PayrollService.approve_run(run.run_id, SITE, "USR-MD")
    assert e.value.status_code == 409 and "held" in e.value.detail
    out = await PayrollService.approve_run(run.run_id, SITE, "USR-MD", acknowledge_held=True)
    assert out.status == "approved"


@pytest.mark.asyncio
async def test_a_run_with_no_payslips_cannot_be_approved(db):
    run = await _run()
    await PayrollService.process_run(run.run_id, SITE, "USR-FI")
    with pytest.raises(HTTPException) as e:
        await PayrollService.approve_run(run.run_id, SITE, "USR-MD")
    assert e.value.status_code == 409


@pytest.mark.asyncio
async def test_pf_is_on_basic_and_capped_and_tds_comes_from_the_structure(db):
    await _person()
    await _salary(basic=40000, hra=0, monthly_tds=2500)
    await _sheet(days=31)
    run = await _run()
    await PayrollService.process_run(run.run_id, SITE, "USR-FI")
    slip = (await Payslip.find({"run_id": run.run_id}).to_list())[0]
    assert slip.pf_employee == 1800.0 and slip.tds == 2500.0   # not a flat 10% of gross


@pytest.mark.asyncio
async def test_pf_follows_basic_not_gross(db):
    await _person()
    await _salary(basic=10000, hra=30000)
    await _sheet(days=31)
    run = await _run()
    await PayrollService.process_run(run.run_id, SITE, "USR-FI")
    slip = (await Payslip.find({"run_id": run.run_id}).to_list())[0]
    assert slip.pf_employee == 1200.0     # 12% of the 10,000 basic, not of the 40,000 gross


@pytest.mark.asyncio
async def test_paid_days_never_exceed_the_month(db):
    await _person()
    await _salary(basic=31000, hra=0)
    await _sheet(days=31)
    for d in (4, 5):
        await AttendanceRecord(attendance_id=f"A{d}", person_id="EMP-1", site_id=SITE,
                               date=datetime(2026, 10, d), status="weekly_off").insert()
    run = await _run()
    await PayrollService.process_run(run.run_id, SITE, "USR-FI")
    slip = (await Payslip.find({"run_id": run.run_id}).to_list())[0]
    assert slip.gross_salary == 31000.0 and slip.loss_of_pay_days == 0
