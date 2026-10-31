#!/usr/bin/env python3
"""Scenario data: every service line and every payables case, in every state.

seed_spine_demo.py gives the inspection spine one coherent set of records. This
one is for testing the rest, and it is built differently: it drives the *real
services* (the same code the API calls), so every record is one the rules would
let exist, and every refusal is a refusal the rules actually make. A scenario
that expects to be refused and is not, aborts the run - the seed doubles as a
check that the rules still hold.

What it creates (all marked, so --wipe removes exactly these):

* Training    nine engagements, T1..T6, happy path and every refusal: wrong or
              lapsed authorisation, conflict of interest, self-confirmation,
              participants who failed, a cohort where nobody passed.
* Other lines Expediting, Vendor assessment, Asset integrity, Equipment design,
              each at several stages, with the gates that stop them.
* H8 / H10    authorisations in every state: pending, recommended, authorised,
              review overdue, lapsed, renewal recommended, renewed, suspended,
              withdrawn, and the legacy inspection-only record.
* Payables    vendors and bills across GST (intra, inter, nil, reverse charge),
              each TDS section, thresholds, no PAN, lower-deduction certificate,
              micro / small / medium MSME on time and late, and every approval
              and payment refusal.

    python scripts/seed_scenarios.py            # seed
    python scripts/seed_scenarios.py --wipe     # remove only what this seeded

Idempotent: if the scenarios are already there it says so and stops. It will not
run against a database whose name looks like production without --force.

IQE_GSTIN: the bills need IQE's own GSTIN to choose CGST+SGST or IGST. If it is
not configured, this run uses a clearly fake Telangana GSTIN *in memory only*
and says so. It is never written to configuration; set the real IQE_GSTIN.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from beanie import init_beanie  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from pymongo import AsyncMongoClient  # noqa: E402

from core.audit import AuditEntry  # noqa: E402
from core.config import settings  # noqa: E402
from core.sequences import Sequence, next_identifier  # noqa: E402
from modules.auth.models import UserLogin  # noqa: E402
from modules.engagements.models import Engagement  # noqa: E402
from modules.engagements.service import EngagementService  # noqa: E402
from modules.finance.models import AccountPayable  # noqa: E402
from modules.jobs.models import Job  # noqa: E402
from modules.people.models import (  # noqa: E402
    Authorization, CompetenceProfile, ImpartialityDeclaration, Person,
)
from modules.people.service import PeopleService  # noqa: E402
from modules.providers.models import (  # noqa: E402
    EvaluationRecord, ExternalProvider, PerformanceRecord, SubcontractConsent,
    SubcontractDecision,
)
from modules.providers.service import ProviderService  # noqa: E402
from modules.purchasing import statutory as st  # noqa: E402
from modules.purchasing.models import Vendor, VendorPayment  # noqa: E402
from modules.purchasing.service import PurchasingService  # noqa: E402
from modules.regions.models import DeputyCoverage, Region  # noqa: E402
from modules.signoff.models import ReportSignoff  # noqa: E402

SITE = "SITE-01"
NOW = datetime.now()

#: Seeded actors. They have no usable password: the hash field holds "!".
TM = {"user_id": "USR-SCN-TM", "role_id": 7}          # Technical Manager
CM = {"user_id": "USR-SCN-CM", "role_id": 1}          # Country Manager (Admin)
FIN = {"user_id": "USR-SCN-FIN", "role_id": 6}        # Finance
FIN2 = {"user_id": "USR-SCN-FIN2", "role_id": 6}      # a second Finance user
TRAINER_USER = {"user_id": "USR-SCN-TRN1", "role_id": 2}
OTHER_USER = {"user_id": "USR-SCN-OTH", "role_id": 2}
TM_SELF = {"user_id": "USR-SCN-TM2", "role_id": 7}    # a TM who is also a trainer
MARK = "USR-SCN"                                      # created_by prefix on finance rows

MODELS = [
    AuditEntry, Sequence, UserLogin, Job, Person, CompetenceProfile, Authorization,
    ImpartialityDeclaration, Engagement, ExternalProvider, EvaluationRecord, PerformanceRecord,
    SubcontractConsent, SubcontractDecision, ReportSignoff, Region, DeputyCoverage,
    Vendor, VendorPayment, AccountPayable,
]


class ScenarioError(RuntimeError):
    """A scenario did not behave as the rules say it must."""


class Run:
    def __init__(self, log):
        self.log = log
        self.refusals: list[tuple[str, int]] = []
        self.counts: dict[str, int] = {}

    def bump(self, key: str, n: int = 1):
        self.counts[key] = self.counts.get(key, 0) + n

    async def refused(self, label: str, coro, status: int, text: str | None = None):
        """The call must be refused with `status` (and mention `text`)."""
        try:
            await coro
        except HTTPException as e:
            if e.status_code != status or (text and text.lower() not in str(e.detail).lower()):
                raise ScenarioError(f"{label}: refused with {e.status_code} {e.detail!r}, "
                                    f"expected {status} {text or ''}") from e
            self.refusals.append((label, e.status_code))
            self.bump("refusals_demonstrated")
            return e
        raise ScenarioError(f"{label}: was allowed, but the rules must refuse it")


# ------------------------------------------------------------------ helpers

def make_gstin(state: str, pan: str, entity: str = "1") -> str:
    """A GSTIN with a correct check digit, for demo vendors."""
    body = f"{state}{pan}{entity}Z"
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    total = 0
    for i, c in enumerate(body):
        p = chars.index(c) * (2 if i % 2 else 1)
        total += p // 36 + p % 36
    return body + chars[(36 - total % 36) % 36]


DEMO_IQE_GSTIN = make_gstin("36", "AABCI0000A")     # Telangana; fake PAN, demo only


async def job(key: str, line: str, title: str, *, client="CLI-SCN-1", j_no="auto",
              registered_line: str | None = None) -> str:
    job_id = f"JOB-SCN-{key}"
    n = await Job.find({"job_id": {"$regex": "^JOB-SCN-"}}).count() + 1
    await Job(job_id=job_id, site_id=SITE, client_id=client, title=title,
              service_line=registered_line or line, region_code="S",
              j_no=(f"S-2627-9{n:03d}" if j_no == "auto" else j_no), status="active").insert()
    return job_id


async def person(code: str, name: str, *, category="TECHNICAL_INSPECTION", conflict_clients=None) -> str:
    p = await PeopleService.create(
        {"employee_code": code, "full_name": name, "category": category,
         "engagement_type": "PERMANENT", "designation": "Scenario " + code,
         "department": "Technical", "base_location": "Hyderabad",
         "employment_status": "active", "date_of_joining": NOW - timedelta(days=500)},
        SITE, "USR-SCN")
    await PeopleService.declare_impartiality(
        p.person_id,
        {"declaration_date": NOW - timedelta(days=20), "has_conflict": bool(conflict_clients),
         "conflicted_client_ids": list(conflict_clients or []),
         "valid_until": NOW + timedelta(days=345)}, SITE)
    return p.person_id


FULL_EVIDENCE = dict(qualification_verified=True, training_completed=True,
                     supervised_inspections_count=5, supervised_required=3,
                     witnessed_assessment_passed=True)


async def grant(pid: str, types: list[str], lines: list[str] | None, *, upto="authorised",
                evidence: dict | None = None) -> Authorization:
    """Take an authorisation as far through H8 as `upto` says."""
    a = await PeopleService.create_authorization(
        pid, {"inspection_types": types, "service_lines": lines or [],
              **(evidence or FULL_EVIDENCE)}, SITE, "USR-SCN")
    if upto == "pending":
        return a
    await PeopleService.recommend_authorization(a.authorization_id, SITE, TM, "scenario: evidence on file")
    if upto == "recommended":
        return await PeopleService._load_auth(a.authorization_id, SITE)
    return await PeopleService.decide_authorization(
        a.authorization_id, "authorized", SITE, CM["user_id"], "scenario: authorised", CM)


async def set_dates(auth: Authorization, **dates):
    """Move an authorisation's clock. Time cannot be waited for in a seed."""
    for k, v in dates.items():
        setattr(auth, k, v)
    await auth.save()


