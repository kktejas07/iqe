# IQE (Ideal Quality Engineers) - Architecture & End-to-End Flow Specification

This document provides a comprehensive technical reference for the **Architecture Flow (Arch Flow)** and **End-to-End Workflow (E2E Flow)** of the **IQE (Ideal Quality Engineers) Inspection Management System**. It covers the system architecture, dual-stack implementation (modern Next.js/FastAPI vs legacy ASP.NET MVC), entity data models, detailed lifecycle phases, sequence diagrams, and security matrix.

---

## 1. Executive Overview

IQE is an enterprise-grade Fieldglass-style Job & Inspection Management Platform designed to streamline third-party inspection (TPI), quality control (QC), site technician scheduling, field data/photo capture, financial billing, and automated reporting.

The system centers around a **Job ID (`job_id`) umbrella concept**—a single reference number linking all operational entities:
```
Client / Site ──▶ Job ID (Umbrella) ──▶ Service Order ──▶ Control Number ──▶ Visit Schedule
                                                                                 │
                                                                           Field Inspection
                                                                           (Docs, Photos, Expenses)
                                                                                 │
                                                                           Quality Control (QC)
                                                                                 │
                                                                           Finance Approval
                                                                                 │
                                                                           Invoice & Annexure
```

---

## 2. Architecture Flow (Arch Flow)

### 2.1 High-Level System Architecture

```mermaid
graph TB
    subgraph Clients["1. Client Layer"]
        WebApp["Web Frontend<br/>(Next.js 14 App Router / React)<br/>Coordinators, Admin, QC, Finance"]
        MobileApp["Mobile App<br/>(React Native / WatermelonDB)<br/>Field Inspectors (Offline-First)"]
        LegacyWeb["Legacy Web UI<br/>(ASP.NET MVC 5 + Bootstrap)"]
    end

    subgraph Gateway["2. Gateway & Authentication"]
        CORS["CORS & Rate Limiting"]
        JWTAuth["JWT Authentication / OWIN Forms Auth"]
        RBAC["Role-Based Access Control (RBAC)"]
    end

    subgraph BackendServices["3. Application & Service Layer"]
        subgraph FastAPIServices["FastAPI Async Micro-Modules (Python 3.12)"]
            AuthMod["Auth Module"]
            UserMod["User & Role Module"]
            ClientMod["Client & Site Module"]
            JobMod["Job & Service Order Module"]
            VisitMod["Visit Processing Module"]
            QCMod["QC & Inspection Module"]
            InvMod["Invoice & Payment Module"]
            ReportMod["Report & Analytics Module"]
            AIMod["AI & Vision Module"]
        end

        subgraph LegacyServices["Legacy Services (.NET 4.8 / C#)"]
            SOSvc["ServiceOrderService"]
            VisitSvc["VisitProcessingService"]
            InvSvc["InvoiceService"]
            RepSvc["ReportService"]
        end
    end

    subgraph DataStorage["4. Data & Storage Layer"]
        PrimaryDB[("Relational DB<br/>SQL Server / Azure SQL<br/>Core Entities & SPs")]
        DocDB[("Document DB<br/>MongoDB Atlas<br/>Job Collections & Audit Logs")]
        BlobStore["Object Storage<br/>Azure Blob / Local FileStorage<br/>Inspection Photos & PDF Invoices"]
    end

    subgraph External["5. External Services & AI Integrations"]
        SendGrid["SendGrid / Azure SMTP<br/>(Email Notifications)"]
        PDFEng["PDF Generation Engine<br/>(iText7 / Syncfusion / Spire.PDF)"]
        AIService["AI Engine<br/>(LangChain / Vision API / RAG)"]
    end

    WebApp --> CORS
    MobileApp --> CORS
    LegacyWeb --> JWTAuth

    CORS --> JWTAuth --> RBAC
    RBAC --> FastAPIServices
    RBAC --> LegacyServices

    FastAPIServices --> PrimaryDB
    FastAPIServices --> DocDB
    FastAPIServices --> BlobStore
    LegacyServices --> PrimaryDB
    LegacyServices --> BlobStore

    FastAPIServices --> SendGrid
    FastAPIServices --> PDFEng
    FastAPIServices --> AIService
    LegacyServices --> SendGrid
    LegacyServices --> PDFEng
```

