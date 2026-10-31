"""Running a non-inspection service line through its steps.

Every refusal here is a rule from the workflow:

* the job must carry a J.No and be registered to the same service line,
* a person is authorised for the line, free of conflict, and confirmed by the
  Technical Manager - never by themselves,
* sub-contracted work needs an approved provider, the MD's decision and the
  client's consent (asset integrity); a design consultant is on the approved
  list, declares conflicts, and is not an inspector (equipment design),
* equipment design stops where IQE inspects the item, since designing it
  would be marking its own work,
* Expediting, vendor assessment and asset integrity close only once the
  Technical Manager has signed the report; design and training issue no
  inspection report.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException

from core import audit
from core.audit import AuditAction
from core.auth import Role
from core.claims import ServiceLine, normalise_service_line
from core.identity import own_identifiers, person_id_of
from core.sequences import next_identifier
from modules.engagements.flows import FLOWS, NO_REPORT_LINES, REPORT_LINES
from modules.engagements.models import Engagement, StepRecord
from modules.regions.cover import covering

_PRIVILEGED = {int(Role.ADMIN), int(Role.TECHNICAL_MANAGER)}


def _step(eng: Engagement, code: str) -> StepRecord:
    for s in eng.steps:
        if s.code == code:
            return s
    raise HTTPException(404, f"{eng.service_line} has no step {code}")


class EngagementService:

    # ------------------------------------------------------------ reads

    @staticmethod
    async def get(engagement_id: str, site_id: str) -> Engagement:
        eng = await Engagement.find_one(
            Engagement.engagement_id == engagement_id, Engagement.site_id == site_id
        )
        if not eng:
            raise HTTPException(404, f"Engagement {engagement_id} not found")
        return eng

    @staticmethod
    async def detail(engagement_id: str, site_id: str) -> dict:
        eng = await EngagementService.get(engagement_id, site_id)
        flow = FLOWS[eng.service_line]
        done = {s.code for s in eng.steps if s.status == "done"}
        nxt = next((s for s in flow if s.code not in done), None)
        return {
            **eng.model_dump(exclude={"id"}),
            "flow": [
                {"code": s.code, "title": s.title, "kind": s.kind,
                 "items": list(s.items), "repeatable": s.repeatable,
                 "done": s.code in done}
                for s in flow
            ],
            "next_step": nxt.code if nxt else None,
        }

    @staticmethod
    async def for_job(job_id: str, site_id: str) -> list[dict]:
        rows = await Engagement.find({"job_id": job_id, "site_id": site_id}).to_list()
        return [r.model_dump(exclude={"id"}) for r in rows]

    # ------------------------------------------------------------- open

    @staticmethod
    async def open(payload: dict, site_id: str, user: dict) -> dict:
        from modules.jobs.models import Job

        job_id = (payload.get("job_id") or "").strip()
        if not job_id:
            raise HTTPException(400, "job_id is required")
        try:
            line = normalise_service_line(payload.get("service_line")).value
        except ValueError as exc:
            raise HTTPException(422, str(exc))
        if line not in FLOWS:
            raise HTTPException(
                422, f"{line} is not one of the staged service lines "
                     f"({', '.join(FLOWS)}); it runs through the inspection workflow."
            )
        job = await Job.find_one({"job_id": job_id, "site_id": site_id})
        if not job:
            raise HTTPException(404, f"Job {job_id} not found")
        if not job.j_no:
            raise HTTPException(
                409, f"{job_id} has no J.No. The engagement starts from an opened J.No (steps 1-4)."
            )
        registered = normalise_service_line(job.service_line).value
        if registered != line:
            raise HTTPException(
                409, f"{job_id} is registered as {registered}; it cannot run an {line} engagement. "
                     "The service line is chosen at step 3 and carried on the Job Register."
            )
        existing = await Engagement.find_one(
            {"job_id": job_id, "service_line": line, "site_id": site_id, "status": {"$ne": "closed"}}
        )
        if existing:
            raise HTTPException(
                409, f"{job_id} already has an open {line} engagement ({existing.engagement_id})"
            )
        steps = [StepRecord(code=s.code) for s in FLOWS[line]]
        steps[0].status = "done"
        steps[0].completed_by = user.get("user_id")
        steps[0].completed_on = datetime.now()
        steps[0].data = {"j_no": job.j_no}
        eng = Engagement(
            engagement_id=await next_identifier(Engagement, "engagement_id", site_id, "ENG"),
            site_id=site_id, job_id=job_id, service_line=line, client_id=job.client_id,
            steps=steps, created_by=user.get("user_id"),
        )
        await eng.insert()
        await audit.record(
            "engagement", eng.engagement_id, AuditAction.CREATE,
            actor={"user_id": user.get("user_id")}, site_id=site_id,
            context={"job_id": job_id, "service_line": line, "j_no": job.j_no},
        )
        return await EngagementService.detail(eng.engagement_id, site_id)

    # ---------------------------------------------------------- helpers

    @staticmethod
    async def _is_tm(user: dict, job) -> bool:
        if int(user.get("role_id") or 0) in _PRIVILEGED:
            return True
        return await covering(user, "TM", getattr(job, "region_code", None))

    @staticmethod
    async def _require_authorised(
        person_id: str, accepted: set[str], job, site_id: str
    ) -> None:
        from core.claims import normalise_service_line
        from modules.people import scope as scope_rules
        from modules.people.service import PeopleService

        pid = await scope_rules.resolve_person_id(person_id, site_id) or person_id
        try:
            line = normalise_service_line(getattr(job, "service_line", None)).value
        except ValueError:
            line = None
        ok = []
        for a in await scope_rules.current_records(pid, site_id):
            if not ({t.upper() for t in a.inspection_types} & accepted):
                continue
            # A record that names service lines must cover this job's line.
            if a.service_lines and line and line not in scope_rules.lines_of(a):
                continue
            ok.append(a)
        if not ok:
            raise HTTPException(
                409, f"{person_id} is not currently authorised for {' / '.join(sorted(accepted))}"
                     f"{' on ' + line if line else ''}. Authorisation is by scope and is renewed "
                     "every year (the Job Register's H8/H10 check)."
            )
        if await PeopleService.has_conflict(
            person_id, getattr(job, "client_id", None), getattr(job, "manufacturer_id", None), site_id
        ):
            raise HTTPException(
                409, f"{person_id} has declared a conflict of interest with this client or manufacturer."
            )

    @staticmethod
    async def _require_report_signed(job_id: str, site_id: str) -> None:
        from modules.signoff.models import ReportSignoff

        signed = await ReportSignoff.find_one(
            {"job_id": job_id, "site_id": site_id, "status": "approved"}
        )
        if not signed:
            raise HTTPException(
                409, f"The Technical Manager has not signed off the report for {job_id}."
            )

    @staticmethod
    def _need(payload: dict, *keys: str) -> None:
        missing = [k for k in keys if not payload.get(k)]
        if missing:
            raise HTTPException(400, "Required: " + ", ".join(missing))

    # --------------------------------------------------------- stepping

    @staticmethod
    async def complete_step(
        engagement_id: str, code: str, payload: dict, site_id: str, user: dict
    ) -> dict:
        from modules.jobs.models import Job

        eng = await EngagementService.get(engagement_id, site_id)
        if eng.status == "closed":
            raise HTTPException(409, f"{engagement_id} is closed")
        if eng.status == "blocked":
            raise HTTPException(
                409, f"{engagement_id} is blocked: {eng.permitted_engagement} only. "
                     "IQE cannot design what it inspects."
            )
        flow = FLOWS[eng.service_line]
        spec = next((s for s in flow if s.code == code), None)
        if not spec:
            raise HTTPException(404, f"{eng.service_line} has no step {code}")
        rec = _step(eng, code)
        if rec.status == "done" and not spec.repeatable:
            raise HTTPException(409, f"{code} is already complete")
        idx = flow.index(spec)
        for before in flow[:idx]:
            if _step(eng, before.code).status != "done":
                raise HTTPException(
                    409, f"{code} comes after {before.code} ({before.title}), which is not complete"
                )
        if spec.repeatable:
            for later in flow[idx + 1:]:
                if _step(eng, later.code).status == "done":
                    raise HTTPException(409, f"{code} is closed to updates once {later.code} is complete")

        job = await Job.find_one({"job_id": eng.job_id, "site_id": site_id})
        who = await person_id_of(user)
        is_tm = await EngagementService._is_tm(user, job)
        data = await getattr(EngagementService, f"_do_{spec.kind}")(
            eng, spec, payload, site_id, user, who, is_tm, job
        )

        now = datetime.now()
        if spec.repeatable:
            rec.updates.append({"on": now, "by": who, **data})
        else:
            rec.data = data
        rec.status = "done"
        rec.completed_by = who
        rec.completed_on = now
        eng.updated_at = now
        if spec.kind == "close":
            eng.status, eng.closed_on = "closed", now
        await eng.save()
        await audit.record(
            "engagement", engagement_id, AuditAction.UPDATE,
            actor={"user_id": user.get("user_id")}, site_id=site_id,
            note=f"{code} {spec.title}", context={"step": code, "by": who},
        )
        return await EngagementService.detail(engagement_id, site_id)

    # ---- one handler per kind; each returns the data to record

    @staticmethod
    async def _do_authorise(eng, spec, p, site_id, user, who, is_tm, job):
        if not is_tm:
            raise HTTPException(
                403, "The Technical Manager (or the deputy arranged for them) confirms competence."
            )
        EngagementService._need(p, "person_id", "allocated_by")
        person = p["person_id"]
        if person in await own_identifiers(user):
            raise HTTPException(403, "You cannot confirm your own authorisation for a job.")
        await EngagementService._require_authorised(person, {eng.service_line}, job, site_id)
        eng.authorised_person_id = person
        return {"person_id": person, "allocated_by": p["allocated_by"], "confirmed_by": who}

    @staticmethod
    async def _do_provider(eng, spec, p, site_id, user, who, is_tm, job):
        from modules.providers.models import ProviderCategory
        from modules.providers.service import ProviderService, is_usable

        if not is_tm:
            raise HTTPException(403, "Engaging an external party is for the Technical Manager or management.")
        EngagementService._need(p, "provider_id", "coi_declared_by")
        provider = await ProviderService.get(p["provider_id"], site_id)
        if eng.service_line == "ASSET_INTEGRITY":
            check = await ProviderService.check_may_subcontract(
                eng.job_id, provider.provider_id, site_id
            )
            if not check["may_subcontract"]:
                raise HTTPException(409, "; ".join(check["blockers"]))
        else:   # equipment design: a consultant, never an inspector
            if provider.category == ProviderCategory.INSPECTION_SUBCONTRACT.value:
                raise HTTPException(
                    409, "A Design Consultant is engaged on a consultancy basis, not as an inspector."
                )
            usable, reason = is_usable(provider)
            if not usable:
                raise HTTPException(409, f"{provider.name} cannot be engaged: {reason}")
        eng.provider_id = provider.provider_id
        return {"provider_id": provider.provider_id, "coi_declared_by": p["coi_declared_by"]}

    @staticmethod
    async def _do_independence(eng, spec, p, site_id, user, who, is_tm, job):
        from modules.risk import design_independence as di

        if not is_tm:
            raise HTTPException(403, "The independence check is for the Technical Manager or management.")
        for k in ("inspected_by_iqe", "similar_competitive"):
            if k not in p or not isinstance(p[k], bool):
                raise HTTPException(
                    400, f"{k} must be stated true or false; the check does not guess it."
                )
        result = di.decide(
            p.get("requested", di.DESIGN),
            inspected_by_iqe=p["inspected_by_iqe"],
            similar_competitive=p["similar_competitive"],
            item=p.get("item"),
        )
        eng.permitted_engagement = result["permitted_engagement"]
        if result["permitted_engagement"] != di.DESIGN:
            eng.status = "blocked"
            rec = _step(eng, spec.code)
            rec.data = result
            await eng.save()
            await audit.record(
                "engagement", eng.engagement_id, AuditAction.STATUS_CHANGE,
                actor={"user_id": user.get("user_id")}, site_id=site_id,
                note="Design refused: " + result["reason"],
            )
            raise HTTPException(
                409, result["reason"] + ". Open a Part B appraisal instead; this engagement is blocked."
            )
        return result

    @staticmethod
    async def _performer_ok(eng, user, who, is_tm) -> None:
        if is_tm:
            return
        if eng.authorised_person_id and who == eng.authorised_person_id:
            return
        if eng.authorised_person_id:
            raise HTTPException(
                403, f"This engagement is with {eng.authorised_person_id}; only they, "
                     "or the Technical Manager, record its progress."
            )

    @staticmethod
    async def _do_checklist(eng, spec, p, site_id, user, who, is_tm, job):
        await EngagementService._performer_ok(eng, user, who, is_tm)
        covered = p.get("covered") or {}
        missing = [i for i in spec.items if not str(covered.get(i) or "").strip()]
        if missing:
            raise HTTPException(
                400, f"{spec.code} {spec.title}: not yet covered - " + ", ".join(missing)
            )
        return {"covered": {i: covered[i] for i in spec.items}}

    @staticmethod
    async def _do_work(eng, spec, p, site_id, user, who, is_tm, job):
        await EngagementService._performer_ok(eng, user, who, is_tm)
        EngagementService._need(p, "note")
        data = {"note": p["note"]}
        if eng.service_line == "ASSET_INTEGRITY":
            sup = (p.get("supervisor_person_id") or "").strip()
            if not sup:
                raise HTTPException(400, "An IQE inspector supervises on site: supervisor_person_id is required")
            await EngagementService._require_authorised(sup, {"ASSET_INTEGRITY", "PART_B"}, job, site_id)
            data["supervisor_person_id"] = sup
        return data

    @staticmethod
    async def _do_evidence(eng, spec, p, site_id, user, who, is_tm, job):
        await EngagementService._performer_ok(eng, user, who, is_tm)
        items = p.get("items") or []
        if not items:
            raise HTTPException(400, f"{spec.code} {spec.title}: at least one item is required")
        for n, it in enumerate(items, 1):
            if not (it.get("description") or "").strip():
                raise HTTPException(400, f"item {n}: a description is required")
            if not it.get("evidence_ids"):
                raise HTTPException(
                    400, f"item {n}: evidence (documents or photographs) is required for every item"
                )
            if eng.service_line == "TRAINING" and it.get("result") not in ("pass", "fail"):
                raise HTTPException(400, f"item {n}: record the result, pass or fail")
        return {"items": items}

    @staticmethod
    async def _do_report(eng, spec, p, site_id, user, who, is_tm, job):
        if not is_tm:
            raise HTTPException(403, "The Technical Manager reviews and signs the report.")
        await EngagementService._require_report_signed(eng.job_id, site_id)
        data: dict = {}
        if eng.service_line == "ASSET_INTEGRITY":
            scope = (p.get("subcontracted_scope") or "").strip()
            if not scope:
                raise HTTPException(
                    400, "The report must identify the sub-contracted scope (subcontracted_scope)"
                )
            data["subcontracted_scope"] = scope
        if eng.service_line == "VENDOR_ASSESSMENT":
            gaps = p.get("gaps")
            if gaps is None:
                raise HTTPException(400, "State the gaps found (an empty list if none)")
            if gaps and not p.get("gaps_sent_to_client"):
                raise HTTPException(409, "Gaps found must be sent to the client before the report is complete")
            data.update(gaps=gaps, gaps_sent_to_client=bool(p.get("gaps_sent_to_client")))
        return data

    @staticmethod
    async def _do_certificate(eng, spec, p, site_id, user, who, is_tm, job):
        await EngagementService._performer_ok(eng, user, who, is_tm)
        EngagementService._need(p, "certificate_ref", "participants")
        assessed = _step(eng, "T4").data.get("items", [])
        passed = {i.get("participant") for i in assessed if i.get("result") == "pass"}
        not_passed = [x for x in p["participants"] if x not in passed]
        if not_passed:
            raise HTTPException(
                409, "No certificate for participants who have not passed assessment: "
                     + ", ".join(map(str, not_passed))
            )
        return {"certificate_ref": p["certificate_ref"], "participants": p["participants"]}

    @staticmethod
    async def _do_close(eng, spec, p, site_id, user, who, is_tm, job):
        if eng.service_line in REPORT_LINES:
            await EngagementService._require_report_signed(eng.job_id, site_id)
        return {"billing_reference": p.get("billing_reference")}
