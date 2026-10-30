from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from core.sequences import next_value
from core.audit import AuditAction, record as audit
from modules.regions.models import (
    DeputyCoverage,
    HO_POOL_PCT,
    InterOfficeSettlement,
    InspectorLoan,
    LoanStatus,
    Office,
    Region,
    SettlementStatus,
)


async def _next_id(model, field: str, prefix: str, *, year_scoped: bool = True, width: int = 4) -> str:
    """Region records are not site-scoped, so they cannot use next_identifier
    (which seeds from a site_id column). Skips any id already taken, so records
    created before this existed cannot collide."""
    root = f"{prefix}-{datetime.now().year}-" if year_scoped else f"{prefix}-"
    while True:
        seq = await next_value(f"regions:{root}")
        candidate = f"{root}{seq:0{width}d}"
        if not await model.find_one({field: candidate}):
            return candidate


class RegionService:

    # ── Regions ──────────────────────────────────────────────────────

    @staticmethod
    async def list_regions():
        return await Region.find({"is_active": True}).sort(Region.region_code).to_list()

    @staticmethod
    async def get_region(region_code: str):
        region = await Region.find_one({"region_code": region_code.upper()})
        if not region:
            raise HTTPException(404, f"Region {region_code} not found")
        return region

    @staticmethod
    async def create_region(data: dict, user_id: str):
        data["region_code"] = data["region_code"].upper()
        existing = await Region.find_one({"region_code": data["region_code"]})
        if existing:
            raise HTTPException(409, f"Region {data['region_code']} already exists")
        region = Region(**data, created_at=datetime.now(), updated_at=datetime.now())
        await region.insert()
        await audit("region", region.region_code, AuditAction.CREATE, actor={"user_id": user_id}, after=data)
        return region

    @staticmethod
    async def update_region(region_code: str, data: dict, user_id: str):
        region = await RegionService.get_region(region_code)
        before = region.dict()
        for k, v in data.items():
            if k not in ("region_code", "created_at"):
                setattr(region, k, v)
        region.updated_at = datetime.now()
        await region.save()
        await audit("region", region.region_code, AuditAction.UPDATE, actor={"user_id": user_id}, before=before, after=data)
        return region

    # ── Offices ──────────────────────────────────────────────────────

    @staticmethod
    async def list_offices(region_code: str):
        return await Office.find({"region_code": region_code.upper(), "is_active": True}).to_list()

    @staticmethod
    async def create_office(region_code: str, data: dict, user_id: str):
        await RegionService.get_region(region_code)
        data["region_code"] = region_code.upper()
        if not data.get("office_id"):
            data["office_id"] = await _next_id(Office, "office_id", f"OFF-{data['region_code']}", year_scoped=False, width=2)
        office = Office(**data, created_at=datetime.now(), updated_at=datetime.now())
        await office.insert()
        await audit("office", office.office_id, AuditAction.CREATE, actor={"user_id": user_id}, after=data)
        return office

    @staticmethod
    async def get_region_for_site(site_id: str) -> Optional[str]:
        office = await Office.find_one({"site_ids": site_id, "is_active": True})
        return office.region_code if office else None

    # ── Inter-office settlements ─────────────────────────────────────

    @staticmethod
    async def list_settlements(
        period_year: Optional[int] = None,
        period_month: Optional[int] = None,
        region: Optional[str] = None,
    ):
        query: dict = {}
        if period_year:
            query["period_year"] = period_year
        if period_month:
            query["period_month"] = period_month
        if region:
            query["from_region"] = region.upper()
        return await InterOfficeSettlement.find(query).sort(
            -InterOfficeSettlement.period_year, -InterOfficeSettlement.period_month
        ).to_list()

    @staticmethod
    async def create_settlement(data: dict, user_id: str):
        fee = data.get("fee_collected", 0.0)
        data["ho_pool_share"] = round(fee * HO_POOL_PCT, 2)
        data["region_share"] = round(fee * (1 - HO_POOL_PCT), 2)
        data["net_payable_to_ho"] = round(data["ho_pool_share"] + data.get("adjustments", 0.0), 2)
        data["created_by"] = user_id
        if not data.get("settlement_id"):
            data["settlement_id"] = await _next_id(InterOfficeSettlement, "settlement_id", "IOS")
        settlement = InterOfficeSettlement(**data, created_at=datetime.now(), updated_at=datetime.now())
        await settlement.insert()
        await audit("settlement", settlement.settlement_id, AuditAction.CREATE, actor={"user_id": user_id}, after=data)
        return settlement

    @staticmethod
    async def settle(settlement_id: str, user_id: str):
        settlement = await InterOfficeSettlement.find_one({"settlement_id": settlement_id})
        if not settlement:
            raise HTTPException(404, "Settlement not found")
        if settlement.status == SettlementStatus.SETTLED.value:
            raise HTTPException(400, "Already settled")
        settlement.status = SettlementStatus.SETTLED.value
        settlement.settled_by = user_id
        settlement.settled_on = datetime.now()
        settlement.updated_at = datetime.now()
        await settlement.save()
        await audit("settlement", settlement_id, AuditAction.UPDATE, actor={"user_id": user_id}, after={"status": "settled"})
        return settlement

    # ── Inspector loans ──────────────────────────────────────────────

    @staticmethod
    async def list_loans(
        status: Optional[str] = None,
        home_region: Optional[str] = None,
        borrowing_region: Optional[str] = None,
    ):
        query: dict = {}
        if status:
            query["status"] = status
        if home_region:
            query["home_region"] = home_region.upper()
        if borrowing_region:
            query["borrowing_region"] = borrowing_region.upper()
        return await InspectorLoan.find(query).sort(-InspectorLoan.created_at).to_list()

    @staticmethod
    async def create_loan(data: dict, user_id: str):
        if data.get("home_region", "").upper() == data.get("borrowing_region", "").upper():
            raise HTTPException(400, "Home and borrowing region cannot be the same")
        data["home_region"] = data["home_region"].upper()
        data["borrowing_region"] = data["borrowing_region"].upper()
        data["created_by"] = user_id
        if not data.get("loan_id"):
            data["loan_id"] = await _next_id(InspectorLoan, "loan_id", "LOAN")

        # A loaned inspector is charged between regions at the internal rate
        # card. The rate is looked up, never typed: a hand-entered figure is
        # how two regions end up disagreeing about what was owed.
        from modules.rates.service import RateService

        code = data.pop("work_type_code", None) or "INSPECTOR_LOAN"
        resolved = await RateService.resolve(code, discipline=data.pop("discipline", None))
        if not resolved.priced or resolved.rate is None:
            raise HTTPException(
                422,
                f"No internal rate card prices {code}. Add the rate first - a loan "
                "is not priced from a figure entered by hand.",
            )
        supplied = data.get("rate_card_rate")
        if supplied and abs(float(supplied) - resolved.rate) > 0.005:
            raise HTTPException(
                409,
                f"Internal loans are priced at the rate card ({resolved.rate:,.2f} from "
                f"{resolved.card_id}); {float(supplied):,.2f} was supplied.",
            )
        data["rate_card_rate"] = resolved.rate
        data["rate_card_id"] = resolved.card_id
        loan = InspectorLoan(**data, created_at=datetime.now(), updated_at=datetime.now())
        await loan.insert()
        await audit("inspector_loan", loan.loan_id, AuditAction.CREATE, actor={"user_id": user_id}, after=data)
        return loan

    @staticmethod
    async def end_loan(loan_id: str, user_id: str):
        loan = await InspectorLoan.find_one({"loan_id": loan_id})
        if not loan:
            raise HTTPException(404, "Loan not found")
        if loan.status != LoanStatus.ACTIVE.value:
            raise HTTPException(400, f"Loan is {loan.status}, cannot end")
        loan.status = LoanStatus.COMPLETED.value
        loan.end_date = datetime.now()
        loan.updated_at = datetime.now()
        await loan.save()
        await audit("inspector_loan", loan_id, AuditAction.UPDATE, actor={"user_id": user_id}, after={"status": "completed"})
        return loan

    # ── Deputy coverage ──────────────────────────────────────────────

    @staticmethod
    async def list_active_deputies(region_code: Optional[str] = None):
        query: dict = {"is_active": True}
        if region_code:
            query["region_code"] = region_code.upper()
        now = datetime.now()
        results = await DeputyCoverage.find(query).sort(DeputyCoverage.valid_from).to_list()
        return [d for d in results if d.valid_until is None or d.valid_until > now]

    @staticmethod
    async def set_deputy(data: dict, user_id: str):
        data["region_code"] = data["region_code"].upper()
        data["arranged_by"] = data.get("arranged_by", user_id)
        if not data.get("coverage_id"):
            data["coverage_id"] = await _next_id(DeputyCoverage, "coverage_id", "DEP")
        deputy = DeputyCoverage(**data, created_at=datetime.now(), updated_at=datetime.now())
        await deputy.insert()
        await audit("deputy_coverage", deputy.coverage_id, AuditAction.CREATE, actor={"user_id": user_id}, after=data)
        return deputy

    @staticmethod
    async def get_escalation_chain(role: str, region_code: str) -> list[dict]:
        """Return the defined escalation chain for a given absent role.

        Static rules from the IQEIPL workflow, enriched with any active
        deputy overrides from the database.
        """
        role = role.upper()
        region_code = region_code.upper()

        chain = {
            "IC": [
                {"deputy_role": "RH", "action": "schedules and allocates", "scope": "Job Register still checks authorisation and COI"},
                {"deputy_role": "TM", "action": "confirms technical fit"},
            ],
            "TM": [
                {"deputy_role": "RH", "action": "signs within authorised scope", "scope": "only for jobs RH did not sell"},
                {"deputy_role": "OTHER_TM", "action": "another region's TM signs", "scope": "arranged by Country Manager"},
            ],
            "RH": [
                {"deputy_role": "CM", "action": "covers the region's approvals"},
                {"deputy_role": "MD", "action": "quotations above MD's limit"},
            ],
            "BD": [
                {"deputy_role": "RH", "action": "handles regional enquiries and quotes", "scope": "MD above limits"},
                {"deputy_role": "HR_MANAGER", "action": "covers recruiter duties"},
                {"deputy_role": "CM", "action": "coordinates deployments and P1-P7"},
            ],
            "RECRUITER": [
                {"deputy_role": "HR_MANAGER", "action": "covers recruitment"},
            ],
        }

        static_chain = chain.get(role, [])

        active_deputies = await DeputyCoverage.find({
            "region_code": region_code,
            "absent_role": role,
            "is_active": True,
        }).to_list()

        return {
            "role": role,
            "region": region_code,
            "default_chain": static_chain,
            "active_overrides": [
                {
                    "coverage_id": d.coverage_id,
                    "deputy_person_id": d.deputy_person_id,
                    "deputy_role": d.deputy_role,
                    "scope_limits": d.scope_limits,
                    "valid_from": d.valid_from.isoformat() if d.valid_from else None,
                    "valid_until": d.valid_until.isoformat() if d.valid_until else None,
                }
                for d in active_deputies
                if d.valid_until is None or d.valid_until > datetime.now()
            ],
        }

    # ── Cross-region audit guard ─────────────────────────────────────

    @staticmethod
    async def validate_cross_region_audit(auditor_person_id: str, target_region_code: str) -> dict:
        """Check that the auditor does not belong to the target region.

        Delegated RH must never audit their own region (SOP-06 · MS-02 · cl. 8.6).
        """
        target_region_code = target_region_code.upper()
        region = await Region.find_one({"region_code": target_region_code})
        if not region:
            raise HTTPException(404, f"Region {target_region_code} not found")

        is_rh = region.regional_head_person_id == auditor_person_id
        is_tm = region.technical_manager_person_id == auditor_person_id
        is_ic = region.inspection_coordinator_person_id == auditor_person_id

        if not (is_rh or is_tm or is_ic):
            now = datetime.now()
            for d in await DeputyCoverage.find(
                {"region_code": target_region_code, "deputy_person_id": auditor_person_id,
                 "is_active": True}
            ).to_list():
                if d.valid_from <= now and (d.valid_until is None or d.valid_until > now):
                    is_rh = True   # covering a post in that region today
        if is_rh or is_tm or is_ic:
            return {
                "allowed": False,
                "reason": f"Person {auditor_person_id} holds a role in region {target_region_code} and cannot audit it",
            }

        return {"allowed": True, "reason": "Auditor is from a different region"}

    @staticmethod
    async def require_cross_region_audit(auditor_person_id: str, target_region_code: str) -> dict:
        """The same check, as a refusal. Whatever assigns an auditor calls
        this, so an auditor cannot be put on their own region by mistake."""
        result = await RegionService.validate_cross_region_audit(
            auditor_person_id, target_region_code
        )
        if not result["allowed"]:
            raise HTTPException(403, result["reason"])
        return result