async def sign_report(job_id: str):
    await ReportSignoff(signoff_id=await next_identifier(ReportSignoff, "signoff_id", SITE, "SGN"),
                        site_id=SITE, job_id=job_id, status="approved").insert()


async def step(eid: str, code: str, body: dict, user: dict):
    return await EngagementService.complete_step(eid, code, body, SITE, user)


async def open_eng(job_id: str, line: str, user: dict = CM) -> str:
    return (await EngagementService.open({"job_id": job_id, "service_line": line}, SITE, user))["engagement_id"]


async def provider(name: str, category="OTHER", *, services=None, evaluate=True) -> str:
    p = await ProviderService.register({"name": name, "category": category}, SITE, "USR-SCN")
    if evaluate:
        await ProviderService.evaluate(
            p["provider_id"],
            {"outcome": "APPROVED", "rationale": "scenario: evaluated against the supplier criteria",
             "approved_services": services or ["Scenario services"]}, SITE, "USR-SCN")
    return p["provider_id"]


# --------------------------------------------------------------- the actors

async def seed_actors(R: Run, ids: dict):
    for u, code in ((TRAINER_USER, "SCN-TRN-01"), (OTHER_USER, "SCN-OTH-01"), (TM_SELF, "SCN-TRN-07")):
        await UserLogin(user_id=u["user_id"], site_id=SITE, login_name=u["user_id"].lower(),
                        login_password="!", email=f"{u['user_id'].lower()}@scenario.invalid",
                        full_name=u["user_id"], role_id=u["role_id"], employee_code=code).insert()


# ---------------------------------------------- H8 / H10: every state, once

async def seed_authorisations(R: Run, ids: dict):
    R.log("Authorisations (H8 / H10) in every state…")

    async def p(code, name, **kw):
        ids[code] = await person(code, name, **kw)
        R.bump("people")
        return ids[code]

    # Trainers for the Training line, each wrong in exactly one way.
    t1 = await p("SCN-TRN-01", "Trainer - fully authorised")
    ids["auth:TRN-01"] = await grant(t1, ["TRAINING"], ["TRAINING"])
    ids["TRN-02"] = await p("SCN-TRN-02", "Trainer - authorised for inspection only")
    await grant(ids["TRN-02"], ["CODE_INSPECTION"], ["PART_B"])
    ids["TRN-03"] = await p("SCN-TRN-03", "Trainer - authorisation still pending")
    await grant(ids["TRN-03"], ["TRAINING"], ["TRAINING"], upto="pending")
    ids["TRN-04"] = await p("SCN-TRN-04", "Trainer - recommended, not yet authorised")
    await grant(ids["TRN-04"], ["TRAINING"], ["TRAINING"], upto="recommended")
    ids["TRN-05"] = await p("SCN-TRN-05", "Trainer - authorisation lapsed")
    a = await grant(ids["TRN-05"], ["TRAINING"], ["TRAINING"])
    await set_dates(a, valid_until=NOW - timedelta(days=20))
    ids["TRN-06"] = await p("SCN-TRN-06", "Trainer - annual review overdue")
    overdue = await grant(ids["TRN-06"], ["TRAINING"], ["TRAINING"])   # dated after the lapse run, below
    ids["TRN-07"] = await p("SCN-TRN-07", "Trainer - is also a Technical Manager")
    await grant(ids["TRN-07"], ["TRAINING"], ["TRAINING"])
    ids["TRN-08"] = await p("SCN-TRN-08", "Trainer - conflict with the client", conflict_clients=["CLI-SCN-2"])
    await grant(ids["TRN-08"], ["TRAINING"], ["TRAINING"])
    ids["TRN-09"] = await p("SCN-TRN-09", "Trainer - suspended")
    a = await grant(ids["TRN-09"], ["TRAINING"], ["TRAINING"])
    await PeopleService.decide_authorization(a.authorization_id, "suspended", SITE, TM["user_id"],
                                             "scenario: pending an NCR review", TM)
    ids["TRN-10"] = await p("SCN-TRN-10", "Trainer - withdrawn")
    a = await grant(ids["TRN-10"], ["TRAINING"], ["TRAINING"])
    await PeopleService.decide_authorization(a.authorization_id, "withdrawn", SITE, CM["user_id"],
                                             "scenario: left the programme", CM)

    # The H8 / H10 rules themselves.
    ids["H-EVID"] = await p("SCN-H-01", "Evidence incomplete")
    a = await grant(ids["H-EVID"], ["CODE_INSPECTION"], ["PART_B"], upto="pending",
                    evidence=dict(FULL_EVIDENCE, supervised_inspections_count=1, witnessed_assessment_passed=False))
    await R.refused("recommend on incomplete evidence",
                    PeopleService.recommend_authorization(a.authorization_id, SITE, TM, "x"), 409, "cannot recommend")
    await R.refused("authorise without a recommendation",
                    PeopleService.decide_authorization(a.authorization_id, "authorized", SITE, CM["user_id"], "x", CM),
                    409, "must recommend")

    ids["H-REC"] = await p("SCN-H-02", "Recommended, waiting for the Country Manager")
    a = await grant(ids["H-REC"], ["CODE_INSPECTION"], ["PART_B"], upto="recommended")
    await R.refused("Technical Manager cannot authorise",
                    PeopleService.decide_authorization(a.authorization_id, "authorized", SITE, TM["user_id"], "x", TM),
                    403, "country manager")
    # Same person recommends and authorises: Admin may recommend, but not then authorise.
    ids["H-SELF"] = await p("SCN-H-03", "Recommended by the same Admin who would authorise")
    a = await PeopleService.create_authorization(
        ids["H-SELF"], {"inspection_types": ["CODE_INSPECTION"], "service_lines": ["PART_B"], **FULL_EVIDENCE},
        SITE, "USR-SCN")
    await PeopleService.recommend_authorization(a.authorization_id, SITE, CM, "x")
    await R.refused("cannot authorise what you recommended",
                    PeopleService.decide_authorization(a.authorization_id, "authorized", SITE, CM["user_id"], "x", CM),
                    403, "recommended")

    ids["H-OK"] = await p("SCN-H-04", "Authorised for Expediting, Vendor Assessment, Asset Integrity and Inspection")
    await grant(ids["H-OK"], ["EXPEDITING", "VENDOR_ASSESSMENT", "ASSET_INTEGRITY", "CODE_INSPECTION"],
                ["EXPEDITING", "VENDOR_ASSESSMENT", "ASSET_INTEGRITY", "PART_B"])

    ids["H-RENEW-REC"] = await p("SCN-H-05", "Renewal recommended, waiting for the Country Manager")
    a = await grant(ids["H-RENEW-REC"], ["CODE_INSPECTION"], ["PART_B"])
    await R.refused("renew without an appraisal",
                    PeopleService.renew_authorization(a.authorization_id, SITE, CM), 409, "appraise")
    await R.refused("appraisal needs a note",
                    PeopleService.recommend_renewal(a.authorization_id, SITE, TM, ""), 422)
    await PeopleService.recommend_renewal(a.authorization_id, SITE, TM, "scenario: yearly appraisal, performance sound")

    ids["H-RENEWED"] = await p("SCN-H-06", "Renewed this year")
    a = await grant(ids["H-RENEWED"], ["CODE_INSPECTION"], ["PART_B"])
    await set_dates(a, next_surveillance_due=NOW - timedelta(days=3))
    await PeopleService.recommend_renewal(a.authorization_id, SITE, TM, "scenario: yearly appraisal")
    await PeopleService.renew_authorization(a.authorization_id, SITE, CM, "scenario: renewed")

    ids["H-LAPSED"] = await p("SCN-H-07", "Lapsed, then marked expired")
    a = await grant(ids["H-LAPSED"], ["CODE_INSPECTION"], ["PART_B"])
    await set_dates(a, valid_until=NOW - timedelta(days=40))
    await PeopleService.lapse_overdue(SITE, CM)
    # Review overdue but not yet swept: authorised on paper, out of force in fact.
    await set_dates(overdue, next_surveillance_due=NOW - timedelta(days=10))

    ids["H-LEGACY"] = await p("SCN-H-08", "Legacy record: no service lines, inspection only")
    a = await grant(ids["H-LEGACY"], ["CODE_INSPECTION"], None)
    R.bump("authorisation_states", 0)
    ids["H-WITHDRAW"] = await p("SCN-H-09", "Withdrawal needs a reason")
    a = await grant(ids["H-WITHDRAW"], ["CODE_INSPECTION"], ["PART_B"])
    await R.refused("withdraw without a reason",
                    PeopleService.decide_authorization(a.authorization_id, "withdrawn", SITE, CM["user_id"], None, CM),
                    422, "why")


