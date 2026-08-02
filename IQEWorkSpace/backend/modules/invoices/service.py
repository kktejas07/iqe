from fastapi import HTTPException
from modules.invoices.models import Invoice
from modules.visits.models import Visit
from datetime import datetime


class InvoiceService:

    @staticmethod
    async def list(site_id: str, status: str = "", job_id: str = "", page: int = 1, per_page: int = 25):
        query = {"site_id": site_id}
        if status: query["status"] = status
        if job_id: query["job_id"] = job_id
        total = await Invoice.find(query).count()
        items = await Invoice.find(query).sort(-Invoice.created_at).skip((page - 1) * per_page).limit(per_page).to_list()
        return {"total": total, "page": page, "per_page": per_page, "data": [i.dict() for i in items]}

    @staticmethod
    async def get(invoice_id: str):
        inv = await Invoice.find_one(Invoice.invoice_id == invoice_id)
        if not inv: raise HTTPException(404, "Invoice not found")
        return inv

    @staticmethod
    async def create(data: dict, site_id: str, user_id: str):
        existing = await Invoice.find_one(Invoice.invoice_id == data.get("invoice_id"))
        if existing: raise HTTPException(400, "Invoice ID already exists")
        inv = Invoice(**data, site_id=site_id, created_by=user_id)
        for visit_id in inv.visit_ids:
            visit = await Visit.find_one(Visit.visit_id == visit_id)
            if visit:
                visit.is_invoiced = True
                visit.invoice_id = inv.invoice_id
                visit.status = "invoice_initiated"
                visit.updated_at = datetime.now()
                await visit.save()
        await inv.insert()
        return inv

    @staticmethod
    async def cancel(invoice_id: str, reason: str, user_id: str):
        inv = await Invoice.find_one(Invoice.invoice_id == invoice_id)
        if not inv: raise HTTPException(404, "Invoice not found")
        inv.cancelled = True; inv.cancellation_reason = reason
        inv.cancelled_by = user_id; inv.cancelled_on = datetime.now()
        inv.status = "cancelled"; inv.updated_at = datetime.now()
        await inv.save()
        return inv

    @staticmethod
    async def toggle_freeze(invoice_id: str):
        inv = await Invoice.find_one(Invoice.invoice_id == invoice_id)
        if not inv: raise HTTPException(404, "Invoice not found")
        inv.frozen = not inv.frozen
        inv.updated_at = datetime.now()
        await inv.save()
        return inv

    @staticmethod
    async def get_eligible_visits(site_id: str):
        query = {"site_id": site_id, "is_invoiced": False, "status": "finance_check_completed"}
        return [v.dict() for v in await Visit.find(query).to_list()]
