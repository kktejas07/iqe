"""Quotation approval limits.

The workflow has the Regional Head approve quotations within a limit and the
MD approve above it. The document gives no amounts, and the amounts are IQE's
decision, so they are data an authorised person sets, never constants in code.

Append-only: changing a limit supersedes the old one and keeps it. "What was
the RH's limit when this quotation was approved?" is a question that gets
asked, and a limit that is overwritten cannot answer it.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import Field


class Level(str, Enum):
    RH = "RH"   # Regional Head, for their own region
    MD = "MD"   # Managing Director


class LimitStatus(str, Enum):
    ACTIVE = "active"
    SUPERSEDED = "superseded"


class ApprovalLimit(Document):
    limit_id: str                       # LIM-YYYY-NNNN
    site_id: str = "SITE-01"
    level: str                          # Level
    max_value: float                    # quotations up to and including this
    currency: str = "INR"
    status: str = LimitStatus.ACTIVE.value
    reason: str                         # why it was set or changed
    set_by: str
    set_on: datetime = Field(default_factory=datetime.now)
    superseded_on: Optional[datetime] = None
    superseded_by_limit_id: Optional[str] = None

    class Settings:
        name = "approval_limits"
        indexes = ["site_id", "level", "status", "limit_id"]
