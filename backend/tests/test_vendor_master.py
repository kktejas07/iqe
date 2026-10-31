"""Vendor master and the creditor ledger.

PAN, GSTIN and MSME status are held once per vendor; a bill takes them from
the record and cannot contradict it. A vendor bill appears on the Accounts
Payable ledger with its tax, and is paid only through the vendor payment.
"""
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pytest
import pytest_asyncio
from beanie import init_beanie
from fastapi import HTTPException
from mongomock_motor import AsyncMongoMockClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.audit import AuditEntry, history  # noqa: E402
from core.config import settings  # noqa: E402
from core.sequences import Sequence  # noqa: E402
from modules.auth.models import UserLogin  # noqa: E402
from modules.finance.models import AccountPayable  # noqa: E402
from modules.finance.service import FinanceService  # noqa: E402
from modules.purchasing.models import Vendor, VendorPayment  # noqa: E402
from modules.purchasing.service import PurchasingService  # noqa: E402

SITE = "SITE-01"
IQE_GSTIN = "27AAPFU0939F1ZV"
PAN_OTHER = "AAGCB7383J"
GSTIN_OTHER = "29AAGCB7383J1Z4"     # contains PAN_OTHER
PAN_FIRM = "AAPFU0939F"             # inside IQE_GSTIN
UDYAM = "UDYAM-TS-00-0012345"

TM = {"user_id": "USR-TM", "role_id": 7}
FIN = {"user_id": "USR-FI", "role_id": 6}
MD = {"user_id": "USR-MD", "role_id": 1}


def _patch():
    from mongomock_motor import AsyncMongoMockDatabase

    original = AsyncMongoMockDatabase.list_collection_names

    async def patched(self, *a, **k):
        k.pop("authorizedCollections", None)
        k.pop("nameOnly", None)
        return await original(self, *a, **k)

    AsyncMongoMockDatabase.list_collection_names = patched


@pytest_asyncio.fixture
async def db(monkeypatch):
    _patch()
    monkeypatch.setattr(settings, "iqe_gstin", IQE_GSTIN)
    monkeypatch.setattr(settings, "rbi_bank_rate_pct", 6.0)
    c = AsyncMongoMockClient()
    await init_beanie(database=c["vendor_master"],
                      document_models=[Vendor, VendorPayment, AccountPayable, UserLogin,
                                       AuditEntry, Sequence])
    yield c


async def _vendor(**kw):
    data = {"name": "Bangalore Calibration", "pan": PAN_OTHER, "gstin": GSTIN_OTHER,
            "default_tds_section": "194J", **kw}
    return await PurchasingService.create_vendor(data, SITE, "USR-FI")


async def _bill(vendor_id, **kw):
    data = {"vendor_id": vendor_id, "taxable_value": 100000, "gst_rate_pct": 18, **kw}
    return await PurchasingService.create_vendor_payment(data, SITE, "USR-ENTRY")


async def _refused(coro, status=None, text=None):
    with pytest.raises(HTTPException) as e:
        await coro
    if status:
        assert e.value.status_code == status, e.value.detail
    if text:
        assert text in e.value.detail, e.value.detail


# ------------------------------------------------------------ the record

@pytest.mark.asyncio
async def test_a_vendor_is_held_with_its_tax_identity(db):
    v = await _vendor()
    assert v["vendor_id"].startswith("VND-") and v["pan"] == PAN_OTHER
    assert (await PurchasingService.get_vendor(v["vendor_id"], SITE))["gstin"] == GSTIN_OTHER


@pytest.mark.asyncio
async def test_identifiers_are_checked_and_normalised(db):
    v = await _vendor(name="x", pan=PAN_OTHER.lower(), gstin=GSTIN_OTHER.lower())
    assert v["pan"] == PAN_OTHER and v["gstin"] == GSTIN_OTHER
    await _refused(_vendor(name="y", pan="BADPAN"), 422, "PAN")
    await _refused(_vendor(name="y", pan=None, gstin="29AAGCB7383J1ZA"), 422, "GSTIN")
    await _refused(PurchasingService.create_vendor({"name": " "}, SITE, "u"), 422, "name")


