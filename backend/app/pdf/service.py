import os
import sys
from pathlib import Path

# Ensure macOS dynamic loader finds homebrew-installed pango/cairo/gobject libraries
if sys.platform == "darwin":
    current_fallback = os.environ.get("DYLD_FALLBACK_LIBRARY_PATH", "")
    if "/usr/local/lib" not in current_fallback:
        os.environ["DYLD_FALLBACK_LIBRARY_PATH"] = f"/usr/local/lib:{current_fallback}".strip(":")
from typing import Dict, Any, Optional
from jinja2 import Environment, FileSystemLoader

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
STYLES_DIR = BASE_DIR / "styles"

jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=True,
    trim_blocks=True,
    lstrip_blocks=True,
)

FORM_CONFIGS = {
    "TP02": {
        "template": "tp02.html",
        "stylesheet": "tp02.css",
        "title": "FLASH INSPECTION REPORT",
        "form_code": "IQE-TP-02",
    },
    "TP03": {
        "template": "tp03.html",
        "stylesheet": "tp03.css",
        "title": "INSPECTION VISIT REPORT",
        "form_code": "IQE-TP-03",
    },
    "TP04": {
        "template": "tp04.html",
        "stylesheet": "tp04.css",
        "title": "INSPECTION RELEASE NOTE",
        "form_code": "IQE-TP-04",
    },
    "TP05": {
        "template": "tp05.html",
        "stylesheet": "tp05.css",
        "title": "EXPEDITING VISIT REPORT",
        "form_code": "IQE-TP-05",
    },
    "FBILL01": {
        "template": "fbill01.html",
        "stylesheet": "fbill01.css",
        "title": "TPI BILL VERIFICATION REPORT",
        "form_code": "F-BILL-01",
    },
    "FQUAL01": {
        "template": "fqual01.html",
        "stylesheet": "fqual01.css",
        "title": "QUANTITY VERIFICATION & SURVEY REPORT",
        "form_code": "F-QUAL-01",
    },
    "FBOQ01": {
        "template": "fboq01.html",
        "stylesheet": "fboq01.css",
        "title": "BOQ RECONCILIATION & MATERIAL AUDIT REPORT",
        "form_code": "F-BOQ-01",
    },
}

def normalize_form_code(form_code: str) -> str:
    cleaned = form_code.upper().replace(".PDF", "").replace("_", "").replace("-", "").strip()
    if cleaned.startswith("IQE"):
        cleaned = cleaned[3:]
    return cleaned

def render_html(form_code: str, payload: Dict[str, Any], is_blank: bool = False, is_draft: bool = False) -> str:
    code = normalize_form_code(form_code)
    cfg = FORM_CONFIGS.get(code)
    if not cfg:
        raise ValueError(f"Unknown form code: {form_code}")

    template = jinja_env.get_template(cfg["template"])
    context = dict(payload)
    for key in [
        "signatures", "activities", "immediate_action", "basis_of_release",
        "traceability", "dispatch_instructions", "progress_status", "schedule_assessment"
    ]:
        context.setdefault(key, {})
    for key in [
        "photos", "items", "findings", "punch_list", "documents_reviewed",
        "scope_activities", "instruments", "attachments", "report_refs",
        "deviation_refs", "release_items", "actions", "personnel",
        "documentation", "sub_orders", "manufacturing_status", "inspection_status"
    ]:
        context.setdefault(key, [])

    context["form_code"] = cfg["form_code"]
    context["title"] = cfg["title"]
    context["stylesheet_url"] = f"../styles/{cfg['stylesheet']}"
    context["is_blank"] = is_blank
    context["is_draft"] = is_draft

    return template.render(**context)

def render_pdf(form_code: str, payload: Optional[Dict[str, Any]] = None, is_blank: bool = False, is_draft: bool = False) -> bytes:
    try:
        import weasyprint
    except Exception as e:
        raise RuntimeError(f"WeasyPrint is not available: {e}")

    code = normalize_form_code(form_code)
    cfg = FORM_CONFIGS.get(code)
    if not cfg:
        raise ValueError(f"Unknown form code: {form_code}")

    data = payload or {}
    html_content = render_html(code, data, is_blank=is_blank, is_draft=is_draft)

    base_url = str(TEMPLATES_DIR)
    html = weasyprint.HTML(string=html_content, base_url=base_url)
    return html.write_pdf()