# ------------------------------------------------------------------ Training

async def seed_training(R: Run, ids: dict):
    R.log("Training engagements, T1..T6, every state…")
    L = "TRAINING"
    ev = ["EVD-SCN-1"]
    cohort = ["Anil", "Bhavna", "Chetan", "Deepa"]

    def assess(passed):
        return {"items": [{"description": f"Written + practical test - {n}", "participant": n,
                           "evidence_ids": ev, "result": "pass" if n in passed else "fail"} for n in cohort]}

    # TRN-01: opened, nothing else
    j = await job("TRN-01", L, "Training: NDT Level II refresher - not started")
    ids["eng:TRN-01"] = await open_eng(j, L)

    # TRN-02: the trainer gate, every way it says no, then a proper trainer
    j = await job("TRN-02", L, "Training: welding awareness - choosing the trainer", client="CLI-SCN-2")
    e = await open_eng(j, L)
    ids["eng:TRN-02"] = e
    body = lambda pid: {"person_id": pid, "allocated_by": "Inspection Coordinator"}  # noqa: E731
    await R.refused("T2 by a non-TM", step(e, "T2", body("SCN-TRN-01"), OTHER_USER), 403, "technical manager")
    await R.refused("T2 without allocated_by", step(e, "T2", {"person_id": "SCN-TRN-01"}, TM), 400, "allocated_by")
    await R.refused("T2 trainer self-confirmed", step(e, "T2", body("SCN-TRN-07"), TM_SELF), 403, "own authorisation")
    await R.refused("T2 out of order (T3 first)", step(e, "T3", {"note": "x"}, TM), 409, "T2")
    await R.refused("T2 trainer authorised for inspection only", step(e, "T2", body("SCN-TRN-02"), TM), 409, "not currently authorised")
    await R.refused("T2 trainer authorisation pending", step(e, "T2", body("SCN-TRN-03"), TM), 409, "not currently authorised")
    await R.refused("T2 trainer only recommended", step(e, "T2", body("SCN-TRN-04"), TM), 409, "not currently authorised")
    await R.refused("T2 trainer authorisation lapsed", step(e, "T2", body("SCN-TRN-05"), TM), 409, "not currently authorised")
    await R.refused("T2 trainer annual review overdue", step(e, "T2", body("SCN-TRN-06"), TM), 409, "not currently authorised")
    await R.refused("T2 trainer suspended", step(e, "T2", body("SCN-TRN-09"), TM), 409, "not currently authorised")
    await R.refused("T2 trainer withdrawn", step(e, "T2", body("SCN-TRN-10"), TM), 409, "not currently authorised")
    await R.refused("T2 trainer has a conflict with the client", step(e, "T2", body("SCN-TRN-08"), TM), 409, "conflict of interest")
    await step(e, "T2", body("SCN-TRN-01"), TM)

    # TRN-03: trainer chosen and programme being delivered (at T3)
    j = await job("TRN-03", L, "Training: API 510 exam preparation - trainer chosen")
    e = await open_eng(j, L)
    ids["eng:TRN-03"] = e
    await step(e, "T2", body("SCN-TRN-01"), TM)
    await R.refused("T3 by someone who is not the trainer", step(e, "T3", {"note": "x"}, OTHER_USER), 403, "only they")
    await R.refused("T3 without a record of what was delivered", step(e, "T3", {}, TRAINER_USER), 400, "note")

    # TRN-04: delivered, awaiting assessment (at T4)
    j = await job("TRN-04", L, "Training: visual testing - delivered, not yet assessed")
    e = await open_eng(j, L)
    ids["eng:TRN-04"] = e
    await step(e, "T2", body("SCN-TRN-01"), TM)
    await step(e, "T3", {"note": "Two-day classroom and shop-floor programme delivered to 4 participants"}, TRAINER_USER)
    await R.refused("T4 with no items", step(e, "T4", {"items": []}, TRAINER_USER), 400, "at least one")
    await R.refused("T4 item with no evidence",
                    step(e, "T4", {"items": [{"description": "test", "participant": "Anil", "result": "pass"}]}, TRAINER_USER),
                    400, "evidence")
    await R.refused("T4 item with no result",
                    step(e, "T4", {"items": [{"description": "test", "participant": "Anil", "evidence_ids": ev}]}, TRAINER_USER),
                    400, "pass or fail")

    # TRN-05: assessed, three passed and one failed (at T5)
    j = await job("TRN-05", L, "Training: penetrant testing - one participant failed")
    e = await open_eng(j, L)
    ids["eng:TRN-05"] = e
    await step(e, "T2", body("SCN-TRN-01"), TM)
    await step(e, "T3", {"note": "Programme delivered"}, TRAINER_USER)
    await step(e, "T4", assess({"Anil", "Bhavna", "Chetan"}), TRAINER_USER)
    await R.refused("T5 for a participant who failed",
                    step(e, "T5", {"certificate_ref": "CERT-SCN-1", "participants": cohort}, TRAINER_USER), 409, "Deepa")
    await R.refused("T5 without a certificate reference",
                    step(e, "T5", {"participants": ["Anil"]}, TRAINER_USER), 400, "certificate_ref")
    await R.refused("T5 for someone never assessed",
                    step(e, "T5", {"certificate_ref": "CERT-SCN-1", "participants": ["Eshwar"]}, TRAINER_USER), 409, "Eshwar")

    # TRN-06: certificates issued to those who passed (at T6)
    j = await job("TRN-06", L, "Training: magnetic particle - certificates issued")
    e = await open_eng(j, L)
    ids["eng:TRN-06"] = e
    await step(e, "T2", body("SCN-TRN-01"), TM)
    await step(e, "T3", {"note": "Programme delivered"}, TRAINER_USER)
    await step(e, "T4", assess({"Anil", "Bhavna", "Chetan"}), TRAINER_USER)
    await step(e, "T5", {"certificate_ref": "CERT-SCN-2", "participants": ["Anil", "Bhavna", "Chetan"]}, TRAINER_USER)

    # TRN-07: the whole path, closed
    j = await job("TRN-07", L, "Training: ISO 9001 internal auditor - complete")
    e = await open_eng(j, L)
    ids["eng:TRN-07"] = e
    await step(e, "T2", body("SCN-TRN-01"), TM)
    await step(e, "T3", {"note": "Programme delivered"}, TRAINER_USER)
    await step(e, "T4", assess(set(cohort)), TRAINER_USER)
    await step(e, "T5", {"certificate_ref": "CERT-SCN-3", "participants": cohort}, TRAINER_USER)
    await step(e, "T6", {"billing_reference": "INV-SCN-TRN-07"}, CM)
    await R.refused("a closed engagement takes no more steps", step(e, "T6", {}, CM), 409, "closed")
    await R.refused("T5 cannot be repeated", step(e, "T5", {"certificate_ref": "x", "participants": ["Anil"]}, CM), 409, "closed")

    # TRN-08: nobody passed. No certificate can be issued, so it stays open.
    j = await job("TRN-08", L, "Training: ultrasonic testing - nobody passed")
    e = await open_eng(j, L)
    ids["eng:TRN-08"] = e
    await step(e, "T2", body("SCN-TRN-01"), TM)
    await step(e, "T3", {"note": "Programme delivered"}, TRAINER_USER)
    await step(e, "T4", assess(set()), TRAINER_USER)
    await R.refused("T5 when no participant passed",
                    step(e, "T5", {"certificate_ref": "CERT-SCN-4", "participants": cohort}, TRAINER_USER), 409, "not passed")
    await R.refused("T6 cannot skip T5", step(e, "T6", {}, CM), 409, "T5")

    # TRN-09: opening is refused for these jobs
    j1 = await job("TRN-09", "PART_B", "Registered as inspection, not training")
    await R.refused("open Training on a job registered as inspection",
                    EngagementService.open({"job_id": j1, "service_line": L}, SITE, CM), 409, "registered as")
    j2 = await job("TRN-10", L, "Training job with no J.No", j_no=None)
    await R.refused("open without a J.No",
                    EngagementService.open({"job_id": j2, "service_line": L}, SITE, CM), 409, "J.No")
    await R.refused("open a second engagement on the same job",
                    EngagementService.open({"job_id": "JOB-SCN-TRN-01", "service_line": L}, SITE, CM), 409, "already has an open")
    R.bump("training_engagements", 8)


