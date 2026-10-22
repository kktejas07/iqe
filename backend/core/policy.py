"""The RBAC matrix, as code.

ARCHITECTURE_AND_E2E_FLOW.md §6.2 sets out who may do what across thirteen
areas of the system. Until now it described nothing: `require_roles` existed
and was applied to no route, so the matrix was documentation of an intention.

Guarding ~195 endpoints by editing each signature would be a large change with
a large surface for mistakes, and the result would be a policy scattered across
thirty files where no one could read it. Instead the matrix lives here, in one
table, and a single dependency applies it by matching the request's method and
path prefix.

Two deliberate choices:

* **Unlisted areas are allowed to any authenticated caller, not denied.**
  Default-deny on a running system means discovering the gaps by breaking
  production. Everything in the table is enforced; everything else still
  requires authentication, which is already a large step up from where this
  started. Areas are added to the table as their permissions are confirmed
  with IQE.
* **Reads and writes are separated.** Most of the matrix's nuance is that a
  role can see something it cannot change - Finance views certifications,
  Inspectors view their own work. Collapsing that into one permission would
  lose the distinction that makes the matrix useful.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from fastapi import HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials

from core.auth import Role, get_current_user

READ_METHODS = {"GET", "HEAD", "OPTIONS"}

#: Everyone who is not a client of IQE. Used where the matrix says a role may
#: look but the client portal may not.
ALL_INTERNAL = [
    Role.ADMIN, Role.COORDINATOR, Role.INSPECTOR, Role.QC_AUDITOR,
    Role.FINANCE, Role.TECHNICAL_MANAGER,
]


@dataclass(frozen=True)
class Rule:
    """Who may read, and who may write, in one area of the system."""

    prefix: str
    read: list[Role] = field(default_factory=lambda: list(ALL_INTERNAL))
    write: list[Role] = field(default_factory=lambda: [Role.ADMIN])
    #: Why these roles, in the words of the matrix - so a 403 can be explained
    #: and a future change can tell whether it contradicts a decision.
    note: str = ""


#: Ordered longest-prefix-first at match time, so "/people/authorizations"
#: beats "/people".
MATRIX: list[Rule] = [
    Rule(
        prefix="/people/authorizations",
        read=ALL_INTERNAL,
        write=[Role.ADMIN, Role.TECHNICAL_MANAGER],
        note="Authorizing inspection personnel sits with a named competent "
             "technical function under ISO/IEC 17020, not with administration.",
    ),
    Rule(
        prefix="/certifications",
        read=ALL_INTERNAL,
        write=[Role.ADMIN, Role.COORDINATOR, Role.INSPECTOR, Role.QC_AUDITOR],
        note="Coordinators and inspectors prepare; the QC auditor issues. "
             "Issue itself carries its own stricter guard on the route.",
    ),
    Rule(
        prefix="/billing",
        read=[Role.ADMIN, Role.FINANCE, Role.QC_AUDITOR, Role.COORDINATOR,
              Role.TECHNICAL_MANAGER],
        write=[Role.ADMIN, Role.FINANCE],
        note="Generate Invoice & Rates: Finance full, others view.",
    ),
    Rule(
        prefix="/invoices",
        read=[Role.ADMIN, Role.FINANCE, Role.QC_AUDITOR, Role.COORDINATOR,
              Role.TECHNICAL_MANAGER],
        write=[Role.ADMIN, Role.FINANCE],
        note="As billing.",
    ),
    Rule(
        prefix="/payments",
        read=[Role.ADMIN, Role.FINANCE],
        write=[Role.ADMIN, Role.FINANCE],
        note="Money in and out is Finance's alone.",
    ),
    Rule(
        prefix="/assignments",
        read=ALL_INTERNAL,
        write=[Role.ADMIN, Role.COORDINATOR, Role.TECHNICAL_MANAGER],
        note="Coordinators assign; the technical manager may override.",
    ),
    Rule(
        prefix="/work-packages",
        read=ALL_INTERNAL,
        write=[Role.ADMIN, Role.COORDINATOR, Role.INSPECTOR],
        note="Coordinators scope the work, inspectors progress it.",
    ),
    Rule(
        prefix="/work-types",
        read=ALL_INTERNAL,
        write=[Role.ADMIN, Role.TECHNICAL_MANAGER],
        note="A work type sets competence requirements, so changing one is a "
             "technical decision.",
    ),
    Rule(
        prefix="/people",
        read=ALL_INTERNAL,
        write=[Role.ADMIN, Role.TECHNICAL_MANAGER],
        note="Manage Users & Masters: Admin full, others read.",
    ),
    Rule(
        prefix="/equipment",
        read=ALL_INTERNAL,
        write=[Role.ADMIN, Role.TECHNICAL_MANAGER, Role.QC_AUDITOR],
        note="Calibration status is a technical control.",
    ),
    Rule(
        prefix="/appeals",
        read=ALL_INTERNAL,
        write=[Role.ADMIN, Role.QC_AUDITOR, Role.TECHNICAL_MANAGER],
        note="An appeal is decided by people independent of the original "
             "decision; the route checks that independently of role.",
    ),
    Rule(
        prefix="/migration",
        read=[Role.ADMIN],
        write=[Role.ADMIN],
        note="Migration rewrites the shape of live data.",
    ),
    Rule(
        prefix="/users",
        read=ALL_INTERNAL,
        write=[Role.ADMIN],
        note="Manage Users & Masters: Admin full, others read.",
    ),
    Rule(
        prefix="/masters",
        read=ALL_INTERNAL,
        write=[Role.ADMIN],
        note="As users.",
    ),
]

#: Longest prefix wins, so a specific area is not shadowed by a general one.
_ORDERED = sorted(MATRIX, key=lambda r: len(r.prefix), reverse=True)


def rule_for(path: str) -> Optional[Rule]:
    """The rule governing this path, if the matrix covers it."""
    # Strip the API version prefix so the table reads like the matrix.
    for marker in ("/api/v1", "/api"):
        if path.startswith(marker):
            path = path[len(marker):]
            break
    for rule in _ORDERED:
        if path == rule.prefix or path.startswith(rule.prefix + "/"):
            return rule
    return None


def allows(rule: Rule, method: str, role_id: Optional[int]) -> bool:
    permitted = rule.read if method.upper() in READ_METHODS else rule.write
    return role_id in {int(r) for r in permitted}


#: Paths that must stay reachable without a token, or nobody can obtain one.
#: Checked by prefix against the full request path.
UNAUTHENTICATED_PATHS: tuple[str, ...] = (
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/health",
    "/healthz",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/files/",            # served static evidence and report assets
)


def is_open(path: str) -> bool:
    return any(path == p or path.startswith(p) for p in UNAUTHENTICATED_PATHS)


async def enforce_policy(request: Request) -> Optional[dict]:
    """Apply the matrix to this request.

    Registered once on the application, so every route is covered without
    thirty files having to remember. Resolves the caller itself rather than
    depending on get_current_user, because the exempt paths must not trigger
    authentication at all - a login route that requires a token cannot issue
    one.
    """
    if is_open(request.url.path):
        return None

    user = await get_current_user(await _credentials(request))
    rule = rule_for(request.url.path)
    if rule is None:
        return user   # authenticated, but this area is not in the matrix yet

    if not allows(rule, request.method, user.get("role_id")):
        action = "read" if request.method.upper() in READ_METHODS else "change"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Your role may not {action} {rule.prefix.lstrip('/')}."
                + (f" {rule.note}" if rule.note else "")
            ),
        )
    return user


async def _credentials(request: Request) -> Optional[HTTPAuthorizationCredentials]:
    """Pull the bearer token off the request.

    Done by hand rather than through the HTTPBearer dependency so that the
    exempt paths above can skip authentication entirely.
    """
    header = request.headers.get("Authorization") or ""
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return HTTPAuthorizationCredentials(scheme=scheme, credentials=token.strip())