---

### 2.2 Dual-Stack Architecture Comparison

IQE supports both a modernized decoupled architecture and the existing legacy enterprise framework:

| Architecture Layer | Modern Stack (Target) | Legacy Stack (Operational) |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 14 (App Router, React 18, Tailwind CSS, TypeScript, Zustand) | ASP.NET MVC 5 (Razor, Bootstrap 5, jQuery, Dropzone.js, jsTree) |
| **Mobile Client** | React Native (WatermelonDB offline sync, Camera, Native GPS) | N/A (Responsive Web) |
| **Backend API** | FastAPI (Python 3.12, Async, Pydantic v2 schemas) | ASP.NET Web API 2 / MVC 5 Controllers (.NET Framework 4.8) |
| **Data Access** | Motor (Async Mongo), SQLAlchemy / asyncpg | Dapper ORM (Stored Procedures), Entity Framework 6 |
| **Primary Data Stores** | MongoDB Atlas + SQL Server | SQL Server (`IQEIMS_DEV` / `IQEIMS`) |
| **File Storage** | Azure Blob Storage + Local Disk | Azure Blob Storage + Physical `D:\IQEApp\FileStorage\` |
| **PDF Processing** | Python ReportLab / WeasyPrint / iText7 | iTextSharp, iText7, Syncfusion.Pdf, Spire.PDF |
| **Authentication** | Bearer JWT (HS256 / RS256) + RBAC Middleware | OWIN Katana Cookie Auth + Forms Authentication + CustomAuthorize Filter |
| **AI / Intelligence** | LangChain, OpenAI Vision / Gemini RAG pipelines | Built-in analytics & static reporting |

---

### 2.3 Layered Architecture Breakdown

```mermaid
graph LR
    subgraph Layer1["Presentation Layer"]
        NextJS["Next.js Web / React Native"]
    end

    subgraph Layer2["API Router & Middleware"]
        API["FastAPI Controllers / OpenAPI"]
        Middleware["JWT Validation / Site Scoping / Exception Handlers"]
    end

    subgraph Layer3["Domain Logic Layer"]
        DomainModels["Core Domain Models & Schemas"]
        Services["Business Services (Jobs, Visits, Invoices, QC)"]
    end

    subgraph Layer4["Data Access & Persistence"]
        Dapper["Dapper / Mongo Repositories"]
        DB["SQL Server / MongoDB Atlas / Azure Storage"]
    end

    NextJS --> API
    API --> Middleware
    Middleware --> Services
    Services --> DomainModels
    Services --> Dapper
    Dapper --> DB
