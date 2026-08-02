from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
        ],
    )
    yield
    await close_redis()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
