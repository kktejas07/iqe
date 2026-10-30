from typing import Optional
from datetime import datetime
from fastapi import HTTPException
from core.audit import AuditAction, record as audit
from core.identity import is_people_manager, own_identifiers, person_id_of
from modules.appraisal.models import Appraisal, WitnessedInspection


async def _is_own(user: dict, person_id: str) -> bool:
    return person_id in await own_identifiers(user)


async def _require_visible(user: dict, person_id: str, what: str = "appraisal") -> None:
    """An appraisal holds ratings and authorisation decisions about one person.
    That person and the people managers may see it; colleagues may not."""
    if is_people_manager(user) or await _is_own(user, person_id):
        return
    raise HTTPException(403, f"You can only see your own {what}")


async def _require_manager_not_self(user: dict, person_id: str, act: str) -> None:
    if not is_people_manager(user):
        raise HTTPException(403, f"Only management or the Technical Manager may {act}")
    if await _is_own(user, person_id):
        raise HTTPException(409, f"You cannot {act} your own appraisal; someone else must")


class AppraisalService:

    # ── Appraisals ─────────────────────────────────────────────────────

    @staticmethod
    async def list_appraisals(
        site_id: str, user: dict, person_id: Optional[str] = None,
        status: Optional[str] = None, page: int = 1, per_page: int = 100,
    ):
        query: dict = {"site_id": site_id}
        if not is_people_manager(user):
            mine = await own_identifiers(user)
            if person_id and person_id not in mine:
                raise HTTPException(403, "You can only see your own appraisals")
            query["person_id"] = {"$in": sorted(mine)}
        elif person_id:
            query["person_id"] = person_id
        if status:
            query["status"] = status
        total = await Appraisal.find(query).count()
        items = (
            await Appraisal.find(query)
            .skip((page - 1) * per_page).limit(per_page)
            .sort(-Appraisal.created_at).to_list()
        )
        return {"total": total, "items": items, "page": page, "per_page": per_page}

    @staticmethod
    async def create_appraisal(data: dict, site_id: str, user: dict):
        user_id = user.get("user_id", "USR-001")
        if not is_people_manager(user):
            raise HTTPException(403, "Only management or the Technical Manager may open an appraisal")
        appraisal = Appraisal(**data, site_id=site_id, created_by=user_id)
        await appraisal.insert()
        await audit("appraisals", appraisal.appraisal_id, AuditAction.CREATE, actor={"user_id": user_id}, site_id=site_id)
        return appraisal

    @staticmethod
    async def get_appraisal(appraisal_id: str, site_id: str, user: dict):
        a = await Appraisal.find_one({"appraisal_id": appraisal_id, "site_id": site_id})
        if not a:
            raise HTTPException(404, "Appraisal not found")
        await _require_visible(user, a.person_id)
        return a

    @staticmethod
    async def self_review(appraisal_id: str, data: dict, site_id: str, user: dict):
        user_id = user.get("user_id", "USR-001")
        a = await Appraisal.find_one({"appraisal_id": appraisal_id, "site_id": site_id})
        if not a:
            raise HTTPException(404, "Appraisal not found")
        if not await _is_own(user, a.person_id):
            raise HTTPException(403, "A self-review is written by the person being appraised")
        if a.status not in ("draft", "self_review"):
            raise HTTPException(400, f"Cannot do self-review on a {a.status} appraisal")
        a.employee_comments = data.get("employee_comments", a.employee_comments)
        if "kpi_scores" in data:
            a.kpi_scores = data["kpi_scores"]
        a.status = "self_review"
        a.updated_at = datetime.now()
        await a.save()
        await audit("appraisals", appraisal_id, AuditAction.UPDATE, actor={"user_id": user_id}, site_id=site_id, after={"status": "self_review"})
        return a

    @staticmethod
    async def manager_review(appraisal_id: str, data: dict, site_id: str, user: dict):
        user_id = user.get("user_id", "USR-001")
        a = await Appraisal.find_one({"appraisal_id": appraisal_id, "site_id": site_id})
        if not a:
            raise HTTPException(404, "Appraisal not found")
        await _require_manager_not_self(user, a.person_id, "review")
        if a.status not in ("self_review", "manager_review"):
            raise HTTPException(400, f"Cannot do manager review on a {a.status} appraisal")
        for field in ("overall_rating", "strengths", "improvement_areas", "training_needs",
                      "authorization_recommendation", "authorization_scopes_to_add",
                      "authorization_scopes_to_remove", "reviewer_comments"):
            if field in data:
                setattr(a, field, data[field])
        a.reviewer_person_id = await person_id_of(user)
        a.status = "manager_review"
        a.updated_at = datetime.now()
        await a.save()
        await audit("appraisals", appraisal_id, AuditAction.UPDATE, actor={"user_id": user_id}, site_id=site_id, after={"status": "manager_review"})
        return a

    @staticmethod
    async def complete_appraisal(appraisal_id: str, site_id: str, user: dict):
        user_id = user.get("user_id", "USR-001")
        a = await Appraisal.find_one({"appraisal_id": appraisal_id, "site_id": site_id})
        if not a:
            raise HTTPException(404, "Appraisal not found")
        await _require_manager_not_self(user, a.person_id, "complete")
        if a.status != "manager_review":
            raise HTTPException(400, f"Cannot complete a {a.status} appraisal")
        a.status = "completed"
        a.completed_on = datetime.now()
        a.updated_at = datetime.now()
        await a.save()
        await audit("appraisals", appraisal_id, AuditAction.UPDATE, actor={"user_id": user_id}, site_id=site_id, after={"status": "completed"})
        return a

    # ── Witnessed Inspections ──────────────────────────────────────────

    @staticmethod
    async def list_witnessed(
        site_id: str, user: dict, person_id: Optional[str] = None, page: int = 1, per_page: int = 100,
    ):
        query: dict = {"site_id": site_id}
        if not is_people_manager(user):
            mine = await own_identifiers(user)
            if person_id and person_id not in mine:
                raise HTTPException(403, "You can only see your own witnessed inspections")
            query["person_id"] = {"$in": sorted(mine)}
        elif person_id:
            query["person_id"] = person_id
        total = await WitnessedInspection.find(query).count()
        items = (
            await WitnessedInspection.find(query)
            .skip((page - 1) * per_page).limit(per_page)
            .sort(-WitnessedInspection.created_at).to_list()
        )
        return {"total": total, "items": items, "page": page, "per_page": per_page}

    @staticmethod
    async def create_witnessed(data: dict, site_id: str, user: dict):
        user_id = user.get("user_id", "USR-001")
        if not is_people_manager(user):
            raise HTTPException(403, "Only management or the Technical Manager record witnessed inspections")
        if data.get("person_id") and await _is_own(user, data["person_id"]):
            raise HTTPException(409, "You cannot record a witnessed inspection of your own work")
        wi = WitnessedInspection(**data, site_id=site_id, created_by=user_id)
        await wi.insert()
        await audit("witnessed_inspections", wi.witness_id, AuditAction.CREATE, actor={"user_id": user_id}, site_id=site_id)
        return wi

    @staticmethod
    async def get_witnessed_for_person(person_id: str, site_id: str, user: dict):
        await _require_visible(user, person_id, "witnessed inspections")
        items = await WitnessedInspection.find({"person_id": person_id, "site_id": site_id}).sort(-WitnessedInspection.date).to_list()
        return {"person_id": person_id, "total": len(items), "items": items}
