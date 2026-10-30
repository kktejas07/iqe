"""The step sequences for the non-inspection service lines.

From the workflow's bottom band. Every line shares steps 1-5 and 9-10 (J.No,
authorisation, invoicing, collection); what differs is the delivery in
between, which is what is defined here. Step 1 of each flow is "J.No opened",
done by the engagement being opened against a job that has one.

A step's `kind` says what it needs before it can be completed:

* authorise     a person authorised for this line, no conflict of interest,
                confirmed by the TM (never by the person themselves)
* provider      an externally provided party on the approved list, with a
                conflict-of-interest declaration; for sub-contracted
                inspection also the MD's decision and the client's consent
* independence  design only: the equipment-design independence check
* checklist     every listed area covered
* evidence      at least one evidence reference per item
* work          a recorded note of what was done
* report        a Technical Manager sign-off on the job's report
* certificate   every participant assessed before a certificate issues
* close         everything before it complete (and the report where one exists)
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Step:
    code: str
    title: str
    kind: str
    items: tuple[str, ...] = field(default=())
    repeatable: bool = False


FLOWS: dict[str, list[Step]] = {
    "EXPEDITING": [
        Step("E1", "J.No opened", "opened"),
        Step("E2", "Authorise expeditor", "authorise"),
        Step("E3", "Follow up supplier", "checklist",
             ("drawings", "quality plans", "delivery schedule", "sub-orders")),
        Step("E4", "Progress update", "work", repeatable=True),
        Step("E5", "Report constraints", "evidence"),
        Step("E6", "Bill and close", "close"),
    ],
    "VENDOR_ASSESSMENT": [
        Step("V1", "J.No opened", "opened"),
        Step("V2", "Authorise assessor", "authorise"),
        Step("V3", "Assess capability", "checklist",
             ("workload", "equipment", "QMS", "welding", "NDT", "safety")),
        Step("V4", "Verify on site", "checklist",
             ("workshop", "storage", "personnel qualification")),
        Step("V5", "Assessment report", "report"),
        Step("V6", "Bill and close", "close"),
    ],
    "ASSET_INTEGRITY": [
        Step("A1", "J.No opened", "opened"),
        Step("A2", "Engage sub-contractor", "provider"),
        Step("A3", "Evaluate and approve", "checklist",
             ("competence of personnel", "competence of equipment")),
        Step("A4", "Work under supervision", "work"),
        Step("A5", "Review and report", "report"),
        Step("A6", "Bill and close", "close"),
    ],
    "EQUIPMENT_DESIGN": [
        Step("D1", "J.No opened", "opened"),
        Step("D2", "Independence check", "independence"),
        Step("D3", "Engage Design Consultant", "provider"),
        Step("D4", "Plan, inputs, controls", "checklist",
             ("design plan", "inputs: codes, specs, client needs", "stage verification")),
        Step("D5", "Outputs and changes", "checklist",
             ("outputs checked", "changes controlled")),
        Step("D6", "Bill and close", "close"),
    ],
    "TRAINING": [
        Step("T1", "J.No opened", "opened"),
        Step("T2", "Authorise trainer", "authorise"),
        Step("T3", "Deliver programme", "work"),
        Step("T4", "Assess participants", "evidence"),
        Step("T5", "Issue certificate", "certificate"),
        Step("T6", "Feedback, bill, close", "close"),
    ],
}

#: Lines whose output is a report the Technical Manager signs off.
REPORT_LINES = {"EXPEDITING", "VENDOR_ASSESSMENT", "ASSET_INTEGRITY"}
#: Lines for which no IQE inspection report is issued.
NO_REPORT_LINES = {"EQUIPMENT_DESIGN", "TRAINING"}
