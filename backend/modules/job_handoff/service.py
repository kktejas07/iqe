from __future__ import annotations
from datetime import datetime
from fastapi import HTTPException
from core.audit import AuditAction, record as audit
from core.claims import normalise_service_line
from modules.job_handoff import jno
from modules.job_handoff.models import JobConversion


_financial_year_code = jno.financial_year_code  # kept for existing importers


class JobHandoffService:

    @staticmethod
    async def convert_enquiry_to_job(data: dict, site_id: str, user_id: str):
        from modules.enquiries.models import Enquiry, EnquiryStatus
        from modules.jobs.models import Job

        enquiry_id = data.get("enquiry_id")
        enquiry = await Enquiry.find_one({"enquiry_id": enquiry_id, "site_id": site_id})
        if not enquiry:
            raise HTTPException(status_code=404, detail="Enquiry not found")
        if enquiry.status != EnquiryStatus.WON.value:
            raise HTTPException(
                status_code=400,
                detail=f"Enquiry must be in WON status, currently {enquiry.status}",
            )
        if enquiry.won_job_id:
            raise HTTPException(status_code=409, detail="Enquiry already converted")

        region_code = jno.normalise_region(data.get("region_code", "S"))
        trigger = jno.check_trigger(data.get("trigger"))
        try:
            service_line = normalise_service_line(data.get("service_line")).value
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))

        if trigger in jno.REUSE_TRIGGERS:
            existing_j_no = data.get("existing_j_no")
            if not existing_j_no:
                raise HTTPException(
                    422, f"{trigger} continues an existing J.No - supply existing_j_no"
                )
            jno.parse(existing_j_no)
            job = await Job.find_one({"j_no": existing_j_no, "site_id": site_id})
            jno.check_reuse(trigger, job, enquiry.client_id, region_code)
            j_no = job.j_no
            refs = list(job.po_references or [])
            if data.get("po_number") and data["po_number"] not in refs:
                refs.append(data["po_number"])
            job.po_references = refs
            job.updated_at = datetime.now()
            await job.save()
        else:
            j_no = await jno.allocate(region_code, site_id)
            fy = jno.financial_year_code()
            job = Job(
                job_id=f"JOB-{j_no}",
                site_id=site_id,
                j_no=j_no,
                enquiry_id=enquiry_id,
                region_code=region_code,
                financial_year=f"20{fy[:2]}-{fy[2:]}",
                service_line=service_line,
                client_id=enquiry.client_id,
                title=data.get("title", f"Job from {enquiry_id}"),
                description=data.get("description"),
                po_number=data.get("po_number"),
                po_references=[data["po_number"]] if data.get("po_number") else [],
                budget_contract_amount=data.get("award_value", enquiry.pipeline_value),
                status="draft",
                created_by=user_id,
            )
            await job.insert()

        earlier = await JobConversion.find({"j_no": j_no, "site_id": site_id}).count()
        conversion = JobConversion(
            conversion_id=f"CNV-{j_no}" if earlier == 0 else f"CNV-{j_no}-{earlier + 1:02d}",
            site_id=site_id,
            enquiry_id=enquiry_id,
            proposal_id=enquiry.current_proposal_id,
            revision_no=enquiry.current_revision_no,
            award_reference=data.get("award_reference"),
            award_date=data.get("award_date"),
            award_value=data.get("award_value", 0),
            job_id=job.job_id,
            j_no=j_no,
            trigger=trigger,
            converted_by=user_id,
        )
        await conversion.insert()

        enquiry.status = EnquiryStatus.CONVERTED.value
        enquiry.won_job_id = job.job_id
        enquiry.award_reference = data.get("award_reference")
        enquiry.updated_at = datetime.now()
        await enquiry.save()

        await audit("job_conversion", conversion.conversion_id, AuditAction.CREATE, actor={"user_id": user_id}, site_id=site_id, note=f"{trigger} {j_no}")
        return {"conversion": conversion.dict(), "job": job.dict(), "j_no": j_no}

    @staticmethod
    async def list_conversions(site_id: str, page: int = 1, per_page: int = 50):
        query = {"site_id": site_id}
        total = await JobConversion.find(query).count()
        items = (
            await JobConversion.find(query)
            .sort(-JobConversion.converted_at)
            .skip((page - 1) * per_page)
            .limit(per_page)
            .to_list()
        )
        return {"total": total, "items": [i.dict() for i in items]}

    @staticmethod
    async def get_conversion(conversion_id: str, site_id: str):
        c = await JobConversion.find_one({"conversion_id": conversion_id, "site_id": site_id})
        if not c:
            raise HTTPException(status_code=404, detail="Conversion not found")
        return c.dict()
