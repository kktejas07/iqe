"""Who may issue a quotation of a given value.

* Up to the RH's limit: the Regional Head of the enquiry's region (or the
  deputy management arranged for them), or the MD.
* Above it, up to the MD's limit: the MD.
* Above the MD's limit: not by this system. It is refused unless the MD
  records the authority it was approved under.
* No limits configured: only the MD, so an unconfigured system is not an
  unapproved one.

The person who prepared a quotation cannot be its approver, except the MD,
who has nobody above to hand it to.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException

from core import audit
from core.audit import AuditAction
from core.auth import Role
from core.identity import own_identifiers
from core.sequences import next_identifier
from modules.approvals.models import ApprovalLimit, Level, LimitStatus

BEYOND_MD = "BEYOND_MD"


class ApprovalService:

    # ------------------------------------------------------------ limits

    @staticmethod
    async def active_limits(site_id: str = "SITE-01") -> dict[str, float]:
        rows = await ApprovalLimit.find(
            {"site_id": site_id, "status": LimitStatus.ACTIVE.value}
        ).to_list()
        return {r.level: r.max_value for r in rows}

    @staticmethod
    async def history(site_id: str = "SITE-01") -> list[dict]:
        rows = await ApprovalLimit.find({"site_id": site_id}).sort(-ApprovalLimit.set_on).to_list()
        return [r.model_dump(exclude={"id"}) for r in rows]

    @staticmethod
    async def set_limit(payload: dict, site_id: str, user_id: str) -> dict:
        level = (payload.get("level") or "").upper()
        if level not in {l.value for l in Level}:
            raise HTTPException(422, "level must be RH or MD")
        try:
            amount = float(payload.get("max_value"))
        except (TypeError, ValueError):
            raise HTTPException(422, "max_value must be a number")
        if amount <= 0:
            raise HTTPException(422, "A limit must be greater than zero")
        reason = (payload.get("reason") or "").strip()
        if not reason:
            raise HTTPException(
                422, "A reason is required: who may approve what is a governance decision"
            )

        limits = await ApprovalService.active_limits(site_id)
        rh = amount if level == "RH" else limits.get("RH")
        md = amount if level == "MD" else limits.get("MD")
        if rh is not None and md is not None and rh > md:
            raise HTTPException(
                409,
                f"The RH limit ({rh:,.0f}) would exceed the MD limit ({md:,.0f}); "
                "the person with less authority cannot approve more.",
            )

        previous = await ApprovalLimit.find_one(
            {"site_id": site_id, "level": level, "status": LimitStatus.ACTIVE.value}
        )
        new_id = await next_identifier(ApprovalLimit, "limit_id", site_id, "LIM")
        if previous:
            previous.status = LimitStatus.SUPERSEDED.value
            previous.superseded_on = datetime.now()
            previous.superseded_by_limit_id = new_id
            await previous.save()
        row = ApprovalLimit(
            limit_id=new_id, site_id=site_id, level=level, max_value=amount,
            currency=payload.get("currency") or "INR", reason=reason, set_by=user_id,
        )
        await row.insert()
        await audit.record(
            "approval_limit", new_id, AuditAction.AUTHORIZE,
            actor={"user_id": user_id}, site_id=site_id,
            note=f"{level} quotation limit {amount:,.0f}",
            context={"previous": previous.max_value if previous else None, "reason": reason},
        )
        return row.model_dump(exclude={"id"})

    # --------------------------------------------------------- authority

    @staticmethod
    async def levels_held(user: dict, region_code: Optional[str], site_id: str = "SITE-01") -> set[str]:
        """Which approval levels this caller holds for this region."""
        held: set[str] = set()
        if int(user.get("role_id") or 0) == int(Role.ADMIN):
            held.add(Level.MD.value)
        if not region_code:
            return held

        from modules.regions.models import DeputyCoverage, Region

        ids = await own_identifiers(user)
        code = region_code.upper()
        region = await Region.find_one({"region_code": code})
        if region and region.regional_head_person_id in ids:
            held.add(Level.RH.value)
        now = datetime.now()
        for d in await DeputyCoverage.find(
            {"region_code": code, "absent_role": "RH", "is_active": True}
        ).to_list():
            live = (d.valid_from is None or d.valid_from <= now) and (
                d.valid_until is None or d.valid_until > now
            )
            if live and d.deputy_person_id in ids:
                held.add(Level.RH.value)
        return held

    @staticmethod
    def required_level(value: float, limits: dict[str, float]) -> tuple[str, Optional[str]]:
        """The lowest level that may approve this value, and a note if the
        answer is a fall-back."""
        rh, md = limits.get("RH"), limits.get("MD")
        if not limits:
            return Level.MD.value, "No approval limits are configured, so only the MD may approve."
        if rh is not None and value <= rh:
            return Level.RH.value, None
        if md is None or value <= md:
            return Level.MD.value, None
        return BEYOND_MD, f"{value:,.0f} is above the MD's limit of {md:,.0f}."

    @staticmethod
    async def quotation_gate(
        value: float, user: dict, region_code: Optional[str], site_id: str,
        *, prepared_by: Optional[str] = None, beyond_limit_reference: Optional[str] = None,
    ) -> dict:
        """Decide, without side effects, whether this caller may issue it."""
        limits = await ApprovalService.active_limits(site_id)
        required, note = ApprovalService.required_level(value, limits)
        held = await ApprovalService.levels_held(user, region_code, site_id)

        allowed, reason, approved_as = False, None, None
        if required == Level.RH.value:
            if Level.MD.value in held:
                allowed, approved_as = True, Level.MD.value
            elif Level.RH.value in held:
                allowed, approved_as = True, Level.RH.value
            else:
                reason = (
                    "Within the RH's limit, so the Regional Head of this region (or their "
                    "arranged deputy) or the MD approves it."
                )
        elif required == Level.MD.value:
            if Level.MD.value in held:
                allowed, approved_as = True, Level.MD.value
            else:
                reason = note or "Above the RH's limit, so the MD approves it."
        else:  # BEYOND_MD
            if Level.MD.value in held and (beyond_limit_reference or "").strip():
                allowed, approved_as = True, BEYOND_MD
            elif Level.MD.value in held:
                reason = (
                    f"{note} Record the authority it was approved under "
                    "(beyond_limit_reference) to issue it."
                )
            else:
                reason = f"{note} It needs the MD, and the authority beyond the MD's limit."

        # The preparer does not approve their own quotation. The MD is exempt:
        # there is nobody above them to pass it to.
        if allowed and approved_as != Level.MD.value and prepared_by:
            if prepared_by in await own_identifiers(user):
                allowed, reason = False, (
                    "You prepared this quotation and cannot approve it; "
                    "another approver must."
                )
        if allowed and approved_as == BEYOND_MD:
            pass

        return {
            "value": value,
            "required_level": required,
            "levels_held": sorted(held),
            "limits": limits,
            "allowed": allowed,
            "approved_as": approved_as,
            "reason": reason,
            "note": note,
        }