# ------------------------------------------------------------ other lines

async def seed_other_lines(R: Run, ids: dict):
    R.log("Expediting, vendor assessment, asset integrity, equipment design…")
    sup = ids["H-OK"]

    # ---- Expediting
    L = "EXPEDITING"
    allot = {"person_id": "SCN-H-04", "allocated_by": "Inspection Coordinator"}
    j = await job("EXP-01", L, "Expediting: switchgear - opened")
    ids["eng:EXP-01"] = await open_eng(j, L)
    j = await job("EXP-02", L, "Expediting: transformer - progress updates")
    e = await open_eng(j, L)
    await R.refused("E2 expeditor authorised for inspection only", step(e, "E2", {"person_id": "SCN-H-08", "allocated_by": "x"}, TM), 409, "not currently authorised")
    await step(e, "E2", allot, TM)
    await R.refused("E3 with an area missing", step(e, "E3", {"covered": {"drawings": "ok"}}, TM), 400, "not yet covered")
    await step(e, "E3", {"covered": {"drawings": "approved", "quality plans": "approved",
                                     "delivery schedule": "agreed", "sub-orders": "placed"}}, TM)
    await step(e, "E4", {"note": "Core assembly started at works"}, TM)
    await step(e, "E4", {"note": "Winding complete; tanking planned"}, TM)
    ids["eng:EXP-02"] = e
    j = await job("EXP-03", L, "Expediting: cables - report not signed, cannot close")
    e = await open_eng(j, L)
    for c, b in (("E2", allot), ("E3", {"covered": {"drawings": "ok", "quality plans": "ok", "delivery schedule": "ok", "sub-orders": "ok"}}),
                 ("E4", {"note": "progress"}), ("E5", {"items": [{"description": "Delay to raw material", "evidence_ids": ["EVD-SCN-2"]}]})):
        await step(e, c, b, TM)
    await R.refused("E4 closed to updates after E5", step(e, "E4", {"note": "late"}, TM), 409, "closed to updates")
    await R.refused("E6 before the report is signed", step(e, "E6", {}, CM), 409, "has not signed off")
    ids["eng:EXP-03"] = e
    j = await job("EXP-04", L, "Expediting: complete")
    e = await open_eng(j, L)
    for c, b in (("E2", allot), ("E3", {"covered": {"drawings": "ok", "quality plans": "ok", "delivery schedule": "ok", "sub-orders": "ok"}}),
                 ("E4", {"note": "progress"}), ("E5", {"items": [{"description": "No constraints", "evidence_ids": ["EVD-SCN-3"]}]})):
        await step(e, c, b, TM)
    await sign_report(j)
    await step(e, "E6", {"billing_reference": "INV-SCN-EXP-04"}, CM)
    ids["eng:EXP-04"] = e

    # ---- Vendor assessment
    L = "VENDOR_ASSESSMENT"
    allot = {"person_id": "SCN-H-04", "allocated_by": "Inspection Coordinator"}
    full3 = {"covered": {k: "assessed" for k in ("workload", "equipment", "QMS", "welding", "NDT", "safety")}}
    full4 = {"covered": {k: "verified" for k in ("workshop", "storage", "personnel qualification")}}
    j = await job("VA-01", L, "Vendor assessment: fabricator - at the on-site check")
    e = await open_eng(j, L)
    await R.refused("V2 assessor lacks the Vendor Assessment line", step(e, "V2", {"person_id": "SCN-H-08", "allocated_by": "x"}, TM), 409, "not currently authorised")
    await step(e, "V2", {"person_id": "SCN-H-04", "allocated_by": "x"}, TM)
    await R.refused("V3 with areas missing", step(e, "V3", {"covered": {"workload": "ok"}}, TM), 400, "not yet covered")
    await step(e, "V3", full3, TM)
    ids["eng:VA-01"] = e
    j = await job("VA-02", L, "Vendor assessment: gaps found, report stuck")
    e = await open_eng(j, L)
    for c, b in (("V2", {"person_id": "SCN-H-04", "allocated_by": "x"}), ("V3", full3), ("V4", full4)):
        await step(e, c, b, TM)
    await R.refused("V5 before the report is signed", step(e, "V5", {"gaps": []}, TM), 409, "has not signed off")
    await sign_report(j)
    await R.refused("V5 without stating gaps", step(e, "V5", {}, TM), 400, "gaps")
    await R.refused("V5 gaps not sent to the client", step(e, "V5", {"gaps": ["No NDT Level II on site"]}, TM), 409, "sent to the client")
    ids["eng:VA-02"] = e
    for key, gaps, billed in (("VA-03", ["Calibration records incomplete"], "INV-SCN-VA-03"), ("VA-04", [], "INV-SCN-VA-04")):
        j = await job(key, L, f"Vendor assessment: {'gaps sent to client' if gaps else 'no gaps'} - closed")
        e = await open_eng(j, L)
        for c, b in (("V2", {"person_id": "SCN-H-04", "allocated_by": "x"}), ("V3", full3), ("V4", full4)):
            await step(e, c, b, TM)
        await sign_report(j)
        await step(e, "V5", {"gaps": gaps, "gaps_sent_to_client": bool(gaps)}, TM)
        await step(e, "V6", {"billing_reference": billed}, CM)
        ids[f"eng:{key}"] = e

    # ---- Asset integrity (sub-contracted, supervised)
    L = "ASSET_INTEGRITY"
    p_ok = await provider("SCN Rope Access & NDT Crew", "EQUIPMENT_HIRE", services=["Rope access", "NDT"])
    p_susp = await provider("SCN Suspended Sub-contractor", "EQUIPMENT_HIRE", services=["NDT"])
    await ProviderService.set_status(p_susp, "SUSPENDED", "scenario: failed re-evaluation", SITE, "USR-SCN")
    p_new = await provider("SCN Unevaluated Sub-contractor", "EQUIPMENT_HIRE", evaluate=False)
    coi = lambda pid: {"provider_id": pid, "coi_declared_by": "SCN-H-04"}  # noqa: E731

    j = await job("AI-01", L, "Asset integrity: pressure vessel - sub-contractor not yet agreed")
    e = await open_eng(j, L)
    err = await R.refused("A2 with neither MD decision nor client consent", step(e, "A2", coi(p_ok), TM), 409, "MD has not approved")
    if "client has not agreed" not in str(err.detail):
        raise ScenarioError("A2 should also name the missing client consent")
    await R.refused("A2 provider pending evaluation", step(e, "A2", coi(p_new), TM), 409)
    await R.refused("A2 provider suspended", step(e, "A2", coi(p_susp), TM), 409)
    ids["eng:AI-01"] = e

    j = await job("AI-02", L, "Asset integrity: MD approved, client has not agreed")
    e = await open_eng(j, L)
    await R.refused("MD decision by a non-MD", ProviderService.decide_subcontract(
        {"job_id": j, "provider_id": p_ok, "special_case_reason": "x"}, SITE, TM), 403, "MD")
    await R.refused("MD decision without the special-case reason", ProviderService.decide_subcontract(
        {"job_id": j, "provider_id": p_ok}, SITE, CM), 400, "special cases")
    await ProviderService.decide_subcontract(
        {"job_id": j, "provider_id": p_ok, "special_case_reason": "Rope access IQE does not hold"}, SITE, CM)
    await R.refused("A2 with MD approval but no client consent", step(e, "A2", coi(p_ok), TM), 409, "client has not agreed")
    ids["eng:AI-02"] = e

    async def ai_through(key, title, upto):
        j = await job(key, L, title)
        e = await open_eng(j, L)
        await ProviderService.decide_subcontract(
            {"job_id": j, "provider_id": p_ok, "special_case_reason": "Rope access IQE does not hold"}, SITE, CM)
        await ProviderService.record_consent({"job_id": j, "provider_id": p_ok, "granted_by": "Client representative"}, SITE, "USR-SCN")
        await step(e, "A2", coi(p_ok), TM)
        if upto == "A2":
            return j, e
        await step(e, "A3", {"covered": {"competence of personnel": "checked", "competence of equipment": "checked"}}, TM)
        return j, e

    j, e = await ai_through("AI-03", "Asset integrity: sub-contractor engaged, awaiting evaluation", "A2")
    await R.refused("A2 cannot be repeated", step(e, "A2", coi(p_ok), TM), 409, "already complete")
    ids["eng:AI-03"] = e
    j, e = await ai_through("AI-04", "Asset integrity: supervision rules", "A3")
    await R.refused("A4 without a supervisor", step(e, "A4", {"note": "work"}, TM), 400, "supervisor_person_id")
    await R.refused("A4 supervisor not authorised for inspection", step(e, "A4", {"note": "work", "supervisor_person_id": "SCN-TRN-03"}, TM), 409)
    ids["eng:AI-04"] = e
    j, e = await ai_through("AI-05", "Asset integrity: complete", "A3")
    await step(e, "A4", {"note": "Crew supervised on site", "supervisor_person_id": "SCN-H-04"}, TM)
    await sign_report(j)
    await R.refused("A5 without the sub-contracted scope", step(e, "A5", {}, TM), 400, "subcontracted_scope")
    await step(e, "A5", {"subcontracted_scope": "Rope access and NDT crew"}, TM)
    await step(e, "A6", {"billing_reference": "INV-SCN-AI-05"}, CM)
    ids["eng:AI-05"] = e

    # ---- Equipment design (independence)
    L = "EQUIPMENT_DESIGN"
    for key, facts, why in (("DS-01", dict(inspected_by_iqe=True, similar_competitive=False), "IQE inspected this item"),
                            ("DS-02", dict(inspected_by_iqe=False, similar_competitive=True), "competes with an item IQE inspected")):
        j = await job(key, L, f"Equipment design: blocked - {why}")
        e = await open_eng(j, L)
        await R.refused(f"{key} independence check refused", step(e, "D2", facts, TM), 409, "appraise")
        await R.refused(f"{key} blocked engagement takes no steps", step(e, "D3", {}, TM), 409, "blocked")
        ids[f"eng:{key}"] = e
    j = await job("DS-03", L, "Equipment design: independence check not answered")
    e = await open_eng(j, L)
    await R.refused("D2 by a non-TM", step(e, "D2", dict(inspected_by_iqe=False, similar_competitive=False), OTHER_USER), 403, "technical manager")
    await R.refused("D2 with a fact left unstated", step(e, "D2", {"inspected_by_iqe": False}, TM), 400, "similar_competitive")
    ids["eng:DS-03"] = e
    consultant = await provider("SCN Design Consultancy", "OTHER", services=["Design"])
    inspector_firm = await provider("SCN Inspection Sub-contractor", "INSPECTION_SUBCONTRACT", services=["Design"])
    j = await job("DS-04", L, "Equipment design: consultant rules")
    e = await open_eng(j, L)
    await step(e, "D2", dict(inspected_by_iqe=False, similar_competitive=False), TM)
    await R.refused("D3 an inspection sub-contractor as design consultant",
                    step(e, "D3", {"provider_id": inspector_firm, "coi_declared_by": "x"}, TM), 409, "not as an inspector")
    await R.refused("D3 without the conflict declaration", step(e, "D3", {"provider_id": consultant}, TM), 400, "coi_declared_by")
    await step(e, "D3", {"provider_id": consultant, "coi_declared_by": "Consultancy director"}, TM)
    await R.refused("D4 with areas missing", step(e, "D4", {"covered": {"design plan": "v1"}}, TM), 400, "not yet covered")
    ids["eng:DS-04"] = e
    j = await job("DS-05", L, "Equipment design: complete, no inspection report")
    e = await open_eng(j, L)
    await step(e, "D2", dict(inspected_by_iqe=False, similar_competitive=False), TM)
    await step(e, "D3", {"provider_id": consultant, "coi_declared_by": "Consultancy director"}, TM)
    await step(e, "D4", {"covered": {"design plan": "v1", "inputs: codes, specs, client needs": "ok", "stage verification": "ok"}}, TM)
    await step(e, "D5", {"covered": {"outputs checked": "ok", "changes controlled": "register"}}, TM)
    await step(e, "D6", {"billing_reference": "INV-SCN-DS-05"}, CM)
    ids["eng:DS-05"] = e
    R.bump("other_line_engagements", 21)


