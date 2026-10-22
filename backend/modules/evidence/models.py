"""Evidence: the files that back an inspection.

Every report format declares a `photographs` section and the work type
catalogue sets `requires_photos`, but nothing linked an uploaded file to a work
package or a certification - so reports rendered with empty photo grids and the
field workflow had nowhere to put what it captured.

An inspection body's evidence has requirements beyond "a file was uploaded":

* It must be attributable - who captured it, when, at which stage of the work.
* It must be tamper-evident. A SHA-256 of the content is stored so a file can
  be shown to be the one that was captured, not a later substitution. This is
  not DRM; it is the difference between "here is a photo" and "here is the
  photo that was taken on the day".
* It must be removable without being erased. Evidence is withdrawn with a
  reason and stays in the record, because deleting the photo that contradicted
  a conclusion is exactly what an assessor is looking for.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import Field


class EvidenceKind(str, Enum):
    PHOTO = "PHOTO"                  # site or material photograph
    DOCUMENT = "DOCUMENT"            # MTC, drawing, test certificate
    MEASUREMENT = "MEASUREMENT"      # joint measurement sheet, survey data
    SIGNATURE = "SIGNATURE"          # a signed acceptance
    VIDEO = "VIDEO"
    OTHER = "OTHER"


class EvidenceStatus(str, Enum):
    ACTIVE = "ACTIVE"
    WITHDRAWN = "WITHDRAWN"          # superseded or captured in error


class Evidence(Document):
    evidence_id: str
    site_id: str = "SITE-01"

    #: What this evidence belongs to. Mirrors the audit trail's addressing, so
    #: one model serves work packages, certifications and visits rather than
    #: three near-identical ones.
    entity_type: str                 # work_package | certification | visit | job
    entity_id: str
    job_id: Optional[str] = None     # denormalised so a job's evidence is one query

    kind: str = EvidenceKind.PHOTO.value
    #: Which declared report section this belongs under, so the renderer can
    #: place it without the capturer having to know the template.
    section: Optional[str] = None

    filename: str
    stored_path: str                 # relative to the uploads root
    content_type: str
    size_bytes: int
    sha256: str                      # integrity, not security

    caption: Optional[str] = None
    captured_at: Optional[datetime] = None     # when the photo was taken
    captured_by_person_id: Optional[str] = None
    location: Optional[str] = None

    status: str = EvidenceStatus.ACTIVE.value
    withdrawn_reason: Optional[str] = None
    withdrawn_by: Optional[str] = None
    withdrawn_at: Optional[datetime] = None

    uploaded_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "evidence"
        indexes = ["site_id", "entity_type", "entity_id", "job_id", "status", "evidence_id"]
