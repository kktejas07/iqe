from __future__ import annotations
from typing import Optional
from datetime import datetime
from fastapi import HTTPException
from core.audit import AuditAction, record as audit
from core.sequences import next_identifier
from modules.signoff.models import ReportSignoff


async def _who_did_the_work(job_id: str, visit_id: Optional[str], site_id: str, given: list[str]) -> list[str]:
    """Everyone recorded as having inspected or prepared this job's work."""
    people = {p for p in given if p}
    from modules.jobs.models import Job
    from modules.visits.models import Visit

    job = await Job.find_one({"job_id": job_id, "site_id": site_id})
    if job and job.assigned_inspector_id:
        people.add(job.assigned_inspector_id)
    q = {"visit_id": visit_id} if visit_id else {"job_id": job_id}
    for v in await Visit.find(q).to_list():
        if getattr(v, "inspector_id", None):
            people.add(v.inspector_id)
    return sorted(people)


def _check_signer(s: ReportSignoff, signer: str, role: str, is_deputy: bool,
                  scope_verified: bool, coi_checked: bool, cross_region: Optional[str],
                  arranged_by: Optional[str]) -> None:
    """The workflow's absence rules, as refusals.

    * Never self-review: whoever did the work cannot sign it, deputy or not.
    * A deputy RH signs only within authorised scope and only for jobs they
      did not sell, so scope and conflict checks must be confirmed and the
      signer cannot be the seller.
    * Another region's TM signs only when the Country Manager arranged it.
    """
    if not signer:
        raise HTTPException(422, "a signer is required")
    if signer in (s.prepared_by_person_ids or []):
        raise HTTPException(
            409, f"{signer} did the work on this job and cannot sign it (never self-review)"
        )
    if is_deputy and role == "deputy_rh":
        if s.sold_by_person_id and signer == s.sold_by_person_id:
            raise HTTPException(409, f"{signer} sold this job; a deputy RH signs only jobs they did not sell")
        if not (scope_verified and coi_checked):
            raise HTTPException(
                409, "a deputy RH signs only within authorised scope: confirm scope_verified and coi_checked first"
            )
    if role == "cross_region_tm" and not (cross_region and arranged_by):
        raise HTTPException(
            409, "another region's TM signs only when arranged by the Country Manager (cross_region_code and arranged_by)"
        )