```

---

## 3. Data Model & Entity Relationship (ER)

### 3.1 Umbrella Job Entity ID Structure

Every entity in IQE carries its own unique identifier and references the root `job_id` and `site_id` for tenant isolation.

```mermaid
erDiagram
    SITE ||--o{ CLIENT : "has"
    SITE ||--o{ MANUFACTURER : "has"
    CLIENT ||--o{ JOB : "initiates"
    JOB ||--o{ SERVICE_ORDER : "contains"
    JOB ||--o{ CONTROL_NUMBER : "contains"
    JOB ||--o{ PURCHASE_ORDER : "contains"
    JOB ||--o{ VISIT : "tracks"
    JOB ||--o{ INVOICE : "bills"
    SERVICE_ORDER ||--o{ CONTROL_NUMBER : "assigns"
    PURCHASE_ORDER ||--o{ PURCHASE_ORDER_ITEM : "contains"
    VISIT ||--o{ VISIT_ASSIGNMENT : "assigned to"
    VISIT ||--o{ VISIT_EXPENSE : "incurs"
    VISIT ||--o{ VISIT_PHOTO : "captures"
    VISIT ||--o{ VISIT_REPORT : "generates"
    INVOICE ||--o{ INVOICE_LINE_ITEM : "itemizes"
    INVOICE ||--o{ PAYMENT : "receives"
    USER ||--o{ VISIT_ASSIGNMENT : "executes"
```

### 3.2 Key Entity Identifier Standards

| Entity | ID Schema | Parent Reference | Description |
| :--- | :--- | :--- | :--- |
| **Site** | `SITE-XX` | — | Multi-tenant branch location |
| **Client** | `CLT-XXXX` | Site | Corporate client ordering inspections |
| **Manufacturer** | `MFR-XXXX` | Site | Vendor/Factory site being inspected |
| **User / Inspector** | `USR-XXXX` | Site | Staff member, coordinator, or field technician |
| **Job (Umbrella)** | `JOB-YYYY-XXXX` | Client | Single reference container for overall engagement |
| **Service Order** | `SO-YYYY-XXXX` | Job | Scope of inspection work contract |
| **Control Number** | `CN-YYYY-XXXX` | Job / SO | Individual tag/batch allocated for inspection |
| **Purchase Order** | `PO-YYYY-XXXX` | Job | Client PO billing reference |
| **Visit** | `VIS-YYYY-XXXX` | Job / CN | Scheduled field inspection event |
| **Inspection Photo** | `PHO-XXXX` | Visit | Photo evidence taken on site |
| **Visit Expense** | `EXP-XXXX` | Visit | Inspector travel, lodging, or meal claim |
| **Invoice** | `INV-YYYY-XXXX` | Job / Visit | Financial invoice issued to client |
| **Payment** | `PAY-YYYY-XXXX` | Invoice | Client payment settlement record |

---

## 4. End-to-End Workflow (E2E Flow)

### 4.1 Master End-to-End Process Flow

```mermaid
flowchart TD
    Start([User Request / Login]) --> Auth{Authenticated?}
    Auth -- No --> Login[Prompt Credentials / SSO] --> Auth
    Auth -- Yes --> Dash[Load Dashboard according to User Role]

    %% Phase 1: Initiation
    Dash --> P1[Phase 1: Job & Service Order Creation]
    P1 --> SelectClient[Select / Create Client & Manufacturer]
    SelectClient --> CreateJob[Initialize Job Umbrella ID: JOB-YYYY-XXXX]
    CreateJob --> CreateSO[Create Service Order & PO Details]

    %% Phase 2: Scheduling
    CreateSO --> P2[Phase 2: Control Number & Visit Scheduling]
    P2 --> AssignCN[Generate Control Numbers: CN-YYYY-XXXX]
    AssignCN --> ScheduleVisit[Schedule Field Visit & Assign Inspector]
    ScheduleVisit --> NotifyInsp[Dispatch Notification to Inspector Web/Mobile]

    %% Phase 3: Execution
    NotifyInsp --> P3[Phase 3: Field Execution & Data Capture]
    P3 --> AcceptVisit[Inspector Accepts Visit Schedule]
    AcceptVisit --> FieldCheckIn[Field GPS Check-in & Inspection]
    FieldCheckIn --> UploadData[Upload Checklist, Photos & Expense Receipts]

    %% Phase 4: QC
    UploadData --> P4[Phase 4: Quality Control & Audit Review]
    P4 --> QCAudit{QC Review Passed?}
    QCAudit -- No / Rejection --> RequestRework[Return Visit to Inspector for Rework] --> FieldCheckIn
    QCAudit -- Yes / Approved --> QCApprove[Approve Inspection Report]

    %% Phase 5: Finance & Billing
    QCApprove --> P5[Phase 5: Finance & Invoice Generation]
    P5 --> CalculateRates[Compute Rates, Inspector Expenses & Charges]
    CalculateRates --> DraftInv[Generate Draft Invoice & Annexures]
    DraftInv --> FinanceApprove{Finance Approved?}
    FinanceApprove -- Re-calc --> CalculateRates
    FinanceApprove -- Approved --> IssueInv[Publish Final PDF Invoice: INV-YYYY-XXXX]

    %% Phase 6: Reporting & Closing
    IssueInv --> P6[Phase 6: Reporting & Archival]
    P6 --> ExportPDF[Send Reports & Invoices to Client]
    ExportPDF --> PayTrack[Track Payment & Close Job Lifecycle]
    PayTrack --> End([Process Completed])
```

---

### 4.2 Detailed Phase Walkthrough

#### Phase 1: Authentication & Dashboard Initialization
1. **User Login**: User submits credentials via Next.js `/login` or mobile client.
2. **Token Generation**: FastAPI Auth service validates hashed password (Bcrypt), returns JWT Bearer token containing `user_id`, `role`, and `site_id`.
3. **Role Routing**:
   - **Coordinator**: Directed to Job Creation & Scheduling Console.
   - **Inspector**: Directed to Mobile Today's Visits & Offline Task Queue.
   - **QC Auditor**: Directed to Inspection Approval Queue.
   - **Finance**: Directed to Unbilled Visits & Invoice Management.

#### Phase 2: Job & Service Order (SO) Initialization
1. **Client Selection**: Select existing client (`client_id`) and client unit.
2. **Job Container Creation**: System creates root `Job` document (`job_id`: e.g. `JOB-2026-0001`).
3. **Service Order Setup**: Attach contract terms, scope of inspection, client PO (`po_id`), and manufacturer unit.
4. **Document Attachment**: Upload client spec sheets or standards to Azure Blob Storage / file storage.

#### Phase 3: Control Number Allocation & Visit Scheduling
1. **Control Number Generation**: Split Service Order into actionable control numbers (`control_number_id`).
2. **Inspector Matching**: Match technician competencies (`competency_id`), location proximity, and calendar availability.
3. **Visit Creation**: Schedule visit (`visit_id`), allocating estimated mandays, start date, and target execution site.
4. **Push Notification**: Automated email (SendGrid) and mobile push notification sent to assigned inspector.

#### Phase 4: Inspector Field Execution & Offline Data Sync
1. **Visit Acceptance**: Inspector confirms schedule via React Native app or mobile browser.
2. **GPS Check-In**: Inspector arrives at manufacturer site; app records GPS coordinates and timestamp.
3. **Inspection Data Capture**:
   - Executes inspection checklists.
   - Captures high-res photos (`photo_id`) with timestamps and watermark overlay.
   - Logs daily expenses (`expense_id`) and attaches receipt scans.
4. **Offline Resilience**: If offline, data is cached in WatermelonDB / local storage and auto-synced upon network restoration via background worker.

#### Phase 5: Quality Control (QC) & AI Verification
1. **QC Dispatch**: Submitted visit transitions to `UNDER_QC` status.
2. **AI Assistance (Optional)**: AI Vision engine scans photos for clarity, barcode correctness, and missing documentation.
3. **QC Review**: Auditor inspects report details, photos, and compliance findings.
4. **Approval / Revision**: If flaws exist, return to inspector with remarks; otherwise approve visit to `QC_APPROVED`.

#### Phase 6: Financial Billing & Invoice Generation
1. **Rate Calculation**: System fetches client billing rate card, inspector travel allowances, and extra hours.
2. **Consolidated Billing**: Group approved visits for a `job_id` into a unified invoice (`invoice_id`).
3. **Annexure & PDF Generation**: Engine compiles summary invoice, detailed line items, and inspection annexures into standard PDF.
4. **Client Dispatch**: Invoice mailed to client finance team; invoice status set to `ISSUED`.

#### Phase 7: Payment Tracking & Archival
1. **Payment Entry**: Record payment receipts (`payment_id`) against open invoices.
2. **Job Closure**: Once all visits are billed and cleared, set `job_id` status to `COMPLETED`.
3. **Data Archival**: Archive logs and photos to long-term storage for audit compliance.

---

## 5. Technical Sequence Diagrams

### 5.1 Service Order to Invoice End-to-End Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Coordinator
    actor Inspector
    actor QC as QC Auditor
    actor Finance
    participant Web as Web / Mobile UI
    participant API as FastAPI Backend
    participant DB as Database (SQL/Mongo)
    participant Storage as Azure Blob Storage
    participant Ext as Email / PDF Engine

    Coordinator->>Web: Create Job & Service Order
    Web->>API: POST /api/v1/jobs
    API->>DB: Save Job (JOB-2026-0001) & SO
    DB-->>API: Saved Confirmation
    API-->>Web: Return Job Details

    Coordinator->>Web: Schedule Visit & Assign Inspector
    Web->>API: POST /api/v1/visits/schedule
    API->>DB: Save Visit (VIS-2026-0123) & Assignment
    API->>Ext: Trigger Notification Email/Push
    Ext-->>Inspector: Send Visit Notification

    Inspector->>Web: Accept & Execute Field Visit
    Inspector->>Web: Upload Photos & Expenses (Offline Sync)
    Web->>API: POST /api/v1/visits/VIS-2026-0123/submit
    API->>Storage: Upload Photo Files & Receipts
    API->>DB: Update Visit Status -> UNDER_QC
    DB-->>API: Updated

    QC->>Web: Review Inspection Report
    Web->>API: GET /api/v1/visits/pending-qc
    API->>DB: Fetch Visit Data & Photos
    DB-->>API: Return Data
    QC->>Web: Approve Visit
    Web->>API: POST /api/v1/visits/VIS-2026-0123/approve-qc
    API->>DB: Update Status -> QC_APPROVED

    Finance->>Web: Generate Invoice for Job
    Web->>API: POST /api/v1/invoices/generate
    API->>DB: Fetch QC_APPROVED Visits & Rates
    API->>Ext: Generate Invoice PDF & Annexure
    Ext-->>API: Return PDF Stream
    API->>Storage: Save Final PDF (INV-2026-0001.pdf)
    API->>DB: Save Invoice Record
    API-->>Web: Invoice Issued Successfully
```

---

### 5.2 Offline Mobile Synchronization Sequence

```mermaid
sequenceDiagram
    autonumber
    actor FieldInsp as Field Inspector
    participant Mobile as React Native App
    participant LocalDB as WatermelonDB (Local)
    participant Sync as Sync Worker
    participant API as FastAPI Backend

    FieldInsp->>Mobile: Fill Inspection Form & Capture Photo (No Internet)
    Mobile->>LocalDB: Save Local Record & Queue Action
    LocalDB-->>Mobile: Saved locally (Status: Pending Sync)

    Note over Mobile, Sync: Internet connection restored
    Sync->>LocalDB: Detect pending offline items
    Sync->>API: POST /api/v1/sync/batch (Data + Photos)
    API->>API: Process Transaction & Validate Tokens
    API-->>Sync: Return Sync Success ACK (Server IDs)
    Sync->>LocalDB: Clear Pending Queue & Update Local IDs
    Mobile-->>FieldInsp: Show Sync Complete Badge
```

---

## 6. Security, Compliance & Data Access Control

### 6.1 Multi-Tenant Isolation
All queries strictly enforce site scoping using the `site_id` parameter to guarantee multi-tenant security:
$$\text{Filter} = (\text{Tenant Site ID} == \text{User Site ID}) \land (\text{Entity Site ID} == \text{Tenant Site ID})$$

### 6.2 Role-Based Access Control (RBAC) Matrix

| Module / Action | Admin | Coordinator | Inspector | QC Auditor | Finance | Client View |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Manage Users & Masters** | Full | Read | Read | Read | Read | None |
| **Create Job & Service Order** | Full | Full | Read | Read | Read | Read |
| **Schedule / Assign Visits** | Full | Full | View Assigned | Read | Read | Read |
| **Execute Visit & Upload Data** | Full | Edit Assigned | Full (Assigned) | View | View | None |
| **QC Review & Approval** | Full | View | View | Full | View | None |
| **Generate Invoice & Rates** | Full | View | None | View | Full | Read (Issued) |
| **Executive Reports** | Full | Full | Self Only | Full | Full | Client Only |

---

## 7. Document Summary & Reference Links

- **Main Codebase Path**: [IQEWorkSpace](file:///Users/avks/Desktop/Projects%20/IQE/iqe/IQEWorkSpace)
- **FastAPI Backend**: [backend/main.py](file:///Users/avks/Desktop/Projects%20/IQE/iqe/IQEWorkSpace/backend/main.py)
- **Web Frontend**: [apps/web/src/app](file:///Users/avks/Desktop/Projects%20/IQE/iqe/IQEWorkSpace/apps/web/src/app)
- **Architecture Diagram**: [architecture-diagram.md](file:///Users/avks/Desktop/Projects%20/IQE/iqe/IQEWorkSpace/architecture-diagram.md)
- **Workflow Overview**: [workflow-overview.md](file:///Users/avks/Desktop/Projects%20/IQE/iqe/IQEWorkSpace/workflow-overview.md)
- **Migration Plan**: [rn-fastapi-migration-plan.md](file:///Users/avks/Desktop/Projects%20/IQE/iqe/IQEWorkSpace/rn-fastapi-migration-plan.md)

---
*Document generated on: August 6, 2026*
