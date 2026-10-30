from typing import Optional
from datetime import datetime
from fastapi import HTTPException
from core.identity import is_approver, own_identifiers
from core.audit import AuditAction, record as audit
from modules.leave_attendance.models import (
    LeaveRequest, AttendanceRecord, Timesheet,
)


async def _require_approver(user: dict, record_person_id: str, what: str) -> None:
    """Approving leave or a timesheet is a managerial act, and never on your own.

    Two separate refusals, because they fail for different reasons: an
    inspector approving a colleague's leave is outside their authority; a
    manager approving their own is a conflict. The second is why leave
    approval exists at all.
    """
    if not is_approver(user):
        raise HTTPException(
            403, f"Your role may not approve {what}; it goes to your manager"
        )
    if record_person_id in await own_identifiers(user):
        raise HTTPException(
            409, f"You cannot approve your own {what}; it needs someone else"
        )


async def _require_own_or_approver(user: dict, person_id, what: str) -> None:
    """Staff file their own; a manager may file on someone's behalf."""
    if is_approver(user):
        return
    if person_id not in await own_identifiers(user):
        raise HTTPException(403, f"You can only file {what} for yourself")


class LeaveAttendanceService:

    # ── Leave ──────────────────────────────────────────────────────────

    @staticmethod
    async def list_leaves(
        site_id: str, person_id: Optional[str] = None,
        status: Optional[str] = None, page: int = 1, per_page: int = 100,
    ):
        query: dict = {"site_id": site_id}
        if person_id:
            query["person_id"] = person_id
        if status:
            query["status"] = status
        total = await LeaveRequest.find(query).count()
        items = (
            await LeaveRequest.find(query)
            .skip((page - 1) * per_page).limit(per_page)
            .sort(-LeaveRequest.created_at).to_list()
        )
        return {"total": total, "items": items, "page": page, "per_page": per_page}

    @staticmethod
    async def create_leave(data: dict, site_id: str, user: dict):
        user_id = user.get("user_id", "USR-001")
        await _require_own_or_approver(user, data.get("person_id"), "leave")
        leave = LeaveRequest(**data, site_id=site_id, created_by=user_id)
        await leave.insert()
        await audit("leave_requests", leave.leave_id, AuditAction.CREATE, actor={"user_id": user_id}, site_id=site_id)
        return leave

    @staticmethod
    async def approve_leave(leave_id: str, site_id: str, approver: dict, remarks: Optional[str] = None):
        user_id = approver.get("user_id", "USR-001")
        leave = await LeaveRequest.find_one({"leave_id": leave_id, "site_id": site_id})
        if not leave:
            raise HTTPException(404, "Leave request not found")
        if leave.status != "pending":
            raise HTTPException(400, f"Cannot approve a {leave.status} request")
        await _require_approver(approver, leave.person_id, "leave")
        leave.status = "approved"
        leave.approved_by = user_id
        leave.approved_on = datetime.now()
        if remarks:
            leave.remarks = remarks
        leave.updated_at = datetime.now()
        await leave.save()
        await audit("leave_requests", leave_id, AuditAction.UPDATE, actor={"user_id": user_id}, site_id=site_id, after={"status": "approved"})
        return leave

    @staticmethod
    async def reject_leave(leave_id: str, site_id: str, approver: dict, remarks: Optional[str] = None):
        user_id = approver.get("user_id", "USR-001")
        leave = await LeaveRequest.find_one({"leave_id": leave_id, "site_id": site_id})
        if not leave:
            raise HTTPException(404, "Leave request not found")
        if leave.status != "pending":
            raise HTTPException(400, f"Cannot reject a {leave.status} request")
        await _require_approver(approver, leave.person_id, "leave")
        leave.status = "rejected"
        leave.approved_by = user_id
        leave.approved_on = datetime.now()
        if remarks:
            leave.remarks = remarks
        leave.updated_at = datetime.now()
        await leave.save()
        await audit("leave_requests", leave_id, AuditAction.UPDATE, actor={"user_id": user_id}, site_id=site_id, after={"status": "rejected"})
        return leave

    # ── Attendance ─────────────────────────────────────────────────────

    @staticmethod
    async def list_attendance(
        site_id: str, person_id: Optional[str] = None,
        from_date: Optional[datetime] = None, to_date: Optional[datetime] = None,
        page: int = 1, per_page: int = 100,
    ):
        query: dict = {"site_id": site_id}
        if person_id:
            query["person_id"] = person_id
        if from_date or to_date:
            date_q: dict = {}
            if from_date:
                date_q["$gte"] = from_date
            if to_date:
                date_q["$lte"] = to_date
            query["date"] = date_q
        total = await AttendanceRecord.find(query).count()
        items = (
            await AttendanceRecord.find(query)
            .skip((page - 1) * per_page).limit(per_page)
            .sort(-AttendanceRecord.date).to_list()
        )
        return {"total": total, "items": items, "page": page, "per_page": per_page}

    @staticmethod
    async def create_attendance(data: dict, site_id: str):
        record = AttendanceRecord(**data, site_id=site_id)
        await record.insert()
        return record

    @staticmethod
    async def attendance_summary(person_id: str, site_id: str, month: int, year: int):
        from_dt = datetime(year, month, 1)
        to_month = month + 1 if month < 12 else 1
        to_year = year if month < 12 else year + 1
        to_dt = datetime(to_year, to_month, 1)
        query = {"site_id": site_id, "person_id": person_id, "date": {"$gte": from_dt, "$lt": to_dt}}
        records = await AttendanceRecord.find(query).to_list()
        summary = {"present": 0, "absent": 0, "half_day": 0, "on_leave": 0, "holiday": 0, "weekly_off": 0}
        total_hours = 0.0
        for r in records:
            summary[r.status] = summary.get(r.status, 0) + 1
            total_hours += r.hours_worked
        return {
            "person_id": person_id, "month": month, "year": year,
            "breakdown": summary, "total_hours": total_hours, "total_records": len(records),
        }

    # ── Timesheets ─────────────────────────────────────────────────────

    @staticmethod
    async def list_timesheets(
        site_id: str, person_id: Optional[str] = None,
        status: Optional[str] = None, page: int = 1, per_page: int = 100,
    ):
        query: dict = {"site_id": site_id}
        if person_id:
            query["person_id"] = person_id
        if status:
            query["status"] = status
        total = await Timesheet.find(query).count()
        items = (
            await Timesheet.find(query)
            .skip((page - 1) * per_page).limit(per_page)
            .sort(-Timesheet.created_at).to_list()
        )
        return {"total": total, "items": items, "page": page, "per_page": per_page}

    @staticmethod
    async def create_timesheet(data: dict, site_id: str, user: dict):
        user_id = user.get("user_id", "USR-001")
        await _require_own_or_approver(user, data.get("person_id"), "timesheet")
        ts = Timesheet(**data, site_id=site_id, created_by=user_id)
        await ts.insert()
        await audit("timesheets", ts.timesheet_id, AuditAction.CREATE, actor={"user_id": user_id}, site_id=site_id)
        return ts

    @staticmethod
    async def get_timesheet(timesheet_id: str, site_id: str):
        ts = await Timesheet.find_one({"timesheet_id": timesheet_id, "site_id": site_id})
        if not ts:
            raise HTTPException(404, "Timesheet not found")
        return ts

    @staticmethod
    async def submit_timesheet(timesheet_id: str, site_id: str, user_id: str):
        ts = await Timesheet.find_one({"timesheet_id": timesheet_id, "site_id": site_id})
        if not ts:
            raise HTTPException(404, "Timesheet not found")
        if ts.status != "draft":
            raise HTTPException(400, f"Cannot submit a {ts.status} timesheet")
        ts.status = "submitted"
        ts.updated_at = datetime.now()
        await ts.save()
        await audit("timesheets", timesheet_id, AuditAction.UPDATE, actor={"user_id": user_id}, site_id=site_id, after={"status": "submitted"})
        return ts

    @staticmethod
    async def approve_timesheet(timesheet_id: str, site_id: str, approver: dict):
        user_id = approver.get("user_id", "USR-001")
        ts = await Timesheet.find_one({"timesheet_id": timesheet_id, "site_id": site_id})
        if not ts:
            raise HTTPException(404, "Timesheet not found")
        if ts.status != "submitted":
            raise HTTPException(400, f"Cannot approve a {ts.status} timesheet")
        await _require_approver(approver, ts.person_id, "timesheet")
        ts.status = "approved"
        ts.approved_by = user_id
        ts.approved_on = datetime.now()
        ts.updated_at = datetime.now()
        await ts.save()
        await audit("timesheets", timesheet_id, AuditAction.UPDATE, actor={"user_id": user_id}, site_id=site_id, after={"status": "approved"})
        return ts
