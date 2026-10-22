"""Visit-level assists.

This module used to be a facade. `generate_inspection_report` composed a prompt
string and returned it under the key "prompt" with `status: "draft"`, so a
screen labelled AI-generated report displayed a prompt. `vector_search` was
substring matching with no vectors anywhere. `suggest_inspector` scored users
with `role_id == 3` - which is the **client** role - and applied none of the
competence, authorization, impartiality or calendar checks the assignment
engine exists to enforce, so it could propose a client's project manager as an
IQE inspector.

Each endpoint now does what its name says, or reports that it cannot:

* report generation calls a real model through `core/llm.py`, and without one
  returns the assembled context plus a status rather than a prompt;
* search is named for what it is - keyword scoring - and is scoped to the
  caller's site;
* anomaly detection keeps its deterministic rules, with its thresholds stated
  in the response so a flag can be argued with;
* inspector suggestion delegates to the assignment engine, so a suggestion
  carries the same gate an actual assignment would.

The route contract is unchanged, because the web client calls all four.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from core import llm
from modules.visits.models import Visit

#: Thresholds for the deterministic checks. Stated in the response so a flag
#: can be questioned rather than taken on faith.
HIGH_EXPENSE_THRESHOLD = 50_000.0
LONG_VISIT_HOURS = 12.0

REPORT_SYSTEM_PROMPT = (
    "You are drafting an inspection report for a third-party inspection body "
    "accredited to ISO/IEC 17020. Write only from the facts supplied. Do not "
    "infer findings that were not recorded, do not state an acceptance "
    "decision that is not present, and where information is missing say so "
    "explicitly rather than filling the gap. The draft will be reviewed and "
    "signed by a competent inspector."
)


class AIService:

    def __init__(self) -> None:
        self.report_model = "configured deployment"

    # ------------------------------------------------------ report draft

    async def generate_inspection_report(
        self, visit_id: str, site_id: str = "SITE-01"
    ) -> dict:
        """Draft narrative for a visit.

        Returns a draft when a model is configured. When one is not, returns
        the assembled context and says so - rather than returning the prompt
        and calling it a draft, which is what this did before.
        """
        visit = await Visit.find_one(Visit.visit_id == visit_id, Visit.site_id == site_id)
        if not visit:
            return {"error": "Visit not found"}

        context = {
            "visit_id": visit.visit_id,
            "inspector": visit.inspector_name,
            "from": str(visit.visited_from or ""),
            "to": str(visit.visited_to or ""),
            "report_no": visit.inspection_report_no,
            "comments": visit.comments,
            "findings": [
                {"severity": f.severity, "description": f.description}
                for f in (visit.findings or [])
            ],
            "photographs": [
                {"id": p.photo_id, "caption": p.caption} for p in (visit.photos or [])
            ],
            "expenses": [
                {"type": e.type, "amount": e.amount, "currency": e.currency}
                for e in (visit.expenses or [])
            ],
        }

        if not llm.is_configured():
            result = llm.not_configured("Report drafting")
            return {
                "visit_id": visit_id,
                "draft": None,
                "status": result.status,
                "detail": result.detail,
                "context": context,
                "generated_at": datetime.now().isoformat(),
            }

        rendered = await llm.complete(
            REPORT_SYSTEM_PROMPT,
            "Draft an inspection report from this record. Use the sections: "
            "Executive Summary, Inspection Details, Findings, Photographic "
            "Evidence, Recommendations.\n\n" + _as_text(context),
        )
        return {
            "visit_id": visit_id,
            "draft": rendered.text,
            "status": rendered.status,
            "detail": rendered.detail,
            "model": rendered.model,
            "context": context,
            "generated_at": datetime.now().isoformat(),
        }

    # ----------------------------------------------------------- search

    async def keyword_search(self, query: str, site_id: str, limit: int = 10) -> list:
        """Keyword scoring across visits.

        Named for what it does. It was called vector_search and performed
        substring matching, which made it impossible to reason about why a
        result ranked where it did.
        """
        visits = (
            await Visit.find(Visit.site_id == site_id)
            .sort(-Visit.created_at)
            .limit(200)
            .to_list()
        )
        q = (query or "").lower().strip()
        if not q:
            return []

        results = []
        for v in visits:
            score, matched = 0, []
            if v.inspection_report_no and q in v.inspection_report_no.lower():
                score += 10
                matched.append("report number")
            if v.comments and q in v.comments.lower():
                score += 5
                matched.append("comments")
            for f in (v.findings or []):
                if q in (f.description or "").lower():
                    score += 3
                    matched.append("finding")
                    break
            if score:
                results.append({
                    "visit_id": v.visit_id, "score": score,
                    "matched_on": matched, "summary": v.comments or "",
                })
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]

    #: The old name, kept so nothing breaks while callers move across.
    async def vector_search(self, query: str, site_id: str, limit: int = 10) -> list:
        return await self.keyword_search(query, site_id, limit)

    # -------------------------------------------------------- anomalies

    async def detect_anomalies(self, visit_id: str, site_id: str = "SITE-01") -> dict:
        """Deterministic checks over a visit record.

        Kept deterministic on purpose: a flag an inspector can argue with is
        more useful than one they cannot.
        """
        visit = await Visit.find_one(Visit.visit_id == visit_id, Visit.site_id == site_id)
        if not visit:
            return {"error": "Visit not found"}

        flags: list[dict] = []
        total_expense = sum(e.amount for e in (visit.expenses or []))

        if total_expense > HIGH_EXPENSE_THRESHOLD:
            flags.append({
                "type": "high_expense", "severity": "medium",
                "detail": f"Total expense {total_expense:,.0f} exceeds the "
                          f"{HIGH_EXPENSE_THRESHOLD:,.0f} threshold",
            })
        if visit.photos and not visit.findings:
            flags.append({
                "type": "photos_without_findings", "severity": "low",
                "detail": "Photographs were captured but no findings recorded",
            })

        hours = _visit_hours(visit)
        if hours is not None and hours > LONG_VISIT_HOURS:
            flags.append({
                "type": "long_visit", "severity": "low",
                "detail": f"Visit duration {hours:.1f}h exceeds {LONG_VISIT_HOURS:.0f}h",
            })

        return {
            "visit_id": visit_id,
            "flags": flags,
            "total_expense": total_expense,
            "findings_count": len(visit.findings or []),
            "method": "rules",
            "thresholds": {
                "high_expense": HIGH_EXPENSE_THRESHOLD,
                "long_visit_hours": LONG_VISIT_HOURS,
            },
        }

    # ------------------------------------------------- inspector suggestion

    async def suggest_inspector(
        self,
        job_type: str,
        location: str,
        site_id: str,
        work_package_id: Optional[str] = None,
    ) -> list:
        """Who should take this work.

        Delegates to the assignment engine. The previous implementation scored
        users with role_id 3 - the client role - and applied none of the
        competence, authorization, impartiality or calendar checks, so it could
        suggest a client's project manager as an IQE inspector. A suggestion
        now carries the same gate an actual assignment would.
        """
        if work_package_id:
            from modules.assignments.service import AssignmentService

            recommendation = await AssignmentService.recommend(
                work_package_id, site_id=site_id, top_n=5
            )
            return [
                {
                    "person_id": r.get("person_id"),
                    "name": r.get("full_name") or r.get("person_name"),
                    "score": r.get("score"),
                    "reasons": r.get("reasons", []),
                    "gate": "full",
                }
                for r in recommendation.get("recommendations", [])
            ]

        # Without a work package there is no competence requirement to check
        # against, so the honest answer is the deployable pool rather than a
        # ranking that implies a judgement nothing supports.
        from modules.people.service import PeopleService

        pool = await PeopleService.deployable_pool(site_id)
        people = pool.get("data", pool) if isinstance(pool, dict) else pool
        return [
            {
                "person_id": p.get("person_id"),
                "name": p.get("full_name"),
                "score": None,
                "reasons": ["Deployable, but no work package was given to rank against"],
                "gate": "deployability_only",
            }
            for p in people[:5]
        ]


def _visit_hours(visit: Any) -> Optional[float]:
    if not (visit.visited_from and visit.visited_to):
        return None
    try:
        start = visit.visited_from
        end = visit.visited_to
        if isinstance(start, str):
            start = datetime.fromisoformat(start.replace("Z", "+00:00"))
        if isinstance(end, str):
            end = datetime.fromisoformat(end.replace("Z", "+00:00"))
        return (end - start).total_seconds() / 3600
    except (ValueError, TypeError):
        # A malformed date is not an anomaly worth reporting; it is bad data.
        return None


def _as_text(context: dict) -> str:
    lines = []
    for key, value in context.items():
        if isinstance(value, list):
            lines.append(f"{key}:")
            lines.extend(f"  - {v}" for v in value) if value else lines.append("  (none)")
        else:
            lines.append(f"{key}: {value if value not in (None, '') else '(not recorded)'}")
    return "\n".join(lines)
