from datetime import datetime
from modules.visits.models import Visit
from modules.invoices.models import Invoice


class ReportService:

    @staticmethod
    async def visit_report(site_id: str, from_date: str = "", to_date: str = "",
                          client_id: str = "", status: str = "", engineer_id: str = "",
                          page: int = 1, per_page: int = 50):
        query = {"site_id": site_id}
        if from_date: query["planned_date"] = {"$gte": from_date}
        if to_date:
            if "$gte" in query.get("planned_date", {}):
                query["planned_date"]["$lte"] = to_date
            else:
                query["planned_date"] = {"$lte": to_date}
        if client_id: query["client_id"] = client_id
        if status: query["status"] = status
        if engineer_id: query["inspector_id"] = engineer_id
        total = await Visit.find(query).count()
        items = await Visit.find(query).sort(-Visit.planned_date).skip((page - 1) * per_page).limit(per_page).to_list()
        return {"total": total, "page": page, "per_page": per_page, "data": [v.dict() for v in items]}

    @staticmethod
    async def expense_report(site_id: str, from_date: str = "", to_date: str = "",
                            page: int = 1, per_page: int = 50):
        query = {"site_id": site_id}
        if from_date or to_date:
            query["created_at"] = {}
            if from_date: query["created_at"]["$gte"] = from_date
            if to_date: query["created_at"]["$lte"] = to_date
        total = await Visit.find(query).count()
        items = await Visit.find(query).sort(-Visit.created_at).skip((page - 1) * per_page).limit(per_page).to_list()
        result = []
        for v in items:
            total_exp = sum(e.amount for e in v.expenses) if v.expenses else 0
            result.append({**v.dict(), "total_expense": total_exp})
        return {"total": total, "page": page, "per_page": per_page, "data": result}

    @staticmethod
    async def invoice_report(site_id: str, from_date: str = "", to_date: str = "",
                            status: str = "", page: int = 1, per_page: int = 50):
        query = {"site_id": site_id}
        if status: query["status"] = status
        if from_date or to_date:
            query["created_at"] = {}
            if from_date: query["created_at"]["$gte"] = from_date
            if to_date: query["created_at"]["$lte"] = to_date
        total = await Invoice.find(query).count()
        items = await Invoice.find(query).sort(-Invoice.created_at).skip((page - 1) * per_page).limit(per_page).to_list()
        return {"total": total, "page": page, "per_page": per_page, "data": [i.dict() for i in items]}
