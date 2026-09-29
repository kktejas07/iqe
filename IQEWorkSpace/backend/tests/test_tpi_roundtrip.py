import asyncio
import pytest
from modules.tpi.schemas import CreateReportRequest, UpdateReportRequest, SignReportRequest
from modules.tpi.service import (
    create_draft,
    update_draft,
    submit_report,
    sign_report,
    issue_report,
    get_report,
)
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from core.config import settings
from modules.tpi.models import TpiReport


def test_tpi_lifecycle_roundtrip():
    """Verify complete roundtrip lifecycle: create -> edit -> submit -> sign (both) -> issue."""
    async def run_lifecycle():
        client = AsyncIOMotorClient(settings.mongodb_url)
        await init_beanie(
            database=client[settings.mongodb_db_name],
            document_models=[TpiReport],
        )

        # 1. Create Draft
        create_req = CreateReportRequest(
            customer="Granules India Limited",
            supplier="L&T Valves Limited",
            po_no="PO-TEST-001",
            data={
                "date": "2026-09-29",
                "outcome": "SATISFACTORY",
                "items": [
                    {
                        "item": 1,
                        "description": "Test Valve",
                        "po_qty": 10,
                        "offered_qty": 10,
                        "inspected_qty": 10,
                        "accepted_qty": 10,
                    }
                ],
            },
        )
        report = await create_draft("TP02", create_req)
        assert report.id is not None
        assert report.status == "DRAFT"
        assert report.revision == "00"
        report_id = str(report.id)

        # 2. Edit Draft
        update_req = UpdateReportRequest(
            customer="Granules India Limited - Gagillapur",
            supplier="L&T Valves Limited",
            data={
                **report.data,
                "remarks": "Updated during inspection walkthrough.",
            },
        )
        updated, warnings = await update_draft(report_id, update_req)
        assert updated.customer == "Granules India Limited - Gagillapur"
        assert updated.data.get("remarks") == "Updated during inspection walkthrough."
        assert len(warnings) == 0

        # 3. Submit
        submitted = await submit_report(report_id)
        assert submitted.status == "SUBMITTED"

        # Cannot edit after submit
        with pytest.raises(Exception):
            await update_draft(report_id, update_req)

        # 4. Sign by Supplier
        supplier_sign = SignReportRequest(
            party="SUPPLIER",
            name="K. Rajesh",
            designation="QA Manager",
            signature_image_url="/media/signatures/supplier_sig.png",
        )
        signed_rep = await sign_report(report_id, supplier_sign)
        assert len(signed_rep.signatures) == 1
        assert signed_rep.status == "SUBMITTED"  # Only 1 party signed so far

        # Sign by IQE
        iqe_sign = SignReportRequest(
            party="IQE",
            name="R. Sundararajan",
            designation="Lead Inspector",
            signature_image_url="/media/signatures/iqe_sig.png",
        )
        both_signed = await sign_report(report_id, iqe_sign)
        assert len(both_signed.signatures) == 2
        assert both_signed.status == "SIGNED"  # Both parties signed

        # 5. Issue
        issued = await issue_report(report_id)
        assert issued.status == "ISSUED"
        assert issued.pdf_url is not None
        assert issued.issued_at is not None

    asyncio.run(run_lifecycle())
