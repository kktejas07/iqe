from fastapi import HTTPException
from modules.invoices.models import Invoice, ChargeItem, AnnexureItem
from modules.visits.models import Visit
from datetime import datetime, timedelta
from typing import Optional


class InvoiceService:

    @staticmethod
    async def list(
        site_id: str = "SITE-01", 
        search: str = "", 
        alpha: str = "", 
        payment_status: str = "", 
        status: str = "", 
        job_id: str = "", 
        page: int = 1, 
        per_page: int = 100
    ):
        query = {"site_id": site_id}
        if status:
            query["status"] = status
        if job_id:
            query["job_id"] = job_id
        if payment_status:
            query["payment_status"] = payment_status

        if alpha and alpha.upper() != "ALL":
            query["$or"] = [
                {"client_name": {"$regex": f"^{alpha}", "$options": "i"}},
                {"invoice_number": {"$regex": f"^{alpha}", "$options": "i"}},
            ]

        if search:
            search_query = {
                "$or": [
                    {"invoice_number": {"$regex": search, "$options": "i"}},
                    {"invoice_id": {"$regex": search, "$options": "i"}},
                    {"client_name": {"$regex": search, "$options": "i"}},
                    {"job_id": {"$regex": search, "$options": "i"}},
                ]
            }
            if "$or" in query:
                alpha_q = query.pop("$or")
                query["$and"] = [{"$or": alpha_q}, search_query]
            else:
                query.update(search_query)

        total = await Invoice.find(query).count()
        items = await Invoice.find(query).sort(-Invoice.created_at).skip((page - 1) * per_page).limit(per_page).to_list()

        # Update overdue alert state
        now = datetime.now()
        for item in items:
            if item.due_date and item.due_date < now and item.payment_status != "paid":
                item.payment_status = "overdue"
                item.overdue_alert = True

        return {"total": total, "page": page, "per_page": per_page, "data": [i.dict() for i in items]}

    @staticmethod
    async def get(invoice_id: str, site_id: str = "SITE-01"):
        inv = await Invoice.find_one(Invoice.invoice_id == invoice_id, Invoice.site_id == site_id)
        if not inv:
            raise HTTPException(404, "Invoice not found")
        return inv

    @staticmethod
    async def create(data: dict, site_id: str, user_id: str):
        existing = await Invoice.find_one(Invoice.invoice_id == data.get("invoice_id"), Invoice.site_id == site_id)
        if existing:
            raise HTTPException(400, "Invoice ID already exists")

        # Auto-calculate 30-Day Payment Due Date if not explicitly set
        inv_date = datetime.now()
        if data.get("invoice_date"):
            try:
                inv_date = datetime.fromisoformat(str(data["invoice_date"]).replace("Z", ""))
            except Exception:
                inv_date = datetime.now()

        due_date = inv_date + timedelta(days=30)
        data["invoice_date"] = inv_date
        data["due_date"] = due_date
        data["payment_status"] = "unpaid"

        inv = Invoice(**data, site_id=site_id, created_by=user_id)
        for visit_id in inv.visit_ids:
            visit = await Visit.find_one(Visit.visit_id == visit_id, Visit.site_id == site_id)
            if visit:
                visit.is_invoiced = True
                visit.invoice_id = inv.invoice_id
                visit.status = "invoice_initiated"
                visit.updated_at = datetime.now()
                await visit.save()
        await inv.insert()
        return inv

    @staticmethod
    async def record_payment(invoice_id: str, payment_mode: str, transaction_ref: str, payment_date: Optional[str] = None, site_id: str = "SITE-01"):
        inv = await Invoice.find_one(Invoice.invoice_id == invoice_id, Invoice.site_id == site_id)
        if not inv:
            raise HTTPException(404, "Invoice not found")
        inv.payment_status = "paid"
        inv.overdue_alert = False
        inv.payment_mode = payment_mode
        inv.transaction_ref = transaction_ref
        if payment_date:
            try:
                inv.payment_date = datetime.fromisoformat(payment_date.replace("Z", ""))
            except Exception:
                inv.payment_date = datetime.now()
        else:
            inv.payment_date = datetime.now()
        inv.status = "paid"
        inv.updated_at = datetime.now()
        await inv.save()
        return inv

    @staticmethod
    async def cancel(invoice_id: str, reason: str, user_id: str, site_id: str = "SITE-01"):
        inv = await Invoice.find_one(Invoice.invoice_id == invoice_id, Invoice.site_id == site_id)
        if not inv:
            raise HTTPException(404, "Invoice not found")
        inv.cancelled = True
        inv.cancellation_reason = reason
        inv.cancelled_by = user_id
        inv.cancelled_on = datetime.now()
        inv.status = "cancelled"
        inv.updated_at = datetime.now()
        await inv.save()
        return inv

    @staticmethod
    async def toggle_freeze(invoice_id: str, site_id: str = "SITE-01"):
        inv = await Invoice.find_one(Invoice.invoice_id == invoice_id, Invoice.site_id == site_id)
        if not inv:
            raise HTTPException(404, "Invoice not found")
        inv.frozen = not inv.frozen
        inv.updated_at = datetime.now()
        await inv.save()
        return inv

    @staticmethod
    async def get_eligible_visits(site_id: str):
        query = {"site_id": site_id, "is_invoiced": False, "status": "finance_check_completed"}
        return [v.dict() for v in await Visit.find(query).to_list()]