@pytest.mark.asyncio
async def test_the_gstin_must_belong_to_the_pan(db):
    await _refused(_vendor(pan=PAN_FIRM, gstin=GSTIN_OTHER), 422, "contains PAN")


@pytest.mark.asyncio
async def test_two_active_vendors_cannot_share_a_pan(db):
    await _vendor()
    await _refused(_vendor(name="Duplicate"), 409, "already holds PAN")


@pytest.mark.asyncio
async def test_msme_needs_a_category_and_a_udyam_number(db):
    await _refused(_vendor(is_msme=True), 422, "msme_category")
    await _refused(_vendor(is_msme=True, msme_category="small", udyam_number="nope"), 422, "Udyam")
    v = await _vendor(is_msme=True, msme_category="Small", udyam_number=UDYAM.lower())
    assert v["msme_category"] == "small" and v["udyam_number"] == UDYAM


@pytest.mark.asyncio
async def test_a_lower_rate_needs_its_certificate(db):
    await _refused(_vendor(lower_rate_pct=1.0), 422, "certificate")


@pytest.mark.asyncio
async def test_an_unknown_tds_section_is_refused(db):
    await _refused(_vendor(default_tds_section="999Z"), 422, "default_tds_section")


@pytest.mark.asyncio
async def test_changing_a_vendors_tax_identity_is_on_the_record(db):
    v = await _vendor()
    await PurchasingService.update_vendor(v["vendor_id"], {"default_tds_section": "194C"}, SITE, "USR-FI")
    entries = await history("vendor", v["vendor_id"], SITE)
    assert len(entries) == 2
    changed = [c for e in entries for c in e.changes if c.field == "default_tds_section"]
    assert any(c.before == "194J" and c.after == "194C" for c in changed)


@pytest.mark.asyncio
async def test_listing_finds_by_name_or_pan(db):
    await _vendor()
    await _vendor(name="Other Co", pan=None, gstin=None)
    assert (await PurchasingService.list_vendors(SITE, "calib"))["total"] == 1
    assert (await PurchasingService.list_vendors(SITE, PAN_OTHER))["total"] == 1
    assert (await PurchasingService.list_vendors(SITE))["total"] == 2


# ------------------------------------------------------------- the bill

@pytest.mark.asyncio
async def test_a_bill_takes_pan_gstin_and_section_from_the_vendor(db):
    v = await _vendor()
    b = await _bill(v["vendor_id"])
    assert b["pan"] == PAN_OTHER and b["gstin"] == GSTIN_OTHER and b["vendor_name"] == v["name"]
    assert b["tds_section"] == "194J" and b["tds_deducted"] == 10000.0
    assert b["igst"] == 18000.0 and b["cgst"] == 0.0        # Karnataka vendor, Maharashtra buyer


@pytest.mark.asyncio
async def test_a_bill_cannot_contradict_the_vendor_record(db):
    v = await _vendor()
    await _refused(_bill(v["vendor_id"], pan="ABCDE1234F"), 409, "vendor record holds")
    await _refused(_bill(v["vendor_id"], gstin="27AAPFU0939F1ZV"), 409, "vendor record holds")
    ok = await _bill(v["vendor_id"], pan=PAN_OTHER.lower())      # the same value is fine
    assert ok["pan"] == PAN_OTHER


@pytest.mark.asyncio
async def test_msme_status_follows_the_vendor_not_the_bill(db):
    v = await _vendor(name="Small Lab", pan=None, gstin=None, is_msme=True,
                      msme_category="micro", udyam_number=UDYAM, default_tds_section="NONE")
    await _refused(_bill(v["vendor_id"], gst_rate_pct=0), 422, "acceptance_date")
    b = await _bill(v["vendor_id"], gst_rate_pct=0, acceptance_date=datetime.now() - timedelta(days=5))
    assert b["is_msme"] and b["msme_category"] == "micro" and b["due_date"] is not None


@pytest.mark.asyncio
async def test_a_lower_deduction_certificate_on_the_vendor_applies(db):
    v = await _vendor(lower_rate_pct=2.0, lower_cert_ref="CERT-1")
    assert (await _bill(v["vendor_id"]))["tds_deducted"] == 2000.0


