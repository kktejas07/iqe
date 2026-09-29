import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings
from core.cache import close_redis

from modules.auth.models import UserLogin
from modules.clients.models import Client, ClientUnit
from modules.manufacturers.models import Manufacturer, ManufacturerUnit
from modules.users.models import Competency, InspectorRate, Associate
from modules.jobs.models import Job
from modules.service_orders.models import ServiceOrder
from modules.control_numbers.models import ControlNumber
from modules.visits.models import Visit, ManufacturerVisitLocation
from modules.invoices.models import Invoice
from modules.purchase_orders.models import PurchaseOrder
from modules.payments.models import Payment
from modules.enquiries.models import Enquiry
from modules.complaints.models import CustomerComplaint
from modules.documents.models import Document as DocModel
from modules.analytics.models import AnalyticsEvent

from modules.auth.routes import router as auth_router
from modules.clients.routes import router as clients_router
from modules.manufacturers.routes import router as manufacturers_router
from modules.users.routes import router as users_router
from modules.jobs.routes import router as jobs_router
from modules.service_orders.routes import router as service_orders_router
from modules.control_numbers.routes import router as control_numbers_router
from modules.visits.routes import router as visits_router
from modules.invoices.routes import router as invoices_router
from modules.purchase_orders.routes import router as purchase_orders_router
from modules.payments.routes import router as payments_router
from modules.enquiries.routes import router as enquiries_router
from modules.complaints.routes import router as complaints_router
from modules.documents.routes import router as documents_router
from modules.reports.routes import router as reports_router
from modules.masters.routes import router as masters_router
from modules.file_upload.routes import router as file_upload_router
from modules.dashboard.routes import router as dashboard_router
from modules.ai.routes import router as ai_router
from modules.analytics.routes import router as analytics_router


from modules.finance.models import AccountReceivable, AccountPayable
from modules.finance.routes import router as finance_router
from modules.construction_bill_verification.models import ConstructionBillVerificationRecord
from modules.construction_bill_verification.routes import router as construction_bill_verification_router
from modules.schedule_m_pharma_epc.models import ScheduleMPharmaEPCProject
from modules.schedule_m_pharma_epc.routes import router as schedule_m_pharma_epc_router
from modules.tpi.models import TpiReport
from modules.tpi.routes import router as tpi_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = AsyncIOMotorClient(settings.mongodb_url)
    await init_beanie(
        database=client[settings.mongodb_db_name],
        document_models=[
            UserLogin, Client, ClientUnit, Manufacturer, ManufacturerUnit,
            Competency, InspectorRate, Associate, Job, ServiceOrder,
            ControlNumber, Visit, ManufacturerVisitLocation, Invoice,
            PurchaseOrder, Payment, Enquiry, CustomerComplaint, DocModel,
            AnalyticsEvent, AccountReceivable, AccountPayable, ConstructionBillVerificationRecord,
            ScheduleMPharmaEPCProject, TpiReport
        ],
    )
    yield
    await close_redis()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Filter out '*' if credentials are true to satisfy CORS specification across browsers
sanitized_origins = [o for o in settings.allowed_origins if o != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=sanitized_origins if sanitized_origins else ["*"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cross-platform static files mount for uploads
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/files/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

MEDIA_DIR = Path(__file__).resolve().parent / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

app.include_router(auth_router, prefix="/api/v1")
app.include_router(clients_router, prefix="/api/v1")
app.include_router(manufacturers_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(jobs_router, prefix="/api/v1")
app.include_router(service_orders_router, prefix="/api/v1")
app.include_router(control_numbers_router, prefix="/api/v1")
app.include_router(visits_router, prefix="/api/v1")
app.include_router(invoices_router, prefix="/api/v1")
app.include_router(purchase_orders_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(enquiries_router, prefix="/api/v1")
app.include_router(complaints_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(masters_router, prefix="/api/v1")
app.include_router(file_upload_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(finance_router, prefix="/api/v1")
app.include_router(construction_bill_verification_router, prefix="/api/v1")
app.include_router(schedule_m_pharma_epc_router, prefix="/api/v1")
app.include_router(tpi_router)



@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name, "platform": sys.platform}


def main():
    """Cross-platform entry point to run server via python main.py"""
    import uvicorn

    # Windows-specific asyncio event loop policy fix to prevent WinError 995 / shutdown crash
    if sys.platform == "win32":
        import asyncio
        try:
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        except Exception:
            pass

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "true").lower() in ("true", "1", "yes")

    print(f"Starting IQEApp Backend on http://{host}:{port} (OS: {sys.platform}, Reload: {reload})...")
    uvicorn.run("main:app", host=host, port=port, reload=reload)


if __name__ == "__main__":
    main()
