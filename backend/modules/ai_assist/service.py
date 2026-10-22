"""The AI assists the work type catalogue declares.

`AIAssist` listed six capabilities per work type and nothing read them. The
existing `modules/ai` is a facade: it composes a prompt string and returns it
without calling a model, and its "vector_search" is substring matching.

Two honest observations shaped this module.

**Half of these assists do not need a model.** Validation is a completeness
check against what the work type already declares. Anomaly detection over
rates and quantities is statistics. Checklist generation is a template built
from the codes the work type names. Implementing those deterministically makes
them testable, explainable to a client, and free - and an inspection body that
has to defend a deduction is better served by "this rate is 3.2 standard
deviations above the others on this job" than by a sentence a model wrote.

**The other half genuinely need one.** Drafting report narrative and
extracting data from a scanned MTC are model work. Those are behind an
interface that reports honestly when no model is configured, rather than
returning a prompt and calling it a result.

Every assist is gated on the work type's own `ai_assists` list, which is what
the architecture said would happen.
"""
from __future__ import annotations

import statistics
from datetime import datetime
from typing import Any, Optional

from fastapi import HTTPException

from core.config import settings
from modules.certifications.models import Certification
from modules.work_packages.models import WorkPackage
from modules.work_types.models import AIAssist, WorkTypeDefinition


async def _work_type_for(work_package_id: str, site_id: str) -> tuple[WorkPackage, WorkTypeDefinition]:
    wp = await WorkPackage.find_one(
        WorkPackage.work_package_id == work_package_id, WorkPackage.site_id == site_id
    )
    if not wp:
        raise HTTPException(404, f"Work package '{work_package_id}' not found")
    wt = await WorkTypeDefinition.find_one(
        WorkTypeDefinition.work_type_code == wp.work_type_code,
        WorkTypeDefinition.site_id == site_id,
    )
    if not wt:
        raise HTTPException(404, f"Work type '{wp.work_type_code}' not in the catalogue")
    return wp, wt


def _require_assist(wt: WorkTypeDefinition, assist: AIAssist) -> None:
    """Refuse an assist the work type does not permit.

    The catalogue decides which assists apply to which work. Running anomaly
    detection on a work type that never declared it would produce findings
    nobody agreed were meaningful.
    """
    if assist.value not in (wt.ai_assists or []):
        raise HTTPException(
            409,
            f"Work type '{wt.work_type_code}' does not enable {assist.value}. "
            f"It permits: {', '.join(wt.ai_assists or ['none'])}.",
        )


