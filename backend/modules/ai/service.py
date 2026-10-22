"""
AI Module — RAG, Vision, Inspection Report Generation, Predictive Analytics
Patterns from: https://github.com/Shubhamsaboo/awesome-llm-apps
"""
from datetime import datetime
from typing import Optional
from modules.visits.models import Visit


class AIService:

    def __init__(self):
        self.report_model = "gpt-4o"
        self.embedding_model = "text-embedding-3-large"

    async def generate_inspection_report(self, visit_id: str) -> dict:
        visit = await Visit.find_one(Visit.visit_id == visit_id)
        if not visit:
            return {"error": "Visit not found"}

        photos_context = "\n".join([
            f"- Photo {p.photo_id}: {p.caption or 'No caption'} (tags: {', '.join(p.ai_tags) if p.ai_tags else 'none'})"
            for p in (visit.photos or [])
        ]) or "No photos captured"

        findings_context = "\n".join([
            f"- [{f.severity.upper()}] {f.description}"
            for f in (visit.findings or [])
        ]) or "No findings recorded"

        expenses_context = "\n".join([
            f"- {e.type}: {e.amount} {e.currency} ({e.description or 'N/A'})"
            for e in (visit.expenses or [])
        ]) or "No expenses recorded"

        report_prompt = (
            f"Generate a professional inspection report with these sections:\n\n"
            f"1. EXECUTIVE SUMMARY\n"
            f"2. INSPECTION DETAILS\n"
            f"   - Visit ID: {visit.visit_id}\n"
            f"   - Inspector: {visit.inspector_name or 'N/A'}\n"
            f"   - Date: {visit.visited_from} to {visit.visited_to}\n"
            f"   - Report No: {visit.inspection_report_no or 'N/A'}\n\n"
            f"3. FINDINGS\n{findings_context}\n\n"
            f"4. PHOTOGRAPHIC EVIDENCE\n{photos_context}\n\n"
            f"5. EXPENSES\n{expenses_context}\n\n"
            f"6. INSPECTOR COMMENTS\n{visit.comments or 'None'}\n\n"
            f"7. RECOMMENDATIONS\n"
        )

        return {
            "visit_id": visit_id,
            "generated_at": datetime.now().isoformat(),
            "prompt": report_prompt,
            "status": "draft",
            "photos_count": len(visit.photos) if visit.photos else 0,
            "findings_count": len(visit.findings) if visit.findings else 0,
            "expenses_total": sum(e.amount for e in (visit.expenses or [])),
        }

    async def vector_search(self, query: str, site_id: str, limit: int = 10) -> list:
        visits = await Visit.find(Visit.site_id == site_id).sort(-Visit.created_at).limit(limit).to_list()
        results = []
        q = query.lower()
        for v in visits:
            score = 0
            if v.inspection_report_no and q in v.inspection_report_no.lower(): score += 10
            if v.comments and q in v.comments.lower(): score += 5
            for f in (v.findings or []):
                if q in f.description.lower(): score += 3
            if score > 0:
                results.append({"visit_id": v.visit_id, "score": score, "summary": v.comments or ""})
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]

    async def detect_anomalies(self, visit_id: str) -> dict:
        visit = await Visit.find_one(Visit.visit_id == visit_id)
        if not visit:
            return {"error": "Visit not found"}

        flags = []
        total_expense = sum(e.amount for e in (visit.expenses or []))

        if total_expense > 50000:
            flags.append({"type": "high_expense", "severity": "medium", "detail": f"Total expense {total_expense} exceeds 50K"})

        if visit.photos and not visit.findings:
            flags.append({"type": "photos_without_findings", "severity": "low", "detail": "Photos exist but no findings recorded"})

        if visit.visited_from and visit.visited_to:
            from datetime import datetime as dt
            try:
                f = dt.fromisoformat(visit.visited_from.replace("Z", "+00:00"))
                t = dt.fromisoformat(visit.visited_to.replace("Z", "+00:00"))
                hours = (t - f).total_seconds() / 3600
                if hours > 12:
                    flags.append({"type": "long_visit", "severity": "low", "detail": f"Visit duration {hours:.1f}h exceeds 12h"})
            except: pass

        return {"visit_id": visit_id, "flags": flags, "total_expense": total_expense, "findings_count": len(visit.findings or [])}

    async def suggest_inspector(self, job_type: str, location: str, site_id: str) -> list:
        from modules.users.models import Competency
        from modules.auth.models import UserLogin
        inspectors = await UserLogin.find(UserLogin.site_id == site_id, UserLogin.role_id == 3, UserLogin.is_active == True).to_list()
        suggestions = []
        for i in inspectors:
            comp = await Competency.find_one(Competency.user_id == i.user_id, Competency.site_id == site_id)
            score = 50
            if job_type == "welding" and comp and comp.welding: score += 30
            if job_type == "electrical" and comp and comp.switchboards_pmccs_mccs: score += 30
            if job_type == "piping" and comp and comp.line_pipe_inspection: score += 30
            if job_type == "pressure" and comp and comp.pressure_vessels: score += 30
            if job_type == "inspection": score += 10
            suggestions.append({"user_id": i.user_id, "name": i.full_name, "score": score, "employee_code": i.employee_code})
        suggestions.sort(key=lambda x: x["score"], reverse=True)
        return suggestions[:5]
