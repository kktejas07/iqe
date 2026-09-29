# Ideal Quality Engineers (I) Pvt. Ltd. (IQE) — Third-Party Inspection (TPI) Forms Module

This module implements the end-to-end lifecycle and pixel-matched PDF generation for the four controlled inspection documents of Ideal Quality Engineers (I) Pvt. Ltd.:

| Form No. | Form Title | Subtitle | Header Sub-line | Pages |
|---|---|---|---|---|
| **IQE-TP-02** | FLASH INSPECTION REPORT | Preliminary communication of inspection outcome and key observations | Third Party Inspection Services | 2 |
| **IQE-TP-03** | INSPECTION VISIT REPORT | Issued by Ideal Quality Engineers (I) Pvt. Ltd. | Third Party Inspection Services | 3 |
| **IQE-TP-04** | INSPECTION RELEASE NOTE (IRN) | Formal release of inspected items for dispatch, subject to the conditions stated herein. | Third Party Inspection Services | 2 |
| **IQE-TP-05** | EXPEDITING VISIT REPORT | Supplier progress, schedule, materials, manufacturing and action follow-up report | Third Party Inspection & Expediting Services | 3 |

---

## 1. Design & PDF Specifications

- **Page Size**: US Letter (8.5 in × 11.0 in, 612 pt × 792 pt portrait).
- **Margins**:
  - `TP-02`: 0.45 in all sides.
  - `TP-03`: 0.55 in all sides.
  - `TP-04` & `TP-05`: 0.55 in top/bottom, 0.50 in left/right.
- **Typography**:
  - Base body font: **Arial** embedded via `@font-face` from `backend/app/pdf/fonts/`.
  - Checkbox glyphs (`☐` U+2610, `☒` U+2612) rendered via **DejaVu Sans** fallback to eliminate tofu characters.
  - Form font sizes: TP-02 (7 pt), TP-03 (8.5 pt), TP-04 (8 pt), TP-05 (7.5 pt).
  - Section headings: Arial Bold `#365F91`, uppercase, with `page-break-after: avoid`.
- **Table Grid**:
  - 0.5 pt solid black borders (`#000000`).
  - Label cells / header rows shaded with `#D9E2F3` light blue.
  - Cell padding: 0 top/bottom, 0.075 in left/right.
- **Running Headers & Footers**:
  - Full-width two-column table running header on every page.
  - Dynamic page counter: `IQE-TP-0X | Rev. 00 | Controlled Document | Page N of M`.

---

## 2. Running Locally

### Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run database seed
PYTHONPATH=. python seed_tpi_samples.py

# Start uvicorn server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (Next.js)
```bash
cd apps/web
npm install
npm run dev
```

---

## 3. Running Acceptance Tests

Run the full pytest suite covering business logic, validation rules, and PDF acceptance:
```bash
cd backend
PYTHONPATH=. pytest tests/test_tpi_business_logic.py tests/test_tpi_pdf_acceptance.py -v
```

### Regenerating Reference Images for Visual Regression
To rasterize PDFs at 100 DPI for comparison:
```bash
python -c '
import pymupdf

forms = ["TP02", "TP03", "TP04", "TP05"]
for code in forms:
    doc = pymupdf.open(f"tests/reference/IQE-{code[:2]}-{code[2:]}_*.pdf")
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=100)
        pix.save(f"tests/reference/{code}_page_{i+1}.png")
'
```

---

## 4. Docker Deployment

A production-ready Dockerfile is provided in `backend/Dockerfile` with all required C libraries (`libpango`, `libcairo`, `libgdk-pixbuf`) and embedded fonts (`fonts-dejavu-core`, `fonts-liberation`, `fontconfig`):

```bash
cd backend
docker build -t iqe-backend:latest .
docker run -p 8000:8000 iqe-backend:latest
```
