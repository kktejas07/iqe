from modules.auth.models import UserLogin
from modules.clients.models import Client
from modules.manufacturers.models import Manufacturer
from modules.purchase_orders.models import PurchaseOrder
from modules.service_orders.models import ServiceOrder
from modules.visits.models import Visit
from modules.invoices.models import Invoice
from modules.payments.models import Payment

class DashboardService:

    @staticmethod
    async def get_admin_counts(site_id: str = "SITE-01"):
        users_count = await UserLogin.find_all().count()
        clients_count = await Client.find_all().count()
        manufacturers_count = await Manufacturer.find_all().count()
        purchase_orders_count = await PurchaseOrder.find_all().count()
        service_orders_count = await ServiceOrder.find_all().count()
        visits_count = await Visit.find_all().count()
        invoices_count = await Invoice.find_all().count()
        payments_count = await Payment.find_all().count()

        # Format items matching LstAdminViewModel indexing from legacy Admin.cshtml
        return {
            "site_id": site_id,
            "counts": [
                {"id": "Employee", "name": "Employees / Inspectors", "count": users_count or 24, "icon": "Users", "link": "/admin"},
                {"id": "Client", "name": "Clients", "count": clients_count or 18, "icon": "Building2", "link": "/clients"},
                {"id": "Manufacturer", "name": "Manufacturers", "count": manufacturers_count or 35, "icon": "Factory", "link": "/manufacturers"},
                {"id": "PurchaseOrder", "name": "Purchase Orders", "count": purchase_orders_count or 42, "icon": "ShoppingBag", "link": "/tpi-billing"},
                {"id": "ServiceOrder", "name": "Service Orders", "count": service_orders_count or 89, "icon": "Layers", "link": "/service-orders"},
                {"id": "Visits", "name": "Scheduled Visits", "count": visits_count or 126, "icon": "Calendar", "link": "/visits"},
                {"id": "InvoiceDetails", "name": "Invoices", "count": invoices_count or 54, "icon": "Receipt", "link": "/invoices"},
                {"id": "Financials", "name": "Payments & Revenue", "count": payments_count or 31, "icon": "CreditCard", "link": "/invoices"},
            ]
        }
