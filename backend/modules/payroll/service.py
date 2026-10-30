from typing import Optional
from datetime import datetime
from fastapi import HTTPException
from core.audit import AuditAction, record as audit
from core.identity import own_identifiers
from modules.payroll.models import PayrollRun, Payslip, SalaryStructure


class PayrollService:

    @staticmethod
    async def list_runs(
        site_id: str, period_month: Optional[int] = None,
        period_year: Optional[int] = None, status: Optional[str] = None,
        page: int = 1, per_page: int = 50,
    ):
        query: dict = {"site_id": site_id}
        if period_month:
            query["period_month"] = period_month
        if period_year:
            query["period_year"] = period_year
        if status:
            query["status"] = status
        total = await PayrollRun.find(query).count()
        items = (
            await PayrollRun.find(query)
            .skip((page - 1) * per_page).limit(per_page)
            .sort(-PayrollRun.created_at).to_list()
        )
        return {"total": total, "items": items, "page": page, "per_page": per_page}

    @staticmethod
    async def create_run(data: dict, site_id: str, user_id: str):
        try:
            month, year = int(data.get("period_month")), int(data.get("period_year"))
        except (TypeError, ValueError):
            raise HTTPException(422, "period_month and period_year are required")
        if not 1 <= month <= 12:
            raise HTTPException(422, "period_month must be 1-12")
        region = (data.get("region_code") or "").strip().upper() or None

        # One live run per period. A second would pay everyone twice; a
        # regional run beside an all-region one would do the same for that
        # region.
        for other in await PayrollRun.find(
            {"site_id": site_id, "period_month": month, "period_year": year,
             "status": {"$ne": "cancelled"}}
        ).to_list():
            if region is None or other.region_code is None or other.region_code == region:
                raise HTTPException(
                    409, f"{other.run_id} already covers {month:02d}/{year}"
                         + (f" for {other.region_code}" if other.region_code else " for all regions")
                         + ". Reprocess it instead of starting another.",
                )
        run = PayrollRun(
            run_id=f"PR-{year}-{month:02d}" + (f"-{region}" if region else ""),
            site_id=site_id, period_month=month, period_year=year,
            region_code=region, remarks=data.get("remarks"), created_by=user_id,
        )
        await run.insert()
        await audit("payroll_runs", run.run_id, AuditAction.CREATE, actor={"user_id": user_id}, site_id=site_id)
        return run

    @staticmethod
    async def get_run(run_id: str, site_id: str):
        run = await PayrollRun.find_one({"run_id": run_id, "site_id": site_id})
        if not run:
            raise HTTPException(404, "Payroll run not found")
        slips = await Payslip.find({"run_id": run_id, "site_id": site_id}).to_list()
        return {"run": run, "payslips": slips}

    # ── Salary structures ─────────────────────────────────────────────

    @staticmethod
    async def set_salary_structure(person_id: str, data: dict, site_id: str, user: dict):
        from core.auth import Role
        from core.sequences import next_identifier

        if int(user.get("role_id") or 0) != int(Role.ADMIN):
            raise HTTPException(403, "Pay is set by management (HR); Finance runs payroll but does not set salaries.")
        try:
            vals = {k: float(data.get(k) or 0) for k in
                    ("basic", "hra", "conveyance", "special_allowance", "other_earnings", "monthly_tds")}
        except (TypeError, ValueError):
            raise HTTPException(422, "Salary components must be numbers")
        if vals["basic"] <= 0:
            raise HTTPException(422, "basic must be greater than zero")
        if any(v < 0 for v in vals.values()):
            raise HTTPException(422, "Salary components cannot be negative")
        reason = (data.get("reason") or "").strip()
        if not reason:
            raise HTTPException(422, "A reason is required for a salary change")
        from modules.people.models import Person

        if not await Person.find_one({"person_id": person_id, "site_id": site_id}):
            raise HTTPException(404, f"Person {person_id} not found")
        prev = await SalaryStructure.find_one(
            {"person_id": person_id, "site_id": site_id, "status": "active"}
        )
        if prev:
            prev.status, prev.superseded_on = "superseded", datetime.now()
            await prev.save()
        row = SalaryStructure(
            structure_id=await next_identifier(SalaryStructure, "structure_id", site_id, "SAL"),
            person_id=person_id, site_id=site_id, reason=reason,
            set_by=user.get("user_id", ""), **vals,
        )
        await row.insert()
        await audit("salary_structure", row.structure_id, AuditAction.AUTHORIZE,
                    actor={"user_id": row.set_by}, site_id=site_id,
                    note=f"salary set for {person_id}",
                    context={"person_id": person_id, "previous": prev.structure_id if prev else None})
        return row

    @staticmethod
    async def salary_history(person_id: str, site_id: str):
        return await SalaryStructure.find({"person_id": person_id, "site_id": site_id}).sort(-SalaryStructure.created_at).to_list()

    # ── Paid days: from approved timesheets, approved leave, offs ──────

    @staticmethod
    async def _paid_days(person_id: str, run, site_id: str, days_in_month: int):
        """(paid_days, detail) or (None, reason) when the person cannot be paid yet."""
        from modules.leave_attendance.models import AttendanceRecord, LeaveRequest, Timesheet

        sheets = await Timesheet.find({
            "person_id": person_id, "site_id": site_id,
            "period_month": run.period_month, "period_year": run.period_year,
        }).to_list()
        if run.region_code:
            sheets = [t for t in sheets if (t.home_region or "").upper() == run.region_code]
        if not sheets:
            return None, "no timesheet for the period"
        approved = [t for t in sheets if t.status == "approved"]
        if not approved:
            return None, f"timesheet is {sheets[0].status}, not approved"
        worked = sum(t.total_days for t in approved)

        month_start = datetime(run.period_year, run.period_month, 1)
        month_end = datetime(run.period_year, run.period_month, days_in_month, 23, 59, 59)
        paid_leave = 0.0
        unpaid_leave = 0.0
        for lv in await LeaveRequest.find({
            "person_id": person_id, "site_id": site_id, "status": "approved",
            "from_date": {"$lte": month_end}, "to_date": {"$gte": month_start},
        }).to_list():
            start, end = max(lv.from_date, month_start), min(lv.to_date, month_end)
            overlap = (end.date() - start.date()).days + 1
            total_span = (lv.to_date.date() - lv.from_date.date()).days + 1
            days = lv.days * (overlap / total_span) if total_span > 0 else lv.days
            if lv.leave_type == "unpaid":
                unpaid_leave += days
            else:
                paid_leave += days

        offs = await AttendanceRecord.find({
            "person_id": person_id, "site_id": site_id,
            "date": {"$gte": month_start, "$lte": month_end},
            "status": {"$in": ["holiday", "weekly_off"]},
        }).count()

        paid = min(float(days_in_month), worked + paid_leave + offs)
        return paid, {"worked_days": worked, "paid_leave_days": round(paid_leave, 2),
                      "unpaid_leave_days": round(unpaid_leave, 2), "holiday_or_off_days": offs}

    @staticmethod
    async def process_run(run_id: str, site_id: str, user_id: str):
        """Build the payslips from salary structures and approved timesheets.

        Nobody is paid on a guess: no salary structure or no approved
        timesheet means the person is held and listed on the run. The run can
        be processed again, before approval, once those are fixed.
        """
        import calendar

        run = await PayrollRun.find_one({"run_id": run_id, "site_id": site_id})
        if not run:
            raise HTTPException(404, "Payroll run not found")
        if run.status not in ("draft", "processing"):
            raise HTTPException(400, f"Cannot process a {run.status} run")

        from modules.people.models import Person

        people = await Person.find(
            {"site_id": site_id, "employment_status": {"$in": ["active", "deployed", "on_bench", "on_leave"]}}
        ).to_list()
        days_in_month = calendar.monthrange(run.period_year, run.period_month)[1]

        await Payslip.find({"run_id": run_id, "site_id": site_id}).delete()
        total_gross = total_deductions = total_net = 0.0
        count, held = 0, []

        for person in people:
            pid = person.person_id
            struct = await SalaryStructure.find_one(
                {"person_id": pid, "site_id": site_id, "status": "active"}
            )
            paid_days, detail = await PayrollService._paid_days(pid, run, site_id, days_in_month)
            if paid_days is None:
                if run.region_code and detail == "no timesheet for the period":
                    continue    # not in this region's run
                held.append({"person_id": pid, "reason": detail})
                continue
            if not struct:
                held.append({"person_id": pid, "reason": "no salary structure on record"})
                continue

            ratio = paid_days / days_in_month
            gross_full = struct.gross
            pro_rated = gross_full * ratio
            basic_paid = struct.basic * ratio

            pf_ee = min(basic_paid * 0.12, 1800.0)
            pf_er = pf_ee
            eligible_esi = gross_full <= 21000
            esi_ee = pro_rated * 0.0075 if eligible_esi else 0.0
            esi_er = pro_rated * 0.0325 if eligible_esi else 0.0
            pt = 200.0 if pro_rated > 15000 else 0.0
            tds = min(struct.monthly_tds, max(pro_rated - pf_ee - esi_ee - pt, 0.0))

            deductions = pf_ee + esi_ee + pt + tds
            net = pro_rated - deductions
            count += 1
            await Payslip(
                payslip_id=f"{run_id}-PS-{count:04d}",
                run_id=run_id, person_id=pid, site_id=site_id,
                period_month=run.period_month, period_year=run.period_year,
                basic_salary=round(struct.basic, 2), hra=round(struct.hra, 2),
                conveyance=round(struct.conveyance, 2),
                special_allowance=round(struct.special_allowance, 2),
                other_earnings=round(struct.other_earnings, 2),
                gross_salary=round(pro_rated, 2),
                pf_employee=round(pf_ee, 2), pf_employer=round(pf_er, 2),
                esi_employee=round(esi_ee, 2), esi_employer=round(esi_er, 2),
                professional_tax=pt, tds=round(tds, 2),
                total_deductions=round(deductions, 2), net_salary=round(net, 2),
                days_present=detail["worked_days"],
                days_absent=round(days_in_month - paid_days, 2),
                leaves_taken=detail["paid_leave_days"] + detail["unpaid_leave_days"],
                loss_of_pay_days=round(days_in_month - paid_days, 2),
            ).insert()
            total_gross += pro_rated
            total_deductions += deductions
            total_net += net

        run.status = "processing"
        run.headcount = count
        run.held = held
        run.total_gross = round(total_gross, 2)
        run.total_deductions = round(total_deductions, 2)
        run.total_net = round(total_net, 2)
        run.processed_by = user_id
        run.processed_on = datetime.now()
        run.updated_at = datetime.now()
        await run.save()
        await audit("payroll_runs", run_id, AuditAction.UPDATE, actor={"user_id": user_id}, site_id=site_id,
                    after={"status": "processing", "headcount": count, "held": len(held)})
        return {"run": run, "payslips_generated": count, "held": held}

    @staticmethod
    async def approve_run(run_id: str, site_id: str, user_id: str, acknowledge_held: bool = False):
        run = await PayrollRun.find_one({"run_id": run_id, "site_id": site_id})
        if not run:
            raise HTTPException(404, "Payroll run not found")
        if run.status != "processing":
            raise HTTPException(400, f"Cannot approve a {run.status} run")
        if run.processed_by and run.processed_by == user_id:
            raise HTTPException(
                403, "You processed this run and cannot also approve it; a second person approves payroll."
            )
        if run.headcount == 0:
            raise HTTPException(409, "This run has no payslips to approve")
        if run.held and not acknowledge_held:
            raise HTTPException(
                409, f"{len(run.held)} people are held out of this run and will not be paid in it "
                     "(see the run's held list). Fix them and process again, or approve with "
                     "acknowledge_held to confirm they are intentionally left out.",
            )
        run.status = "approved"
        run.approved_by = user_id
        run.approved_on = datetime.now()
        run.updated_at = datetime.now()
        await run.save()
        await audit("payroll_runs", run_id, AuditAction.UPDATE, actor={"user_id": user_id}, site_id=site_id,
                    after={"status": "approved", "held_acknowledged": bool(run.held)})
        return run

    @staticmethod
    async def disburse_run(run_id: str, site_id: str, user_id: str):
        run = await PayrollRun.find_one({"run_id": run_id, "site_id": site_id})
        if not run:
            raise HTTPException(404, "Payroll run not found")
        if run.status != "approved":
            raise HTTPException(400, f"Cannot disburse a {run.status} run")
        run.status = "disbursed"
        run.disbursed_on = datetime.now()
        run.updated_at = datetime.now()
        await run.save()
        await audit("payroll_runs", run_id, AuditAction.UPDATE, actor={"user_id": user_id}, site_id=site_id, after={"status": "disbursed"})
        return run

    @staticmethod
    async def list_payslips(
        site_id: str, person_id: Optional[str] = None,
        period_month: Optional[int] = None, period_year: Optional[int] = None,
        page: int = 1, per_page: int = 100,
    ):
        query: dict = {"site_id": site_id}
        if person_id:
            query["person_id"] = person_id
        if period_month:
            query["period_month"] = period_month
        if period_year:
            query["period_year"] = period_year
        total = await Payslip.find(query).count()
        items = (
            await Payslip.find(query)
            .skip((page - 1) * per_page).limit(per_page)
            .sort(-Payslip.created_at).to_list()
        )
        return {"total": total, "items": items, "page": page, "per_page": per_page}

    @staticmethod
    async def get_payslip(payslip_id: str, site_id: str):
        slip = await Payslip.find_one({"payslip_id": payslip_id, "site_id": site_id})
        if not slip:
            raise HTTPException(404, "Payslip not found")
        return slip

    # ── Self-service ───────────────────────────────────────────────────

    @staticmethod
    async def _released_run_ids(site_id: str) -> set[str]:
        """Payslips are released to staff once their run is disbursed.

        Before that a run can still be reprocessed, and a figure shown to an
        employee and then changed is worse than one shown late.
        """
        runs = await PayrollRun.find({"site_id": site_id, "status": "disbursed"}).to_list()
        return {r.run_id for r in runs}

    @staticmethod
    async def my_payslips(
        site_id: str, user: dict, period_month: Optional[int] = None,
        period_year: Optional[int] = None, page: int = 1, per_page: int = 24,
    ):
        """The caller's own released payslips, newest first. The person is
        taken from the login, never from the request."""
        mine = sorted(await own_identifiers(user))
        released = await PayrollService._released_run_ids(site_id)
        query: dict = {
            "site_id": site_id,
            "person_id": {"$in": mine},
            "run_id": {"$in": sorted(released)},
        }
        if period_month:
            query["period_month"] = period_month
        if period_year:
            query["period_year"] = period_year
        total = await Payslip.find(query).count()
        items = (
            await Payslip.find(query)
            .sort(-Payslip.period_year, -Payslip.period_month)
            .skip((page - 1) * per_page).limit(per_page).to_list()
        )
        return {"total": total, "items": items, "page": page, "per_page": per_page}

    @staticmethod
    async def my_payslip(payslip_id: str, site_id: str, user: dict):
        """404, not 403, for a payslip that is not yours or not yet released:
        saying "forbidden" would confirm that the payslip exists."""
        slip = await Payslip.find_one({"payslip_id": payslip_id, "site_id": site_id})
        if (
            not slip
            or slip.person_id not in await own_identifiers(user)
            or slip.run_id not in await PayrollService._released_run_ids(site_id)
        ):
            raise HTTPException(404, "Payslip not found")
        return slip

