"""The RBAC matrix applied across the API.

ARCHITECTURE_AND_E2E_FLOW.md 6.2 set out who may do what, and nothing enforced
it: require_roles was applied to no route. Guarding ~200 endpoints by editing
each signature would scatter the policy across thirty files where nobody could
read it, so the matrix lives in core/policy.py as one table and is applied once
on the application.

These tests exercise it through the HTTP layer, which is the only place the
behaviour is real - a unit test of the table would not catch the dependency
being registered wrongly, or the login route being locked behind the very
token it issues.
"""
import sys
from pathlib import Path

import pytest
from starlette.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.auth import Role, create_access_token  # noqa: E402
from core.policy import MATRIX, Rule, allows, is_open, rule_for  # noqa: E402
from main import app  # noqa: E402

client = TestClient(app, raise_server_exceptions=False)


def auth(role: Role) -> dict:
    token = create_access_token({"sub": "EMP-T", "role_id": int(role), "site_id": "SITE-01"})
    return {"Authorization": f"Bearer {token}"}


#: A handler that was reached. The test database is not initialised here, so a
#: permitted request fails inside the handler - which is exactly the signal we
#: want: it got past the policy.
REACHED_HANDLER = {200, 201, 400, 404, 409, 422, 500}


# ------------------------------------------------------- table semantics

def test_longest_prefix_wins():
    """/people/authorizations must not be shadowed by /people."""
    rule = rule_for("/api/v1/people/authorizations/ATH-1")
    assert rule.prefix == "/people/authorizations"
    assert Role.TECHNICAL_MANAGER in rule.write
    assert Role.ADMIN in rule.write


def test_the_version_prefix_is_ignored():
    assert rule_for("/api/v1/billing/queue").prefix == "/billing"
    assert rule_for("/billing/queue").prefix == "/billing"


def test_an_area_outside_the_matrix_has_no_rule():
    """Unlisted areas are authenticated but unrestricted - default-deny on a
    running system means finding the gaps by breaking production."""
    assert rule_for("/api/v1/clients") is None


def test_reads_and_writes_are_separated():
    rule = Rule(prefix="/x", read=[Role.FINANCE], write=[Role.ADMIN])
    assert allows(rule, "GET", int(Role.FINANCE))
    assert not allows(rule, "POST", int(Role.FINANCE))
    assert allows(rule, "POST", int(Role.ADMIN))


def test_every_rule_in_the_matrix_has_a_reason():
    """A permission with no stated reason cannot be reviewed later."""
    for rule in MATRIX:
        assert rule.note, f"{rule.prefix} has no note explaining its roles"
        assert rule.write, f"{rule.prefix} has nobody who can write"


# --------------------------------------------------------- exemptions

def test_login_is_reachable_without_a_token():
    """The defect this guards: a login route behind the token it issues locks
    everyone out permanently."""
    assert is_open("/api/v1/auth/login")
    assert client.post(
        "/api/v1/auth/login", json={"login_name": "x", "password": "y"}
    ).status_code != 401


def test_health_and_docs_stay_open():
    assert client.get("/health").status_code != 401
    assert client.get("/openapi.json").status_code == 200


def test_everything_else_needs_a_token():
    for path in ("/api/v1/people", "/api/v1/billing/queue", "/api/v1/work-packages"):
        assert client.get(path).status_code == 401, path


# ----------------------------------------------------- enforcement

@pytest.mark.parametrize("role,expected_allowed", [
    (Role.FINANCE, True),
    (Role.ADMIN, True),
    (Role.INSPECTOR, False),
    (Role.QC_AUDITOR, False),
    (Role.COORDINATOR, False),
])
def test_only_finance_and_admin_raise_invoices(role, expected_allowed):
    r = client.post(
        "/api/v1/billing/invoices/from-certifications", json={}, headers=auth(role)
    )
    if expected_allowed:
        assert r.status_code in REACHED_HANDLER, f"{role.name} was blocked: {r.status_code}"
    else:
        assert r.status_code == 403, f"{role.name} got {r.status_code}"


@pytest.mark.parametrize("role,expected_allowed", [
    (Role.TECHNICAL_MANAGER, True),
    (Role.ADMIN, True),
    (Role.QC_AUDITOR, False),
    (Role.FINANCE, False),
    (Role.INSPECTOR, False),
])
def test_only_the_technical_manager_and_admin_change_people(role, expected_allowed):
    r = client.post("/api/v1/people", json={}, headers=auth(role))
    if expected_allowed:
        assert r.status_code in REACHED_HANDLER, f"{role.name} was blocked: {r.status_code}"
    else:
        assert r.status_code == 403


def test_an_inspector_may_read_what_it_may_not_change():
    """Most of the matrix's nuance is that a role can see what it cannot edit."""
    assert client.get("/api/v1/people", headers=auth(Role.INSPECTOR)).status_code in REACHED_HANDLER
    assert client.post("/api/v1/people", json={}, headers=auth(Role.INSPECTOR)).status_code == 403


def test_a_client_role_cannot_reach_internal_areas():
    for path in ("/api/v1/people", "/api/v1/work-packages", "/api/v1/equipment"):
        assert client.get(path, headers=auth(Role.CLIENT)).status_code == 403, path


def test_only_admin_runs_migrations():
    assert client.post("/api/v1/migration/all", headers=auth(Role.ADMIN)).status_code in REACHED_HANDLER
    for role in (Role.TECHNICAL_MANAGER, Role.QC_AUDITOR, Role.FINANCE, Role.INSPECTOR):
        assert client.post("/api/v1/migration/all", headers=auth(role)).status_code == 403


def test_payments_are_finance_only_even_to_read():
    assert client.get("/api/v1/payments", headers=auth(Role.FINANCE)).status_code in REACHED_HANDLER
    assert client.get("/api/v1/payments", headers=auth(Role.INSPECTOR)).status_code == 403


def test_a_forbidden_response_explains_why():
    """A 403 that says only 'forbidden' sends someone to a developer."""
    r = client.post("/api/v1/people", json={}, headers=auth(Role.FINANCE))
    assert r.status_code == 403
    detail = r.json()["detail"]
    assert "may not change" in detail
    assert "Admin full" in detail or "Masters" in detail
