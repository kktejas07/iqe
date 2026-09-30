"use client";

import { useState, useMemo, useEffect } from "react";
import { trackButtonClick, trackPageView } from "@/lib/analytics";
import { PdfPreviewModal } from "@/components/PdfPreviewModal";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Edit3,
  Building2,
  HardHat,
  Calendar,
  Layers,
  Save,
  Printer,
  ChevronDown,
  X,
  Clock,
  Eye,
  Sparkles,
  Upload,
  History,
  FileSignature,
  ShieldAlert,
  Columns,
  Lock,
  Unlock,
  Trash2,
  Calculator,
  Bot,
  Paperclip,
  ArrowRight,
  UserCheck,
  RefreshCw,
  FileCheck,
  FilePlus,
  Check,
  SlidersHorizontal,
  Rows,
  FileCheck2,
  FileEdit,
  DollarSign,
  Briefcase,
  Layers3,
  Users,
  Handshake,
  Landmark,
} from "lucide-react";

export type TpiInspectionMode = "epc_sponsored" | "end_client_direct" | "tripartite";

const TPI_MODE_LABELS: Record<TpiInspectionMode, { label: string; subLabel: string }> = {
  epc_sponsored: {
    label: "EPC / Supplier Sponsored",
    subLabel: "EPC = Client | EPC's Client = End Client",
  },
  end_client_direct: {
    label: "End Client Direct",
    subLabel: "End Client = Primary Client | EPC = Contractor under audit",
  },
  tripartite: {
    label: "Tripartite Inspection",
    subLabel: "Exclusive 3-way alignment between EPC Contractor & End Client",
  },
};

const UNIT_OPTIONS = ["No's", "Mtrs", "Kgs", "Ltrs", "Sqm", "Cum", "Set", "LS"];
const VARIATION_OPTIONS = ["N", "Y"];
const HIDDEN_WORK_OPTIONS = ["N", "Y"];
const MEASUREMENT_TYPE_OPTIONS = [
  "Joint Physical Verification",
  "Joint Concealed Work Inspection",
  "Weight Bridge Calibration & Count",
  "Surface Area & DFT Gauge Verification",
  "Ultrasonic Thickness Measurement",
  "Hydrostatic Pressure Test",
  "Bill Audit & Verification",
];
const CLOSURE_STATUS_OPTIONS = [
  "Closed",
  "Open / Pending Correction",
  "In Progress",
  "Approved for Payment",
];

const CLIENT_OPTIONS = [
  "Granules India Limited - Gagillapur",
  "Atom Project (New Atom Project)",
  "Suven Pharmaceuticals Ltd (Chonce Life Science)",
  "MCGM (Greater Mumbai Corp)",
  "S2 / Standard Client",
];

interface ClientDetails {
  projectName: string;
  projectLocation: string;
  vendor: string;
  contractRef: string;
  poNumber: string;
  poDate: string;
  endClient: string;
  epcContractor: string;
  supplierVendor: string;
}

const CLIENT_DETAILS_MAP: Record<string, ClientDetails> = {
  "Granules India Limited - Gagillapur": {
    projectName: "Granules Gagillapur Maintenance & Project Expansion",
    projectLocation: "Gagillapur Plant, Hyderabad, Telangana",
    vendor: "JB Fabricator / Devi Sri Civil",
    contractRef: "GIL/GAG/2025/TPI-1710",
    poNumber: "WO-3400077675/18.08.25",
    poDate: "2025-10-17",
    endClient: "Granules India Limited (Asset Owner)",
    epcContractor: "Devi Sri Civil & Painting",
    supplierVendor: "JB Fabricator / Maruthi Engg / D Seva Singh / Triveni",
  },
  "Atom Project (New Atom Project)": {
    projectName: "New Atom Process Facility Pkg 01",
    projectLocation: "Atom Site Industrial Zone, India",
    vendor: "Quality Engineers (I) Pvt Ltd",
    contractRef: "ATOM/PKG01/2026/TPI-9901",
    poNumber: "PO-ATOM-2026-88120",
    poDate: "2026-05-14",
    endClient: "Atom Process Energy Asset Owner",
    epcContractor: "Larsen & Toubro Ltd - Infra Div",
    supplierVendor: "Apex Heavy Engg Corp",
  },
  "Suven Pharmaceuticals Ltd (Chonce Life Science)": {
    projectName: "Suven C.Tank Civil & Scaffolding Works",
    projectLocation: "Chonce Life Science Plant, Suryapet, TS",
    vendor: "SV Enterprises",
    contractRef: "SUVEN/CIVIL/2025/TPI-4443",
    poNumber: "PO-SUVEN-50054",
    poDate: "2025-12-13",
    endClient: "Suven Pharmaceuticals Ltd (Asset Owner)",
    epcContractor: "SVS CONSTRUCTIONS",
    supplierVendor: "SV Enterprises",
  },
  "MCGM (Greater Mumbai Corp)": {
    projectName: "Mumbai Coastal Road Pkg 03",
    projectLocation: "Worli-Nariman Corridor, Mumbai, MH",
    vendor: "Larsen & Toubro Ltd - Infra Div",
    contractRef: "MCGM/CWD/2024/TPI-8892",
    poNumber: "PO-MCGM-2024-99812",
    poDate: "2024-04-15",
    endClient: "Municipal Corporation of Greater Mumbai",
    epcContractor: "Larsen & Toubro Ltd - Infra Div",
    supplierVendor: "Shapoorji Pallonji Engineering",
  },
  "S2 / Standard Client": {
    projectName: "Standard Industrial Facility Pkg 01",
    projectLocation: "Industrial Zone Phase 2, India",
    vendor: "Tata Projects Infrastructure",
    contractRef: "S2/STD/2024/TPI-1010",
    poNumber: "PO-S2-2024-10100",
    poDate: "2024-05-15",
    endClient: "S2 Standard Asset Owner",
    epcContractor: "Tata Projects Infrastructure",
    supplierVendor: "Apex Heavy Engg Corp",
  },
};

const CLIENT_VENDOR_MAP: Record<string, string[]> = {
  "Granules India Limited - Gagillapur": [
    "JB Fabricator",
    "Devi sri (Painting)",
    "Devi sri(Civil)",
    "Maruthi Engg",
    "D Seva singh",
    "VSV Engg",
    "AG Projects",
    "Sri Lakshmi Co",
    "Rama Flag",
    "Triveni Insulation",
  ],
  "Atom Project (New Atom Project)": [
    "Quality Engineers (I) Pvt Ltd",
    "Larsen & Toubro Ltd - Infra Div",
    "Apex Heavy Engg Corp",
  ],
  "Suven Pharmaceuticals Ltd (Chonce Life Science)": [
    "SV Enterprises",
    "SVS CONSTRUCTIONS",
  ],
  "MCGM (Greater Mumbai Corp)": [
    "Larsen & Toubro Ltd - Infra Div",
    "Shapoorji Pallonji Engineering",
  ],
  "S2 / Standard Client": [
    "Tata Projects Infrastructure",
    "Sterling & Wilson Renewable",
    "Thermax Quality Systems",
    "Apex Heavy Engg Corp",
  ],
};

const VENDOR_OPTIONS = [
  "Larsen & Toubro Ltd - Infra Div",
  "Shapoorji Pallonji Engineering",
  "Tata Projects Infrastructure",
  "Sterling & Wilson Renewable",
  "Thermax Quality Systems",
  "Apex Heavy Engg Corp",
  "JB Fabricator",
  "Devi sri(Civil)",
  "D Seva singh",
  "Triveni Insulation",
];

export interface BillItem {
  id: number;
  slNo: number;
  raBill: string;
  date: string;
  vendor: string;
  boqItem: string;
  description: string;
  unit: string;
  gfcDrawingRef: string;
  boqQty: number;
  prevCertifiedQty: number;
  contractorClaimedQty: number;
  tpiVerifiedQty: number;
  unitRate: number;
  isVariation: "Y" | "N";
  variationRef: string;
  contractClause: string;
  isHiddenWork: "Y" | "N";
  measurementType: string;
  observation: string;
  actionRequired: string;
  targetDate: string;
  closureStatus: "Closed" | "Open / Pending Correction" | "In Progress" | "Approved for Payment";
  attachments: string[];
  isLocked?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  itemId: number;
  boqItem: string;
  field: string;
  oldValue: any;
  newValue: any;
  userRole: string;
  reason: string;
}

