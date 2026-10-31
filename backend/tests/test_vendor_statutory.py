"""Vendor bills: GST, TDS and the MSMED Act 45 days, computed not typed.

Before: TDS was whatever the caller typed, with 194J as the default; there
was no GST at all; the MSME check measured 45 days from the due date instead
of from acceptance; and a vendor payment could be paid without approval, by
the person who approved it, twice.
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

from core.audit import AuditEntry  # noqa: E402
from core.config import settings  # noqa: E402
from core.sequences import Sequence  # noqa: E402
from modules.auth.models import UserLogin  # noqa: E402
from modules.purchasing import statutory as st  # noqa: E402
from modules.finance.models import AccountPayable  # noqa: E402
from modules.purchasing.models import Vendor, VendorPayment  # noqa: E402
from modules.purchasing.service import PurchasingService  # noqa: E402

SITE = "SITE-01"
IQE_GSTIN = "27AAPFU0939F1ZV"        # Maharashtra, valid check digit
SAME_STATE = "27AAPFU0939F1ZV"
OTHER_STATE = "29AAGCB7383J1Z4"      # Karnataka
PAN_COMPANY = "ABCCE1234F"           # 4th letter C: company
PAN_PERSON = "ABCPE1234F"            # 4th letter P: individual

MD = {"user_id": "USR-MD", "role_id": 1}
TM = {"user_id": "USR-TM", "role_id": 7}
FIN = {"user_id": "USR-FI", "role_id": 6}


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
    await init_beanie(database=c["vendor_stat"],
                      document_models=[VendorPayment, Vendor, AccountPayable, UserLogin, AuditEntry, Sequence])
    yield c


async def _bill(**kw):
    data = {"vendor_name": "Acme", "taxable_value": 100000, "pan": PAN_COMPANY,
            "gst_rate_pct": 18, "gstin": SAME_STATE, "tds_section": "194J", **kw}
    return await PurchasingService.create_vendor_payment(data, SITE, "USR-ENTRY")


async def _refused(coro, status=None, text=None):
    with pytest.raises(HTTPException) as e:
        await coro
    if status:
        assert e.value.status_code == status, e.value.detail
    if text:
        assert text in e.value.detail, e.value.detail
    return e.value


# ------------------------------------------------------------- identity

def test_identity_checks():
    assert st.valid_gstin(SAME_STATE) and not st.valid_gstin("27AAPFU0939F1ZA")
    assert not st.valid_gstin(None) and not st.valid_gstin("short")
    assert st.valid_pan("ABCDE1234F") and not st.valid_pan("ABCDE12345")
    assert st.valid_udyam("UDYAM-TS-00-0012345") and not st.valid_udyam("UDYAM-TS-0012345")


# ------------------------------------------------------------------ GST

@pytest.mark.asyncio
async def test_gst_is_split_by_state_and_added_to_the_invoice(db):
    intra = await _bill()
    assert (intra["cgst"], intra["sgst"], intra["igst"]) == (9000.0, 9000.0, 0.0)
    assert intra["amount"] == 118000.0
    inter = await _bill(gstin=OTHER_STATE, vendor_name="Beta")
    assert (inter["cgst"], inter["sgst"], inter["igst"]) == (0.0, 0.0, 18000.0)


@pytest.mark.asyncio
async def test_gst_needs_a_valid_vendor_gstin_and_iqes_own(db, monkeypatch):
    await _refused(_bill(gstin="27AAPFU0939F1ZA"), 422, "GSTIN")
    await _refused(_bill(gstin=None), 422, "GSTIN")
    unregistered = await _bill(gst_rate_pct=0, gstin=None, vendor_name="Small")
    assert unregistered["gst_total"] == 0.0 and unregistered["amount"] == 100000.0
    monkeypatch.setattr(settings, "iqe_gstin", None)
    await _refused(_bill(vendor_name="X"), 422, "IQE_GSTIN")


@pytest.mark.asyncio
async def test_reverse_charge_gst_is_not_paid_to_the_vendor(db):
    v = await _bill(reverse_charge=True)
    assert v["amount"] == 100000.0 and v["gst_total"] == 18000.0


# ------------------------------------------------------------------ TDS

@pytest.mark.asyncio
async def test_tds_is_computed_on_the_taxable_value_not_the_gst(db):
    v = await _bill()
    assert v["tds_deducted"] == 10000.0          # 10% of 100,000, not of 118,000
    assert v["net_payable"] == 108000.0           # 118,000 - 10,000


@pytest.mark.asyncio
async def test_a_typed_tds_amount_that_differs_is_refused(db):
    await _refused(_bill(tds_deducted=500), 409, "computed, not typed")
    ok = await _bill(tds_deducted=10000, vendor_name="Right")
    assert ok["tds_deducted"] == 10000.0


@pytest.mark.asyncio
async def test_rate_follows_section_and_payee_type(db):
    person = await _bill(tds_section="194C", pan=PAN_PERSON, taxable_value=200000, vendor_name="P")
    company = await _bill(tds_section="194C", pan=PAN_COMPANY, taxable_value=200000, vendor_name="C")
    assert person["tds_rate_pct"] == 1.0 and company["tds_rate_pct"] == 2.0
    tech = await _bill(tds_section="194J_TECH", vendor_name="T")
    assert tech["tds_rate_pct"] == 2.0
    await _refused(_bill(tds_section="999Z", vendor_name="Z"), 422, "tds_section")


@pytest.mark.asyncio
async def test_no_pan_means_the_higher_rate(db):
    v = await _bill(pan=None, tds_section="194C", taxable_value=200000, vendor_name="NoPan")
    assert v["tds_rate_pct"] == 20.0 and v["tds_deducted"] == 40000.0
    await _refused(_bill(pan="BADPAN"), 422, "PAN")


@pytest.mark.asyncio
async def test_below_the_threshold_nothing_is_deducted_then_the_crossing_catches_up(db):
    a = await _bill(taxable_value=30000, gst_rate_pct=0, gstin=None)      # 194J threshold 50,000
    assert a["tds_deducted"] == 0.0
    b = await _bill(taxable_value=30000, gst_rate_pct=0, gstin=None)      # cumulative 60,000 crosses
    assert b["tds_deducted"] == 6000.0     # 10% of all 60,000, so the year's total is right


@pytest.mark.asyncio
async def test_lower_deduction_certificate_needs_a_reference(db):
    await _refused(_bill(lower_rate_pct=1), 422, "certificate")
    v = await _bill(lower_rate_pct=1, lower_cert_ref="CERT-9", vendor_name="L")
    assert v["tds_deducted"] == 1000.0


def test_deposit_due_dates():
    assert st.tds_deposit_due(datetime(2026, 10, 20)) == datetime(2026, 11, 7)
    assert st.tds_deposit_due(datetime(2026, 12, 3)) == datetime(2027, 1, 7)
    assert st.tds_deposit_due(datetime(2027, 3, 31)) == datetime(2027, 4, 30)


# ----------------------------------------------------------------- MSME

def test_msme_due_date_rules():
    acc = datetime(2026, 10, 1)
    assert st.msme_due_date(acc, None) == acc + timedelta(days=15)      # no written agreement
    assert st.msme_due_date(acc, 30) == acc + timedelta(days=30)
    assert st.msme_due_date(acc, 90) == acc + timedelta(days=45)        # never beyond 45


@pytest.mark.asyncio
async def test_msme_bills_carry_their_statutory_due_date(db):
    acc = datetime.now() - timedelta(days=10)
    base = {"is_msme": True, "msme_category": "micro", "udyam_number": "UDYAM-TS-00-0012345"}
    await _refused(_bill(**base), 422, "acceptance_date")
    await _refused(_bill(**{**base, "udyam_number": "bad", "acceptance_date": acc}), 422, "Udyam")
    await _refused(_bill(**{**base, "msme_category": "huge", "acceptance_date": acc}), 422, "msme_category")
    v = await _bill(**base, acceptance_date=acc, written_agreement_days=90)
    assert (v["due_date"] - acc).days == 45


async def _approved(vp_id):
    await PurchasingService.approve_vendor_payment(vp_id, {}, SITE, TM)


@pytest.mark.asyncio
async def test_late_msme_payment_is_flagged_with_compound_interest(db):
    acc = datetime.now() - timedelta(days=75)       # due 30 days ago on a 45-day term
    v = await _bill(is_msme=True, msme_category="small", udyam_number="UDYAM-TS-00-0012345",
                    acceptance_date=acc, written_agreement_days=45, vendor_name="MSME")
    await _approved(v["vp_id"])
    paid = await PurchasingService.pay_vendor(v["vp_id"], {}, SITE, FIN)
    assert paid["msme_45day_compliant"] is False and paid["msme_late_days"] in (29, 30, 31)
    assert paid["msme_interest"] and paid["msme_interest"] > 0
    # 3 x 6% = 18% a year, monthly rests, about one month late on 118,000
    assert 1500 < paid["msme_interest"] < 1900


@pytest.mark.asyncio
async def test_on_time_msme_payment_is_compliant_and_medium_is_outside_the_act(db):
    acc = datetime.now() - timedelta(days=5)
    ok = await _bill(is_msme=True, msme_category="micro", udyam_number="UDYAM-TS-00-0012345",
                     acceptance_date=acc, vendor_name="A")
    await _approved(ok["vp_id"])
    paid = await PurchasingService.pay_vendor(ok["vp_id"], {}, SITE, FIN)
    assert paid["msme_45day_compliant"] is True and paid["msme_interest"] == 0.0

    med = await _bill(is_msme=True, msme_category="medium", udyam_number="UDYAM-TS-00-0012346",
                      vendor_name="M")
    assert med["due_date"] is None            # the Act's limits do not apply to medium


@pytest.mark.asyncio
async def test_interest_is_not_invented_when_the_bank_rate_is_not_set(db, monkeypatch):
    monkeypatch.setattr(settings, "rbi_bank_rate_pct", None)
    acc = datetime.now() - timedelta(days=80)
    v = await _bill(is_msme=True, msme_category="micro", udyam_number="UDYAM-TS-00-0012345",
                    acceptance_date=acc, vendor_name="N")
    await _approved(v["vp_id"])
    paid = await PurchasingService.pay_vendor(v["vp_id"], {}, SITE, FIN)
    assert paid["msme_45day_compliant"] is False and paid["msme_interest"] is None
    assert "RBI_BANK_RATE_PCT" in paid["msme_interest_note"]


# --------------------------------------------------------- the payment path

@pytest.mark.asyncio
async def test_payment_needs_approval_by_someone_else_and_cannot_repeat(db):
    v = await _bill(vendor_name="Flow")
    await _refused(PurchasingService.pay_vendor(v["vp_id"], {}, SITE, FIN), 409, "approved first")
    await _refused(PurchasingService.approve_vendor_payment(v["vp_id"], {}, SITE, FIN), 403)  # not TM/MD
    # the person who entered it cannot approve it
    await _refused(PurchasingService.approve_vendor_payment(
        v["vp_id"], {}, SITE, {"user_id": "USR-ENTRY", "role_id": 1}), 403, "entered")
    await PurchasingService.approve_vendor_payment(v["vp_id"], {"tm_approved_by": "someone else"}, SITE, TM)
    row = await VendorPayment.find_one({"vp_id": v["vp_id"]})
    assert row.tm_approved_by == "USR-TM"                  # not the name in the request
    await _refused(PurchasingService.pay_vendor(v["vp_id"], {}, SITE, TM), 403, "different person")
    paid = await PurchasingService.pay_vendor(v["vp_id"], {}, SITE, FIN)
    assert paid["status"] == "paid" and paid["tds_deposit_due"] is not None
    await _refused(PurchasingService.pay_vendor(v["vp_id"], {}, SITE, FIN), 409, "already")


@pytest.mark.asyncio
async def test_ids_are_sequenced_not_counted(db):
    ids = {(await _bill(vendor_name=f"V{i}"))["vp_id"] for i in range(3)}
    assert len(ids) == 3