class SignoffService:

    @staticmethod
    async def create(data: dict, site_id: str, user_id: str):
        signoff_id = await next_identifier(
            ReportSignoff, "signoff_id", site_id, "SGN",
        )
        prepared = await _who_did_the_work(
            data["job_id"], data.get("visit_id"), site_id, data.get("prepared_by_person_ids") or [],
        )
        signoff = ReportSignoff(
            prepared_by_person_ids=prepared,
            sold_by_person_id=data.get("sold_by_person_id"),
            signoff_id=signoff_id,
            site_id=site_id,
            job_id=data["job_id"],
            visit_id=data.get("visit_id"),
            report_ref=data.get("report_ref"),
            certification_id=data.get("certification_id"),
            assigned_tm_person_id=data.get("assigned_tm_person_id"),
            status="pending",
            created_by=user_id,
        )
        await signoff.insert()
        await audit("report_signoff", signoff_id, AuditAction.CREATE, actor={"user_id": user_id}, site_id=site_id)
        return signoff.dict()

    @staticmethod
    async def list(
        site_id: str,
        job_id: Optional[str] = None,
        status: Optional[str] = None,
        person_id: Optional[str] = None,
        page: int = 1,
        per_page: int = 50,
    ):
        query: dict = {"site_id": site_id}
        if job_id:
            query["job_id"] = job_id
        if status:
            query["status"] = status
        if person_id:
            query["$or"] = [
                {"assigned_tm_person_id": person_id},
                {"signed_by_person_id": person_id},
            ]
        total = await ReportSignoff.find(query).count()
        items = (
            await ReportSignoff.find(query)
            .sort(-ReportSignoff.created_at)
            .skip((page - 1) * per_page)
            .limit(per_page)
            .to_list()
        )
        return {"total": total, "items": [i.dict() for i in items]}

    @staticmethod
    async def get(signoff_id: str, site_id: str):
        s = await ReportSignoff.find_one({"signoff_id": signoff_id, "site_id": site_id})
        if not s:
            raise HTTPException(status_code=404, detail="Signoff not found")
        return s.dict()

    @staticmethod
    async def submit_review(signoff_id: str, data: dict, site_id: str, user_id: str):
        s = await ReportSignoff.find_one({"signoff_id": signoff_id, "site_id": site_id})
        if not s:
            raise HTTPException(status_code=404, detail="Signoff not found")

        result = data.get("result")
        if result not in ("approved", "rework_required", "rejected"):
            raise HTTPException(status_code=400, detail="result must be approved, rework_required, or rejected")

        signer = data.get("signed_by_person_id", user_id)
        is_deputy = bool(data.get("is_deputy", s.is_deputy))
        role = data.get("signed_by_role", s.signed_by_role if s.is_deputy else "tm")
        _check_signer(
            s, signer, role, is_deputy,
            bool(data.get("scope_verified", False)), bool(data.get("coi_checked", False)),
            data.get("cross_region_code") or s.cross_region_code, data.get("arranged_by") or s.arranged_by,
        )
        s.signed_by_person_id = signer
        s.signed_by_name = data.get("signed_by_name")
        s.signed_by_role = role
        s.is_deputy = is_deputy
        s.deputy_reason = data.get("deputy_reason") or s.deputy_reason
        s.cross_region_code = data.get("cross_region_code") or s.cross_region_code
        s.scope_verified = data.get("scope_verified", False)
        s.coi_checked = data.get("coi_checked", False)
        s.review_date = datetime.now()
        s.result = result

        if result == "approved":
            s.status = "approved"
            s.signed_on = datetime.now()
        elif result == "rework_required":
            s.status = "rework"
            s.rework_notes = data.get("rework_notes", "")
            s.rework_count += 1
        else:
            s.status = "rejected"

        s.updated_at = datetime.now()
        await s.save()
        await audit("report_signoff", signoff_id, AuditAction.UPDATE, actor={"user_id": user_id}, site_id=site_id, after={"result": result})
        return s.dict()

    @staticmethod
    async def assign_deputy(signoff_id: str, data: dict, site_id: str, user_id: str):
        s = await ReportSignoff.find_one({"signoff_id": signoff_id, "site_id": site_id})
        if not s:
            raise HTTPException(status_code=404, detail="Signoff not found")

        role = data.get("role", "deputy_rh")
        # Scope/COI are confirmed at review time; here only the checks that can
        # already be decided - never-self-review, seller, Country Manager arrangement.
        _check_signer(
            s, data["deputy_person_id"], role, False, True, True,
            data.get("cross_region_code"), data.get("arranged_by", user_id),
        )
        if role == "deputy_rh" and s.sold_by_person_id == data["deputy_person_id"]:
            raise HTTPException(409, "a deputy RH signs only jobs they did not sell")
        s.signed_by_person_id = data["deputy_person_id"]
        s.signed_by_name = data.get("deputy_name")
        s.signed_by_role = data.get("role", "deputy_rh")
        s.is_deputy = True
        s.deputy_reason = data.get("reason", "TM absent")
        s.cross_region_code = data.get("cross_region_code")
        s.arranged_by = data.get("arranged_by", user_id)
        s.status = "under_review"
        s.updated_at = datetime.now()
        await s.save()
        await audit("report_signoff", signoff_id, AuditAction.UPDATE, actor={"user_id": user_id}, site_id=site_id, after={"deputy": data["deputy_person_id"]})
        return s.dict()

    @staticmethod
    async def pending_for_user(person_id: str, site_id: str):
        query = {
            "site_id": site_id,
            "status": {"$in": ["pending", "under_review"]},
            "$or": [
                {"assigned_tm_person_id": person_id},
                {"signed_by_person_id": person_id},
            ],
        }
        items = await ReportSignoff.find(query).sort(-ReportSignoff.created_at).to_list()
        return {"total": len(items), "items": [i.dict() for i in items]}