const GRANULES_DATA: BillItem[] = [
  {
    "id": 2001,
    "slNo": 1,
    "raBill": "RA-001",
    "date": "2025-05-25",
    "vendor": "JB Fabricator",
    "boqItem": "1.01",
    "description": "[MUPS] WO: 3400077675/18.08.25 | Inv: 34/",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-001",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9789,
    "unitRate": 53758.0,
    "isVariation": "Y",
    "variationRef": "3400077675",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "1 item bill & MS not matched. Corrected on 17.10.25",
    "actionRequired": "Variance \u20b91,134 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_34_.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2002,
    "slNo": 2,
    "raBill": "RA-002",
    "date": "2025-01-25",
    "vendor": "Devi sri (Painting)",
    "boqItem": "2.01",
    "description": "[MUPS] WO: 3400072605/31.01.25 | Inv: 123/devi/24-25/01.03.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-002",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9977,
    "unitRate": 300000.0,
    "isVariation": "Y",
    "variationRef": "3400072605",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Corrected on 17.10.25. IAD corrected on 5.11.25",
    "actionRequired": "Variance \u20b9681 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_123_devi_24-25_01.03.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2003,
    "slNo": 3,
    "raBill": "RA-003",
    "date": "2025-07-25",
    "vendor": "Devi sri(Civil)",
    "boqItem": "3.01",
    "description": "[FD] WO: 3600004339/11.08.25 | Inv: 54/devisri/25-26/01.03.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-003",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 360000.0,
    "isVariation": "N",
    "variationRef": "3600004339",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 17.10.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_54_devisri_25-26_01.03.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2004,
    "slNo": 4,
    "raBill": "RA-004",
    "date": "2025-08-25",
    "vendor": "Maruthi Engg",
    "boqItem": "4.01",
    "description": "[CWH/PFI] WO: 3400077282/31.07.25 | Inv: Mec/25-26/082/31.08.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-004",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 24000.0,
    "isVariation": "N",
    "variationRef": "3400077282",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 17.10.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_Mec_25-26_082_31.08.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2005,
    "slNo": 5,
    "raBill": "RA-005",
    "date": "2025-08-25",
    "vendor": "Maruthi Engg",
    "boqItem": "5.01",
    "description": "[CWH/PFI] WO: 3400077282/31.07.25 | Inv: Mec/25-26/081/31.08.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-005",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 18500.0,
    "isVariation": "N",
    "variationRef": "3400077282",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 17.10.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_Mec_25-26_081_31.08.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2006,
    "slNo": 6,
    "raBill": "RA-006",
    "date": "2025-04-25",
    "vendor": "D Seva singh",
    "boqItem": "6.01",
    "description": "[CWH/PFI] WO: 3400078194/08.09.25 | Inv: 23/23.09.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-006",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 247543.0,
    "isVariation": "N",
    "variationRef": "3400078194",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "2 ARC No written wrong.Corrected on 17.10.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_23_23.09.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2007,
    "slNo": 7,
    "raBill": "RA-007",
    "date": "2025-08-25",
    "vendor": "D Seva singh",
    "boqItem": "7.01",
    "description": "[PFI] WO: 3400076185/16.06.25 | Inv: 19/11.09.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-007",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 30000.0,
    "isVariation": "N",
    "variationRef": "3400076185",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 17.10.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_19_11.09.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2008,
    "slNo": 8,
    "raBill": "RA-008",
    "date": "2025-08-25",
    "vendor": "VSV Engg",
    "boqItem": "8.01",
    "description": "[FD] WO: 3400076627/07.07.25 | Inv: 32/13.09.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-008",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 196000.0,
    "isVariation": "N",
    "variationRef": "3400076627",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 17.10.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_32_13.09.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2009,
    "slNo": 9,
    "raBill": "RA-009",
    "date": "2025-08-25",
    "vendor": "AG Projects",
    "boqItem": "9.01",
    "description": "[FD] WO: 3600004328/02.08.25 | Inv: AG/33/25-26/21.08.25.",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-009",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 120776.0,
    "isVariation": "N",
    "variationRef": "3600004328",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 17.10.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_AG_33_25-26_21.08.25..pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2010,
    "slNo": 10,
    "raBill": "RA-010",
    "date": "2025-07-25",
    "vendor": "Sri Lakshmi Co",
    "boqItem": "10.01",
    "description": "[Different] WO: 3400077997/29.08.25 | Inv: 42/25-26/10.09.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-010",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 313723.0,
    "isVariation": "N",
    "variationRef": "3400077997",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 17.10.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_42_25-26_10.09.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2011,
    "slNo": 11,
    "raBill": "RA-011",
    "date": "2025-10-17",
    "vendor": "Rama Flag",
    "boqItem": "11.01",
    "description": "[Different] WO: 3400078881/09.10.25 | Inv: RF/42/09.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-011",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 136020.0,
    "isVariation": "N",
    "variationRef": "3400078881",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 21.10.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_RF_42_09.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2012,
    "slNo": 12,
    "raBill": "RA-012",
    "date": "2025-10-17",
    "vendor": "Triveni Insulation",
    "boqItem": "12.01",
    "description": "[PFI] WO: 3400077961/29.08.25 | Inv: 1495/25-26/13.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-012",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9216,
    "unitRate": 42831.0,
    "isVariation": "Y",
    "variationRef": "3400077961",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 22.10.25",
    "actionRequired": "Variance \u20b93,357 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_1495_25-26_13.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2013,
    "slNo": 13,
    "raBill": "RA-013",
    "date": "2025-05-25",
    "vendor": "D Seva singh",
    "boqItem": "13.01",
    "description": "[All Blocks] WO: 3400078193/08.09.25 | Inv: 24/23.09.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-013",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9983,
    "unitRate": 299233.0,
    "isVariation": "Y",
    "variationRef": "3400078193",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "1 ARC No written wrong.Corrected on 31.10.25",
    "actionRequired": "Variance \u20b9498 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_24_23.09.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2014,
    "slNo": 14,
    "raBill": "RA-014",
    "date": "2025-06-25",
    "vendor": "D Seva singh",
    "boqItem": "14.01",
    "description": "[All Blocks] WO: 3400078047/02.09.25 | Inv: 18/11.09.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-014",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9982,
    "unitRate": 431919.0,
    "isVariation": "Y",
    "variationRef": "3400078047",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "3 ARC No written wrong.Corrected on 23.10.25",
    "actionRequired": "Variance \u20b9760 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_18_11.09.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2015,
    "slNo": 15,
    "raBill": "RA-015",
    "date": "2025-05-25",
    "vendor": "Triveni Insulation",
    "boqItem": "15.01",
    "description": "[All Blocks] WO: WO-2025-001 | Inv: 758/10.07.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-015",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9804,
    "unitRate": 155867.0,
    "isVariation": "Y",
    "variationRef": "VO-GAG-01",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 24.10.25 & 29.10.25",
    "actionRequired": "Variance \u20b93,062 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_758_10.07.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2016,
    "slNo": 16,
    "raBill": "RA-016",
    "date": "2025-06-25",
    "vendor": "Triveni Insulation",
    "boqItem": "16.01",
    "description": "[All Blocks] WO: WO-2025-001 | Inv: 722/29.07.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-016",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.001,
    "unitRate": 93420.0,
    "isVariation": "Y",
    "variationRef": "VO-GAG-01",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 24.10.25 & 29.10.25",
    "actionRequired": "Variance \u20b993,327 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_722_29.07.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2017,
    "slNo": 17,
    "raBill": "RA-017",
    "date": "2025-07-25",
    "vendor": "Triveni Insulation",
    "boqItem": "17.01",
    "description": "[All Blocks] WO: WO-2025-001 | Inv: 936/18.08.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-017",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9458,
    "unitRate": 378449.0,
    "isVariation": "Y",
    "variationRef": "VO-GAG-01",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 24.10.25 & 29.10.25",
    "actionRequired": "Variance \u20b920,514 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_936_18.08.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2018,
    "slNo": 18,
    "raBill": "RA-018",
    "date": "2025-08-25",
    "vendor": "Triveni Insulation",
    "boqItem": "18.01",
    "description": "[All Blocks] WO: WO-2025-001 | Inv: 1299/26.09.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-018",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.991,
    "unitRate": 133465.0,
    "isVariation": "Y",
    "variationRef": "VO-GAG-01",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 24.10.25 & 29.10.25",
    "actionRequired": "Variance \u20b91,206 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_1299_26.09.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2019,
    "slNo": 19,
    "raBill": "RA-019",
    "date": "2025-07-25",
    "vendor": "SKV Electrical",
    "boqItem": "19.01",
    "description": "[CWH] WO: 3400078778/06.10.25 | Inv: SV/25-26/42/10.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-019",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 160606.0,
    "isVariation": "N",
    "variationRef": "3400078778",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "2 ARC No written wrong.Corrected on 25.10.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_SV_25-26_42_10.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2020,
    "slNo": 20,
    "raBill": "RA-020",
    "date": "2025-10-25",
    "vendor": "Mundru Infra",
    "boqItem": "20.01",
    "description": "[All Blocks] WO: WO-2025-001 | Inv: INV-2025-001",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-020",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 0.0,
    "isVariation": "N",
    "variationRef": "VO-GAG-01",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 25.10.25.Final bill not Produced.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_INV-2025-001.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2021,
    "slNo": 21,
    "raBill": "RA-021",
    "date": "2025-10-17",
    "vendor": "Vaibhav Coatings",
    "boqItem": "21.01",
    "description": "[FD] WO: WO-2025-001 | Inv: INV-2025-001",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-021",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 0.0,
    "isVariation": "N",
    "variationRef": "VO-GAG-01",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 25.10.25.Final bill not Produced.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_INV-2025-001.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2022,
    "slNo": 22,
    "raBill": "RA-022",
    "date": "2025-06-25",
    "vendor": "Devi sri(Civil)",
    "boqItem": "22.01",
    "description": "[All Blocks] WO: 3400078707/30.09.25 | Inv: 59/devisri/25-26/08.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-022",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 473542.0,
    "isVariation": "N",
    "variationRef": "3400078707",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "4 ARC No written wrong.Corrected on 27.10.25 & 29.10.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_59_devisri_25-26_08.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2023,
    "slNo": 23,
    "raBill": "RA-023",
    "date": "2025-07-25",
    "vendor": "Devi sri(Civil)",
    "boqItem": "23.01",
    "description": "[All Blocks] WO: 3400078707/30.09.25 | Inv: 60/devisri/25-26/08.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-023",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 465517.0,
    "isVariation": "N",
    "variationRef": "3400078707",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 27.10.25.SDT Hostel Tractor rotator ARC not available.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_60_devisri_25-26_08.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2024,
    "slNo": 24,
    "raBill": "RA-024",
    "date": "2025-01-25",
    "vendor": "Devi sri(Civil)",
    "boqItem": "24.01",
    "description": "[MUPS] WO: 3400072877/12.02.25 | Inv: 65/devisri/25-26/22.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-024",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9631,
    "unitRate": 79355.0,
    "isVariation": "Y",
    "variationRef": "3400072877",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 28.10.25.2 Items Area written wrong on the bill.Invoice replaced on 08.11.25.",
    "actionRequired": "Variance \u20b92,930 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_65_devisri_25-26_22.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2025,
    "slNo": 25,
    "raBill": "RA-025",
    "date": "AUG--25",
    "vendor": "D Seva singh",
    "boqItem": "25.01",
    "description": "[All Blocks] WO: 3400079076/16.10.25 | Inv: 25/22.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-025",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 228855.0,
    "isVariation": "N",
    "variationRef": "3400079076",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 28.10.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_25_22.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2026,
    "slNo": 26,
    "raBill": "RA-026",
    "date": "2025-06-25",
    "vendor": "VSV Engg",
    "boqItem": "26.01",
    "description": "[CWH] WO: 3600004229/19.06.25 | Inv: 38/17.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-026",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9963,
    "unitRate": 972329.0,
    "isVariation": "Y",
    "variationRef": "3600004229",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified twice on 28.10.25 & 04.11.25.Final approved on 07.11.25.",
    "actionRequired": "Variance \u20b93,578 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_38_17.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2027,
    "slNo": 27,
    "raBill": "RA-027",
    "date": "JULY---25",
    "vendor": "D Seva singh",
    "boqItem": "27.01",
    "description": "[All Blocks] WO: 3400079187/21.10.25 | Inv: 26/24.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-027",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 123453.0,
    "isVariation": "N",
    "variationRef": "3400079187",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 29.10.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_26_24.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2028,
    "slNo": 28,
    "raBill": "RA-028",
    "date": "2025-10-17",
    "vendor": "Ganesh Interior",
    "boqItem": "28.01",
    "description": "[CWH] WO: 3400079084/16.10.25 | Inv: 273/22.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-028",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 56340.0,
    "isVariation": "N",
    "variationRef": "3400079084",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 29.10.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_273_22.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2029,
    "slNo": 29,
    "raBill": "RA-029",
    "date": "2025-10-17",
    "vendor": "Ganesh Interior",
    "boqItem": "29.01",
    "description": "[CWH B1] WO: 3400079043/15.10.25 | Inv: 272/22.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-029",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 187080.0,
    "isVariation": "N",
    "variationRef": "3400079043",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 29.10.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_272_22.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2030,
    "slNo": 30,
    "raBill": "RA-030",
    "date": "2025-10-17",
    "vendor": "Ganesh Interior",
    "boqItem": "30.01",
    "description": "[MUPS] WO: 3400079045/15.10.25 | Inv: 271/21.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-030",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 28960.0,
    "isVariation": "N",
    "variationRef": "3400079045",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 29.10.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_271_21.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2031,
    "slNo": 31,
    "raBill": "RA-031",
    "date": "2025-10-17",
    "vendor": "Ganesh Interior",
    "boqItem": "31.01",
    "description": "[CWH] WO: 3400079085/16.10.25 | Inv: 274/23.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-031",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 30000.0,
    "isVariation": "N",
    "variationRef": "3400079085",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 29.10.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_274_23.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2032,
    "slNo": 32,
    "raBill": "RA-032",
    "date": "2025-07-25",
    "vendor": "SVR Power",
    "boqItem": "32.01",
    "description": "[Different] WO: 3400078779/06.10.25 | Inv: svr/25-26/29/05.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-032",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9995,
    "unitRate": 266197.0,
    "isVariation": "Y",
    "variationRef": "3400078779",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 30.10.25 & 04.11.25.1 ARC No & 1 measurement written wrong.",
    "actionRequired": "Variance \u20b9135 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_svr_25-26_29_05.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2033,
    "slNo": 33,
    "raBill": "RA-033",
    "date": "AUG--25",
    "vendor": "SVR Power",
    "boqItem": "33.01",
    "description": "[Different] WO: 3400079278/23.10.25 | Inv: svr/25-26/30/05.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-033",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 154521.0,
    "isVariation": "N",
    "variationRef": "3400079278",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 30.10.25 & 04.11.25.1 ARC No written wrong.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_svr_25-26_30_05.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2034,
    "slNo": 34,
    "raBill": "RA-034",
    "date": "AUG--25",
    "vendor": "SV Electrical",
    "boqItem": "34.01",
    "description": "[Different] WO: WO-2025-001 | Inv: INV-2025-001",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-034",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 101488.0,
    "isVariation": "N",
    "variationRef": "VO-GAG-01",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 04.11.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_INV-2025-001.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2035,
    "slNo": 35,
    "raBill": "RA-035",
    "date": "SEPT---25",
    "vendor": "Vijay shankar insulation",
    "boqItem": "35.01",
    "description": "[All Blocks] WO: 3600004041/25.03.25 | Inv: 34/29.09.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-035",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 400675.0,
    "isVariation": "N",
    "variationRef": "3600004041",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 31.10.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_34_29.09.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2036,
    "slNo": 36,
    "raBill": "RA-036",
    "date": "JULY--25",
    "vendor": "Ratna contract works",
    "boqItem": "36.01",
    "description": "[All Blocks] WO: 3400078676/28.09.25 | Inv: 83/08.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-036",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 229334.0,
    "isVariation": "N",
    "variationRef": "3400078676",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 07.11.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_83_08.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2037,
    "slNo": 37,
    "raBill": "RA-037",
    "date": "AUG--25",
    "vendor": "Ratna contract works",
    "boqItem": "37.01",
    "description": "[All Blocks] WO: 3400078871/08.10.25 | Inv: 84/13.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-037",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 381004.0,
    "isVariation": "N",
    "variationRef": "3400078871",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 07.11.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_84_13.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2038,
    "slNo": 38,
    "raBill": "RA-038",
    "date": "OCT--25",
    "vendor": "Perfect insulation",
    "boqItem": "38.01",
    "description": "[All Blocks] WO: 3600004040/25.03.25 | Inv: 363/25-26/18.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-038",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 164994.0,
    "isVariation": "N",
    "variationRef": "3600004040",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 07.11.25. Sign & Stamp on 19.11.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_363_25-26_18.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2039,
    "slNo": 39,
    "raBill": "RA-039",
    "date": "OCT--25",
    "vendor": "Maruthi Engg",
    "boqItem": "39.01",
    "description": "[FD/PFI] WO: 3400077282/31.07.25 | Inv: Mec/25-26/105/12.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-039",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 7200.0,
    "isVariation": "N",
    "variationRef": "3400077282",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 08.11.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_Mec_25-26_105_12.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2040,
    "slNo": 40,
    "raBill": "RA-040",
    "date": "OCT--25",
    "vendor": "Maruthi Engg",
    "boqItem": "40.01",
    "description": "[FD/PFI] WO: 3400077282/31.07.25 | Inv: Mec/25-26/104/12.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-040",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 5500.0,
    "isVariation": "N",
    "variationRef": "3400077282",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 08.11.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_Mec_25-26_104_12.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2041,
    "slNo": 41,
    "raBill": "RA-041",
    "date": "SEPT---25",
    "vendor": "Eco Facility Mgt.",
    "boqItem": "41.01",
    "description": "[FD/PFI] WO: 3400078731/30.09.2025 | Inv: Eco/25-26/64/11.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-041",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 201942.0,
    "isVariation": "N",
    "variationRef": "3400078731",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 08.11.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_Eco_25-26_64_11.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2042,
    "slNo": 42,
    "raBill": "RA-042",
    "date": "SEPT---25",
    "vendor": "Eco Facility Mgt.",
    "boqItem": "42.01",
    "description": "[FD/PFI] WO: 3400079441/30.09.2025 | Inv: Eco/25-26/63/11.11.252,65,809",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-042",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 265809.0,
    "isVariation": "N",
    "variationRef": "3400079441",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 08.11.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_Eco_25-26_63_11.11.252,65,809.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2043,
    "slNo": 43,
    "raBill": "RA-043",
    "date": "SEPT---25",
    "vendor": "Ratna contract works",
    "boqItem": "43.01",
    "description": "[All Blocks] WO: WO-2025-001 | Inv: INV-2025-001",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-043",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 377497.0,
    "isVariation": "N",
    "variationRef": "VO-GAG-01",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 10.11.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_INV-2025-001.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2044,
    "slNo": 44,
    "raBill": "RA-044",
    "date": "2025-08-25",
    "vendor": "AG Projects",
    "boqItem": "44.01",
    "description": "[FD] WO: 3600004328/02.08.25 | Inv: AG/43/25-26/10.11.25.",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-044",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 190948.0,
    "isVariation": "N",
    "variationRef": "3600004328",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Verified on 10.11.25.(Removing of old pand & steel)",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_AG_43_25-26_10.11.25..pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2045,
    "slNo": 45,
    "raBill": "RA-045",
    "date": "SEPT---25",
    "vendor": "AG Projects",
    "boqItem": "45.01",
    "description": "[FD] WO: 3400078099/03.09.25 | Inv: AG/44/25-26/10.11.25.",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-045",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 20998.0,
    "isVariation": "N",
    "variationRef": "3400078099",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Verified on 10.11.25.(Removing of Ceiling & wall)",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_AG_44_25-26_10.11.25..pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2046,
    "slNo": 46,
    "raBill": "RA-046",
    "date": "MAY--25",
    "vendor": "Sudhakar Buffing. 360000",
    "boqItem": "46.01",
    "description": "[PFI] WO: 3600003793/27.12.2024 | Inv: 18/sbw/25-26/29.05.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-046",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 28481.0,
    "isVariation": "N",
    "variationRef": "3600003793",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Verified on 12.11.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_18_sbw_25-26_29.05.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2047,
    "slNo": 47,
    "raBill": "RA-047",
    "date": "AUG--25",
    "vendor": "Devi sri(Civil)",
    "boqItem": "47.01",
    "description": "[MUPS/FD] WO: 3400079448/31.10.25 | Inv: 67/devisri/25-26/10.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-047",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9961,
    "unitRate": 255259.0,
    "isVariation": "Y",
    "variationRef": "3400079448",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 12.11.25.",
    "actionRequired": "Variance \u20b91,000 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_67_devisri_25-26_10.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2048,
    "slNo": 48,
    "raBill": "RA-048",
    "date": "AUG--25",
    "vendor": "Sri Lakshmi Co",
    "boqItem": "48.01",
    "description": "[Different] WO: 3400079027/14.10.25 | Inv: 59/25-26/13.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-048",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9796,
    "unitRate": 557717.0,
    "isVariation": "Y",
    "variationRef": "3400079027",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 13.11.25",
    "actionRequired": "Variance \u20b911,356 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_59_25-26_13.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2049,
    "slNo": 49,
    "raBill": "RA-049",
    "date": "JUNE--25",
    "vendor": "SS Rise Boom lift",
    "boqItem": "49.01",
    "description": "[CWH] WO: 3400079407/29.10.25 | Inv: 521/25-26/05.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-049",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 139980.0,
    "isVariation": "N",
    "variationRef": "3400079407",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 12.11.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_521_25-26_05.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2050,
    "slNo": 50,
    "raBill": "RA-050",
    "date": "JULY--25",
    "vendor": "SS Rise Boom lift",
    "boqItem": "50.01",
    "description": "[CWH] WO: 3400079407/29.10.25 | Inv: 522/25-26/05.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-050",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 139980.0,
    "isVariation": "N",
    "variationRef": "3400079407",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 12.11.25.(01.06.25 TO 05.07.25)",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_522_25-26_05.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2051,
    "slNo": 51,
    "raBill": "RA-051",
    "date": "AUG--25",
    "vendor": "SS Rise Boom lift",
    "boqItem": "51.01",
    "description": "[CWH] WO: 3400079407/29.10.25 | Inv: 530/25-26/12.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-051",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 102652.0,
    "isVariation": "N",
    "variationRef": "3400079407",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 12.11.25.(10.08.25 TO 04.09.25)",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_530_25-26_12.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2052,
    "slNo": 52,
    "raBill": "RA-052",
    "date": "SEPT---25",
    "vendor": "SVR Power",
    "boqItem": "52.01",
    "description": "[Different] WO: 3400079629/06.11.25 | Inv: svr/25-26/32/18.11.251,92,125",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-052",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9947,
    "unitRate": 192125.0,
    "isVariation": "Y",
    "variationRef": "3400079629",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 14.11.25.(Corrected as per PO Value)",
    "actionRequired": "Variance \u20b91,012 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_svr_25-26_32_18.11.251,92,125.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2053,
    "slNo": 53,
    "raBill": "RA-053",
    "date": "OCT--25",
    "vendor": "SVR Power",
    "boqItem": "53.01",
    "description": "[Different] WO: 3400080012/20.11.25 | Inv: svr/25-26/34/26.11.25.1,78,608",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-053",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9994,
    "unitRate": 178608.0,
    "isVariation": "Y",
    "variationRef": "3400080012",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 14.11.25. On 07.10.25 ARC rate written wrong.",
    "actionRequired": "Variance \u20b9105 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_svr_25-26_34_26.11.25.1,78,608.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2054,
    "slNo": 54,
    "raBill": "RA-054",
    "date": "OCT--25",
    "vendor": "SKV Electrical",
    "boqItem": "54.01",
    "description": "[Different] WO: WO-2025-001 | Inv: INV-2025-001",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-054",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 173069.0,
    "isVariation": "N",
    "variationRef": "VO-GAG-01",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 14.11.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_INV-2025-001.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2055,
    "slNo": 55,
    "raBill": "RA-055",
    "date": "2025-10-17",
    "vendor": "SVR Power",
    "boqItem": "55.01",
    "description": "[Different] WO: 3600004127/05.02.25 | Inv: svr/25-26/37/26.11.25.13,833",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-055",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9965,
    "unitRate": 13834.0,
    "isVariation": "Y",
    "variationRef": "3600004127",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 17.11.25.",
    "actionRequired": "Variance \u20b948 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_svr_25-26_37_26.11.25.13,833.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2056,
    "slNo": 56,
    "raBill": "RA-056",
    "date": "2025-10-17",
    "vendor": "SVR Power",
    "boqItem": "56.01",
    "description": "[Different] WO: 360003782/23.12.24 | Inv: svr/25-26/36/26.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-056",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9887,
    "unitRate": 244262.0,
    "isVariation": "Y",
    "variationRef": "360003782",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 17.11.25. Cable tray removed QTY. written wrong.",
    "actionRequired": "Variance \u20b92,763 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_svr_25-26_36_26.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2057,
    "slNo": 57,
    "raBill": "RA-057",
    "date": "2025-10-17",
    "vendor": "SVR Power",
    "boqItem": "57.01",
    "description": "[Different] WO: 360004311/28.07.25 | Inv: svr/25-26/35/26.11.25.",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-057",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9955,
    "unitRate": 348497.0,
    "isVariation": "Y",
    "variationRef": "360004311",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 17.11.25.",
    "actionRequired": "Variance \u20b91,552 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_svr_25-26_35_26.11.25..pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2058,
    "slNo": 58,
    "raBill": "RA-058",
    "date": "NOV--25",
    "vendor": "Trisha Ent.",
    "boqItem": "58.01",
    "description": "[FD] WO: 3400073708/17.03.25 | Inv: 13/01.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-058",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 472153.0,
    "isVariation": "N",
    "variationRef": "3400073708",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 18.11.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_13_01.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2059,
    "slNo": 59,
    "raBill": "RA-059",
    "date": "OCT--25",
    "vendor": "Innovative coatings",
    "boqItem": "59.01",
    "description": "[FD] WO: 3600004406/16.09.25 | Inv: Inno/275/25-26/14.10.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-059",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 1214239.0,
    "isVariation": "N",
    "variationRef": "3600004406",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 20.11.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_Inno_275_25-26_14.10.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2060,
    "slNo": 60,
    "raBill": "RA-060",
    "date": "APRIL--25",
    "vendor": "Mundru Infra",
    "boqItem": "60.01",
    "description": "[All Blocks] WO: 3400080174/08.11.25 | Inv: 25-26/128/06.12.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-060",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9433,
    "unitRate": 172189.0,
    "isVariation": "Y",
    "variationRef": "3400080174",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 20.11.25.",
    "actionRequired": "Variance \u20b99,757 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_25-26_128_06.12.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2061,
    "slNo": 61,
    "raBill": "RA-061",
    "date": "June--25",
    "vendor": "Mundru Infra",
    "boqItem": "61.01",
    "description": "[All Blocks] WO: 3400080174/28.11.25 | Inv: 25-26/127/06.12.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-061",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.956,
    "unitRate": 280819.0,
    "isVariation": "Y",
    "variationRef": "3400080174",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 20.11.25.",
    "actionRequired": "Variance \u20b912,357 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_25-26_127_06.12.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2062,
    "slNo": 62,
    "raBill": "RA-062",
    "date": "SEPT---25",
    "vendor": "Sri Lakshmi Co",
    "boqItem": "62.01",
    "description": "[Different] WO: 3400079191/21.10.25 | Inv: 60/25-26/19.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-062",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 281131.0,
    "isVariation": "N",
    "variationRef": "3400079191",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 21.11.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_60_25-26_19.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2063,
    "slNo": 63,
    "raBill": "RA-063",
    "date": "NOV--25",
    "vendor": "VSV Engg",
    "boqItem": "63.01",
    "description": "[FD] WO: 3400079372/28.10.25 | Inv: 49/20.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-063",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 95060.0,
    "isVariation": "N",
    "variationRef": "3400079372",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 21.11.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_49_20.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2064,
    "slNo": 64,
    "raBill": "RA-064",
    "date": "NOV--25",
    "vendor": "VSV Engg",
    "boqItem": "64.01",
    "description": "[Scrapyard] WO: 3600004229/19.06.25 | Inv: 50/20.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-064",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 32360.0,
    "isVariation": "N",
    "variationRef": "3600004229",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Corrected on 22.11.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_50_20.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2065,
    "slNo": 65,
    "raBill": "RA-065",
    "date": "May--25",
    "vendor": "Mundru Infra",
    "boqItem": "65.01",
    "description": "[All Blocks] WO: WO-2025-001 | Inv: INV-2025-001",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-065",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 0.0,
    "isVariation": "N",
    "variationRef": "VO-GAG-01",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 22.11.25.(PR)",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_INV-2025-001.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2066,
    "slNo": 66,
    "raBill": "RA-066",
    "date": "June--25",
    "vendor": "Mundru Infra",
    "boqItem": "66.01",
    "description": "[All Blocks] WO: WO-2025-001 | Inv: INV-2025-001",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-066",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 0.0,
    "isVariation": "N",
    "variationRef": "VO-GAG-01",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 22.11.25.(PR)",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_INV-2025-001.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2067,
    "slNo": 67,
    "raBill": "RA-067",
    "date": "NOV--25",
    "vendor": "Styrax Instt.",
    "boqItem": "67.01",
    "description": "[FD] WO: 3600004296/22.07.25 | Inv: 26/24.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-067",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 55200.0,
    "isVariation": "N",
    "variationRef": "3600004296",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 26.11.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_26_24.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2068,
    "slNo": 68,
    "raBill": "RA-068",
    "date": "NOV--25",
    "vendor": "Styrax Instt.",
    "boqItem": "68.01",
    "description": "[FD] WO: 3600004297/22.07.25 | Inv: 17/24.11.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-068",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 27600.0,
    "isVariation": "N",
    "variationRef": "3600004297",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 26.11.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_17_24.11.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2069,
    "slNo": 69,
    "raBill": "RA-069",
    "date": "NOV--25",
    "vendor": "Siri pharma",
    "boqItem": "69.01",
    "description": "[FD] WO: 3600004409/--.07.25 | Inv: siri/25-26/152/20.11.251,60,755",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-069",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 160755.0,
    "isVariation": "N",
    "variationRef": "3600004409",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 26.11.25",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_siri_25-26_152_20.11.251,60,755.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2070,
    "slNo": 70,
    "raBill": "RA-070",
    "date": "NOV--25",
    "vendor": "AG Projects",
    "boqItem": "70.01",
    "description": "[All Blocks] WO: 3600003775/22.11.25 | Inv: AG/48/25-26/10.11.25.",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-070",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 29165.0,
    "isVariation": "N",
    "variationRef": "3600003775",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Verified on 25.11.25.(Emergency Doors)",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_AG_48_25-26_10.11.25..pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2071,
    "slNo": 71,
    "raBill": "RA-071",
    "date": "NOV--25",
    "vendor": "AG Projects",
    "boqItem": "71.01",
    "description": "[FD] WO: 3600004097/23.04.25 | Inv: AG/50/25-26/22.11.25.",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-071",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 37241.0,
    "isVariation": "N",
    "variationRef": "3600004097",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Verified on 25.11.25.(Emergency Doors)",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_AG_50_25-26_22.11.25..pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2072,
    "slNo": 72,
    "raBill": "RA-072",
    "date": "NOV--25",
    "vendor": "AG Projects",
    "boqItem": "72.01",
    "description": "[CWH] WO: 3600003852/22.11.25 | Inv: AG/47/25-26/27.11.25.",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-072",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.8217,
    "unitRate": 232545.0,
    "isVariation": "Y",
    "variationRef": "3600003852",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Verified on 27.11.25.",
    "actionRequired": "Variance \u20b941,457 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_AG_47_25-26_27.11.25..pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2073,
    "slNo": 73,
    "raBill": "RA-073",
    "date": "NOV--25",
    "vendor": "Trisha Ent.",
    "boqItem": "73.01",
    "description": "[CWH] WO: 3400077748/ 19.10.2025 | Inv: 14/ 01.11.2025",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-073",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 0.0,
    "isVariation": "N",
    "variationRef": "3400077748",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Verified on 08.12.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_14_ 01.11.2025.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2074,
    "slNo": 74,
    "raBill": "RA-074",
    "date": "July--25",
    "vendor": "Mundru Infra",
    "boqItem": "74.01",
    "description": "[All Blocks] WO: 3400080254/03.12.25 | Inv: 25-26/129/06.12.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-074",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.9312,
    "unitRate": 186917.0,
    "isVariation": "Y",
    "variationRef": "3400080254",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 09.12.25.",
    "actionRequired": "Variance \u20b912,858 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_25-26_129_06.12.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2075,
    "slNo": 75,
    "raBill": "RA-075",
    "date": "SEPT---25",
    "vendor": "SVR Power",
    "boqItem": "75.01",
    "description": "[Different] WO: 3600004275/15.07.25 | Inv: svr/25-26/40/10.12.25. 13,833",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-075",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 192001.0,
    "isVariation": "N",
    "variationRef": "3600004275",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 11.12.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_svr_25-26_40_10.12.25. 13,833.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2076,
    "slNo": 76,
    "raBill": "RA-076",
    "date": "AUG--24",
    "vendor": "SVR Power",
    "boqItem": "76.01",
    "description": "[Different] WO: 3400079466/31.10.25 | Inv: svr/25-26/38/10.12.25.",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-076",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 43879.0,
    "isVariation": "N",
    "variationRef": "3400079466",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 11.12.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_svr_25-26_38_10.12.25..pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2077,
    "slNo": 77,
    "raBill": "RA-077",
    "date": "JULY--25",
    "vendor": "SVR Power",
    "boqItem": "77.01",
    "description": "[Different] WO: 3600004145/07.05.25 | Inv: svr/25-26/41/10.12.25.",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-077",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 104489.0,
    "isVariation": "N",
    "variationRef": "3600004145",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 11.12.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_svr_25-26_41_10.12.25..pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2078,
    "slNo": 78,
    "raBill": "RA-078",
    "date": "NOV--25",
    "vendor": "SVR Power",
    "boqItem": "78.01",
    "description": "[Different] WO: 3600003363/09.05.25 | Inv: svr/25-26/39/10.12.25.",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-078",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 19561.0,
    "isVariation": "N",
    "variationRef": "3600003363",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 11.12.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_svr_25-26_39_10.12.25..pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2079,
    "slNo": 79,
    "raBill": "RA-079",
    "date": "OCT--25",
    "vendor": "Vijayshankar",
    "boqItem": "79.01",
    "description": "[Different] WO: 3600003911/26.02.25 | Inv: 52/09.12.25.",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-079",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.8756,
    "unitRate": 156308.0,
    "isVariation": "Y",
    "variationRef": "3600003911",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 11.12.25.",
    "actionRequired": "Variance \u20b919,448 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_52_09.12.25..pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2080,
    "slNo": 80,
    "raBill": "RA-080",
    "date": "NOV--25",
    "vendor": "Vijayshankar",
    "boqItem": "80.01",
    "description": "[Different] WO: 3600004041/25.03.25 | Inv: 53/09.12.25.",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-080",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.8687,
    "unitRate": 213139.0,
    "isVariation": "Y",
    "variationRef": "3600004041",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 11.12.25.(Rs 1,72.120/- claimed due to PO value.",
    "actionRequired": "Variance \u20b927,984 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_53_09.12.25..pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2081,
    "slNo": 81,
    "raBill": "RA-081",
    "date": "DEC--25",
    "vendor": "Trisha Ent.",
    "boqItem": "81.01",
    "description": "[MUPS] WO: 3400079769/ 12.11.2025 | Inv: 16/ 01.12.2025",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-081",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 0.0,
    "isVariation": "N",
    "variationRef": "3400079769",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Verified on 11.12.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_16_ 01.12.2025.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2082,
    "slNo": 82,
    "raBill": "RA-082",
    "date": "DEC--25",
    "vendor": "Trisha Ent.",
    "boqItem": "82.01",
    "description": "[MUPS] WO: 3400077583/ 14.08.2025 | Inv: 15/ 01.12.2025",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-082",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 0.0,
    "isVariation": "N",
    "variationRef": "3400077583",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill Verified on 11.12.25.",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_15_ 01.12.2025.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2083,
    "slNo": 83,
    "raBill": "RA-083",
    "date": "OCT--25",
    "vendor": "Mundru Infra",
    "boqItem": "83.01",
    "description": "[All Blocks] WO: 3400080320/04.12.25 | Inv: 25-26/130/10.12.25",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-083",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 0.7467,
    "unitRate": 168683.0,
    "isVariation": "Y",
    "variationRef": "3400080320",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Bill verified on 11.12.25.",
    "actionRequired": "Variance \u20b942,723 Deducted & Corrected",
    "targetDate": "2025-12-31",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Invoice_25-26_130_10.12.25.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  },
  {
    "id": 2084,
    "slNo": 84,
    "raBill": "RA-084",
    "date": "2025-10-17",
    "vendor": "General Vendor",
    "boqItem": "84.01",
    "description": "[Block Main] WO: WO-2025-001 | Inv: INV-2025-001",
    "unit": "LS",
    "gfcDrawingRef": "GFC-GIL-GAG-084",
    "boqQty": 1,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 1,
    "tpiVerifiedQty": 1.0,
    "unitRate": 0.0,
    "isVariation": "N",
    "variationRef": "VO-GAG-01",
    "contractClause": "Clause 12.3 (Bill Verification & Audit)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification & Bill Audit",
    "observation": "Verified by TPI Engineer",
    "actionRequired": "Verified & Recommended for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Invoice_INV-2025-001.pdf",
      "TPI_Verification_Sheet.pdf"
    ]
  }
];
const ATOM_DATA: BillItem[] = [
  {
    "id": 3001,
    "slNo": 1,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "1.01",
    "description": "6' MS DP Fab.",
    "unit": "No",
    "gfcDrawingRef": "GFC-ATOM-001",
    "boqQty": 45,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 45,
    "tpiVerifiedQty": 0,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 45.0, Verified: 0.0. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_1.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3002,
    "slNo": 2,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "2.01",
    "description": "6' SS DP Fab.",
    "unit": "No",
    "gfcDrawingRef": "GFC-ATOM-002",
    "boqQty": 90,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 90,
    "tpiVerifiedQty": 45,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 90.0, Verified: 45.0. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_2.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3003,
    "slNo": 3,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "3.01",
    "description": "8' MS DP Fab.",
    "unit": "No",
    "gfcDrawingRef": "GFC-ATOM-003",
    "boqQty": 8,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 8,
    "tpiVerifiedQty": 0,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 8.0, Verified: 0.0. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_3.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3004,
    "slNo": 4,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "4.01",
    "description": "8' SS DP Fab.",
    "unit": "No",
    "gfcDrawingRef": "GFC-ATOM-004",
    "boqQty": 16,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 16,
    "tpiVerifiedQty": 8,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 16.0, Verified: 8.0. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_4.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3005,
    "slNo": 5,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "5.01",
    "description": "3' MS DP Fab.",
    "unit": "No",
    "gfcDrawingRef": "GFC-ATOM-005",
    "boqQty": 7,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 7,
    "tpiVerifiedQty": 0,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 7.0, Verified: 0.0. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_5.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3006,
    "slNo": 6,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "6.01",
    "description": "3' SS DP Fab.",
    "unit": "No",
    "gfcDrawingRef": "GFC-ATOM-006",
    "boqQty": 14,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 14,
    "tpiVerifiedQty": 7,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 14.0, Verified: 7.0. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_6.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3007,
    "slNo": 7,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "7.01",
    "description": "6' MS Pipe line/Bends/Reduc.",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-007",
    "boqQty": 291,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 291,
    "tpiVerifiedQty": 274,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 291.4, Verified: 274.2. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_7.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3008,
    "slNo": 8,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "8.01",
    "description": "6' MS Pipe line/Bends/Reduc.",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-008",
    "boqQty": 432,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 432,
    "tpiVerifiedQty": 406,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 432.6, Verified: 406.2. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_8.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3009,
    "slNo": 9,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "9.01",
    "description": "8' MS Pipe line/Bends/Reduc.",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-009",
    "boqQty": 291,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 291,
    "tpiVerifiedQty": 274,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 291.4, Verified: 274.2. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_9.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3010,
    "slNo": 10,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "10.01",
    "description": "6' MS Pipe line/ Reducers",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-010",
    "boqQty": 275,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 275,
    "tpiVerifiedQty": 272,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 275.6, Verified: 272.8. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_10.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3011,
    "slNo": 11,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "11.01",
    "description": "4' MS Pipe line/Bends/Reduc.",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-011",
    "boqQty": 131,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 131,
    "tpiVerifiedQty": 130,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 131.7, Verified: 130.1. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_11.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3012,
    "slNo": 12,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "12.01",
    "description": "4' MS Pipe line/Bends/Reduc.",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-012",
    "boqQty": 68,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 68,
    "tpiVerifiedQty": 64,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 68.8, Verified: 64.4. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_12.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3013,
    "slNo": 13,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "13.01",
    "description": "6' MS Pipe line/Bends/Reduc.",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-013",
    "boqQty": 68,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 68,
    "tpiVerifiedQty": 64,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 68.8, Verified: 64.4. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_13.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3014,
    "slNo": 14,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "14.01",
    "description": "4' MS Pipe line/Bends/Reduc.",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-014",
    "boqQty": 68,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 68,
    "tpiVerifiedQty": 64,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 68.8, Verified: 64.4. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_14.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3015,
    "slNo": 15,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "15.01",
    "description": "1.5'' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-015",
    "boqQty": 86,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 86,
    "tpiVerifiedQty": 75,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 86.3, Verified: 75.9. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_15.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3016,
    "slNo": 16,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "16.01",
    "description": "2' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-016",
    "boqQty": 513,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 513,
    "tpiVerifiedQty": 444,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 513.65, Verified: 444.5. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_16.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3017,
    "slNo": 17,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "17.01",
    "description": "3' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-017",
    "boqQty": 58,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 58,
    "tpiVerifiedQty": 52,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 58.1, Verified: 52.1. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_17.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3018,
    "slNo": 18,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "18.01",
    "description": "1.5' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-018",
    "boqQty": 66,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 66,
    "tpiVerifiedQty": 56,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 66.9, Verified: 56.4. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_18.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3019,
    "slNo": 19,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "19.01",
    "description": "3' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-019",
    "boqQty": 83,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 83,
    "tpiVerifiedQty": 82,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 83.9, Verified: 82.8. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_19.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3020,
    "slNo": 20,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "20.01",
    "description": "1' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-020",
    "boqQty": 48,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 48,
    "tpiVerifiedQty": 46,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 48.7, Verified: 46.2. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_20.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3021,
    "slNo": 21,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "21.01",
    "description": "1.5' LIne",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-021",
    "boqQty": 48,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 48,
    "tpiVerifiedQty": 40,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 48.9, Verified: 40.9. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_21.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3022,
    "slNo": 22,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "22.01",
    "description": "2' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-022",
    "boqQty": 43,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 43,
    "tpiVerifiedQty": 41,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 43.5, Verified: 41.5. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_22.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3023,
    "slNo": 23,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "23.01",
    "description": "1' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-023",
    "boqQty": 51,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 51,
    "tpiVerifiedQty": 47,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 51.2, Verified: 47.0. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_23.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3024,
    "slNo": 24,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "24.01",
    "description": "2' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-024",
    "boqQty": 13,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 13,
    "tpiVerifiedQty": 12,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 13.2, Verified: 12.5. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_24.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3025,
    "slNo": 25,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "25.01",
    "description": "Condenser & Flanges",
    "unit": "Sq.Mt",
    "gfcDrawingRef": "GFC-ATOM-025",
    "boqQty": 6,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 6,
    "tpiVerifiedQty": 3,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 6.98, Verified: 3.84. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_25.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3026,
    "slNo": 26,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "26.01",
    "description": "2' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-026",
    "boqQty": 13,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 13,
    "tpiVerifiedQty": 12,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 13.75, Verified: 12.9. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_26.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3027,
    "slNo": 27,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "27.01",
    "description": "2' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-027",
    "boqQty": 7,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 7,
    "tpiVerifiedQty": 6,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 7.5, Verified: 6.6. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_27.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3028,
    "slNo": 28,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "28.01",
    "description": "Condenser & Flanges",
    "unit": "Sq.Mt",
    "gfcDrawingRef": "GFC-ATOM-028",
    "boqQty": 8,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 8,
    "tpiVerifiedQty": 8,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 8.6, Verified: 8.2. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_28.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3029,
    "slNo": 29,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "29.01",
    "description": "2' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-029",
    "boqQty": 9,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 9,
    "tpiVerifiedQty": 8,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 9.4, Verified: 8.8. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_29.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3030,
    "slNo": 30,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "30.01",
    "description": "2' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-030",
    "boqQty": 6,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 6,
    "tpiVerifiedQty": 6,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 6.7, Verified: 6.1. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_30.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3031,
    "slNo": 31,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "31.01",
    "description": "1.5' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-031",
    "boqQty": 85,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 85,
    "tpiVerifiedQty": 79,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 85.2, Verified: 79.8. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_31.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3032,
    "slNo": 32,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "32.01",
    "description": "1' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-032",
    "boqQty": 89,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 89,
    "tpiVerifiedQty": 85,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 89.4, Verified: 85.8. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_32.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3033,
    "slNo": 33,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "33.01",
    "description": "1.5' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-033",
    "boqQty": 94,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 94,
    "tpiVerifiedQty": 91,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 94.8, Verified: 91.8. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_33.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3034,
    "slNo": 34,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "34.01",
    "description": "1' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-034",
    "boqQty": 155,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 155,
    "tpiVerifiedQty": 148,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 155.4, Verified: 148.6. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_34.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3035,
    "slNo": 35,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "35.01",
    "description": "3' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-035",
    "boqQty": 94,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 94,
    "tpiVerifiedQty": 87,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 94.6, Verified: 87.3. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_35.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3036,
    "slNo": 36,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "36.01",
    "description": "3' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-036",
    "boqQty": 92,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 92,
    "tpiVerifiedQty": 88,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 92.2, Verified: 88.4. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_36.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3037,
    "slNo": 37,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "37.01",
    "description": "3' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-037",
    "boqQty": 11,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 11,
    "tpiVerifiedQty": 11,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 11.9, Verified: 11.3. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_37.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3038,
    "slNo": 38,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "38.01",
    "description": "3' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-038",
    "boqQty": 80,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 80,
    "tpiVerifiedQty": 71,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 80.0, Verified: 71.0. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_38.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3039,
    "slNo": 39,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "39.01",
    "description": "2' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-039",
    "boqQty": 72,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 72,
    "tpiVerifiedQty": 71,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 72.4, Verified: 71.8. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_39.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3040,
    "slNo": 40,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "40.01",
    "description": "3' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-040",
    "boqQty": 150,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 150,
    "tpiVerifiedQty": 139,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 150.8, Verified: 139.1. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_40.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3041,
    "slNo": 41,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "41.01",
    "description": "2' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-041",
    "boqQty": 146,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 146,
    "tpiVerifiedQty": 138,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 146.6, Verified: 138.0. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_41.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3042,
    "slNo": 42,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "42.01",
    "description": "1.5' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-042",
    "boqQty": 71,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 71,
    "tpiVerifiedQty": 65,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 71.2, Verified: 65.4. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_42.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3043,
    "slNo": 43,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "43.01",
    "description": "2' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-043",
    "boqQty": 302,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 302,
    "tpiVerifiedQty": 280,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 302.6, Verified: 280.7. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_43.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3044,
    "slNo": 44,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "44.01",
    "description": "1.5' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-044",
    "boqQty": 21,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 21,
    "tpiVerifiedQty": 20,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 21.4, Verified: 20.2. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_44.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3045,
    "slNo": 45,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "45.01",
    "description": "1' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-045",
    "boqQty": 27,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 27,
    "tpiVerifiedQty": 26,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 27.6, Verified: 26.5. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_45.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3046,
    "slNo": 46,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "46.01",
    "description": "2' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-046",
    "boqQty": 19,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 19,
    "tpiVerifiedQty": 17,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 19.6, Verified: 17.6. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_46.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3047,
    "slNo": 47,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "47.01",
    "description": "1.5' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-047",
    "boqQty": 13,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 13,
    "tpiVerifiedQty": 11,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 13.2, Verified: 11.7. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_47.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3048,
    "slNo": 48,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "48.01",
    "description": "1.5' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-048",
    "boqQty": 179,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 179,
    "tpiVerifiedQty": 171,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 179.3, Verified: 171.6. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_48.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3049,
    "slNo": 49,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "49.01",
    "description": "2' Line",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-049",
    "boqQty": 193,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 193,
    "tpiVerifiedQty": 187,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 193.6, Verified: 187.0. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_49.pdf",
      "TPI_Checksheet.pdf"
    ]
  },
  {
    "id": 3050,
    "slNo": 50,
    "raBill": "RA-001",
    "date": "2026-05-14",
    "vendor": "Quality Engineers (I) Pvt Ltd",
    "boqItem": "50.01",
    "description": "3' Valve/T-Piece",
    "unit": "MT",
    "gfcDrawingRef": "GFC-ATOM-050",
    "boqQty": 96,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 96,
    "tpiVerifiedQty": 81,
    "unitRate": 1200,
    "isVariation": "Y",
    "variationRef": "VO-ATOM-01",
    "contractClause": "Clause 14.2 (Piping & Equipment Verification)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Billed: 96.8, Verified: 81.4. Line item removed or adjusted per TPI verification.",
    "actionRequired": "Deducted non-installed cut spools",
    "targetDate": "2026-06-30",
    "closureStatus": "Open / Pending Correction",
    "attachments": [
      "Atom_Drawing_50.pdf",
      "TPI_Checksheet.pdf"
    ]
  }
];
const SUVEN_DATA: BillItem[] = [
  {
    "id": 4001,
    "slNo": 1,
    "raBill": "RA-001",
    "date": "2025-12-13",
    "vendor": "SVS CONSTRUCTIONS",
    "boqItem": "1.01",
    "description": "Supply & laying of RCC M25 upto 4.25m Level (ETP Office, Lab Lintels, Handrail)",
    "unit": "CUM",
    "gfcDrawingRef": "GFC-SUV-001",
    "boqQty": 11,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 11,
    "tpiVerifiedQty": 10.613,
    "unitRate": 4100,
    "isVariation": "N",
    "variationRef": "WO-4443",
    "contractClause": "Clause 5.1 (RCC Works)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Verified 10.613 CUM concrete pour with slump & cube test reports.",
    "actionRequired": "Verified OK for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Suven_Measurement_Sheet_P1.pdf",
      "Cube_Test_Cert.pdf"
    ]
  },
  {
    "id": 4002,
    "slNo": 2,
    "raBill": "RA-001",
    "date": "2025-12-13",
    "vendor": "SV Enterprises",
    "boqItem": "2.01",
    "description": "Plastering to walls outside building with 20mm thickness in 1:5 ratio with Dr Fixit",
    "unit": "SQM",
    "gfcDrawingRef": "GFC-SUV-002",
    "boqQty": 600,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 600,
    "tpiVerifiedQty": 591.553,
    "unitRate": 724,
    "isVariation": "Y",
    "variationRef": "VO-SUV-02",
    "contractClause": "Clause 8.4 (Waterproof Plastering)",
    "isHiddenWork": "Y",
    "measurementType": "Joint Concealed Work Inspection",
    "observation": "Physical tape measurement showed 591.553 SQM after window/door deductions.",
    "actionRequired": "8.447 SQM Deduction Applied",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "Plaster_Deduction_Sheet.pdf"
    ]
  },
  {
    "id": 4003,
    "slNo": 3,
    "raBill": "RA-001",
    "date": "2025-12-13",
    "vendor": "SVS CONSTRUCTIONS",
    "boqItem": "3.01",
    "description": "Plum Concrete 16mm steel fixing by GP2 & Water proof Plywood shuttering",
    "unit": "CUM",
    "gfcDrawingRef": "GFC-SUV-003",
    "boqQty": 33,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 33,
    "tpiVerifiedQty": 32.324,
    "unitRate": 4100,
    "isVariation": "N",
    "variationRef": "WO-50054",
    "contractClause": "Clause 3.2 (Plum Concrete)",
    "isHiddenWork": "N",
    "measurementType": "Joint Physical Verification",
    "observation": "Verified 32.324 CUM against PO 50054 abstract sheet.",
    "actionRequired": "Verified OK for Payment",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "PO_50054_Abstract.pdf"
    ]
  },
  {
    "id": 4004,
    "slNo": 4,
    "raBill": "RA-001",
    "date": "2025-12-13",
    "vendor": "SV Enterprises",
    "boqItem": "4.01",
    "description": "Asian Apex Exterior Paint Two Coats with Primer on Bio Tank & C.Tank",
    "unit": "SQM",
    "gfcDrawingRef": "GFC-SUV-004",
    "boqQty": 3400,
    "prevCertifiedQty": 0,
    "contractorClaimedQty": 3400,
    "tpiVerifiedQty": 3322.55,
    "unitRate": 150,
    "isVariation": "Y",
    "variationRef": "VO-SUV-04",
    "contractClause": "Clause 17.1 (Exterior Painting)",
    "isHiddenWork": "N",
    "measurementType": "Surface Area & DFT Gauge Verification",
    "observation": "DFT gauge verification passed 110 microns. Measured 3322.55 SQM net area.",
    "actionRequired": "Deducted unpainted scaffolding overhang",
    "targetDate": "2025-12-31",
    "closureStatus": "Closed",
    "attachments": [
      "DFT_Report_AsianApex.pdf"
    ]
  }
];

