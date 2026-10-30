"""Who a login is, as the rest of the system names people.

A request is authenticated as a `user_id` (a login), but HR, sign-off and
timesheet records name people by `person_id` / `employee_code`. A rule like
"you cannot approve your own leave" needs both to be recognised as the same
person, so it is resolved here once instead of each module guessing.
"""
from __future__ import annotations

from core.auth import Role

#: Roles that approve other people's leave and timesheets: management (HR /
#: Regional Head), the Technical Manager, and the Inspection Coordinator.
APPROVER_ROLES = {int(Role.ADMIN), int(Role.TECHNICAL_MANAGER), int(Role.COORDINATOR)}


async def own_identifiers(user: dict) -> set[str]:
    """Every identifier this login is known by."""
    ids = {str(user.get("user_id"))} if user.get("user_id") else set()
    try:
        from modules.auth.models import UserLogin

        row = await UserLogin.find_one({"user_id": user.get("user_id")})
    except Exception:  # noqa: BLE001 - identity must not take the request down
        row = None
    if row:
        ids |= {i for i in (row.employee_code, row.inspector_code) if i}
    return ids


def is_approver(user: dict) -> bool:
    return int(user.get("role_id") or 0) in APPROVER_ROLES