@pytest.mark.asyncio
async def test_an_inactive_or_unknown_vendor_takes_no_bill(db):
    v = await _vendor()
    await PurchasingService.update_vendor(v["vendor_id"], {"active": False}, SITE, "u")
    await _refused(_bill(v["vendor_id"]), 409, "inactive")
    await _refused(_bill("VND-9999"), 404)


@pytest.mark.asyncio
async def test_a_one_off_bill_still_works_but_needs_a_name(db):
    b = await PurchasingService.create_vendor_payment(
        {"vendor_name": "Walk-in", "taxable_value": 1000, "gst_rate_pct": 0, "tds_section": "NONE"},
        SITE, "u")
    assert b["vendor_id"] is None
    await _refused(PurchasingService.create_vendor_payment(
        {"taxable_value": 1000, "gst_rate_pct": 0}, SITE, "u"), 422, "Name the vendor")


@pytest.mark.asyncio
async def test_the_threshold_counts_bills_to_the_same_vendor_across_the_year(db):
    v = await _vendor(default_tds_section="194J")
    first = await _bill(v["vendor_id"], taxable_value=30000)
    assert first["tds_deducted"] == 0.0                       # below 50,000 for the year
    second = await _bill(v["vendor_id"], taxable_value=30000)
    assert second["tds_deducted"] == 6000.0                   # the bill that crosses carries it all


# ------------------------------------------------------- the creditor ledger

@pytest.mark.asyncio
async def test_a_bill_appears_on_the_ledger_with_its_tax(db):
    v = await _vendor(is_msme=True, msme_category="small", udyam_number=UDYAM)
    b = await _bill(v["vendor_id"], acceptance_date=datetime.now())
    ap = await AccountPayable.find_one({"vp_id": b["vp_id"]})
    assert ap.ap_id.startswith("AP-") and ap.vendor_id == v["vendor_id"]
    assert ap.pan == PAN_OTHER and ap.gstin == GSTIN_OTHER
    assert ap.taxable_value == 100000 and ap.gst_total == 18000.0 and ap.invoice_total == 118000.0
    assert ap.tds_section == "194J" and ap.tds_deducted == 10000.0
    assert ap.amount == ap.balance_amount == 108000.0         # owed to the vendor after TDS
    assert ap.is_msme and ap.msme_category == "small" and ap.msme_due_date is not None


@pytest.mark.asyncio
async def test_ledger_ids_are_sequenced_not_clock_derived(db):
    v = await _vendor()
    a, b = await _bill(v["vendor_id"]), await _bill(v["vendor_id"])
    ids = [r.ap_id for r in await AccountPayable.find({}).to_list()]
    assert len(set(ids)) == 2 and all(i.startswith("AP-") for i in ids)
    manual = await FinanceService.create_ap({"vendor_name": "Manual", "amount": 10}, SITE)
    assert manual.ap_id not in ids


@pytest.mark.asyncio
async def test_a_bill_on_the_ledger_cannot_be_paid_round_the_back(db):
    v = await _vendor()
    b = await _bill(v["vendor_id"])
    ap = await AccountPayable.find_one({"vp_id": b["vp_id"]})
    await _refused(FinanceService.record_ap_disbursement(ap.ap_id, 1.0, "NEFT", "X", SITE), 409, "paid there")


@pytest.mark.asyncio
async def test_paying_the_bill_settles_the_ledger_entry(db):
    v = await _vendor()
    b = await _bill(v["vendor_id"])
    await PurchasingService.approve_vendor_payment(b["vp_id"], {}, SITE, TM)
    await PurchasingService.pay_vendor(b["vp_id"], {"payment_mode": "RTGS", "payment_ref": "R1"}, SITE, FIN)
    ap = await AccountPayable.find_one({"vp_id": b["vp_id"]})
    assert ap.status == "settled" and ap.balance_amount == 0.0
    assert ap.paid_amount == 108000.0 and ap.transaction_ref == "R1" and ap.payment_mode == "RTGS"


@pytest.mark.asyncio
async def test_a_manual_ledger_entry_without_a_bill_is_still_payable(db):
    ap = await FinanceService.create_ap({"vendor_name": "Petty", "amount": 500}, SITE)
    out = await FinanceService.record_ap_disbursement(ap.ap_id, 500.0, "CASH", "T", SITE)
    assert out.status == "settled"