class AIAssistService:

    # ------------------------------------------------------- validation

    @staticmethod
    async def validate(work_package_id: str, site_id: str = "SITE-01") -> dict:
        """Pre-submission completeness, checked against what the work type and
        the lifecycle already require.

        Deliberately deterministic: an inspector told their report is
        incomplete is entitled to know exactly which field is missing.
        """
        wp, wt = await _work_type_for(work_package_id, site_id)
        _require_assist(wt, AIAssist.VALIDATION)

        blocking: list[str] = []
        advisory: list[str] = []

        from modules.assignments.models import Assignment
        from modules.evidence.models import Evidence, EvidenceStatus

        assignments = await Assignment.find(
            Assignment.work_package_id == work_package_id,
            Assignment.site_id == site_id,
        ).to_list()
        if not assignments:
            blocking.append("No inspection officer has been assigned.")

        if wt.requires_photos:
            photos = await Evidence.find(
                Evidence.entity_type == "work_package",
                Evidence.entity_id == work_package_id,
                Evidence.site_id == site_id,
                Evidence.kind == "PHOTO",
                Evidence.status == EvidenceStatus.ACTIVE.value,
            ).count()
            if photos == 0:
                blocking.append(
                    f"{wt.name} requires photographic evidence and none is attached."
                )

        if wt.requires_measurements:
            certs = await Certification.find(
                Certification.work_package_id == work_package_id,
                Certification.site_id == site_id,
            ).to_list()
            if not any(c.line_items for c in certs):
                blocking.append(
                    f"{wt.name} requires measurements and no measured line items exist."
                )

        if not wp.planned_start or not wp.planned_finish:
            advisory.append("Planned dates are not set, so schedule reporting will be blank.")
        if wt.applicable_codes and not wp.description:
            advisory.append(
                f"No scope description recorded. This work is governed by "
                f"{', '.join(wt.applicable_codes)} and the report will cite it."
            )

        return {
            "work_package_id": work_package_id,
            "work_type_code": wt.work_type_code,
            "ready_to_submit": not blocking,
            "blocking": blocking,
            "advisory": advisory,
            "checked_at": datetime.now(),
            "method": "deterministic",
        }

    # ---------------------------------------------------------- anomaly

    @staticmethod
    def _outliers(values: list[float], labels: list[str], z: float = 2.0) -> list[dict]:
        """Values far enough from the rest to be worth a second look.

        Needs at least four points: with three, one unusual value drags the
        mean far enough that nothing looks unusual.
        """
        if len(values) < 4:
            return []
        mean = statistics.fmean(values)
        try:
            sd = statistics.stdev(values)
        except statistics.StatisticsError:
            return []
        if sd == 0:
            return []
        found = []
        for label, value in zip(labels, values):
            score = (value - mean) / sd
            if abs(score) >= z:
                found.append({
                    "item": label,
                    "value": round(value, 2),
                    "mean": round(mean, 2),
                    "std_devs_from_mean": round(score, 2),
                    "direction": "above" if score > 0 else "below",
                })
        return sorted(found, key=lambda f: abs(f["std_devs_from_mean"]), reverse=True)

    @staticmethod
    async def detect_anomalies(
        work_package_id: str, site_id: str = "SITE-01", sensitivity: float = 2.0
    ) -> dict:
        """Rate and quantity outliers across a package's certified lines.

        Explainable by construction: each finding states how far from the mean
        it sits, which is what someone defending a deduction needs to say.
        """
        wp, wt = await _work_type_for(work_package_id, site_id)
        _require_assist(wt, AIAssist.ANOMALY)

        certs = await Certification.find(
            Certification.work_package_id == work_package_id,
            Certification.site_id == site_id,
        ).to_list()
        lines = [li for c in certs for li in (c.line_items or [])]
        if not lines:
            return {
                "work_package_id": work_package_id, "findings": [],
                "note": "No certified line items to compare.", "method": "deterministic",
            }

        findings: list[dict] = []

        rates = [(li.line_id or li.description or "?", float(li.rate or 0)) for li in lines]
        rates = [(lbl, v) for lbl, v in rates if v > 0]
        for f in AIAssistService._outliers([v for _, v in rates],
                                           [lbl for lbl, _ in rates], sensitivity):
            findings.append({**f, "kind": "RATE_OUTLIER",
                             "explanation": f"Rate sits {abs(f['std_devs_from_mean'])} standard "
                                            f"deviations {f['direction']} the other lines."})

        # Deduction concentration: a line where most of the claim was rejected.
        for li in lines:
            claimed = float(getattr(li, "claimed_quantity", 0) or 0)
            certified = float(getattr(li, "certified_quantity", 0) or 0)
            if claimed > 0:
                rejected = (claimed - certified) / claimed
                if rejected >= 0.25:
                    findings.append({
                        "kind": "HIGH_REJECTION",
                        "item": li.line_id or li.description or "?",
                        "value": round(rejected * 100, 1),
                        "explanation": f"{round(rejected * 100, 1)}% of the claimed quantity "
                                       f"was not certified.",
                    })

        return {
            "work_package_id": work_package_id,
            "work_type_code": wt.work_type_code,
            "lines_examined": len(lines),
            "sensitivity_std_devs": sensitivity,
            "findings": findings,
            "method": "deterministic",
        }

    # ------------------------------------------------------- checklist

    @staticmethod
    async def generate_checklist(work_package_id: str, site_id: str = "SITE-01") -> dict:
        """A checklist built from what the work type declares it is governed by.

        Not a model: the codes, acceptance basis and capture requirements are
        already recorded, and turning them into verification points is a
        transformation rather than a generation.
        """
        wp, wt = await _work_type_for(work_package_id, site_id)
        _require_assist(wt, AIAssist.CHECKLIST_GEN)

        points: list[dict] = []
        seq = 1

        def add(discipline: str, point: str, basis: Optional[str] = None) -> None:
            nonlocal seq
            points.append({
                "item_id": f"{wt.work_type_code}-{seq:03d}",
                "discipline": discipline,
                "verification_point": point,
                "acceptance_basis": basis or wt.acceptance_basis or "Per approved ITP",
                "status": "PENDING",
            })
            seq += 1

        for code in wt.applicable_codes or []:
            add(wt.discipline_tags[0] if wt.discipline_tags else "General",
                f"Verify compliance with {code}", code)

        if wt.requires_measurements:
            add("Measurement",
                f"Record measurements in {wt.measurement_uom or 'the agreed unit'} "
                f"using {wt.measurement_method or 'the approved method'}")
        if wt.requires_photos:
            add("Evidence", "Capture photographic evidence of the inspected condition")
        for auth_type in wt.required_authorization_types or []:
            add("Competence",
                f"Confirm the attending inspector holds a current {auth_type} authorization")

        if not points:
            add("General", f"Perform {wt.name} and record the outcome")

        return {
            "work_package_id": work_package_id,
            "work_type_code": wt.work_type_code,
            "generated_at": datetime.now(),
            "points": points,
            "method": "deterministic",
            "note": "Derived from the work type's codes and capture requirements. "
                    "Review and add scope-specific points before use.",
        }

    # -------------------------------------------------- model-backed

    @staticmethod
    def _model_available() -> bool:
        return bool(settings.azure_openai_endpoint and settings.azure_openai_api_key)

    @staticmethod
    async def draft_report(work_package_id: str, site_id: str = "SITE-01") -> dict:
        """Draft report narrative from the captured record.

        This one genuinely needs a model. When none is configured it says so
        and hands back the assembled context, rather than returning a prompt
        dressed up as a draft - which is what the previous AI module did.
        """
        wp, wt = await _work_type_for(work_package_id, site_id)
        _require_assist(wt, AIAssist.REPORT_DRAFT)

        from modules.evidence.service import EvidenceService

        certs = await Certification.find(
            Certification.work_package_id == work_package_id,
            Certification.site_id == site_id,
        ).to_list()
        photos = await EvidenceService.photos_for_report("work_package", work_package_id, site_id)

        context: dict[str, Any] = {
            "work_package": {
                "id": wp.work_package_id, "title": wp.title, "status": wp.status,
                "discipline": wp.discipline, "location": wp.location,
                "description": wp.description,
            },
            "work_type": {
                "code": wt.work_type_code, "name": wt.name,
                "applicable_codes": wt.applicable_codes,
                "acceptance_basis": wt.acceptance_basis,
                "report_format": wt.report_format_code,
            },
            "certified_lines": [
                {"description": li.description, "uom": li.uom,
                 "claimed": li.claimed_quantity, "certified": li.certified_quantity}
                for c in certs for li in (c.line_items or [])
            ],
            "photograph_count": len(photos),
        }

        if not AIAssistService._model_available():
            return {
                "work_package_id": work_package_id,
                "draft": None,
                "status": "model_not_configured",
                "detail": (
                    "Report drafting needs a language model. Set "
                    "AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY to enable it. "
                    "The assembled context is returned so the section can be "
                    "written by hand meanwhile."
                ),
                "context": context,
            }

        # A configured deployment would be called here with `context`. Left
        # unimplemented rather than stubbed: a fabricated draft presented as
        # model output is worse than an honest gap.
        return {
            "work_package_id": work_package_id,
            "draft": None,
            "status": "not_implemented",
            "detail": (
                "A model is configured but the drafting call is not wired up yet. "
                "Nothing is returned rather than a fabricated draft."
            ),
            "context": context,
        }

    @staticmethod
    async def extract_document(
        work_package_id: str, evidence_id: str, site_id: str = "SITE-01"
    ) -> dict:
        """Pull structured data out of a scanned certificate or bill.

        Genuinely model work - optical character recognition plus judgement
        about which number is the heat number. Reports honestly until wired.
        """
        wp, wt = await _work_type_for(work_package_id, site_id)
        _require_assist(wt, AIAssist.DOC_EXTRACT)

        from modules.evidence.service import EvidenceService

        item = await EvidenceService.get(evidence_id, site_id)
        return {
            "work_package_id": work_package_id,
            "evidence_id": evidence_id,
            "source": {"filename": item.filename, "content_type": item.content_type},
            "extracted": None,
            "status": "model_not_configured" if not AIAssistService._model_available()
                      else "not_implemented",
            "detail": (
                "Document extraction needs a vision-capable model. No values are "
                "returned until one is wired up - a guessed heat number on a "
                "material certificate would be worse than a blank field."
            ),
        }

    @staticmethod
    async def available_for(work_package_id: str, site_id: str = "SITE-01") -> dict:
        """Which assists this package can use, and which are actually working."""
        wp, wt = await _work_type_for(work_package_id, site_id)
        deterministic = {
            AIAssist.VALIDATION.value, AIAssist.ANOMALY.value, AIAssist.CHECKLIST_GEN.value,
        }
        declared = list(wt.ai_assists or [])
        return {
            "work_package_id": work_package_id,
            "work_type_code": wt.work_type_code,
            "declared": declared,
            "ready": [a for a in declared if a in deterministic],
            "needs_a_model": [a for a in declared if a not in deterministic],
            "model_configured": AIAssistService._model_available(),
        }
