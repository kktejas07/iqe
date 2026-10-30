"""A person can see their own pay, and only their own, and only once released.

/payroll is Finance and Admin. That left every employee with no way to see
their payslip, and the obvious fix - opening the area - would have exposed
everyone's pay. So self-service is a separate path where the person comes from
the login.
"""
import sys
from pathlib import Path

import pytest
import pytest_asyncio
from beanie import init_beanie
from fastapi import HTTPException
from mongomock_motor import AsyncMongoMockClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.auth import Role  # noqa: E402
from core.policy import allows, rule_for  # noqa: E402
from modules.auth.models import UserLogin  # noqa: E402
from modules.payroll.models import PayrollRun, Payslip  # noqa: E402
from modules.payroll.service import PayrollService as S  # noqa: E402

SITE = "SITE-01"


def _patch_mongomock():
    from mongomock_motor import AsyncMongoMockDatabase

    original = AsyncMongoMockDatabase.list_collection_names

    async def patched(self, *args, **kwargs):
        kwargs.pop("authorizedCollections", None)
        kwargs.pop("nameOnly", None)
        return await original(self, *args, **kwargs)

    AsyncMongoMockDatabase.list_collection_names = patched


def _u(uid, role=Role.INSPECTOR):
    return {"user_id": uid, "role_id": int(role), "site_id": SITE}


A, B = _u("USR-A"), _u("USR-B")


@pytest_asyncio.fixture
async def db():
    _patch_mongomock()
    client = AsyncMongoMockClient()
    await init_beanie(database=client["payslip_test"], document_models=[PayrollRun, Payslip, UserLogin])
    for uid, code in [("USR-A", "EMP-A"), ("USR-B", "EMP-B")]:
        await UserLogin(user_id=uid, site_id=SITE, login_name=uid.lower(), login_password="x",
                        email=f"{uid}@x", full_name=uid, role_id=2, employee_code=code).insert()
    yield client


async def _run(run_id, status, month=10):
    await PayrollRun(run_id=run_id, site_id=SITE, period_month=month, period_year=2026, status=status).insert()


async def _slip(pid, person, run_id, month=10, net=50000.0):
    await Payslip(payslip_id=pid, run_id=run_id, person_id=person, site_id=SITE,
                  period_month=month, period_year=2026, net_salary=net).insert()


@pytest.mark.asyncio
async def test_a_person_sees_their_own_released_payslips_only(db):
    await _run("R1", "disbursed")
    await _slip("PS-A", "EMP-A", "R1")
    await _slip("PS-B", "EMP-B", "R1", net=90000.0)
    out = await S.my_payslips(SITE, A)
    assert [i.payslip_id for i in out["items"]] == ["PS-A"]
    assert out["total"] == 1


@pytest.mark.asyncio
async def test_payslips_are_not_shown_before_the_run_is_disbursed(db):
    for rid, st in [("R1", "draft"), ("R2", "processing"), ("R3", "approved")]:
        await _run(rid, st)
        await _slip(f"PS-{rid}", "EMP-A", rid)
    assert (await S.my_payslips(SITE, A))["total"] == 0


@pytest.mark.asyncio
async def test_newest_first_and_filterable(db):
    await _run("R9", "disbursed", 9)
    await _run("R10", "disbursed", 10)
    await _slip("PS-9", "EMP-A", "R9", 9)
    await _slip("PS-10", "EMP-A", "R10", 10)
    out = await S.my_payslips(SITE, A)
    assert [i.payslip_id for i in out["items"]] == ["PS-10", "PS-9"]
    only9 = await S.my_payslips(SITE, A, period_month=9)
    assert [i.payslip_id for i in only9["items"]] == ["PS-9"]


@pytest.mark.asyncio
async def test_someone_elses_payslip_is_not_found_not_forbidden(db):
    await _run("R1", "disbursed")
    await _slip("PS-B", "EMP-B", "R1")
    with pytest.raises(HTTPException) as e:
        await S.my_payslip("PS-B", SITE, A)
    assert e.value.status_code == 404, "403 would confirm the payslip exists"
    assert (await S.my_payslip("PS-B", SITE, B)).payslip_id == "PS-B"


@pytest.mark.asyncio
async def test_an_unreleased_payslip_is_not_found_even_to_its_owner(db):
    await _run("R1", "approved")
    await _slip("PS-A", "EMP-A", "R1")
    with pytest.raises(HTTPException) as e:
        await S.my_payslip("PS-A", SITE, A)
    assert e.value.status_code == 404


@pytest.mark.asyncio
async def test_a_missing_payslip_gives_the_same_answer_as_someone_elses(db):
    await _run("R1", "disbursed")
    await _slip("PS-B", "EMP-B", "R1")
    with pytest.raises(HTTPException) as missing:
        await S.my_payslip("PS-NOPE", SITE, A)
    with pytest.raises(HTTPException) as theirs:
        await S.my_payslip("PS-B", SITE, A)
    assert missing.value.status_code == theirs.value.status_code
    assert missing.value.detail == theirs.value.detail


def test_every_internal_role_can_reach_the_self_service_path_but_not_the_rest():
    me, other = rule_for("/api/v1/payroll/me/payslips"), rule_for("/api/v1/payroll/payslips")
    for role in (Role.INSPECTOR, Role.COORDINATOR, Role.QC_AUDITOR, Role.TECHNICAL_MANAGER, Role.FINANCE):
        assert allows(me, "GET", int(role)), role
    for role in (Role.INSPECTOR, Role.COORDINATOR, Role.QC_AUDITOR, Role.TECHNICAL_MANAGER):
        assert not allows(other, "GET", int(role)), role


def test_clients_cannot_reach_payroll_at_all():
    me = rule_for("/api/v1/payroll/me/payslips")
    assert not allows(me, "GET", int(Role.CLIENT))


def test_self_service_is_read_only_for_everyone_but_admin():
    me = rule_for("/api/v1/payroll/me/payslips")
    assert not allows(me, "POST", int(Role.INSPECTOR))


def test_the_self_service_routes_take_no_person_parameter():
    from modules.payroll.routes import router

    for r in router.routes:
        if r.path.startswith("/payroll/me"):
            names = {p.name for p in r.dependant.query_params}
            assert "person_id" not in names, r.path
