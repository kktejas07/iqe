from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from beanie import Document
from pydantic import BaseModel, Field


class StepRecord(BaseModel):
    code: str
    status: str = "pending"            # pending | done
    completed_by: Optional[str] = None
    completed_on: Optional[datetime] = None
    data: dict[str, Any] = {}
    updates: list[dict[str, Any]] = []  # repeatable steps (progress updates)


class Engagement(Document):
    engagement_id: str                 # ENG-YYYY-NNNN
    site_id: str = "SITE-01"
    job_id: str
    service_line: str
    client_id: Optional[str] = None
    steps: list[StepRecord] = []
    #: People bound to this engagement by its authorise / supervise steps.
    authorised_person_id: Optional[str] = None
    provider_id: Optional[str] = None
    #: Set by the independence check: only an appraisal may go ahead when the
    #: item is one IQE inspects.
    permitted_engagement: Optional[str] = None
    status: str = "open"               # open | closed | blocked
    closed_on: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "engagements"
        indexes = ["site_id", "job_id", "service_line", "engagement_id"]
