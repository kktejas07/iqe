"""Migrate the legacy SQL Server user master into the Person collection.

WHY THIS EXISTS
---------------
The FastAPI rewrite carried over only Competency, InspectorRate and Associate.
The legacy ASP.NET app (IQEApp.Domain/UserDomain, IQEApp.Service/UserService)
holds considerably more: statutory IDs, banking, qualifications, secondment and
empanelment. This moves that across without losing it.

HOW TO RUN
----------
This script needs network access to the SQL Server, which the cloud sandbox does
not have. Run it from a machine that can reach the database:

    pip install pyodbc motor beanie
    export LEGACY_SQL_DSN="Driver={ODBC Driver 18 for SQL Server};Server=tcp:HOST,1433;Database=DB;UID=USER;PWD=PASS;Encrypt=yes"
    export MONGODB_URL="mongodb://localhost:27017"
    export MONGODB_DB_NAME="iqeapp_dev"

    python scripts/migrate_legacy_people.py --dry-run     # inspect first
    python scripts/migrate_legacy_people.py --commit      # then write

Credentials come from the environment only. Do not put a connection string in
this file or anywhere in the repository.

SAFETY
------
- Read-only against SQL Server. No UPDATE, DELETE or DDL is issued.
- Idempotent on migrated_from_legacy_user_id, so a re-run updates rather than
  duplicates.
- --dry-run is the default; writing requires --commit explicitly.
- Legacy CompentenceActive becomes an Authorization flagged
  unverified_legacy_grant=True. Those grants have no evidence behind them and
  must be re-evidenced at next review rather than silently trusted.
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from modules.people.models import (  # noqa: E402
    Authorization,
    AuthorizationStatus,
    CompetenceProfile,
    EngagementType,
    Person,
    PersonCategory,
)

# ---------------------------------------------------------------- SQL source

#: Read-only. Column list mirrors the legacy CreateUser / GetUserListDetails
#: stored procedures and IQEApp.Domain/UserDomain/UserDomainModel.cs.
LEGACY_QUERY = """
SELECT
    u.UserId,
    u.SiteId,
    u.TitleId,
    u.FirstName,
    u.LastName,
    u.EmailId,
    u.LoginName,
    u.Address,
    u.City                AS CityName,
    u.CountryId,
    u.StateId,
    u.DateofBirth,
    u.ContactNumber,
    u.EmployeeCode,
    u.InspectorCode,
    u.EmployeeTypeId,
    u.RoleID,
    u.DesignationId,
    u.Experience,
    u.Certifications,
    u.SkillSet,
    u.OtherProfessional,
    u.Qualification,
    u.ProfQualification,
    u.AssociateId,
    u.AssociateName,
    u.ContactPerson,
    u.ESI,
    u.PF,
    u.PA,
    u.Medical,
    u.BankAcc,
    u.IFSCCode,
    u.Branch,
    u.PAN,
    u.Aadhar,
    u.IsUserActive,
    u.IsSecondment,
    u.CompentenceActive
