/**
 * The application menu: the eleven departments from the "Menu structure"
 * slide, in that order, each listing the screens that belong to it.
 *
 * This is the only place the menu is defined. The header renders it for
 * desktop and mobile, and scripts/check-menu.mjs fails the build's checks if a
 * screen exists that no menu reaches, or a menu points at a screen that does
 * not exist. Plain data with no imports, so the check can load it directly.
 */

export type MenuItem = {
  name: string;
  subtitle: string;
  href: string;
};

export type MenuGroup = {
  id: string;
  title: string;
  /** Key into the icon table in MainMenu.tsx. */
  icon: string;
  /** Shown above the items; used for areas that are planned, not built. */
  note?: string;
  items: MenuItem[];
};

const ENG = "/engagements";

export const MENU: MenuGroup[] = [
  {
    id: "sales", title: "Sales", icon: "sales",
    items: [
      { name: "Customers", subtitle: "Clients & corporate details", href: "/clients" },
      { name: "Enquiries & Quotations", subtitle: "Bid gate, proposals, award", href: "/enquiries" },
      { name: "Pipeline", subtitle: "Funnel, win rate, loss reasons", href: "/pipeline" },
      { name: "Win-Loss Analysis", subtitle: "Conversion & loss reasons", href: "/win-loss" },
      { name: "Rate Cards & Floors", subtitle: "Pricing, discounts, the rate floor", href: "/rates" },
      { name: "Contracts & Amendments", subtitle: "Order ceilings, periods, renewals", href: "/contracts" },
      { name: "Service Orders", subtitle: "Client service engagements", href: "/service-orders" },
      { name: "Complaints", subtitle: "Customer service quality log", href: "/complaints" },
      { name: "Client Feedback", subtitle: "Ratings & management review", href: "/client-feedback" },
    ],
  },
  {
    id: "operations", title: "Operations", icon: "operations",
    items: [
      { name: "Job Register", subtitle: "Jobs and active inspection assignments", href: "/jobs" },
      { name: "Job Handoff", subtitle: "Enquiry to job conversion", href: "/job-handoff" },
      { name: "Work Packages", subtitle: "Scope, assignment & certification", href: "/work-packages" },
      { name: "Allocation", subtitle: "Who is qualified to take the work", href: "/assignments" },
      { name: "Proposed Assignments", subtitle: "Inspector allocation matrix", href: "/proposed-assignments" },
      { name: "Open Calls Intake", subtitle: "Customer inspection call requests", href: "/open-calls" },
      { name: "Inspection Calls", subtitle: "Calls raised against quality plans", href: "/inspection-calls" },
      { name: "Visit Schedule", subtitle: "Inspection calendar & timeline", href: "/visit-schedule" },
      { name: "Visits", subtitle: "Site visits & attendance", href: "/visits" },
      { name: "Reports", subtitle: "Formats & end-to-end project report", href: "/reports" },
      { name: "Report Sign-off", subtitle: "Technical Manager / deputy approval", href: "/signoffs" },
      { name: "Release Notes", subtitle: "IRN sign-off & release", href: "/release-notes" },
      { name: "Certifications", subtitle: "Claimed vs certified value", href: "/certifications" },
      { name: "Expediting", subtitle: "Vendor follow-up engagements", href: `${ENG}?line=EXPEDITING` },
      { name: "Vendor Assessment", subtitle: "Assessment engagements", href: `${ENG}?line=VENDOR_ASSESSMENT` },
      { name: "Public Authenticator", subtitle: "QR certificate verification", href: "/verify" },
      { name: "Analytics", subtitle: "Vendor & operations analytics", href: "/analytics" },
    ],
  },
  {
    id: "projects", title: "Projects", icon: "projects",
    items: [
      { name: "Part C — Mpharma EPC", subtitle: "Project support formats F-01 to F-12", href: "/schedule-m-pharma-epc" },
      { name: "RFI", subtitle: "Requests for inspection", href: "/rfis" },
      { name: "NCR", subtitle: "Findings, dispositions & closure", href: "/ncrs" },
      { name: "Punch List", subtitle: "Snag items A / B / C", href: "/punch-list" },
      { name: "Bill Verification", subtitle: "RA bills & TPI billing", href: "/tpi-billing" },
      { name: "BOQ Reconciliation", subtitle: "Material & quantity audit", href: "/boq-reconciliation" },
      { name: "Construction Matrix", subtitle: "Measurement verification", href: "/construction-bill-verification" },
      { name: "Quality Verification", subtitle: "Concealed work & quality audit", href: "/quality-bill-verification" },
    ],
  },
  {
    id: "hr", title: "HR", icon: "hr",
    items: [
      { name: "Recruitment", subtitle: "Manpower requests to induction", href: "/recruitment" },
      { name: "Staffing Pool", subtitle: "People, competence & deployability", href: "/people" },
      { name: "Authorisation", subtitle: "Yearly H8 / H10 review and renewal", href: "/authorisation-review" },
      { name: "Appraisals", subtitle: "KPIs & witnessed inspections", href: "/appraisals-monitoring" },
      { name: "Leave & Attendance", subtitle: "Leave, attendance & timesheets", href: "/leave-attendance" },
      { name: "Payroll", subtitle: "Runs, PF / ESI / PT & payslips", href: "/payroll" },
      { name: "My Payslips", subtitle: "Your released payslips", href: "/my-payslips" },
      { name: "Exit Management", subtitle: "Separation & final settlement", href: "/exit-management" },
    ],
  },
  {
    id: "finance", title: "Finance", icon: "finance",
    items: [
      { name: "Ready to Invoice", subtitle: "Certified work ready to bill", href: "/billing" },
      { name: "Invoices", subtitle: "Client invoices & records", href: "/invoices" },
      { name: "Receipts", subtitle: "Accounts receivable & ageing", href: "/accounts-receivable" },
      { name: "Payables", subtitle: "Vendor bills, GST, TDS, MSME", href: "/accounts-payable" },
      { name: "Purchasing", subtitle: "Requisitions, vendors & vendor bills", href: "/purchasing" },
      { name: "Purchase Orders", subtitle: "Procurement & PO tracking", href: "/purchase-orders" },
    ],
  },
  {
    id: "qms", title: "QMS", icon: "qms",
    items: [
      { name: "SOP Library", subtitle: "SOP-01 to SOP-08 manuals", href: "/sops" },
      { name: "Work Instructions", subtitle: "Controlled work instructions", href: "/work-instructions" },
      { name: "Quality Plans", subtitle: "ITPs and hold points", href: "/itps" },
      { name: "TPI Process Flow", subtitle: "RFQ to certificate workflow", href: "/tpi-process-flow" },
      { name: "NCR / CA", subtitle: "Nonconformities & corrective action", href: "/ncrs" },
      { name: "Appeals", subtitle: "Challenges to issued decisions", href: "/appeals" },
      { name: "Risk Register", subtitle: "Risks, controls & audit plan", href: "/risks" },
      { name: "Impartiality", subtitle: "Revenue concentration & ties", href: "/impartiality" },
      { name: "External Providers", subtitle: "Subcontractors & calibration labs", href: "/providers" },
      { name: "Calibration", subtitle: "Equipment register & status", href: "/equipment" },
      { name: "Audits", subtitle: "Audit trail: who changed what", href: "/audit" },
    ],
  },
  {
    id: "field", title: "Field Portal", icon: "field",
    note: "What an inspector works in day to day.",
    items: [
      { name: "My Work", subtitle: "Your role's open items", href: "/console" },
      { name: "Report Builder", subtitle: "Master formats index", href: "/pms-formats" },
      { name: "Flash Inspection", subtitle: "Quick day summary", href: "/flash-inspection-report" },
      { name: "Inspection Visit", subtitle: "Complete visit report", href: "/inspection-visit-report" },
      { name: "Inspection Release", subtitle: "Dispatch clearance (IRN)", href: "/inspection-release-note" },
      { name: "Expediting Report", subtitle: "Vendor visit & fabrication", href: "/expediting-visit-report" },
      { name: "Site Daily Logsheet", subtitle: "Daily inspection & attendance", href: "/logsheet" },
      { name: "Uploads & Evidence", subtitle: "Photographs, certificates, readiness", href: "/evidence" },
    ],
  },
  {
    id: "admin", title: "Admin", icon: "admin",
    items: [
      { name: "Masters", subtitle: "Admin settings", href: "/admin" },
      { name: "Manufacturers", subtitle: "Manufacturers directory", href: "/manufacturers" },
      { name: "Work Types", subtitle: "How each kind of work is run", href: "/work-types" },
      { name: "Roles & Approval Limits", subtitle: "RH / MD quotation limits", href: "/approval-limits" },
      { name: "Cover", subtitle: "Regions, offices & deputies", href: "/regions" },
      { name: "Numbering", subtitle: "IRN / IVR control numbers", href: "/control-numbers" },
      { name: "Notifications", subtitle: "Alerts & preferences", href: "/notifications" },
    ],
  },
  {
    id: "asset", title: "Asset Integrity", icon: "asset",
    note: "Future, via consultants: asset register, life extension, due diligence.",
    items: [
      { name: "Engagements", subtitle: "Asset integrity & advanced NDT", href: `${ENG}?line=ASSET_INTEGRITY` },
    ],
  },
  {
    id: "design", title: "Equipment Design", icon: "design",
    note: "Future, via consultants: design requests, drawing register.",
    items: [
      { name: "Engagements", subtitle: "Design requests & drawings", href: `${ENG}?line=EQUIPMENT_DESIGN` },
    ],
  },
  {
    id: "training", title: "Training", icon: "training",
    items: [
      { name: "Courses, Batches, Trainees", subtitle: "Training engagements & certificates", href: `${ENG}?line=TRAINING` },
    ],
  },
];

export function pathOf(href: string): string {
  return href.split("?")[0];
}

export function lineOf(href: string): string | null {
  const q = href.split("?")[1];
  return q ? new URLSearchParams(q).get("line") : null;
}

/** Is `item` the screen the user is on? A query-less item matches its path;
 * a service-line item also needs its line to match. */
export function isItemActive(item: MenuItem, pathname: string, line: string | null): boolean {
  if (!(pathname === pathOf(item.href) || pathname.startsWith(pathOf(item.href) + "/"))) return false;
  const want = lineOf(item.href);
  return want ? want === (line || "EXPEDITING") : true;
}

export function isGroupActive(group: MenuGroup, pathname: string, line: string | null): boolean {
  return group.items.some((i) => isItemActive(i, pathname, line));
}