const CLIENT_ITEMS_MAP: Record<string, BillItem[]> = {
  "Granules India Limited - Gagillapur": GRANULES_DATA,
  "Atom Project (New Atom Project)": ATOM_DATA,
  "Suven Pharmaceuticals Ltd (Chonce Life Science)": SUVEN_DATA,
  "MCGM (Greater Mumbai Corp)": ATOM_DATA.slice(0, 10),
  "S2 / Standard Client": SUVEN_DATA,
};

function TooltipCell({ text, maxLength = 28, className = "" }: { text: string; maxLength?: number; className?: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isTruncated = text && text.length > maxLength;

  return (
    <div
      className={`relative group inline-block ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="truncate max-w-[210px] cursor-help" title={text}>
        {text}
      </div>
      {showTooltip && isTruncated && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 bg-slate-900 text-white text-[11px] p-3 rounded-2xl shadow-2xl border border-slate-700 leading-relaxed pointer-events-none break-words font-sans">
          <div className="font-extrabold text-sky-400 mb-1 flex items-center gap-1.5 text-xs">
            <Eye className="w-3.5 h-3.5" /> Full Specification Detail
          </div>
          <p className="text-slate-200 font-medium">{text}</p>
        </div>
      )}
    </div>
  );
}

export default function TPIBillingPage() {
  const [selectedClient, setSelectedClient] = useState<string>("Granules India Limited - Gagillapur");
  const [items, setItems] = useState<BillItem[]>(GRANULES_DATA);
  const [activeTab, setActiveTab] = useState<"ledger" | "ai" | "files" | "deliverables" | "audit" | "concealed">("ledger");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [quickFilter, setQuickFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"horizontal" | "cards">("horizontal");
  const [isInlineEditMode, setIsInlineEditMode] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<"TPI Engineer" | "Super Admin" | "Tenant PM" | "Contractor">("TPI Engineer");
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string>("/api/v1/reports/pdf/tpi-billing");
  const [previewPdfTitle, setPreviewPdfTitle] = useState<string>("TPI Bill Verification Master Report");
  const [previewReportNo, setPreviewReportNo] = useState<string>("F-BILL-01");

  const [tpiMode, setTpiMode] = useState<TpiInspectionMode>("epc_sponsored");

  const initialDetails = CLIENT_DETAILS_MAP["Granules India Limited - Gagillapur"];
  const [selectedVendor, setSelectedVendor] = useState<string>(initialDetails.vendor);
  const [contractRef, setContractRef] = useState<string>(initialDetails.contractRef);
  const [projectName, setProjectName] = useState<string>(initialDetails.projectName);
  const [projectLocation, setProjectLocation] = useState<string>(initialDetails.projectLocation);
  const [poNumber, setPoNumber] = useState<string>(initialDetails.poNumber);
  const [poDate, setPoDate] = useState<string>(initialDetails.poDate);
  const [endClient, setEndClient] = useState<string>(initialDetails.endClient);
  const [epcContractor, setEpcContractor] = useState<string>(initialDetails.epcContractor);
  const [supplierVendor, setSupplierVendor] = useState<string>(initialDetails.supplierVendor);

  const handleClientChange = (client: string) => {
    setSelectedClient(client);
    const details = CLIENT_DETAILS_MAP[client] || {
      projectName: `${client} Project`,
      projectLocation: "Industrial Site, India",
      vendor: CLIENT_VENDOR_MAP[client]?.[0] || VENDOR_OPTIONS[0],
      contractRef: `CON-${client.slice(0, 4).toUpperCase()}-2025-001`,
      poNumber: `PO-${client.slice(0, 4).toUpperCase()}-2025-9901`,
      poDate: "2025-10-17",
      endClient: `${client} (Asset Owner)`,
      epcContractor: CLIENT_VENDOR_MAP[client]?.[0] || VENDOR_OPTIONS[0],
      supplierVendor: "General Sub-Vendor",
    };
    setSelectedVendor(details.vendor);
    setProjectName(details.projectName);
    setProjectLocation(details.projectLocation);
    setContractRef(details.contractRef);
    setPoNumber(details.poNumber);
    setPoDate(details.poDate);
    setEndClient(details.endClient);
    setEpcContractor(details.epcContractor);
    setSupplierVendor(details.supplierVendor);

    const newItems = CLIENT_ITEMS_MAP[client] || [];
    setItems(newItems);
  };

  const [editingItem, setEditingItem] = useState<BillItem | null>(null);
  const [viewingItemDetail, setViewingItemDetail] = useState<any>(null);
  const [attachmentModalItem, setAttachmentModalItem] = useState<BillItem | null>(null);
  const [newFileName, setNewFileName] = useState<string>("");
  const [newFileCategory, setNewFileCategory] = useState<string>("Joint Measurement Report");
  const [showAddItemModal, setShowAddItemModal] = useState<boolean>(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<string>("Payment Recommendation Note");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [dateVersionFilter, setDateVersionFilter] = useState<"ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH">("ALL");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [showSubModuleDropdown, setShowSubModuleDropdown] = useState(false);
  const [selectedSubModule, setSelectedSubModule] = useState<string>("boq_ledger");

  const subModuleLabels: Record<string, string> = {
    boq_ledger: "1. BOQ Measurement Ledger",
    savings_audit: "2. Over-Claim Savings & Variance",
    iso_compliance: "3. Inspection Certificates",
    attachments_docs: "4. Drawings & Document Attachments",
    audit_trail: "5. Audit Trail & History",
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const verifyBoq = urlParams.get("verify_boq");
      if (verifyBoq) {
        const found = items.find((i) => i.boqItem === verifyBoq || i.boqItem.startsWith(verifyBoq));
        if (found) {
          setDetailsItem(found);
          setShowDetailsRowModal(true);
        }
      }
    }
  }, [items]);

  const availableVendorsForClient = useMemo(() => {
    return CLIENT_VENDOR_MAP[selectedClient] || VENDOR_OPTIONS;
  }, [selectedClient]);

  const processedItems = useMemo(() => {
    return items.map((item) => {
      const balanceQty = item.boqQty - item.prevCertifiedQty;
      const diffQty = item.contractorClaimedQty - item.tpiVerifiedQty;
      const claimedAmt = item.contractorClaimedQty * item.unitRate;
      const recommendedAmt = item.tpiVerifiedQty * item.unitRate;
      let status: "Accepted" | "Over Claimed" | "Under Claimed" = "Accepted";
      if (diffQty > 0) status = "Over Claimed";
      else if (diffQty < 0) status = "Under Claimed";

      return {
        ...item,
        balanceQty,
        diffQty,
        claimedAmt,
        recommendedAmt,
        status,
      };
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    return processedItems.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACCEPTED" && item.status === "Accepted") ||
        (statusFilter === "OVER_CLAIMED" && item.status === "Over Claimed") ||
        (statusFilter === "UNDER_CLAIMED" && item.status === "Under Claimed");

      let matchesQuick = true;
      if (quickFilter === "OVER_CLAIMED") matchesQuick = item.status === "Over Claimed";
      if (quickFilter === "PENDING_CERT") matchesQuick = item.closureStatus.includes("Pending") || item.closureStatus.includes("Open");
      if (quickFilter === "HIGH_VALUE") matchesQuick = item.claimedAmt >= 10000;
      if (quickFilter === "HIDDEN_WORK") matchesQuick = item.isHiddenWork === "Y";

      const matchesSearch =
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.boqItem.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.gfcDrawingRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.vendor.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesQuick && matchesSearch;
    });
  }, [processedItems, statusFilter, quickFilter, searchQuery]);

  const totalClaimedAmount = useMemo(() => processedItems.reduce((acc, curr) => acc + curr.claimedAmt, 0), [processedItems]);
  const totalRecommendedAmount = useMemo(() => processedItems.reduce((acc, curr) => acc + curr.recommendedAmt, 0), [processedItems]);
  const totalSavingsVariance = totalClaimedAmount - totalRecommendedAmount;
  const overClaimedCount = processedItems.filter((i) => i.status === "Over Claimed").length;
  const hiddenWorkCount = processedItems.filter((i) => i.isHiddenWork === "Y").length;
  const totalAttachmentsCount = processedItems.reduce((acc, curr) => acc + curr.attachments.length, 0);

  const handleCellChange = (id: number, field: keyof BillItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Modals & Row Management State
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [showEditRowModal, setShowEditRowModal] = useState(false);
  const [showDetailsRowModal, setShowDetailsRowModal] = useState(false);
  const [rowEditingItem, setRowEditingItem] = useState<BillItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<BillItem | null>(null);

  // Form State for Add / Edit Row (All 27 Fields)
  const [rowBoqItem, setRowBoqItem] = useState("1.01"); // Field 1
  const [rowRaBill, setRowRaBill] = useState("RA-001"); // Field 2
  const [rowDate, setRowDate] = useState(new Date().toISOString().split("T")[0]); // Field 3
  const [rowClient, setRowClient] = useState(""); // Field 4
  const [rowVendor, setRowVendor] = useState(VENDOR_OPTIONS[0]); // Field 5
  const [rowDescription, setRowDescription] = useState(""); // Field 6
  const [rowUnit, setRowUnit] = useState("LS"); // Field 7
  const [rowGfcRef, setRowGfcRef] = useState("GFC-REF-001"); // Field 8
  const [rowBoqQty, setRowBoqQty] = useState<number>(100); // Field 9
  const [rowPrevCertifiedQty, setRowPrevCertifiedQty] = useState<number>(0); // Field 10
  const [rowClaimedQty, setRowClaimedQty] = useState<number>(100); // Field 11
  const [rowTpiQty, setRowTpiQty] = useState<number>(95); // Field 12
  const [rowUnitRate, setRowUnitRate] = useState<number>(50000); // Field 14
  const [rowIsVariation, setRowIsVariation] = useState<"Y" | "N">("N"); // Field 18
  const [rowVariationRef, setRowVariationRef] = useState("VO-001"); // Field 19
  const [rowContractClause, setRowContractClause] = useState("Clause 12.3 (Bill Verification & Audit)"); // Field 20
  const [rowIsHiddenWork, setRowIsHiddenWork] = useState<"Y" | "N">("N"); // Field 21
  const [rowMeasurementType, setRowMeasurementType] = useState(MEASUREMENT_TYPE_OPTIONS[0]); // Field 22
  const [rowObservation, setRowObservation] = useState("Joint Physical Verification Completed"); // Field 23
  const [rowActionRequired, setRowActionRequired] = useState("Variance Deducted & Corrected"); // Field 24
  const [rowTargetDate, setRowTargetDate] = useState("2026-12-31"); // Field 25
  const [rowClosureStatus, setRowClosureStatus] = useState<"Closed" | "Open / Pending Correction" | "In Progress" | "Approved for Payment">("Closed"); // Field 26
  const [rowIsLocked, setRowIsLocked] = useState<boolean>(false); // Field 27

  // Live Auto Calculations for Financials & Variance
  const rowDiffQty = useMemo(() => Number(rowClaimedQty || 0) - Number(rowTpiQty || 0), [rowClaimedQty, rowTpiQty]); // Field 13
  const rowClaimedAmt = useMemo(() => Number(rowClaimedQty || 0) * Number(rowUnitRate || 0), [rowClaimedQty, rowUnitRate]); // Field 15
  const rowRecommendedAmt = useMemo(() => Number(rowTpiQty || 0) * Number(rowUnitRate || 0), [rowTpiQty, rowUnitRate]); // Field 16
  const rowSavingsAmt = useMemo(() => rowDiffQty * Number(rowUnitRate || 0), [rowDiffQty, rowUnitRate]); // Field 17

  const handleOpenAddRowModal = () => {
    setRowEditingItem(null);
    const sl = items.length + 1;
    const availableVendors = CLIENT_VENDOR_MAP[selectedClient] || VENDOR_OPTIONS;

    setRowBoqItem(`${sl}.01`); // #1
    setRowRaBill(`RA-${sl.toString().padStart(3, "0")}`); // #2
    setRowDate(new Date().toISOString().split("T")[0]); // #3
    setRowClient(selectedClient); // #4
    setRowVendor(availableVendors[0] || VENDOR_OPTIONS[0]); // #5
    setRowDescription(`[${selectedClient.substring(0, 18)}] TPI Measurement & Bill Verification Item`); // #6
    setRowUnit("LS"); // #7
    setRowGfcRef(`GFC-${selectedClient.substring(0, 3).toUpperCase()}-${sl.toString().padStart(3, "0")}`); // #8
    setRowBoqQty(100); // #9
    setRowPrevCertifiedQty(0); // #10
    setRowClaimedQty(100); // #11
    setRowTpiQty(95); // #12
    setRowUnitRate(50000); // #14
    setRowIsVariation("N"); // #18
    setRowVariationRef(`VO-RA-${sl.toString().padStart(3, "0")}`); // #19
    setRowContractClause("Clause 12.3 (Bill Verification & Audit)"); // #20
    setRowIsHiddenWork("N"); // #21
    setRowMeasurementType(MEASUREMENT_TYPE_OPTIONS[0]); // #22
    setRowObservation("Joint Physical Verification Completed & Audit Recommended"); // #23
    setRowActionRequired("Variance Deducted & Corrected"); // #24
    setRowTargetDate("2026-12-31"); // #25
    setRowClosureStatus("Closed"); // #26
    setRowIsLocked(false); // #27

    setShowAddRowModal(true);
  };

  const handleOpenEditRowModal = (item: BillItem) => {
    setRowEditingItem(item);
    setRowBoqItem(item.boqItem); // #1
    setRowRaBill(item.raBill); // #2
    setRowDate(item.date); // #3
    setRowClient(selectedClient); // #4
    setRowVendor(item.vendor); // #5
    setRowDescription(item.description); // #6
    setRowUnit(item.unit); // #7
    setRowGfcRef(item.gfcDrawingRef); // #8
    setRowBoqQty(item.boqQty); // #9
    setRowPrevCertifiedQty(item.prevCertifiedQty || 0); // #10
    setRowClaimedQty(item.contractorClaimedQty); // #11
    setRowTpiQty(item.tpiVerifiedQty); // #12
    setRowUnitRate(item.unitRate); // #14
    setRowIsVariation(item.isVariation || (item.contractorClaimedQty !== item.tpiVerifiedQty ? "Y" : "N")); // #18
    setRowVariationRef(item.variationRef || `VO-${item.raBill}`); // #19
    setRowContractClause(item.contractClause || "Clause 12.3 (Bill Verification & Audit)"); // #20
    setRowIsHiddenWork(item.isHiddenWork || "N"); // #21
    setRowMeasurementType(item.measurementType || MEASUREMENT_TYPE_OPTIONS[0]); // #22
    setRowObservation(item.observation); // #23
    setRowActionRequired(item.actionRequired || (item.contractorClaimedQty !== item.tpiVerifiedQty ? "Variance Deducted & Corrected" : "Verified & Recommended for Payment")); // #24
    setRowTargetDate(item.targetDate || "2026-12-31"); // #25
    setRowClosureStatus(item.closureStatus); // #26
    setRowIsLocked(!!item.isLocked); // #27

    setShowEditRowModal(true);
  };

  const handleOpenDetailsRowModal = (item: BillItem) => {
    setDetailsItem(item);
    setShowDetailsRowModal(true);
  };

  const handleSaveAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: BillItem = {
      id: Date.now(),
      slNo: items.length + 1,
      boqItem: rowBoqItem, // #1
      raBill: rowRaBill, // #2
      date: rowDate, // #3
      vendor: rowVendor, // #5
      description: rowDescription, // #6
      unit: rowUnit, // #7
      gfcDrawingRef: rowGfcRef, // #8
      boqQty: Number(rowBoqQty), // #9
      prevCertifiedQty: Number(rowPrevCertifiedQty), // #10
      contractorClaimedQty: Number(rowClaimedQty), // #11
      tpiVerifiedQty: Number(rowTpiQty), // #12
      unitRate: Number(rowUnitRate), // #14
      isVariation: rowIsVariation, // #18
      variationRef: rowVariationRef, // #19
      contractClause: rowContractClause, // #20
      isHiddenWork: rowIsHiddenWork, // #21
      measurementType: rowMeasurementType, // #22
      observation: rowObservation, // #23
      actionRequired: rowActionRequired, // #24
      targetDate: rowTargetDate, // #25
      closureStatus: rowClosureStatus, // #26
      attachments: ["Invoice_Attachment.pdf", "TPI_Verification_Sheet.pdf"],
      isLocked: rowIsLocked, // #27
    };

    setItems((prev) => [newItem, ...prev]);
    setShowAddRowModal(false);
  };

  const handleSaveEditRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rowEditingItem) return;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === rowEditingItem.id) {
          return {
            ...i,
            boqItem: rowBoqItem,
            raBill: rowRaBill,
            date: rowDate,
            vendor: rowVendor,
            description: rowDescription,
            unit: rowUnit,
            gfcDrawingRef: rowGfcRef,
            boqQty: Number(rowBoqQty),
            prevCertifiedQty: Number(rowPrevCertifiedQty),
            contractorClaimedQty: Number(rowClaimedQty),
            tpiVerifiedQty: Number(rowTpiQty),
            unitRate: Number(rowUnitRate),
            isVariation: rowIsVariation,
            variationRef: rowVariationRef,
            contractClause: rowContractClause,
            isHiddenWork: rowIsHiddenWork,
            measurementType: rowMeasurementType,
            observation: rowObservation,
            actionRequired: rowActionRequired,
            targetDate: rowTargetDate,
            closureStatus: rowClosureStatus,
            isLocked: rowIsLocked,
          };
        }
        return i;
      })
    );
    setShowEditRowModal(false);
  };

  const handleExportSingleRowCSV = (item: BillItem) => {
    const claimedAmt = item.contractorClaimedQty * item.unitRate;
    const recommendedAmt = item.tpiVerifiedQty * item.unitRate;
    const diffQty = item.contractorClaimedQty - item.tpiVerifiedQty;
    const status = diffQty > 0 ? "Over Claimed" : "Verified OK";

    const data = [
      ["BOQ Item", item.boqItem],
      ["RA Bill", item.raBill],
      ["Date", item.date],
      ["Contractor / Vendor", item.vendor],
      ["Description / Invoice", item.description],
      ["Unit", item.unit],
      ["Drawing / Ref", item.gfcDrawingRef],
      ["BOQ Qty", item.boqQty],
      ["Contractor Claimed Qty", item.contractorClaimedQty],
      ["TPI Verified Qty", item.tpiVerifiedQty],
      ["Diff Qty / Variance", diffQty],
      ["Unit Rate (INR)", item.unitRate],
      ["Claimed Amount (INR)", claimedAmt],
      ["Recommended Amount (INR)", recommendedAmt],
      ["Over Claim Savings (INR)", claimedAmt - recommendedAmt],
      ["TPI Engineer Observations", item.observation],
      ["Closure Status", item.closureStatus],
      ["Audit Status", status],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + data.map((e) => `"${e[0]}","${(e[1] + "").replace(/"/g, '""')}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BOQ_Item_${item.boqItem.replace(/\./g, "_")}_Single_Row_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSingleRowPDF = (item: BillItem) => {
    trackButtonClick("btn_download_tpi_item_pdf", "pdf_download", `Download BOQ Item ${item.boqItem} PDF Report`, "reports");
    const params = new URLSearchParams({
      boq_item: item.boqItem,
      ra_bill: item.raBill,
      vendor: item.vendor,
      client: selectedClient,
      description: item.description,
      unit: item.unit,
      drawing_ref: item.gfcDrawingRef,
      boq_qty: item.boqQty.toString(),
      claimed_qty: item.contractorClaimedQty.toString(),
      verified_qty: item.tpiVerifiedQty.toString(),
      unit_rate: item.unitRate.toString(),
      observation: item.observation,
      closure_status: item.closureStatus,
      is_locked: item.isLocked ? "true" : "false",
    });
    window.open(`/api/v1/reports/pdf/tpi-billing-item?${params.toString()}`, "_blank");
  };

  const handlePreviewSingleRowPDF = (item: BillItem) => {
    trackButtonClick("btn_preview_tpi_item_pdf", "pdf_preview", `Preview BOQ Item ${item.boqItem} PDF Report`, "reports");
    const params = new URLSearchParams({
      boq_item: item.boqItem,
      ra_bill: item.raBill,
      vendor: item.vendor,
      client: selectedClient,
      description: item.description,
      unit: item.unit,
      drawing_ref: item.gfcDrawingRef,
      boq_qty: item.boqQty.toString(),
      claimed_qty: item.contractorClaimedQty.toString(),
      verified_qty: item.tpiVerifiedQty.toString(),
      unit_rate: item.unitRate.toString(),
      observation: item.observation,
      closure_status: item.closureStatus,
      is_locked: item.isLocked ? "true" : "false",
    });
    setPreviewPdfUrl(`/api/v1/reports/pdf/tpi-billing-item?${params.toString()}`);
    setPreviewPdfTitle(`BOQ Item ${item.boqItem} Verification Certificate`);
    setPreviewReportNo(item.boqItem);
    setShowPdfPreview(true);
  };

  const handleToggleLockItem = (id: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, isLocked: !item.isLocked };
        }
        return item;
      })
    );
  };

  const handleExportCSV = () => {
    trackButtonClick("btn_export_csv", "csv_export", "Export TPI Billing CSV Data", "reports");
    const headers = [
      "Sl No",
      "RA Bill",
      "Date",
      "Contractor Vendor",
      "BOQ Item",
      "Description",
      "Unit",
      "Drawing Ref",
      "BOQ Qty",
      "Prev Cert Qty",
      "Contractor Claimed Qty",
      "TPI Verified Qty",
      "Diff Qty",
      "Unit Rate (INR)",
      "Claimed Amount (INR)",
      "Recommended Amount (INR)",
      "Observations",
      "Closure Status",
      "Status",
    ];

    const csvRows = processedItems.map((item, idx) => [
      idx + 1,
      item.raBill,
      item.date,
      `"${item.vendor.replace(/"/g, '""')}"`,
      item.boqItem,
      `"${item.description.replace(/"/g, '""')}"`,
      item.unit,
      item.gfcDrawingRef,
      item.boqQty,
      item.prevCertifiedQty,
      item.contractorClaimedQty,
      item.tpiVerifiedQty,
      item.diffQty,
      item.unitRate,
      item.claimedAmt,
      item.recommendedAmt,
      `"${(item.observation || "").replace(/"/g, '""')}"`,
      item.closureStatus,
      item.status,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TPI_Billing_Verification_Full_${items.length}_Items_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="bg-white text-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#003366] font-heading tracking-tight flex items-center gap-2">
              <span>Bill Verification Platform</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#003366] border border-blue-200 text-[11px] font-bold font-mono">
              ISO 9001:2015 Certified
            </span>

            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-600 font-extrabold">Select Client:</span>
              <select
                value={selectedClient}
                onChange={(e) => handleClientChange(e.target.value)}
                className="bg-white text-slate-900 font-extrabold border border-slate-300 rounded-lg text-xs p-1 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {CLIENT_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <span className="px-2 text-slate-500 text-[11px] font-bold flex items-center gap-1">
                <Handshake className="w-3.5 h-3.5 text-indigo-500" /> TPI Mode:
              </span>
              {(
                [
                  { id: "epc_sponsored", label: "EPC Sponsored", icon: Building2, tooltip: "EPC = Client | EPC's Client = End Client" },
                  { id: "end_client_direct", label: "End Client Direct", icon: Landmark, tooltip: "End Client = Primary Client" },
                  { id: "tripartite", label: "Tripartite (EPC & End Client)", icon: Handshake, tooltip: "Exclusive 3-way alignment between EPC & End Client" },
                ] as const
              ).map((m) => {
                const IconComp = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setTpiMode(m.id)}
                    title={m.tooltip}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      tpiMode === m.id
                        ? "bg-[#003366] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5 shrink-0" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition-all shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4 text-sky-400" />
            </button>

            <button
              onClick={handleExportCSV}
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                trackButtonClick("btn_live_preview_tpi_pdf", "pdf_preview", "Live Preview TPI Billing PDF", "reports");
                setPreviewPdfUrl("/api/v1/reports/pdf/tpi-billing");
                setPreviewPdfTitle("TPI Bill Verification Master Report");
                setPreviewReportNo("F-BILL-01");
                setShowPdfPreview(true);
              }}
              className="px-3 py-2 rounded-xl bg-[#0084bf] hover:bg-[#0073a8] text-white transition-all shadow-sm cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Live PDF Preview of TPI Billing Report"
            >
              <Eye className="w-4 h-4 text-white" />
              <span>Live Preview</span>
            </button>

            <button
              onClick={() => {
                trackButtonClick("btn_download_tpi_pdf", "pdf_download", "Download TPI Billing PDF Report", "reports");
                const apiHost = "";
                window.open(`${apiHost}/api/v1/reports/pdf/tpi-billing`, "_blank");
              }}
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm cursor-pointer"
              title="Download PDF File"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5-Card Project & Contract Metadata Strip (Hidden as requested) */}
        <div className="hidden border-t border-slate-200 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-8.5 h-8.5 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-blue-700 uppercase font-extrabold tracking-wider">Project &amp; Location</p>
              <p className="font-extrabold text-slate-900 truncate text-xs">{projectName}</p>
              <p className="text-[10px] text-slate-500 truncate">{projectLocation}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
            <div className="w-8.5 h-8.5 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-emerald-700 uppercase font-extrabold tracking-wider">
                {tpiMode === "epc_sponsored" ? "Client (EPC Sponsor)" : "Primary Client / Sponsor"}
              </p>
              <p className="font-extrabold text-slate-900 truncate text-xs">
                {tpiMode === "epc_sponsored" ? epcContractor : selectedClient}
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold truncate">
                {tpiMode === "epc_sponsored" ? "Hired TPI for Audit" : "Direct Bill Sponsor"}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
            <div className="w-8.5 h-8.5 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <HardHat className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-amber-700 uppercase font-extrabold tracking-wider">EPC Main Contractor</p>
              <p className="font-extrabold text-slate-900 truncate text-xs">{epcContractor}</p>
              <p className="text-[10px] text-amber-700 font-mono truncate">Ref: {contractRef}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-3">
            <div className="w-8.5 h-8.5 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-purple-700 uppercase font-extrabold tracking-wider">Supplier / Sub-Vendor</p>
              <p className="font-extrabold text-slate-900 truncate text-xs">{supplierVendor}</p>
              <p className="text-[10px] text-purple-700 font-mono truncate">PO: {poNumber}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-3">
            <div className="w-8.5 h-8.5 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-indigo-700 uppercase font-extrabold tracking-wider">
                {tpiMode === "epc_sponsored" ? "End Client (EPC's Client)" : "End Client (Asset Owner)"}
              </p>
              <p className="font-extrabold text-slate-900 truncate text-xs">{endClient}</p>
              <p className="text-[10px] text-indigo-600 font-semibold truncate">
                {tpiMode === "tripartite" ? "Tripartite Signatory" : "Final Asset Owner"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between shadow-2xs">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Contractor Claimed Total</p>
              <p className="text-xl font-extrabold font-mono text-slate-900 mt-0.5 truncate">
                ₹{totalClaimedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">RA Bill Submitted Claim</p>
            </div>
            <div className="w-8.5 h-8.5 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold text-sm shrink-0">
              ₹
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between shadow-2xs">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[9px] text-emerald-700 font-extrabold uppercase tracking-wider">TPI Recommended Payable</p>
              <p className="text-xl font-extrabold font-mono text-emerald-700 mt-0.5 truncate">
                ₹{totalRecommendedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-emerald-700/80 mt-0.5 truncate">Physically Verified Value</p>
            </div>
            <div className="w-8.5 h-8.5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between shadow-2xs">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[9px] text-rose-700 font-extrabold uppercase tracking-wider">Over-Claim Savings / Variance</p>
              <p className="text-xl font-extrabold font-mono text-rose-700 mt-0.5 truncate">
                ₹{totalSavingsVariance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-rose-700/80 mt-0.5 truncate">Prevented Excess Claims</p>
            </div>
            <div className="w-8.5 h-8.5 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between shadow-2xs">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[9px] text-indigo-700 uppercase font-extrabold tracking-wider">Discrepancy Audit</p>
              <p className="text-base font-extrabold font-mono text-indigo-700 mt-0.5 truncate">
                {overClaimedCount} Flagged / {hiddenWorkCount} Hidden
              </p>
              <p className="text-[10px] text-indigo-700/80 mt-0.5 truncate">Out of {items.length} BOQ Items</p>
            </div>
            <div className="w-8.5 h-8.5 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>27-Column Excel Measurement &amp; Bill Verification Ledger ({filteredItems.length} items)</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor, description, WO..."
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold bg-white text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              title="Filter by Verification Status"
            >
              <option value="ALL">All Statuses ({items.length})</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="OVER_CLAIMED">Over Claimed</option>
              <option value="UNDER_CLAIMED">Under Claimed</option>
            </select>
            <select
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold bg-white text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              title="Filter by Audit Scope"
            >
              <option value="ALL">All Categories</option>
              <option value="OVER_CLAIMED">Over-Claim Variance</option>
              <option value="PENDING_CERT">Pending Certification</option>
              <option value="HIGH_VALUE">High Value (₹10,000+)</option>
              <option value="HIDDEN_WORK">Concealed / Hidden Works</option>
            </select>
            <button
              onClick={() => setIsInlineEditMode(!isInlineEditMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                isInlineEditMode
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-amber-500/20"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
              }`}
              title="Toggle Inline Cell Editing Mode"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isInlineEditMode ? "Exit Inline Edit" : "Enable Inline Edit"}</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
              title="Export All Items to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV ({items.length})</span>
            </button>

            <button
              onClick={() => {
                trackButtonClick("btn_live_preview_tpi_table_pdf", "pdf_preview", "Live Preview TPI Billing Ledger PDF", "reports");
                setPreviewPdfUrl("/api/v1/reports/pdf/tpi-billing");
                setPreviewPdfTitle("TPI Bill Verification Master Report");
                setPreviewReportNo("F-BILL-01");
                setShowPdfPreview(true);
              }}
              className="px-3.5 py-1.5 bg-[#0084bf] hover:bg-[#0073a8] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Live PDF Preview of TPI Billing Master Report"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview ({items.length})</span>
            </button>

            <button
              onClick={() => {
                trackButtonClick("btn_download_tpi_all_pdf", "pdf_download", "Download All Items TPI Billing PDF Report", "reports");
                const apiHost = "";
                window.open(`${apiHost}/api/v1/reports/pdf/tpi-billing`, "_blank");
              }}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
              title="Export All Items to Master 27-Column PDF Report with IQE Watermark & QR Code"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF ({items.length})</span>
            </button>
            <button
              onClick={handleOpenAddRowModal}
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add BOQ Item #{items.length + 1}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse min-w-[2500px]">
            <thead className="sticky top-0 bg-slate-100 text-slate-800 font-bold border-b border-slate-300 z-10 select-none shadow-xs">
              <tr>
                <th className="p-3 text-center border-r border-slate-200 w-12">Sl No</th>
                <th className="p-3 border-r border-slate-200">RA Bill</th>
                <th className="p-3 border-r border-slate-200">Date</th>
                <th className="p-3 border-r border-slate-200 min-w-[180px]">Contractor / Vendor</th>
                <th className="p-3 border-r border-slate-200">BOQ Item</th>
                <th className="p-3 border-r border-slate-200 min-w-[260px]">Work Description / Invoice</th>
                <th className="p-3 border-r border-slate-200 text-center">Unit</th>
                <th className="p-3 border-r border-slate-200">Drawing / Ref</th>
                <th className="p-3 border-r border-slate-200 text-right">BOQ Qty</th>
                <th className="p-3 border-r border-slate-200 text-right bg-amber-100 text-amber-900 font-extrabold min-w-[120px]">Claimed Qty / Val (₹)</th>
                <th className="p-3 border-r border-slate-200 text-right bg-emerald-100 text-emerald-900 font-extrabold min-w-[120px]">TPI Verified Qty / Val (₹)</th>
                <th className="p-3 border-r border-slate-200 text-right bg-rose-100 text-rose-900 font-extrabold min-w-[130px]">Amount Diff (₹)</th>
                <th className="p-3 border-r border-slate-200 text-right">Unit Rate (₹)</th>
                <th className="p-3 border-r border-slate-200 text-right bg-amber-100 text-amber-900 font-extrabold">Claimed Amount (₹)</th>
                <th className="p-3 border-r border-slate-200 text-right bg-emerald-100 text-emerald-900 font-extrabold">Recommended Amount (₹)</th>
                <th className="p-3 border-r border-slate-200 min-w-[240px]">TPI Engineer Correction Remarks</th>
                <th className="p-3 border-r border-slate-200 text-center">Closure Status</th>
                <th className="p-3 border-r border-slate-200 text-center">Status</th>
                <th className="p-3 text-center min-w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredItems.map((item, idx) => {
                const isOver = item.status === "Over Claimed";
                const isUnder = item.status === "Under Claimed";
                const amountDiff = item.diffQty * item.unitRate;
                return (
                  <tr key={item.id} className={`hover:bg-indigo-50/40 transition-colors ${isOver ? "bg-rose-50/30" : isUnder ? "bg-amber-50/30" : ""}`}>
                    <td className="p-3 text-center font-mono font-bold text-slate-700 bg-slate-50 border-r border-slate-100">#{idx + 1}</td>
                    <td className="p-3 font-mono border-r border-slate-100">
                      {isInlineEditMode && !item.isLocked ? (
                        <input
                          type="text"
                          value={item.raBill}
                          onChange={(e) => handleCellChange(item.id, "raBill", e.target.value)}
                          className="w-16 p-1 font-mono text-xs bg-white border border-slate-300 rounded"
                        />
                      ) : (
                        item.raBill
                      )}
                    </td>
                    <td className="p-3 border-r border-slate-100">
                      {isInlineEditMode && !item.isLocked ? (
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) => handleCellChange(item.id, "date", e.target.value)}
                          className="p-1 font-mono text-xs bg-white border border-slate-300 rounded"
                        />
                      ) : (
                        item.date
                      )}
                    </td>
                    <td className="p-3 font-semibold text-slate-900 border-r border-slate-100">
                      {isInlineEditMode && !item.isLocked ? (
                        <input
                          type="text"
                          value={item.vendor}
                          onChange={(e) => handleCellChange(item.id, "vendor", e.target.value)}
                          className="w-full min-w-[120px] p-1 text-xs bg-white border border-slate-300 rounded"
                        />
                      ) : (
                        item.vendor
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-indigo-600 border-r border-slate-100">
                      {isInlineEditMode && !item.isLocked ? (
                        <input
                          type="text"
                          value={item.boqItem}
                          onChange={(e) => handleCellChange(item.id, "boqItem", e.target.value)}
                          className="w-24 p-1 font-mono font-bold text-indigo-600 bg-white border border-indigo-300 rounded text-xs"
                        />
                      ) : (
                        item.boqItem
                      )}
                    </td>
                    <td className="p-3 border-r border-slate-100 font-medium">
                      {isInlineEditMode && !item.isLocked ? (
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleCellChange(item.id, "description", e.target.value)}
                          className="w-full min-w-[180px] p-1 text-xs bg-white border border-slate-300 rounded"
                        />
                      ) : (
                        <TooltipCell text={item.description} maxLength={36} />
                      )}
                    </td>
                    <td className="p-3 text-center font-mono border-r border-slate-100">
                      {isInlineEditMode && !item.isLocked ? (
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleCellChange(item.id, "unit", e.target.value)}
                          className="w-14 p-1 text-center font-mono text-xs bg-white border border-slate-300 rounded"
                        />
                      ) : (
                        item.unit
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-600 border-r border-slate-100">
                      {isInlineEditMode && !item.isLocked ? (
                        <input
                          type="text"
                          value={item.gfcDrawingRef}
                          onChange={(e) => handleCellChange(item.id, "gfcDrawingRef", e.target.value)}
                          className="w-24 p-1 font-mono text-xs bg-white border border-slate-300 rounded"
                        />
                      ) : (
                        item.gfcDrawingRef
                      )}
                    </td>
                    <td className="p-3 text-right font-mono border-r border-slate-100">
                      {isInlineEditMode && !item.isLocked ? (
                        <input
                          type="number"
                          step="any"
                          value={item.boqQty}
                          onChange={(e) => handleCellChange(item.id, "boqQty", parseFloat(e.target.value) || 0)}
                          className="w-16 p-1 text-right font-mono text-xs bg-white border border-slate-300 rounded"
                        />
                      ) : (
                        Number(item.boqQty).toFixed(2)
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-amber-800 bg-amber-50/40 border-r border-slate-100">
                      {isInlineEditMode && !item.isLocked ? (
                        <input
                          type="number"
                          step="any"
                          value={item.contractorClaimedQty}
                          onChange={(e) => handleCellChange(item.id, "contractorClaimedQty", parseFloat(e.target.value) || 0)}
                          className="w-20 p-1 text-right font-mono font-bold text-amber-900 bg-white border border-amber-300 rounded text-xs focus:ring-1 focus:ring-amber-500"
                        />
                      ) : (
                        Number(item.contractorClaimedQty).toFixed(2)
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40 border-r border-slate-100">
                      {isInlineEditMode && !item.isLocked ? (
                        <input
                          type="number"
                          step="any"
                          value={item.tpiVerifiedQty}
                          onChange={(e) => handleCellChange(item.id, "tpiVerifiedQty", parseFloat(e.target.value) || 0)}
                          className="w-20 p-1 text-right font-mono font-bold text-emerald-900 bg-white border border-emerald-400 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                        />
                      ) : (
                        Number(item.tpiVerifiedQty).toFixed(2)
                      )}
                    </td>
                    <td className={`p-3 text-right font-mono font-bold border-r border-slate-100 ${isOver ? "text-rose-600 bg-rose-100/50" : "text-slate-500"}`}>
                      ₹{amountDiff.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono border-r border-slate-100">
                      {isInlineEditMode && !item.isLocked ? (
                        <input
                          type="number"
                          step="any"
                          value={item.unitRate}
                          onChange={(e) => handleCellChange(item.id, "unitRate", parseFloat(e.target.value) || 0)}
                          className="w-24 p-1 text-right font-mono text-slate-900 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        `₹${Number(item.unitRate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold border-r border-slate-100">₹{Number(item.claimedAmt).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 border-r border-slate-100 text-[11px] leading-tight text-slate-700">
                      {isInlineEditMode && !item.isLocked ? (
                        <input
                          type="text"
                          value={item.observation}
                          onChange={(e) => handleCellChange(item.id, "observation", e.target.value)}
                          className="w-full min-w-[160px] p-1 text-xs bg-white border border-slate-300 rounded"
                        />
                      ) : (
                        <TooltipCell text={item.observation} maxLength={40} />
                      )}
                    </td>
                    <td className="p-3 text-center border-r border-slate-100">
                      {isInlineEditMode && !item.isLocked ? (
                        <select
                          value={item.closureStatus}
                          onChange={(e) => handleCellChange(item.id, "closureStatus", e.target.value)}
                          className="p-1 rounded text-[10px] font-bold bg-white border border-slate-300"
                        >
                          <option value="Open">Open</option>
                          <option value="Closed">Closed</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.closureStatus === "Closed" ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"}`}>
                          {item.closureStatus}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center border-r border-slate-100">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${isOver ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleLockItem(item.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${item.isLocked ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-100 hover:bg-slate-200 text-slate-500"}`}
                          title={item.isLocked ? "Locked — Click to Unlock Row" : "Unlocked — Click to Lock Row"}
                        >
                          {item.isLocked ? <Lock className="w-3.5 h-3.5 text-amber-700" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
                        </button>

                        <button
                          onClick={() => handleOpenDetailsRowModal(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer"
                          title="View 27-Column Row Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => !item.isLocked && handleOpenEditRowModal(item)}
                          disabled={item.isLocked}
                          className={`p-1.5 rounded-lg transition-colors ${item.isLocked ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 cursor-pointer"}`}
                          title={item.isLocked ? "Item Locked — Cannot edit verified bill row" : "Edit Row Values"}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleExportSingleRowCSV(item)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer"
                          title="Download Single Row CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handlePreviewSingleRowPDF(item)}
                          className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0084bf] transition-colors cursor-pointer border border-sky-200/60"
                          title="Live Preview Single Item PDF Certificate"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDownloadSingleRowPDF(item)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer border border-rose-200/60"
                          title="Download 27-Column PDF Report with IQE Watermark & Scannable QR Code"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New BOQ Item Row Modal (All 27 Columns / Parameters) */}
      {showAddRowModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <FilePlus className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Add New BOQ Item #{items.length + 1}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[11px]">
                      All 27 Parameter Fields Required
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500">
                    Client: <strong className="text-slate-700">{selectedClient}</strong> | Auto Sl No #{items.length + 1}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddRow} className="space-y-6 text-xs">
              {/* SECTION 1: Item Identification (#1 to #5) */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <h3 className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>1. Basic Identification Parameters (#1 – #5)</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">Core BOQ &amp; Vendor Identification</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#1</span>
                      BOQ Item Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={rowBoqItem}
                      onChange={(e) => setRowBoqItem(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                      placeholder="e.g. 85.01"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#2</span>
                      RA Bill Ref *
                    </label>
                    <input
                      type="text"
                      required
                      value={rowRaBill}
                      onChange={(e) => setRowRaBill(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                      placeholder="e.g. RA-085"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#3</span>
                      Bill Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={rowDate}
                      onChange={(e) => setRowDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#4</span>
                      Primary Client / Sponsor
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedClient}
                      className="w-full px-3 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold cursor-not-allowed shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#5</span>
                      Contractor / Vendor *
                    </label>
                    <select
                      value={rowVendor}
                      onChange={(e) => setRowVendor(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    >
                      {(CLIENT_VENDOR_MAP[selectedClient] || VENDOR_OPTIONS).map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Description, Drawings & Specifications (#6–#8, #18–#22) */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <h3 className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>2. Specifications, Drawings &amp; Contractual Governance (#6–#8, #18–#22)</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">Drawing &amp; Contract References</span>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#6</span>
                    Work Description / Invoice Line *
                  </label>
                  <input
                    type="text"
                    required
                    value={rowDescription}
                    onChange={(e) => setRowDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    placeholder="Provide full description of item or invoice reference"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#7</span>
                      Unit of Measurement (UOM)
                    </label>
                    <select
                      value={rowUnit}
                      onChange={(e) => setRowUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#8</span>
                      GFC Drawing / Ref *
                    </label>
                    <input
                      type="text"
                      required
                      value={rowGfcRef}
                      onChange={(e) => setRowGfcRef(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#18</span>
                      Variation Order Flag (Y/N)
                    </label>
                    <select
                      value={rowIsVariation}
                      onChange={(e) => setRowIsVariation(e.target.value as "Y" | "N")}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    >
                      {VARIATION_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#19</span>
                      Variation Order Ref Number
                    </label>
                    <input
                      type="text"
                      value={rowVariationRef}
                      onChange={(e) => setRowVariationRef(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#20</span>
                      Contract Governance Clause
                    </label>
                    <input
                      type="text"
                      value={rowContractClause}
                      onChange={(e) => setRowContractClause(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#21</span>
                      Is Concealed / Hidden Work
                    </label>
                    <select
                      value={rowIsHiddenWork}
                      onChange={(e) => setRowIsHiddenWork(e.target.value as "Y" | "N")}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    >
                      {HIDDEN_WORK_OPTIONS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#22</span>
                    Measurement Protocol Type
                  </label>
                  <select
                    value={rowMeasurementType}
                    onChange={(e) => setRowMeasurementType(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                  >
                    {MEASUREMENT_TYPE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION 3: Quantities, Rates & Financials (#9–#17) */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <h3 className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>3. Quantities, Unit Rates &amp; Live Financial Audit (#9–#17)</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">Automatic Amount &amp; Variance Recalculations</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#9</span>
                      Contract BOQ Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={rowBoqQty}
                      onChange={(e) => setRowBoqQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#10</span>
                      Prev Certified Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={rowPrevCertifiedQty}
                      onChange={(e) => setRowPrevCertifiedQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-[10px] mr-1">#11</span>
                      Contractor Claimed Qty *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={rowClaimedQty}
                      onChange={(e) => setRowClaimedQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-amber-50 text-amber-950 border border-amber-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:bg-amber-50 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono text-[10px] mr-1">#12</span>
                      TPI Verified Qty *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={rowTpiQty}
                      onChange={(e) => setRowTpiQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-emerald-50 text-emerald-950 border border-emerald-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-emerald-50 shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-rose-200 text-rose-900 font-mono text-[10px] mr-1">#13</span>
                      Variance Qty (Diff = Billed - Verified)
                    </label>
                    <div className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 flex items-center justify-between">
                      <span>{rowDiffQty.toFixed(2)} {rowUnit}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-sans uppercase font-extrabold ${rowDiffQty > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {rowDiffQty > 0 ? "Over Claimed" : "Verified OK"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#14</span>
                      Unit Rate (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={rowUnitRate}
                      onChange={(e) => setRowUnitRate(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-mono font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    />
                  </div>
                </div>

                {/* Live Auto Calculations Display (#15, #16, #17) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-amber-900 block">
                      #15 Claimed Amount (INR ₹)
                    </span>
                    <p className="text-base font-extrabold font-mono text-amber-950 mt-0.5">
                      ₹{rowClaimedAmt.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-900 block">
                      #16 TPI Recommended Amount (INR ₹)
                    </span>
                    <p className="text-base font-extrabold font-mono text-emerald-950 mt-0.5">
                      ₹{rowRecommendedAmt.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-rose-900 block">
                      #17 Over-Claim Savings Variance (INR ₹)
                    </span>
                    <p className="text-base font-extrabold font-mono text-rose-950 mt-0.5">
                      ₹{rowSavingsAmt.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Remarks, Actions & Lock Security (#23–#27) */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <h3 className="font-extrabold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>4. Audit Remarks, Action Summary &amp; Security Lock (#23–#27)</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium">Verification &amp; Final Certification</span>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#23</span>
                    TPI Engineer Correction Remarks / Observation *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={rowObservation}
                    onChange={(e) => setRowObservation(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-xl font-medium text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    placeholder="Detailed observation notes from physical measurement"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#24</span>
                      Action Required / Summary
                    </label>
                    <input
                      type="text"
                      value={rowActionRequired}
                      onChange={(e) => setRowActionRequired(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-medium text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#25</span>
                      Target Closure Date
                    </label>
                    <input
                      type="date"
                      value={rowTargetDate}
                      onChange={(e) => setRowTargetDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#26</span>
                      Verification Closure Status
                    </label>
                    <select
                      value={rowClosureStatus}
                      onChange={(e) => setRowClosureStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white shadow-xs"
                    >
                      {CLOSURE_STATUS_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] mr-1">#27</span>
                      Lock &amp; Security Audit Status
                    </label>
                    <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={rowIsLocked}
                        onChange={(e) => setRowIsLocked(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        {rowIsLocked ? <Lock className="w-4 h-4 text-rose-600" /> : <Unlock className="w-4 h-4 text-emerald-600" />}
                        {rowIsLocked ? "Locked (Certified & Sealed)" : "Unlocked (Draft Record)"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddRowModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>Add New BOQ Item (#{items.length + 1}) &amp; Save All 27 Fields</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit BOQ Item Row Modal (All 27 Columns / Parameters) */}
      {showEditRowModal && rowEditingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto text-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-900">
                      Edit BOQ Item #{rowEditingItem.slNo} — {rowEditingItem.boqItem}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                      27-Field Full Audit Form
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500">
                    Client: <strong className="text-slate-700">{selectedClient}</strong> | Vendor: <strong className="text-slate-700">{rowEditingItem.vendor}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditRowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRow} className="space-y-6 text-xs">
              {/* SECTION 1: Item Identification (#1 to #5) */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <h3 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>1. Basic Identification Parameters (#1 – #5)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#1</span>
                      BOQ Item Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={rowBoqItem}
                      onChange={(e) => setRowBoqItem(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#2</span>
                      RA Bill Ref *
                    </label>
                    <input
                      type="text"
                      required
                      value={rowRaBill}
                      onChange={(e) => setRowRaBill(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#3</span>
                      Bill Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={rowDate}
                      onChange={(e) => setRowDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#4</span>
                      Primary Client / Sponsor
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={selectedClient}
                      className="w-full px-3 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold cursor-not-allowed shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#5</span>
                      Contractor / Vendor *
                    </label>
                    <select
                      value={rowVendor}
                      onChange={(e) => setRowVendor(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    >
                      {(CLIENT_VENDOR_MAP[selectedClient] || VENDOR_OPTIONS).map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Description, Drawings & Specifications (#6–#8, #18–#22) */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <h3 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>2. Specifications, Drawings &amp; Contractual Governance (#6–#8, #18–#22)</span>
                  </h3>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#6</span>
                    Work Description / Invoice Line *
                  </label>
                  <input
                    type="text"
                    required
                    value={rowDescription}
                    onChange={(e) => setRowDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#7</span>
                      Unit of Measurement (UOM)
                    </label>
                    <select
                      value={rowUnit}
                      onChange={(e) => setRowUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#8</span>
                      GFC Drawing / Ref *
                    </label>
                    <input
                      type="text"
                      required
                      value={rowGfcRef}
                      onChange={(e) => setRowGfcRef(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#18</span>
                      Variation Order Flag (Y/N)
                    </label>
                    <select
                      value={rowIsVariation}
                      onChange={(e) => setRowIsVariation(e.target.value as "Y" | "N")}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    >
                      {VARIATION_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#19</span>
                      Variation Order Ref Number
                    </label>
                    <input
                      type="text"
                      value={rowVariationRef}
                      onChange={(e) => setRowVariationRef(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#20</span>
                      Contract Governance Clause
                    </label>
                    <input
                      type="text"
                      value={rowContractClause}
                      onChange={(e) => setRowContractClause(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#21</span>
                      Is Concealed / Hidden Work
                    </label>
                    <select
                      value={rowIsHiddenWork}
                      onChange={(e) => setRowIsHiddenWork(e.target.value as "Y" | "N")}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    >
                      {HIDDEN_WORK_OPTIONS.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#22</span>
                    Measurement Protocol Type
                  </label>
                  <select
                    value={rowMeasurementType}
                    onChange={(e) => setRowMeasurementType(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                  >
                    {MEASUREMENT_TYPE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SECTION 3: Quantities, Rates & Financials (#9–#17) */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <h3 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>3. Quantities, Unit Rates &amp; Live Financial Audit (#9–#17)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#9</span>
                      Contract BOQ Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={rowBoqQty}
                      onChange={(e) => setRowBoqQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#10</span>
                      Prev Certified Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={rowPrevCertifiedQty}
                      onChange={(e) => setRowPrevCertifiedQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-[10px] mr-1">#11</span>
                      Contractor Claimed Qty *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={rowClaimedQty}
                      onChange={(e) => setRowClaimedQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-amber-50 text-amber-950 border border-amber-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:bg-amber-50 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono text-[10px] mr-1">#12</span>
                      TPI Verified Qty *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={rowTpiQty}
                      onChange={(e) => setRowTpiQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-emerald-50 text-emerald-950 border border-emerald-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-emerald-50 shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-rose-200 text-rose-900 font-mono text-[10px] mr-1">#13</span>
                      Variance Qty (Diff = Billed - Verified)
                    </label>
                    <div className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 flex items-center justify-between">
                      <span>{rowDiffQty.toFixed(2)} {rowUnit}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-sans uppercase font-extrabold ${rowDiffQty > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {rowDiffQty > 0 ? "Over Claimed" : "Verified OK"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#14</span>
                      Unit Rate (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={rowUnitRate}
                      onChange={(e) => setRowUnitRate(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-mono font-bold text-blue-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    />
                  </div>
                </div>

                {/* Live Auto Calculations Display (#15, #16, #17) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-amber-900 block">
                      #15 Claimed Amount (INR ₹)
                    </span>
                    <p className="text-base font-extrabold font-mono text-amber-950 mt-0.5">
                      ₹{rowClaimedAmt.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-900 block">
                      #16 TPI Recommended Amount (INR ₹)
                    </span>
                    <p className="text-base font-extrabold font-mono text-emerald-950 mt-0.5">
                      ₹{rowRecommendedAmt.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-rose-900 block">
                      #17 Over-Claim Savings Variance (INR ₹)
                    </span>
                    <p className="text-base font-extrabold font-mono text-rose-950 mt-0.5">
                      ₹{rowSavingsAmt.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Remarks, Actions & Lock Security (#23–#27) */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <h3 className="font-extrabold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>4. Audit Remarks, Action Summary &amp; Security Lock (#23–#27)</span>
                  </h3>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#23</span>
                    TPI Engineer Correction Remarks / Observation *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={rowObservation}
                    onChange={(e) => setRowObservation(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-medium text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#24</span>
                      Action Required / Summary
                    </label>
                    <input
                      type="text"
                      value={rowActionRequired}
                      onChange={(e) => setRowActionRequired(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-medium text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#25</span>
                      Target Closure Date
                    </label>
                    <input
                      type="date"
                      value={rowTargetDate}
                      onChange={(e) => setRowTargetDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#26</span>
                      Verification Closure Status
                    </label>
                    <select
                      value={rowClosureStatus}
                      onChange={(e) => setRowClosureStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white shadow-xs"
                    >
                      {CLOSURE_STATUS_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] mr-1">#27</span>
                      Lock &amp; Security Audit Status
                    </label>
                    <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={rowIsLocked}
                        onChange={(e) => setRowIsLocked(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        {rowIsLocked ? <Lock className="w-4 h-4 text-rose-600" /> : <Unlock className="w-4 h-4 text-emerald-600" />}
                        {rowIsLocked ? "Locked (Certified & Sealed)" : "Unlocked (Draft Record)"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditRowModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Row Changes (All 27 Fields)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View 27-Column BOQ Item Details Modal */}
      {showDetailsRowModal && detailsItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    27-Column BOQ Item Audit Details — #{detailsItem.slNo} ({detailsItem.boqItem})
                  </h2>
                  <p className="text-xs font-medium text-slate-500">Client: <strong className="text-slate-700">{selectedClient}</strong> | Vendor: <strong className="text-slate-700">{detailsItem.vendor}</strong></p>
                </div>
              </div>
              <button onClick={() => setShowDetailsRowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2">
                <p className="font-extrabold text-slate-900 text-sm">{detailsItem.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-medium">
                  <span><strong className="text-slate-600">#2 RA Bill:</strong> {detailsItem.raBill}</span>
                  <span><strong className="text-slate-600">#3 Date:</strong> {detailsItem.date}</span>
                  <span><strong className="text-slate-600">#8 Drawing Ref:</strong> {detailsItem.gfcDrawingRef}</span>
                </div>
              </div>

              {/* 27 Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">#9 BOQ Contract Qty</span>
                  <p className="font-bold text-slate-900 text-sm font-mono">{detailsItem.boqQty} {detailsItem.unit}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">#11 Claimed Qty</span>
                  <p className="font-bold text-amber-900 text-sm font-mono">{detailsItem.contractorClaimedQty} {detailsItem.unit}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">#12 TPI Verified Qty</span>
                  <p className="font-bold text-emerald-900 text-sm font-mono">{detailsItem.tpiVerifiedQty} {detailsItem.unit}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">#14 Unit Rate (₹)</span>
                  <p className="font-bold text-slate-900 text-sm font-mono">₹{detailsItem.unitRate.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">#15 Billed Claimed Amount</span>
                  <p className="font-mono font-extrabold text-amber-950">₹{(detailsItem.contractorClaimedQty * detailsItem.unitRate).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">#16 TPI Recommended</span>
                  <p className="font-mono font-extrabold text-emerald-950">₹{(detailsItem.tpiVerifiedQty * detailsItem.unitRate).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-rose-800 block">#17 Over-Claim Savings</span>
                  <p className="font-mono font-extrabold text-rose-950">₹{((detailsItem.contractorClaimedQty - detailsItem.tpiVerifiedQty) * detailsItem.unitRate).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">#18 Variation Flag</span>
                  <p className="font-bold text-slate-900">{detailsItem.isVariation || "N"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">#26 Closure Status</span>
                  <p className="font-bold text-indigo-700">{detailsItem.closureStatus}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-800">#23 TPI Inspection Remarks &amp; Action (#24):</span>
                <p className="text-slate-900 font-medium">{detailsItem.observation}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportSingleRowCSV(detailsItem)}
                  className="px-3.5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Row CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreviewSingleRowPDF(detailsItem)}
                  className="px-3.5 py-2 text-xs font-bold bg-[#0084bf] hover:bg-[#0073a8] text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Live Preview Item PDF"
                >
                  <Eye className="w-4 h-4" />
                  <span>Live Preview PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadSingleRowPDF(detailsItem)}
                  className="px-3.5 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download 27-Field Precision PDF (IQE Logo &amp; QR)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailsRowModal(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standardized Live PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        formCode="FBILL01"
        payload={{
          report_no: previewReportNo || "F-BILL-01",
          date: new Date().toISOString().split("T")[0],
          customer: selectedClient || "MCGM (Greater Mumbai Corp)",
          project: `${projectName || "Mumbai Coastal Road Pkg 03"} - ${projectLocation || "Worli Corridor"}`,
          supplier: epcContractor || selectedVendor || "Larsen & Toubro Ltd - Infra Div",
          contract_ref: contractRef || "MCGM/CWD/2024/TPI-8892",
          ra_bill_no: "RA-001 (Period: Current Cycle)",
          inspector: "Er. Rajesh Sharma (Lead TPI Surveyor)",
          items: items.map((i, idx) => ({
            sl: idx + 1,
            boq_item: i.boqItem,
            description: i.description,
            unit: i.unit,
            scope_qty: i.boqQty,
            claimed_qty: i.contractorClaimedQty,
            verified_qty: i.tpiVerifiedQty,
            diff_qty: Math.max(0, i.contractorClaimedQty - i.tpiVerifiedQty),
            unit_rate: i.unitRate,
            claimed_amt: i.contractorClaimedQty * i.unitRate,
            verified_amt: i.tpiVerifiedQty * i.unitRate,
            status: i.closureStatus || "Verified",
          })),
          total_scope_qty: items.reduce((acc, i) => acc + (i.boqQty || 0), 0),
          total_claimed_qty: items.reduce((acc, i) => acc + (i.contractorClaimedQty || 0), 0),
          total_verified_qty: items.reduce((acc, i) => acc + (i.tpiVerifiedQty || 0), 0),
          total_diff_qty: items.reduce((acc, i) => acc + Math.max(0, (i.contractorClaimedQty || 0) - (i.tpiVerifiedQty || 0)), 0),
          total_claimed_amt: items.reduce((acc, i) => acc + ((i.contractorClaimedQty || 0) * (i.unitRate || 0)), 0),
          total_verified_amt: items.reduce((acc, i) => acc + ((i.tpiVerifiedQty || 0) * (i.unitRate || 0)), 0),
        }}
        pdfUrl={previewPdfUrl}
        title={previewPdfTitle}
        reportNo={previewReportNo}
      />
    </div>
  );
}
