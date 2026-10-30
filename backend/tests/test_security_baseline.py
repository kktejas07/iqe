"""Startup refusal for unsafe configuration, the secrets hygiene of the repo,
and the roles on the HR / workflow / inter-office areas."""
import hashlib
import subprocess
from pathlib import Path

import pytest

from core.auth import Role
from core.config import (
    DEFAULT_JWT_SECRET, LEAKED_JWT_SECRET_HASHES, Settings, security_problems,
)
from core.policy import allows, rule_for

ROOT = Path(__file__).resolve().parent.parent.parent
GOOD = "x" * 48


def _s(**kw):
    base = dict(debug=False, auth_allow_anonymous=False, jwt_secret_key=GOOD)
    base.update(kw)
    return Settings.model_construct(**base)


# ------------------------------------------------------------- startup guard

def test_a_safe_production_configuration_has_no_problems():
    assert security_problems(_s()) == []


def test_anonymous_admin_is_refused_outside_debug():
    assert any("AUTH_ALLOW_ANONYMOUS" in p for p in security_problems(_s(auth_allow_anonymous=True)))


def test_anonymous_admin_is_allowed_on_a_declared_developer_machine():
    assert security_problems(_s(auth_allow_anonymous=True, debug=True)) == []


def test_the_default_jwt_secret_is_refused_outside_debug():
    assert any("default" in p for p in security_problems(_s(jwt_secret_key=DEFAULT_JWT_SECRET)))


def test_a_short_jwt_secret_is_refused_outside_debug():
    assert any("shorter" in p for p in security_problems(_s(jwt_secret_key="short")))


def test_a_secret_that_was_committed_is_refused_outside_debug(monkeypatch):
    leaked = "this-was-committed-to-git-" + "y" * 20
    monkeypatch.setattr(
        "core.config.LEAKED_JWT_SECRET_HASHES",
        LEAKED_JWT_SECRET_HASHES | {hashlib.sha256(leaked.encode()).hexdigest()},
    )
    assert any("committed" in p for p in security_problems(_s(jwt_secret_key=leaked)))


def test_the_denylist_holds_a_hash_not_a_secret():
    for h in LEAKED_JWT_SECRET_HASHES:
        assert len(h) == 64 and all(c in "0123456789abcdef" for c in h)


def test_lifespan_refuses_to_boot_on_an_unsafe_configuration(monkeypatch):
    """The guard is wired into startup, not just defined."""
    import asyncio
    import main

    monkeypatch.setattr(main.settings, "debug", False)
    monkeypatch.setattr(main.settings, "auth_allow_anonymous", True)

    async def boot():
        async with main.lifespan(main.app):
            pass

    with pytest.raises(RuntimeError, match="Refusing to start"):
        asyncio.run(boot())


# ------------------------------------------------------------ repo hygiene

def test_backend_env_is_not_tracked_and_an_example_is():
    tracked = subprocess.run(
        ["git", "ls-files", "backend/.env", "backend/.env.example"],
        cwd=ROOT, capture_output=True, text=True,
    ).stdout.split()
    assert "backend/.env" not in tracked
    assert "backend/.env.example" in tracked


def test_the_example_env_is_safe_by_default():
    text = (ROOT / "backend" / ".env.example").read_text()
    assert "AUTH_ALLOW_ANONYMOUS=false" in text
    assert "DEBUG=false" in text
    assert "JWT_SECRET_KEY=\n" in text, "the example must not ship a usable secret"


# ------------------------------------------------------------------- roles

def _can(path, method, role):
    rule = rule_for(path)
    assert rule is not None, f"{path} is unclassified"
    return allows(rule, method, int(role))


@pytest.mark.parametrize("path", ["/api/v1/payroll/runs", "/api/v1/payroll/payslips"])
def test_only_finance_and_admin_touch_payroll(path):
    for role in (Role.FINANCE, Role.ADMIN):
        assert _can(path, "GET", role) and _can(path, "POST", role)
    for role in (Role.INSPECTOR, Role.COORDINATOR, Role.QC_AUDITOR, Role.TECHNICAL_MANAGER, Role.CLIENT):
        assert not _can(path, "GET", role), role


def test_candidates_are_not_visible_to_finance_inspectors_or_clients():
    for role in (Role.FINANCE, Role.INSPECTOR, Role.CLIENT, Role.COORDINATOR):
        assert not _can("/api/v1/recruitment/candidates", "GET", role), role
    assert _can("/api/v1/recruitment/candidates", "GET", Role.TECHNICAL_MANAGER)


def test_vendor_payments_are_finance_not_operations():
    p = "/api/v1/purchasing/vendor-payments/1/pay"
    assert _can(p, "POST", Role.FINANCE) and not _can(p, "POST", Role.COORDINATOR)
    # but operations can still raise a requisition
    assert _can("/api/v1/purchasing/", "POST", Role.COORDINATOR)
    assert not _can("/api/v1/purchasing/", "POST", Role.INSPECTOR)


def test_inter_office_settlement_is_finance_only():
    p = "/api/v1/regions/settlements/x/settle"
    assert _can(p, "PATCH", Role.FINANCE) and not _can(p, "PATCH", Role.COORDINATOR)
    assert not _can("/api/v1/regions/settlements/list", "GET", Role.INSPECTOR)


def test_regions_are_readable_but_only_admin_changes_them():
    assert _can("/api/v1/regions/", "GET", Role.INSPECTOR)
    assert not _can("/api/v1/regions/", "POST", Role.INSPECTOR)
    assert _can("/api/v1/regions/", "POST", Role.ADMIN)


def test_inspectors_cannot_sign_off_reports_or_release_notes():
    for p in ("/api/v1/signoffs/1/review", "/api/v1/release-notes/1/approve"):
        assert not _can(p, "POST", Role.INSPECTOR), p
        assert _can(p, "POST", Role.TECHNICAL_MANAGER), p


def test_job_handoff_is_not_open_to_inspectors_or_clients():
    p = "/api/v1/job-handoff/convert"
    assert not _can(p, "POST", Role.INSPECTOR) and not _can(p, "POST", Role.CLIENT)
    assert _can(p, "POST", Role.COORDINATOR)


def test_clients_can_give_feedback_but_not_read_it():
    assert _can("/api/v1/feedback/", "POST", Role.CLIENT)
    assert not _can("/api/v1/feedback/", "GET", Role.CLIENT)


def test_notifications_are_self_service_but_the_email_log_is_admin_only():
    assert _can("/api/v1/notifications/in-app", "GET", Role.CLIENT)
    assert _can("/api/v1/notifications/read-all", "POST", Role.INSPECTOR)
    assert not _can("/api/v1/notifications/emails", "GET", Role.INSPECTOR)
    assert not _can("/api/v1/notifications/preferences/admin/recipients", "POST", Role.COORDINATOR)


def test_withdrawing_a_leavers_authorisation_includes_the_technical_manager():
    assert _can("/api/v1/exit/1/withdraw-authorization", "POST", Role.TECHNICAL_MANAGER)
    assert not _can("/api/v1/exit/1/withdraw-authorization", "POST", Role.INSPECTOR)