# ------------------------------------------------------------------ payables

def pan(letters5: str, kind="C", digits="1234", last="F") -> str:
    return f"{letters5[:3]}{kind}{letters5[4]}{digits}{last}"


async def vendor(R: Run, name: str, **kw) -> str:
    v = await PurchasingService.create_vendor({"name": name, **kw}, SITE, FIN["user_id"])
    R.bump("vendors")
    return v["vendor_id"]


async def bill(R: Run, vid: str, taxable: float, **kw):
    kw = {"gst_rate_pct": 18, "invoice_number": f"INV-{R.counts.get('bills', 0) + 1:04d}",
          "invoice_date": NOW - timedelta(days=3), **kw}
    r = await PurchasingService.create_vendor_payment({"vendor_id": vid, "taxable_value": taxable, **kw}, SITE, FIN["user_id"])
    R.bump("bills")
    return r


async def seed_payables(R: Run, ids: dict):
    R.log("Vendors and bills: GST, TDS and MSME in every case…")
    used_demo = False
    if not settings.iqe_gstin:
        settings.iqe_gstin = DEMO_IQE_GSTIN        # in memory for this run only
        used_demo = True
        R.log(f"  IQE_GSTIN is not set: using the FAKE demo GSTIN {DEMO_IQE_GSTIN} for this run only. "
              "Set the real IQE_GSTIN.")
    try:
        await _payables(R, ids)
    finally:
        if used_demo:
            settings.iqe_gstin = None


