from fastapi import HTTPException
from modules.payments.models import Payment
from datetime import datetime

class PaymentService:
    @staticmethod
    async def list(site_id: str, invoice_id: str = "", page: int = 1, per_page: int = 25):
        query = {"site_id": site_id}
        if invoice_id: query["invoice_id"] = invoice_id
        total = await Payment.find(query).count()
        items = await Payment.find(query).sort(-Payment.created_at).skip((page - 1) * per_page).limit(per_page).to_list()
        return {"total": total, "page": page, "per_page": per_page, "data": [p.dict() for p in items]}

    @staticmethod
    async def create(data: dict, site_id: str, user_id: str):
        data["site_id"] = site_id; data["created_by"] = user_id
        payment = Payment(**data)
        await payment.insert()
        from modules.invoices.models import Invoice
        inv = await Invoice.find_one(Invoice.invoice_id == data.get("invoice_id"))
        if inv:
            inv.status = "paid"
            inv.updated_at = datetime.now()
            from modules.jobs.models import Job
            await Job.find(Job.site_id == site_id).update({"$set": {"status": "closed"}})
            await inv.save()
        return payment