FROM Users AS u
WHERE u.SiteId = ?
"""


def fetch_legacy_rows(dsn: str, site_id_numeric: int) -> list[dict[str, Any]]:
    try:
        import pyodbc
    except ImportError:
        raise SystemExit(
            "pyodbc is not installed. Run: pip install pyodbc\n"
            "(also needs the Microsoft ODBC Driver for SQL Server)"
        )

    with pyodbc.connect(dsn, timeout=30, readonly=True) as conn:
        cur = conn.cursor()
        cur.execute(LEGACY_QUERY, site_id_numeric)
        columns = [c[0] for c in cur.description]
        return [dict(zip(columns, row)) for row in cur.fetchall()]


# ------------------------------------------------------------------ mapping

#: Legacy EmployeeTypeId -> Person.category.
#: VERIFY THIS against the EmployeeType master before committing - the ids are
#: installation-specific and this mapping is an informed guess, not fact.
EMPLOYEE_TYPE_TO_CATEGORY: dict[int, str] = {
    1: PersonCategory.TECHNICAL_INSPECTION.value,
    2: PersonCategory.TECHNICAL_ENGINEERING.value,
    3: PersonCategory.ADMIN_SUPPORT.value,
    4: PersonCategory.CORPORATE_FUNCTION.value,
    5: PersonCategory.SITE_LABOUR.value,
}

DEFAULT_CATEGORY = PersonCategory.TECHNICAL_INSPECTION.value


def _clean(v: Any) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def map_row(row: dict[str, Any], site_id: str) -> dict[str, Any]:
    """Legacy row -> Person payload."""
    first = _clean(row.get("FirstName")) or ""
    last = _clean(row.get("LastName")) or ""
    full_name = f"{first} {last}".strip() or _clean(row.get("LoginName")) or "Unnamed"

    emp_type = row.get("EmployeeTypeId")
    category = EMPLOYEE_TYPE_TO_CATEGORY.get(
        int(emp_type) if emp_type is not None else -1, DEFAULT_CATEGORY
    )

    if row.get("IsSecondment"):
        engagement = EngagementType.SECONDMENT.value
    elif row.get("AssociateId") or _clean(row.get("AssociateName")):
        engagement = EngagementType.ASSOCIATE.value
    else:
        engagement = EngagementType.PERMANENT.value

    return {
        "site_id": site_id,
        "migrated_from_legacy_user_id": int(row["UserId"]),
        "employee_code": _clean(row.get("EmployeeCode")),
        "title_id": row.get("TitleId"),
        "full_name": full_name,
        "first_name": first or None,
        "last_name": last or None,
        "date_of_birth": row.get("DateofBirth"),
        "phone": _clean(row.get("ContactNumber")),
        "email": _clean(row.get("EmailId")),
        "address": _clean(row.get("Address")),
        "country_id": row.get("CountryId"),
        "state_id": row.get("StateId"),
        "city_name": _clean(row.get("CityName")),
        "base_location": _clean(row.get("CityName")),
        "category": category,
        "engagement_type": engagement,
        "designation_id": row.get("DesignationId"),
        "inspector_code": _clean(row.get("InspectorCode")),
        "skill_sets": _clean(row.get("SkillSet")),
        "qualification_text": _clean(row.get("Qualification")),
        "prof_qualification": _clean(row.get("ProfQualification")),
        "experience_text": _clean(row.get("Experience")),
        "certifications_text": _clean(row.get("Certifications")),
        "other_professional": _clean(row.get("OtherProfessional")),
        "associate_id": _clean(row.get("AssociateId")),
        "associate_name": _clean(row.get("AssociateName")),
        "contact_person": _clean(row.get("ContactPerson")),
        "bank_account": _clean(row.get("BankAcc")),
        "ifsc_code": _clean(row.get("IFSCCode")),
        "bank_branch": _clean(row.get("Branch")),
        "pan": _clean(row.get("PAN")),
        "aadhaar": _clean(row.get("Aadhar")),
        "esi_no": _clean(row.get("ESI")),
        "pf_no": _clean(row.get("PF")),
        "pa_no": _clean(row.get("PA")),
        "medical_ref": _clean(row.get("Medical")),
        "employment_status": "active" if row.get("IsUserActive") else "exited",
    }


# ------------------------------------------------------------------- runner

async def run(dsn: str, site_id: str, site_id_numeric: int, commit: bool, limit: int):
    from beanie import init_beanie
    from pymongo import AsyncMongoClient

    rows = fetch_legacy_rows(dsn, site_id_numeric)
    if limit:
        rows = rows[:limit]
    print(f"Read {len(rows)} legacy user rows for site {site_id_numeric}.\n")

    if not commit:
        print("DRY RUN — nothing will be written. Sample of the mapping:\n")
        for row in rows[:5]:
            m = map_row(row, site_id)
            print(f"  legacy UserId {m['migrated_from_legacy_user_id']}: "
                  f"{m['full_name']} | {m['category']} | {m['engagement_type']} | "
                  f"emp={m['employee_code']} insp={m['inspector_code']}")
        unmapped = {
            int(r["EmployeeTypeId"]) for r in rows
            if r.get("EmployeeTypeId") is not None
            and int(r["EmployeeTypeId"]) not in EMPLOYEE_TYPE_TO_CATEGORY
        }
        if unmapped:
            print(f"\n  WARNING: EmployeeTypeId values with no category mapping: "
                  f"{sorted(unmapped)} — these default to {DEFAULT_CATEGORY}.")
            print("  Check them against the EmployeeType master before committing.")
        legacy_grants = sum(1 for r in rows if r.get("CompentenceActive"))
        print(f"\n  {legacy_grants} rows carry CompentenceActive and would become "
              f"authorizations flagged unverified_legacy_grant.")
        print("\nRe-run with --commit to write.")
        return

    client = AsyncMongoClient(os.environ.get("MONGODB_URL", "mongodb://localhost:27017"))
    await init_beanie(
        database=client[os.environ.get("MONGODB_DB_NAME", "iqeapp_dev")],
        document_models=[Person, CompetenceProfile, Authorization],
    )

    created = updated = grants = 0
    seq = await Person.find(Person.site_id == site_id).count()

    for row in rows:
        payload = map_row(row, site_id)
        legacy_id = payload["migrated_from_legacy_user_id"]

        existing = await Person.find_one(
            Person.migrated_from_legacy_user_id == legacy_id,
            Person.site_id == site_id,
        )
        if existing:
            for k, v in payload.items():
                if k not in ("site_id", "migrated_from_legacy_user_id") and hasattr(existing, k):
                    setattr(existing, k, v)
            existing.updated_at = datetime.now()
            await existing.save()
            person = existing
            updated += 1
        else:
            seq += 1
            payload["person_id"] = f"EMP-{seq:05d}"
            payload["created_by"] = "legacy-migration"
            person = Person(**payload)
            await person.insert()
            created += 1

        # CompentenceActive -> an authorization, explicitly marked as unevidenced.
        if row.get("CompentenceActive"):
            has_auth = await Authorization.find_one(
                Authorization.person_id == person.person_id,
                Authorization.site_id == site_id,
            )
            if not has_auth:
                await Authorization(
                    authorization_id=f"ATH-{datetime.now().year}-{grants + 1:04d}",
                    person_id=person.person_id,
                    site_id=site_id,
                    inspection_types=[],
                    status=AuthorizationStatus.AUTHORIZED.value,
                    unverified_legacy_grant=True,
                    authorized_by="legacy-migration",
                    authorized_on=datetime.now(),
                ).insert()
                grants += 1

    print(f"Created {created} people, updated {updated}.")
    print(f"Created {grants} authorizations flagged unverified_legacy_grant.")
    print("\nNext: review those grants, set their inspection_types, and re-evidence")
    print("them before relying on deployability. Then run the deployability sweep.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--commit", action="store_true", help="write to MongoDB (default is a dry run)")
    ap.add_argument("--site-id", default="SITE-01", help="target site_id in the new system")
    ap.add_argument("--legacy-site-id", type=int, default=1, help="numeric SiteId in SQL Server")
    ap.add_argument("--limit", type=int, default=0, help="only process the first N rows")
    args = ap.parse_args()

    dsn = os.environ.get("LEGACY_SQL_DSN")
    if not dsn:
        raise SystemExit(
            "LEGACY_SQL_DSN is not set.\n\n"
            "Export it first, for example:\n"
            '  export LEGACY_SQL_DSN="Driver={ODBC Driver 18 for SQL Server};'
            'Server=tcp:HOST,1433;Database=DB;UID=USER;PWD=PASS;Encrypt=yes"\n\n'
            "Never commit a connection string to the repository."
        )

    asyncio.run(run(dsn, args.site_id, args.legacy_site_id, args.commit, args.limit))


if __name__ == "__main__":
    main()
