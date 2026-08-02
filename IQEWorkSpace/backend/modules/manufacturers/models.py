from typing import Optional
from datetime import datetime
from beanie import Document


class ManufacturerUnit(Document):
    manufacturer_unit_id: str
    manufacturer_id: str
    site_id: str
    name: str
    phone: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True
    created_at: datetime = datetime.now()

    class Settings:
        name = "manufacturer_units"


class Manufacturer(Document):
    manufacturer_id: str
    site_id: str
    name: str
    code: Optional[str] = None
    contact_number: Optional[str] = None
    gst: Optional[str] = None
    sgst: float = 0.0
    cgst: float = 0.0
    igst: float = 0.0
    is_sez: bool = False
    is_overseas: bool = False
    total_units: int = 0
    is_active: bool = True
    created_at: datetime = datetime.now()

    class Settings:
        name = "manufacturers"
