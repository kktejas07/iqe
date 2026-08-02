from fastapi import HTTPException
from modules.jobs.models import Job
from modules.service_orders.models import ServiceOrder
from modules.control_numbers.models import ControlNumber
from modules.visits.models import Visit
from modules.invoices.models import Invoice
from datetime import datetime


class JobService:

    @staticmethod
    async def list(site_id: str, search: str = "", status: str = "", page: int = 1, per_page: int = 25):
        query = {"site_id": site_id}
        if status: query["status"] = status
        if search:
            query["$or"] = [{"job_id": {"$regex": search, "$options": "i"}}, {"title": {"$regex": search, "$options": "i"}}, {"client_name": {"$regex": search, "$options": "i"}}]
        total = await Job.find(query).count()
        items = await Job.find(query).sort(-Job.created_at).skip((page - 1) * per_page).limit(per_page).to_list()
        return {"total": total, "page": page, "per_page": per_page, "data": [j.dict() for j in items]}

    @staticmethod
    async def get(job_id: str, site_id: str, include: str = ""):
        job = await Job.find_one(Job.job_id == job_id, Job.site_id == site_id)
        if not job: raise HTTPException(404, "Job not found")
        result = job.dict()
        if "service-orders" in include:
            result["service_orders"] = [s.dict() for s in await ServiceOrder.find(ServiceOrder.job_id == job_id).to_list()]
        if "control-numbers" in include:
            result["control_numbers"] = [c.dict() for c in await ControlNumber.find(ControlNumber.job_id == job_id).to_list()]
        if "visits" in include:
            result["visits"] = [v.dict() for v in await Visit.find(Visit.job_id == job_id).to_list()]
        if "invoices" in include:
            result["invoices"] = [i.dict() for i in await Invoice.find(Invoice.job_id == job_id).to_list()]
        return result

    @staticmethod
    async def create(data: dict, site_id: str, user_id: str):
        if not data.get("job_id"):
            total_jobs = await Job.find_all().count()
            data["job_id"] = f"JOB-{(total_jobs + 1):03d}"

        existing = await Job.find_one(Job.job_id == data["job_id"])
        if existing: raise HTTPException(400, "Job ID already exists")
        job = Job(**data, site_id=site_id, created_by=user_id)
        await job.insert()
        return job

    @staticmethod
    async def update(job_id: str, data: dict, site_id: str):
        job = await Job.find_one(Job.job_id == job_id, Job.site_id == site_id)
        if not job: raise HTTPException(404, "Job not found")
        for k, v in data.items():
            if hasattr(job, k) and k not in ("job_id", "site_id", "created_at", "created_by"):
                setattr(job, k, v)
        job.updated_at = datetime.now()
        await job.save()
        return job

    @staticmethod
    async def update_status(job_id: str, status: str, site_id: str):
        job = await Job.find_one(Job.job_id == job_id, Job.site_id == site_id)
        if not job: raise HTTPException(404, "Job not found")
        job.status = status
        job.updated_at = datetime.now()
        await job.save()
        return job

    @staticmethod
    async def dashboard(site_id: str):
        jobs = await Job.find(Job.site_id == site_id).to_list()
        return {
            "total": len(jobs),
            "open": sum(1 for j in jobs if j.status in ("draft", "open")),
            "in_progress": sum(1 for j in jobs if j.status in ("assigned", "in_progress")),
            "qc_pending": sum(1 for j in jobs if j.status == "submitted"),
            "approved": sum(1 for j in jobs if j.status in ("qc_approved", "approved")),
            "invoiced": sum(1 for j in jobs if j.status == "invoiced"),
            "closed": sum(1 for j in jobs if j.status in ("closed", "cancelled")),
        }
