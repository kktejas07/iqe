"""GST, TDS and MSME rules for paying vendors.

Pure functions, so the rules can be read and tested without a database.

**These tables are tax law as at the date below and are data, not truth.**
Rates and thresholds change with each Finance Act, and from 1 April 2026 the
Income-tax Act 2025 renumbers the sections (194C/194J become s.393 table
entries). Have IQE's accountant confirm them before relying on a payment run;
change them here, in one place, when they move.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException

RULES_AS_OF = "FY 2026-27 (Income-tax Act 2025 from 1 April 2026) - confirm with your accountant"

# ---------------------------------------------------------------- identity

_PAN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
_GSTIN = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
_UDYAM = re.compile(r"^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$")
_CH = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def valid_pan(pan: Optional[str]) -> bool:
    return bool(pan) and bool(_PAN.match(pan.strip().upper()))


def valid_gstin(g: Optional[str]) -> bool:
    if not g:
        return False
    g = g.strip().upper()
    if not _GSTIN.match(g):
        return False
    total = 0
    for i, c in enumerate(g[:14]):
        p = _CH.index(c) * (2 if i % 2 else 1)
        total += p // 36 + p % 36
    return _CH[(36 - total % 36) % 36] == g[14]


def valid_udyam(u: Optional[str]) -> bool:
    return bool(u) and bool(_UDYAM.match(u.strip().upper()))


# --------------------------------------------------------------------- GST

def gst_split(taxable: float, rate_pct: float, vendor_gstin: Optional[str],
              iqe_gstin: Optional[str], *, reverse_charge: bool = False) -> dict:
    """CGST+SGST within the state, IGST across states."""
    if rate_pct < 0 or rate_pct > 40:
        raise HTTPException(422, "gst_rate_pct is outside any GST rate")
    if rate_pct == 0:
        return {"cgst": 0.0, "sgst": 0.0, "igst": 0.0, "gst_total": 0.0, "supply": "NIL"}
    if not valid_gstin(vendor_gstin):
        raise HTTPException(
            422, "A vendor charging GST needs a valid GSTIN (15 characters with a correct check digit). "
                 "Set gst_rate_pct to 0 for an unregistered vendor.")
    if not iqe_gstin or not valid_gstin(iqe_gstin):
        raise HTTPException(
            422, "IQE's own GSTIN is not configured (IQE_GSTIN), so the tax heads cannot be decided.")
    tax = round(taxable * rate_pct / 100, 2)
    if reverse_charge:
        # Payable by IQE itself, not added to what the vendor is paid.
        pass
    if vendor_gstin.strip().upper()[:2] == iqe_gstin.strip().upper()[:2]:
        half = round(tax / 2, 2)
        return {"cgst": half, "sgst": round(tax - half, 2), "igst": 0.0, "gst_total": tax, "supply": "INTRA"}
    return {"cgst": 0.0, "sgst": 0.0, "igst": tax, "gst_total": tax, "supply": "INTER"}


# --------------------------------------------------------------------- TDS

#: section -> (rate for individual/HUF %, rate for others %, annual threshold, single-payment threshold)
TDS_SECTIONS = {
    "194C":          (1.0, 2.0, 100000.0, 30000.0),     # contractors
    "194J":          (10.0, 10.0, 50000.0, None),       # professional fees
    "194J_TECH":     (2.0, 2.0, 50000.0, None),         # technical services
    "194H":          (2.0, 2.0, 20000.0, None),         # commission / brokerage
}
NO_PAN_RATE = 20.0   # higher of this and the normal rate (s.206AA / its 2025 Act equivalent)


def payee_is_individual(pan: Optional[str]) -> bool:
    return valid_pan(pan) and pan.strip().upper()[3] in ("P", "H")   # person / HUF


def financial_year(d: datetime) -> tuple[datetime, datetime]:
    start_year = d.year if d.month >= 4 else d.year - 1
    return datetime(start_year, 4, 1), datetime(start_year + 1, 4, 1)


def tds_for(section: Optional[str], taxable: float, pan: Optional[str], *,
            prior_in_fy: float = 0.0, prior_tds_in_fy: float = 0.0,
            lower_rate_pct: Optional[float] = None,
            lower_cert_ref: Optional[str] = None) -> dict:
    """What to deduct from this payment.

    Deducted on the taxable value, not on GST charged separately. Below the
    threshold nothing is deducted; the payment that crosses it carries the TDS
    on everything not yet deducted, so the total deducted is right for the year.
    """
    if not section or section.upper() == "NONE":
        return {"section": None, "rate_pct": 0.0, "tds": 0.0, "reason": "no TDS section applies"}
    section = section.upper()
    if section not in TDS_SECTIONS:
        raise HTTPException(
            422, f"tds_section must be one of {', '.join(TDS_SECTIONS)} (or NONE); got {section}")
    ind, other, annual, single = TDS_SECTIONS[section]
    rate = ind if payee_is_individual(pan) else other
    note = None
    if not valid_pan(pan):
        rate = max(rate, NO_PAN_RATE)
        note = "no valid PAN: deducted at the higher rate"
    if lower_rate_pct is not None:
        if not (lower_cert_ref or "").strip():
            raise HTTPException(422, "A lower deduction rate needs the certificate reference")
        rate = float(lower_rate_pct)
        note = f"lower deduction certificate {lower_cert_ref}"

    crossing = (prior_in_fy + taxable) > annual or (single is not None and taxable > single)
    if not crossing:
        return {"section": section, "rate_pct": rate, "tds": 0.0,
                "reason": f"below the {annual:,.0f} threshold for the year", "note": note}
    base = taxable + max(prior_in_fy, 0.0)
    tds = round(base * rate / 100 - prior_tds_in_fy, 2)
    return {"section": section, "rate_pct": rate, "tds": max(tds, 0.0),
            "reason": None, "note": note, "base": round(base, 2)}


def tds_deposit_due(paid_on: datetime) -> datetime:
    """7th of the month after deduction; 30 April for March."""
    if paid_on.month == 3:
        return datetime(paid_on.year, 4, 30)
    nxt = paid_on.month + 1 if paid_on.month < 12 else 1
    year = paid_on.year if paid_on.month < 12 else paid_on.year + 1
    return datetime(year, nxt, 7)


# -------------------------------------------------------------------- MSME

def msme_due_date(acceptance: datetime, written_agreement_days: Optional[int]) -> datetime:
    """MSMED Act s.15: within the agreed time, never beyond 45 days from
    acceptance; with no written agreement, 15 days."""
    if written_agreement_days is None:
        days = 15
    else:
        days = min(int(written_agreement_days), 45)
        if days <= 0:
            days = 15
    return acceptance + timedelta(days=days)


def msme_interest(principal: float, due: datetime, paid_on: datetime,
                  bank_rate_pct: Optional[float]) -> dict:
    """s.16: three times the RBI bank rate, compounded with monthly rests."""
    late_days = max((paid_on.date() - due.date()).days, 0)
    if late_days == 0:
        return {"late_days": 0, "interest": 0.0, "rate_pct": None}
    if bank_rate_pct is None:
        return {"late_days": late_days, "interest": None, "rate_pct": None,
                "note": "RBI bank rate (RBI_BANK_RATE_PCT) is not configured; interest not computed"}
    annual = 3 * bank_rate_pct / 100
    months = late_days / 30.4167
    interest = round(principal * ((1 + annual / 12) ** months - 1), 2)
    return {"late_days": late_days, "interest": interest, "rate_pct": round(3 * bank_rate_pct, 2)}