async def _payables(R: Run, ids: dict):
    TG, MH, KA = "36", "27", "29"
    V = {}
    V["intra"] = await vendor(R, "Scenario Fabricators (Telangana)", pan=(p := pan("AAACS")), gstin=make_gstin(TG, p),
                              default_tds_section="194C")
    V["inter"] = await vendor(R, "Scenario Consultants (Maharashtra)", pan=(p := pan("AABCM")), gstin=make_gstin(MH, p),
                              default_tds_section="194J")
    V["tech"] = await vendor(R, "Scenario Tech Services (Karnataka)", pan=(p := pan("AABCK")), gstin=make_gstin(KA, p),
                             default_tds_section="194J_TECH")
    V["commission"] = await vendor(R, "Scenario Agents (Telangana)", pan=(p := pan("AABCA")), gstin=make_gstin(TG, p),
                                   default_tds_section="194H")
    V["nopan"] = await vendor(R, "Scenario Local Contractor (no PAN)", default_tds_section="194C")
    V["lower"] = await vendor(R, "Scenario Erectors (lower-deduction certificate)", pan=(p := pan("AABCE")), gstin=make_gstin(TG, p),
                              default_tds_section="194C", lower_rate_pct=0.5, lower_cert_ref="197/SCN/2026-27/0042")
    V["thresh"] = await vendor(R, "Scenario Proprietor (crosses the threshold)", pan=pan("AAAPT", "P"), default_tds_section="194C")
    V["unreg"] = await vendor(R, "Scenario Goods Transport (reverse charge)", pan=(p := pan("AABCG", "P")),
                              gstin=make_gstin(TG, p), default_tds_section="194C")
    V["nil"] = await vendor(R, "Scenario Stationers (nil-rated)", pan=(p := pan("AABCN")), gstin=make_gstin(TG, p), default_tds_section="NONE")
    V["micro"] = await vendor(R, "Scenario Micro Works", pan=(p := pan("AABCU")), gstin=make_gstin(TG, p), is_msme=True,
                              msme_category="micro", udyam_number="UDYAM-TS-02-0000001", default_tds_section="194C")
    V["small"] = await vendor(R, "Scenario Small Industries", pan=(p := pan("AABCL")), gstin=make_gstin(TG, p), is_msme=True,
                              msme_category="small", udyam_number="UDYAM-TS-02-0000002", default_tds_section="194C")
    V["medium"] = await vendor(R, "Scenario Medium Engineering", pan=(p := pan("AABCD")), gstin=make_gstin(TG, p), is_msme=True,
                               msme_category="medium", udyam_number="UDYAM-TS-02-0000003", default_tds_section="194C")
    V["gone"] = await vendor(R, "Scenario Closed Vendor", pan=(p := pan("AABCX")), gstin=make_gstin(TG, p), active=False)
    ids["vendors"] = V

    # --- GST
    ids["b:intra"] = await bill(R, V["intra"], 150000)                                    # CGST+SGST, 194C 2%
    ids["b:inter"] = await bill(R, V["inter"], 80000)                                     # IGST, 194J 10%
    ids["b:tech"] = await bill(R, V["tech"], 120000)                                      # IGST, 194J_TECH 2%
    ids["b:nil"] = await bill(R, V["nil"], 25000, gst_rate_pct=0)                         # no GST, no TDS
    ids["b:reverse"] = await bill(R, V["unreg"], 40000, gst_rate_pct=5, reverse_charge=True)   # IQE pays the GST
    # --- TDS
    ids["b:commission-below"] = await bill(R, V["commission"], 15000)                     # below 20,000: nil
    ids["b:nopan"] = await bill(R, V["nopan"], 200000, gst_rate_pct=0)                    # 20% no-PAN rate
    ids["b:lower"] = await bill(R, V["lower"], 200000)                                    # 0.5% per certificate
    for t in (25000, 25000, 25000, 40000):                                                # 4th crosses 1,00,000
        await bill(R, V["thresh"], t, gst_rate_pct=0)
    # --- MSME
    ids["b:micro-ok"] = await bill(R, V["micro"], 60000, acceptance_date=NOW - timedelta(days=5))
    ids["b:micro-late"] = await bill(R, V["micro"], 90000, acceptance_date=NOW - timedelta(days=40))   # 15 days default: late
    ids["b:small-agreed"] = await bill(R, V["small"], 70000, acceptance_date=NOW - timedelta(days=50),
                                       written_agreement_days=30)                                       # due day 30: late
    ids["b:small-45"] = await bill(R, V["small"], 70000, acceptance_date=NOW - timedelta(days=20),
                                   written_agreement_days=90)                                           # capped at 45: on time
    ids["b:medium"] = await bill(R, V["medium"], 300000, acceptance_date=NOW - timedelta(days=120))      # no 45-day rule

    # --- Refusals at entry
    await R.refused("bill: TDS typed differently from computed", PurchasingService.create_vendor_payment(
        {"vendor_id": V["intra"], "taxable_value": 150000, "gst_rate_pct": 18, "tds_deducted": 100}, SITE, FIN["user_id"]),
        409, "computed")
    await R.refused("bill: PAN differs from the vendor record", PurchasingService.create_vendor_payment(
        {"vendor_id": V["intra"], "taxable_value": 1000, "pan": pan("AAACZ")}, SITE, FIN["user_id"]), 409, "vendor record")
    await R.refused("bill: against an inactive vendor", PurchasingService.create_vendor_payment(
        {"vendor_id": V["gone"], "taxable_value": 1000}, SITE, FIN["user_id"]), 409, "inactive")
    await R.refused("bill: micro vendor without acceptance date", PurchasingService.create_vendor_payment(
        {"vendor_id": V["micro"], "taxable_value": 1000}, SITE, FIN["user_id"]), 422, "acceptance_date")
    await R.refused("bill: zero value", PurchasingService.create_vendor_payment(
        {"vendor_id": V["intra"], "taxable_value": 0}, SITE, FIN["user_id"]), 422, "greater than zero")
    await R.refused("bill: GST charged by a vendor with no GSTIN", PurchasingService.create_vendor_payment(
        {"vendor_id": V["nopan"], "taxable_value": 1000, "gst_rate_pct": 18}, SITE, FIN["user_id"]), 422, "GSTIN")
    await R.refused("vendor: invalid GSTIN", PurchasingService.create_vendor(
        {"name": "Bad GSTIN Ltd", "pan": pan("AAACB"), "gstin": "36AAACB1234F1Z0"}, SITE, FIN["user_id"]), 422, "GSTIN")
    await R.refused("vendor: GSTIN does not contain the PAN", PurchasingService.create_vendor(
        {"name": "Mismatch Ltd", "pan": pan("AAACQ"), "gstin": make_gstin(TG, pan("AAACR"))}, SITE, FIN["user_id"]), 422, "contains PAN")
    await R.refused("vendor: duplicate PAN", PurchasingService.create_vendor(
        {"name": "Duplicate Fabricators", "pan": pan("AAACS")}, SITE, FIN["user_id"]), 409, "already holds")
    await R.refused("vendor: lower rate without certificate", PurchasingService.create_vendor(
        {"name": "No Certificate Ltd", "pan": pan("AAACC"), "lower_rate_pct": 0.5}, SITE, FIN["user_id"]), 422, "certificate")
    await R.refused("vendor: MSME without a Udyam number", PurchasingService.create_vendor(
        {"name": "No Udyam Ltd", "is_msme": True, "msme_category": "micro"}, SITE, FIN["user_id"]), 422, "Udyam")

    # --- Approval and payment, in every state
    # pending: left as entered (b:intra). approved: b:inter. paid: the MSME and TDS cases.
    await R.refused("approve own entry", PurchasingService.approve_vendor_payment(
        (await bill(R, V["tech"], 5000, gst_rate_pct=0))["vp_id"], {}, SITE, {**TM, "user_id": FIN["user_id"], "role_id": 7}),
        403, "cannot approve")
    await R.refused("approve by Finance", PurchasingService.approve_vendor_payment(
        ids["b:inter"]["vp_id"], {}, SITE, FIN2), 403, "technical manager")
    await R.refused("pay before approval", PurchasingService.pay_vendor(
        ids["b:inter"]["vp_id"], {}, SITE, FIN2), 409, "approved first")
    await PurchasingService.approve_vendor_payment(ids["b:inter"]["vp_id"], {}, SITE, TM)

    to_pay = ("b:micro-ok", "b:micro-late", "b:small-agreed", "b:small-45", "b:medium", "b:lower", "b:nopan", "b:tech")
    for k in to_pay:
        await PurchasingService.approve_vendor_payment(ids[k]["vp_id"], {}, SITE, TM)
    await R.refused("approver also releases the money", PurchasingService.pay_vendor(
        ids["b:tech"]["vp_id"], {}, SITE, {"user_id": TM["user_id"], "role_id": 7}), 403, "different person")
    for k in to_pay:
        await PurchasingService.pay_vendor(ids[k]["vp_id"], {"payment_mode": "NEFT", "payment_ref": f"UTR-SCN-{k}"}, SITE, FIN2)
        R.bump("bills_paid")
    await R.refused("pay twice", PurchasingService.pay_vendor(ids["b:tech"]["vp_id"], {}, SITE, FIN2), 409, "already")

    late = await VendorPayment.find_one({"vp_id": ids["b:micro-late"]["vp_id"]})
    if not (late.msme_late_days and late.msme_interest):
        raise ScenarioError("the late micro-enterprise payment should carry MSMED interest")
    ok = await VendorPayment.find_one({"vp_id": ids["b:micro-ok"]["vp_id"]})
    if ok.msme_late_days:
        raise ScenarioError("the on-time micro-enterprise payment should carry no interest")
    med = await VendorPayment.find_one({"vp_id": ids["b:medium"]["vp_id"]})
    if med.msme_late_days:
        raise ScenarioError("a medium enterprise is not on the 45-day rule")


# --------------------------------------------------------------------- run

async def run_seed(log) -> dict:
    if await Job.find_one({"job_id": "JOB-SCN-TRN-01"}):
        log("Scenarios are already seeded. Run with --wipe first to rebuild them.")
        return {"already_seeded": True}
    R = Run(log)
    ids: dict = {}
    await seed_actors(R, ids)
    await seed_authorisations(R, ids)
    await seed_training(R, ids)
    await seed_other_lines(R, ids)
    await seed_payables(R, ids)
    engagements = await Engagement.find({"job_id": {"$regex": "^JOB-SCN-"}}).to_list()
    by_state: dict[str, int] = {}
    for e in engagements:
        by_state[e.status] = by_state.get(e.status, 0) + 1
    return {**R.counts, "engagements": len(engagements),
            **{f"engagements_{k}": v for k, v in sorted(by_state.items())},
            "authorisations": await Authorization.find({"person_id": {"$regex": "^"}}).count()}


async def run_wipe(log) -> dict:
    removed: dict[str, int] = {}

    async def drop(label, docs):
        n = 0
        for d in docs:
            await d.delete()
            n += 1
        removed[label] = n
        log(f"  removed {n} {label}")

    jobs = [j.job_id for j in await Job.find({"job_id": {"$regex": "^JOB-SCN-"}}).to_list()]
    people = await Person.find({"employee_code": {"$regex": "^SCN-"}}).to_list()
    pids = [p.person_id for p in people]
    provs = [p.provider_id for p in await ExternalProvider.find({"name": {"$regex": "^SCN "}}).to_list()]
    vps = await VendorPayment.find({"created_by": {"$regex": f"^{MARK}"}}).to_list()

    await drop("engagements", await Engagement.find({"job_id": {"$in": jobs}}).to_list())
    await drop("report sign-offs", await ReportSignoff.find({"job_id": {"$in": jobs}}).to_list())
    await drop("subcontract decisions", await SubcontractDecision.find({"job_id": {"$in": jobs}}).to_list())
    await drop("subcontract consents", await SubcontractConsent.find({"job_id": {"$in": jobs}}).to_list())
    await drop("provider evaluations", await EvaluationRecord.find({"provider_id": {"$in": provs}}).to_list())
    await drop("providers", await ExternalProvider.find({"provider_id": {"$in": provs}}).to_list())
    await drop("authorisations", await Authorization.find({"person_id": {"$in": pids}}).to_list())
    await drop("impartiality declarations", await ImpartialityDeclaration.find({"person_id": {"$in": pids}}).to_list())
    await drop("people", people)
    await drop("jobs", await Job.find({"job_id": {"$in": jobs}}).to_list())
    await drop("scenario logins", await UserLogin.find({"user_id": {"$regex": "^USR-SCN-"}}).to_list())
    await drop("payables ledger rows", await AccountPayable.find({"vp_id": {"$in": [v.vp_id for v in vps]}}).to_list())
    await drop("vendor bills", vps)
    await drop("vendors", await Vendor.find({"created_by": {"$regex": f"^{MARK}"}}).to_list())
    return removed


PROD_LOOKING = ("prod", "production", "live")


async def main(wipe: bool, force: bool, quiet: bool) -> int:
    def log(msg: str) -> None:
        if not quiet:
            print(msg)

    db_name = settings.mongodb_db_name
    if not force and any(tag in db_name.lower() for tag in PROD_LOOKING):
        print(f"Refusing to touch database '{db_name}': the name looks like production. "
              "Pass --force if you are certain.", file=sys.stderr)
        return 2
    client = AsyncMongoClient(settings.mongodb_url)
    await init_beanie(database=client[db_name], document_models=MODELS)
    log(f"{'Wiping' if wipe else 'Seeding'} scenarios in '{db_name}'…\n")
    try:
        result = await run_wipe(log) if wipe else await run_seed(log)
    except ScenarioError as e:
        print(f"\nSCENARIO FAILED: {e}\nThe rules no longer behave as the scenario expects. "
              "Run with --wipe to clear the partial data.", file=sys.stderr)
        return 1
    log("")
    for k, v in result.items():
        log(f"{k:30} {v}")
    log("\nDone.")
    await client.close()
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--wipe", action="store_true", help="remove the records this script seeded")
    ap.add_argument("--force", action="store_true", help="proceed even if the database name looks like production")
    ap.add_argument("--quiet", action="store_true", help="only print the summary")
    a = ap.parse_args()
    raise SystemExit(asyncio.run(main(a.wipe, a.force, a.quiet)))
