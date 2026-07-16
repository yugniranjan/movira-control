import { createElement, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  FaArrowLeft,
  FaBuilding,
  FaCheckCircle,
  FaCreditCard,
  FaEdit,
  FaFileInvoiceDollar,
  FaEye,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaPause,
  FaPlay,
  FaPlus,
  FaRocket,
  FaSearch,
  FaTimes,
  FaTrash,
  FaTrashRestore,
  FaUserPlus,
} from "react-icons/fa";
import PageLayout from "../../layouts/PageLayout";
import Loader from "../../components/Loader";
import ErrorMessage from "../../components/ErrorMessage";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import SearchableSelect from "../../components/common/SearchableSelect";
import {
  useApproveSaasParkGoLiveMutation,
  useCreateSaasParkMutation,
  useCreateSaasCustomerOwnerMutation,
  useCreateSaasInvoicePaymentLinkMutation,
  useCreateSaasPlanMutation,
  useDeleteSaasPlanMutation,
  useDeleteSaasParkMutation,
  useGetSaasParkAuditLogsQuery,
  useGetSaasParkByIdQuery,
  useGetSaasParkPaymentEventsQuery,
  useGetSaasParksQuery,
  useGetSaasModulesQuery,
  useGetSaasPlansQuery,
  useLazyGetSaasInvoiceDocumentQuery,
  useLazyGetSaasParkPermanentDeletePreviewQuery,
  useRecordSaasInvoicePaymentMutation,
  useRefundSaasInvoicePaymentMutation,
  useRefreshSaasInvoiceLifecycleMutation,
  useUpdateSaasParkBillingMutation,
  useUpdateSaasParkLifecycleMutation,
  useUpdateSaasParkModulesMutation,
  useUpdateSaasParkMutation,
  useUpdateSaasParkOnboardingMutation,
  useUpdateSaasParkPaymentsMutation,
  useUpdateSaasModuleMutation,
  useUpdateSaasPlanMutation,
  useVoidSaasInvoiceMutation,
  usePermanentDeleteSaasParkMutation,
} from "../../features/saas/moviraControlApi";
import { useGetAllUsersQuery } from "../../features/user/userApi";
import ParkPaymentConsole from "./ParkPaymentConsole";

const modules = [
  { key: "bookings", label: "Bookings", monthly: 299, description: "Core reservations, calendars, and order records." },
  { key: "pos", label: "POS", monthly: 299, description: "Counter sales, terminals, receipts, and cashier controls." },
  { key: "booking_portal", label: "Booking portal", monthly: 199, description: "Public checkout, pages, and guest booking flow." },
  { key: "crm", label: "CRM", monthly: 249, description: "Contacts, segments, email, and automation." },
  { key: "staff", label: "Staff", monthly: 149, description: "Schedules, time clock, leave, and team operations." },
  { key: "inventory", label: "Inventory", monthly: 99, description: "Stock, add-ons, gift cards, and retail items." },
  { key: "waivers", label: "Waivers", monthly: 99, description: "Digital waiver setup, holders, and signatures." },
  { key: "reports", label: "Reports", monthly: 129, description: "Owner dashboards and operating reports." },
];

const onboardingLabels = {
  parkWorkspace: "Park workspace",
  ownerAccess: "Owner access",
  moduleAccess: "Module access",
  billingPlan: "Billing setup",
  paymentMethod: "Payment method",
  guestPayments: "Guest payments",
  catalogReady: "Ticket catalog",
  bookingPortal: "Booking portal",
  staffHandoff: "Staff handoff",
  goLiveApproval: "Go-live approval",
};

const defaultForm = {
  organizationId: "",
  organizationName: "",
  name: "",
  slug: "",
  owner: "",
  ownerUserId: "",
  ownerEmail: "",
  phone: "",
  city: "",
  state: "",
  country: "Canada",
  timezone: "America/Toronto",
  currency: "CAD",
  streetNumberOrBuildingName: "",
  streetName: "",
  postalCode: "",
  displayAddress: "",
  monthlyBaseFee: 0,
};

const countryProfiles = [
  {
    value: "Canada",
    label: "Canada",
    timezone: "America/Toronto",
    currency: "CAD",
    dialCode: "+1",
    cityPlaceholder: "St. Catharines",
    statePlaceholder: "Ontario",
    postalPlaceholder: "L2R 7C2",
  },
  {
    value: "United States",
    label: "United States",
    timezone: "America/New_York",
    currency: "USD",
    dialCode: "+1",
    cityPlaceholder: "Orlando",
    statePlaceholder: "Florida",
    postalPlaceholder: "32801",
  },
  {
    value: "India",
    label: "India",
    timezone: "Asia/Kolkata",
    currency: "INR",
    dialCode: "+91",
    cityPlaceholder: "Jalaun",
    statePlaceholder: "Uttar Pradesh",
    postalPlaceholder: "285123",
  },
  {
    value: "United Kingdom",
    label: "United Kingdom",
    timezone: "Europe/London",
    currency: "GBP",
    dialCode: "+44",
    cityPlaceholder: "London",
    statePlaceholder: "England",
    postalPlaceholder: "SW1A 1AA",
  },
  {
    value: "Australia",
    label: "Australia",
    timezone: "Australia/Sydney",
    currency: "AUD",
    dialCode: "+61",
    cityPlaceholder: "Sydney",
    statePlaceholder: "New South Wales",
    postalPlaceholder: "2000",
  },
];

const countryOptions = countryProfiles.map((profile) => ({
  value: profile.value,
  label: profile.label,
  description: `${profile.timezone} / ${profile.currency} / ${profile.dialCode}`,
}));

const getCountryProfile = (country) =>
  countryProfiles.find((profile) => profile.value.toLowerCase() === String(country || "").trim().toLowerCase()) ||
  countryProfiles[0];

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const normalizePhoneForCountry = (phone, country) => {
  const raw = String(phone || "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  const dialCode = getCountryProfile(country).dialCode;
  const dialDigits = dialCode.replace(/\D/g, "");
  return digits.startsWith(dialDigits) ? `+${digits}` : `${dialCode} ${digits}`;
};

const phoneLocalValue = (phone, country) => {
  const raw = String(phone || "").trim();
  if (!raw) return "";
  const dialDigits = getCountryProfile(country).dialCode.replace(/\D/g, "");
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith(dialDigits)) return digits.slice(dialDigits.length);
  return digits || raw.replace(/^\+\d+\s*/, "");
};

const getUserName = (user) =>
  user?.name ||
  [user?.first_name || user?.firstName, user?.last_name || user?.lastName].filter(Boolean).join(" ") ||
  user?.email ||
  "";

const getUserPhone = (user) => user?.phone || user?.phone_number || user?.contactNumber || "";

const requiredParkProfileFields = [
  ["organizationName", "Organization name is required."],
  ["name", "Park name is required."],
  ["owner", "Customer name is required."],
  ["phone", "Customer phone is required."],
  ["ownerEmail", "Customer email is required."],
  ["country", "Country is required."],
  ["timezone", "Timezone is required."],
  ["currency", "Currency is required."],
  ["city", "City is required."],
  ["state", "State / province is required."],
  ["postalCode", "Postal / ZIP code is required."],
  ["streetNumberOrBuildingName", "Building / street number is required."],
  ["streetName", "Street / address line is required."],
];

const defaultCustomerOwner = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  temporaryPassword: "",
};

const billingCycleOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

const taxLabelOptions = [
  { value: "Tax", label: "Tax", description: "Generic tax label for regions without a named tax." },
  { value: "VAT", label: "VAT", description: "Value Added Tax." },
  { value: "GST", label: "GST", description: "Goods and Services Tax." },
  { value: "HST", label: "HST", description: "Harmonized Sales Tax." },
  { value: "PST", label: "PST", description: "Provincial Sales Tax." },
  { value: "QST", label: "QST", description: "Quebec Sales Tax." },
  { value: "Sales Tax", label: "Sales Tax", description: "Common sales tax label." },
];

const platformBillingMethodOptions = [
  { value: "not_configured", label: "Not configured" },
  { value: "online_payment", label: "Online payment" },
  { value: "online", label: "Online payment" },
  { value: "card_on_file", label: "Card on file" },
  { value: "bank_debit", label: "Bank debit" },
  { value: "manual_invoice", label: "Manual invoice" },
];

const platformBillingStatusOptions = [
  { value: "not_configured", label: "Not configured" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "suspended", label: "Suspended" },
];

const guestPaymentStatusOptions = [
  { value: "not_configured", label: "Not configured" },
  { value: "sandbox", label: "Sandbox" },
  { value: "live", label: "Live" },
];

const paymentHistoryStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "partial", label: "Partial" },
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "past_due", label: "Past due" },
  { value: "suspended", label: "Suspended" },
  { value: "recovered", label: "Recovered" },
  { value: "void", label: "Void" },
  { value: "recorded", label: "Recorded" },
];

const paymentEventTypeOptions = [
  { value: "all", label: "All event types" },
  { value: "invoice_generated", label: "Invoice generated" },
  { value: "invoice_payment_captured", label: "Payment captured" },
  { value: "invoice_payment_refunded", label: "Payment refunded" },
  { value: "invoice_payment_link_created", label: "Payment link" },
  { value: "invoice_marked_overdue", label: "Marked overdue" },
  { value: "invoice_reminder_sent", label: "Reminder sent" },
  { value: "invoice_reminder_failed", label: "Reminder failed" },
  { value: "account_marked_past_due", label: "Account past due" },
  { value: "account_suspended_for_non_payment", label: "Account suspended" },
  { value: "account_collection_recovered", label: "Account recovered" },
  { value: "invoice_voided", label: "Invoice voided" },
  { value: "payment_settings_updated", label: "Payment settings" },
];

const auditActionOptions = [
  { value: "all", label: "All actions" },
  { value: "park.created", label: "Park created" },
  { value: "park.updated", label: "Park updated" },
  { value: "park.archived", label: "Park archived" },
  { value: "park.lifecycle_updated", label: "Lifecycle updated" },
  { value: "billing.updated", label: "Billing updated" },
  { value: "payments.updated", label: "Payments updated" },
  { value: "invoice.generated", label: "Invoice generated" },
  { value: "invoice.payment_recorded", label: "Payment recorded" },
  { value: "invoice.payment_link_created", label: "Payment link created" },
  { value: "invoice.payment_refunded", label: "Payment refunded" },
  { value: "invoice.marked_overdue", label: "Marked overdue" },
  { value: "invoice.reminder_sent", label: "Reminder sent" },
  { value: "invoice.reminder_failed", label: "Reminder failed" },
  { value: "billing.past_due", label: "Billing past due" },
  { value: "billing.suspended", label: "Billing suspended" },
  { value: "billing.collection_recovered", label: "Billing recovered" },
  { value: "invoice.voided", label: "Invoice voided" },
  { value: "onboarding.updated", label: "Onboarding updated" },
];

const setupSteps = [
  { key: "parkWorkspace", label: "Workspace", route: "" },
  { key: "ownerAccess", label: "Owner", route: "edit" },
  { key: "moduleAccess", label: "Modules", route: "modules" },
  { key: "billingPlan", label: "Billing", route: "billing" },
  { key: "paymentMethod", label: "Payment", route: "payments" },
  { key: "guestPayments", label: "Guest payments", route: "payments" },
  { key: "catalogReady", label: "Catalog", route: "" },
  { key: "bookingPortal", label: "Portal", route: "" },
  { key: "staffHandoff", label: "Staff", route: "" },
  { key: "goLiveApproval", label: "Go live", route: "onboarding" },
];

const parkDetailTabs = [
  { suffix: "", label: "Overview" },
  { suffix: "modules", label: "Modules", requiredStep: "parkWorkspace", requiredLabel: "Workspace" },
  { suffix: "billing", label: "Billing", requiredStep: "moduleAccess", requiredLabel: "Modules" },
  { suffix: "billing-history", label: "Billing History", requiredStep: "billingPlan", requiredLabel: "Billing" },
  { suffix: "payments", label: "Payments", requiredStep: "billingPlan", requiredLabel: "Billing" },
  { suffix: "payment-history", label: "Payment History", requiredStep: "paymentMethod", requiredLabel: "Payments" },
  { suffix: "onboarding", label: "Onboarding", requiredStep: "guestPayments", requiredLabel: "Guest payments" },
  { suffix: "audit", label: "Audit", requiredStep: "goLiveApproval", requiredLabel: "Go live" },
];

function money(value, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function todayDateInputValue() {
  const today = new Date();
  const offsetMs = today.getTimezoneOffset() * 60 * 1000;
  return new Date(today.getTime() - offsetMs).toISOString().slice(0, 10);
}

function dateInputValue(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function dateOnly(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function dateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function statusClass(status) {
  if (status === "live") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "paused") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "archived") return "bg-stone-100 text-stone-600 border-stone-200";
  if (status === "needs_checks") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-orange-50 text-orange-700 border-orange-200";
}

function billingStatusClass(status) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "recovered" || status === "sent") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "overdue" || status === "past_due" || status === "suspended") return "border-red-200 bg-red-50 text-red-700";
  if (status === "open") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "failed" || status === "refunded") return "border-red-200 bg-red-50 text-red-700";
  if (status === "void") return "border-stone-200 bg-stone-100 text-stone-500";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || String(value || "Not configured").replace(/_/g, " ");
}

function Pill({ children, className = "" }) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

function buttonClass(variant = "secondary", extra = "") {
  const base =
    "inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    primary: "btn-nexus",
    secondary: "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50",
    ghost: "border border-transparent bg-transparent text-stone-700 hover:bg-stone-100",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    success: "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  };
  return `${base} ${variants[variant] || variants.secondary} ${extra}`;
}

function iconButtonClass(variant = "secondary", extra = "") {
  const base =
    "inline-grid h-9 w-9 place-items-center rounded-lg border text-sm shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/15 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    secondary: "border-[var(--stroke-soft)] bg-[var(--surface-panel)] text-[var(--text-base)] hover:border-[var(--brand-primary-border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)]",
    danger: "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100",
  };
  return `${base} ${variants[variant] || variants.secondary} ${extra}`;
}

const listingShellClass =
  "min-w-0 overflow-hidden rounded-xl border border-[var(--stroke-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-card)]";
const listingToolbarClass =
  "sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--stroke-soft)] bg-[var(--surface-panel-strong)]/95 p-2.5 backdrop-blur sm:p-3";
const listingScrollClass = "max-h-[min(68vh,760px)] overflow-auto";
const listingTableClass = (minWidth = "min-w-[900px]") =>
  `w-full ${minWidth} border-separate border-spacing-0 text-sm`;
const listingHeadClass =
  "sticky top-0 z-20 bg-[var(--brand-primary-deep)] text-left text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-[0_1px_0_var(--stroke-soft)]";
const listingThClass = (extra = "") => `whitespace-nowrap border-b border-[var(--stroke-soft)] px-3 py-2.5 align-middle ${extra}`;
const listingBodyClass =
  "divide-y divide-[var(--stroke-soft)] bg-[var(--surface-panel)] text-[var(--text-base)] [&_p.font-black]:text-[var(--text-strong)] [&_td.font-black]:text-[var(--text-strong)] [&_td]:text-[var(--text-base)]";
const listingRowClass = "transition hover:bg-[var(--brand-primary-soft)]/45 [&>td]:border-b [&>td]:border-[var(--stroke-soft)]";
const listingFooterClass =
  "sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--stroke-soft)] bg-[var(--surface-panel-strong)]/95 p-2.5 backdrop-blur";

function StatCard({ icon: Icon, label, value, detail, compact = false }) {
  return (
    <div className={`min-w-0 rounded-xl border border-stone-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
      <div className={`flex items-center ${compact ? "gap-2.5" : "gap-3"}`}>
        <div className={`grid shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700 ${compact ? "h-9 w-9 text-sm" : "h-11 w-11"}`}>
          {createElement(Icon)}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`min-w-0 ${compact ? "flex flex-1 items-baseline gap-2" : ""}`}>
            <p className={`min-w-0 truncate font-black leading-none text-stone-950 ${compact ? "text-xl" : "text-2xl"}`}>{value}</p>
            <p className={`truncate font-bold text-stone-600 ${compact ? "text-sm" : "text-sm"}`}>{label}</p>
          </div>
          {detail ? <p className={`${compact ? "mt-1" : "mt-2"} truncate text-xs font-semibold text-stone-500`}>{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, detail, action }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-orange-700 shadow-sm">
        <FaRocket />
      </div>
      <h3 className="mt-3 text-lg font-black text-stone-950">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm font-semibold text-stone-500">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function ProgressBar({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="h-2.5 rounded-full bg-stone-100">
      <div className="h-2.5 rounded-full bg-orange-600 transition-all" style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function getNextStep(park) {
  return setupSteps.find((step) => !park?.onboarding?.[step.key]) || setupSteps[setupSteps.length - 1];
}

function stepHref(parkId, step) {
  return `/movira-control/parks/${parkId}${step?.route ? `/${step.route}` : ""}`;
}

function getParkTabLock(park, suffix = "") {
  const tab = parkDetailTabs.find((item) => item.suffix === suffix);
  if (!tab?.requiredStep) return null;
  if (park?.onboarding?.[tab.requiredStep]) return null;
  return {
    tab,
    message: `Complete ${tab.requiredLabel} before opening ${tab.label}.`,
  };
}

function LaunchRail({ park }) {
  const score = Number(park.onboardingScore || 0);
  const completedSteps = setupSteps.filter((step) => Boolean(park.onboarding?.[step.key])).length;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <div className="grid min-w-0 gap-3 xl:grid-cols-[260px_minmax(0,1fr)_auto] xl:items-center">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700">
            <FaRocket />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
              Launch readiness
            </p>
            <div className="mt-1 flex min-w-0 items-baseline gap-2">
              <p className="shrink-0 text-2xl font-black leading-none text-stone-950">{score}%</p>
              <span className="text-sm font-black text-stone-500">complete</span>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-stone-500">
            <span>{completedSteps}/{setupSteps.length} steps complete</span>
            <span>{score === 100 ? "Ready for launch" : "In progress"}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 xl:justify-end">
          <Pill className={statusClass(park.status)}>{park.status}</Pill>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {setupSteps.map((step, index) => {
          const done = Boolean(park.onboarding?.[step.key]);
          return (
            <Link
              key={step.key}
              to={stepHref(park.id, step)}
              className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-black transition ${
                done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-stone-200 bg-stone-50 text-stone-600 hover:border-orange-200 hover:bg-orange-50"
              }`}
            >
              <span
                className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] ${
                  done ? "bg-emerald-600 text-white" : "bg-white text-stone-400"
                }`}
              >
                {done ? <FaCheckCircle className="text-[8px]" /> : index + 1}
              </span>
              <span className="truncate">{step.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NextActionCard({ park }) {
  const nextStep = getNextStep(park);
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
      <p className="text-xs font-black uppercase text-orange-700">Next action</p>
      <h3 className="mt-1 text-lg font-black text-stone-950">{nextStep.label}</h3>
      <p className="mt-1 text-sm font-semibold text-stone-600">
        {park.onboardingScore === 100 ? "Ready for live operations review." : "Complete this step to move the park closer to go-live."}
      </p>
      <Link to={stepHref(park.id, nextStep)} className={buttonClass("primary", "mt-4")}>
        Continue <FaRocket />
      </Link>
    </div>
  );
}

function ControlShell({ title, kicker = "SaaS command", children, actions }) {
  return (
    <PageLayout
      heading={title}
      sectionKicker={kicker}
      breadcrumb={[{ label: "Movira Control", link: "/movira-control/parks" }, { label: title }]}
      topButton={actions}
    >
      {children}
    </PageLayout>
  );
}

const emptyPlanForm = {
  key: "",
  label: "",
  monthlyBaseFee: 0,
  maxParks: "",
  description: "",
  sortOrder: 100,
  recommended: false,
  internalOnly: false,
  status: "active",
};

function planFormFrom(plan = null) {
  if (!plan) return emptyPlanForm;
  return {
    key: plan.key || "",
    label: plan.label || "",
    monthlyBaseFee: Number(plan.monthlyBaseFee || 0),
    maxParks: plan.maxParks === null || plan.maxParks === undefined ? "" : Number(plan.maxParks),
    description: plan.description || "",
    sortOrder: Number(plan.sortOrder || 100),
    recommended: Boolean(plan.recommended),
    internalOnly: Boolean(plan.internalOnly),
    status: plan.status || "active",
  };
}

function PlansManager() {
  const [activeCatalogTab, setActiveCatalogTab] = useState("plans");
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState(emptyPlanForm);
  const [deletePlan, setDeletePlan] = useState(null);
  const { data = {}, isLoading, isError, error } = useGetSaasPlansQuery({ includeArchived });
  const [createPlan, createState] = useCreateSaasPlanMutation();
  const [updatePlan, updateState] = useUpdateSaasPlanMutation();
  const [archivePlan, archiveState] = useDeleteSaasPlanMutation();
  const plans = data.plans || [];
  const filteredPlans = plans.filter((plan) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [plan.label, plan.key, plan.description].some((value) => String(value || "").toLowerCase().includes(term));
  });
  const activePlans = plans.filter((plan) => plan.status === "active" && !plan.archivedAt);
  const recommendedPlan = activePlans.find((plan) => plan.recommended);
  const cheapestPlan = activePlans.reduce((lowest, plan) => {
    if (!lowest) return plan;
    return Number(plan.monthlyBaseFee || 0) < Number(lowest.monthlyBaseFee || 0) ? plan : lowest;
  }, null);
  const unlimitedCount = activePlans.filter((plan) => plan.maxParks === null).length;
  const isSaving = createState.isLoading || updateState.isLoading;

  function openCreate() {
    setEditingPlan(null);
    setForm(emptyPlanForm);
    setPlanModalOpen(true);
  }

  function openEdit(plan) {
    setEditingPlan(plan);
    setForm(planFormFrom(plan));
    setPlanModalOpen(true);
  }

  function closeForm() {
    if (isSaving) return;
    setEditingPlan(null);
    setForm(emptyPlanForm);
    setPlanModalOpen(false);
  }

  async function handleSavePlan(event) {
    event.preventDefault();
    const payload = {
      ...form,
      monthlyBaseFee: Number(form.monthlyBaseFee || 0),
      maxParks: form.maxParks === "" ? null : Number(form.maxParks),
      sortOrder: Number(form.sortOrder || 100),
    };
    try {
      if (editingPlan) {
        await updatePlan({ planKey: editingPlan.key, ...payload }).unwrap();
        toast.success("Plan updated.");
      } else {
        await createPlan(payload).unwrap();
        toast.success("Plan created.");
      }
      closeForm();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save plan.");
    }
  }

  async function handleDeletePlan() {
    if (!deletePlan) return;
    try {
      await archivePlan(deletePlan.key).unwrap();
      toast.success("Plan archived.");
      setDeletePlan(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete plan.");
    }
  }

  if (isLoading) return <Loader />;
  if (isError) return <ErrorMessage message={error?.data?.message || "Failed to load SaaS plans."} />;

  return (
    <ControlShell
      title="Plans"
      actions={
        activeCatalogTab === "plans" ? (
          <button type="button" onClick={openCreate} className={buttonClass("primary")}>
            <FaPlus /> New plan
          </button>
        ) : null
      }
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
          <div className="inline-flex rounded-lg bg-stone-50 p-1">
            {[
              { key: "plans", label: "Plans" },
              { key: "modules", label: "Module pricing" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveCatalogTab(tab.key)}
                className={`rounded-md px-4 py-2 text-sm font-black transition ${
                  activeCatalogTab === tab.key ? "bg-orange-50 text-orange-700 shadow-sm" : "text-stone-600 hover:bg-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeCatalogTab === "plans" ? (
          <>
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard compact icon={FaLayerGroup} label="Active plans" value={activePlans.length} detail="available for billing" />
          <StatCard compact icon={FaRocket} label="Recommended" value={recommendedPlan?.label || "-"} detail="highlighted for sales" />
          <StatCard compact icon={FaMapMarkerAlt} label="Unlimited" value={unlimitedCount} detail="no park cap" />
          <StatCard compact icon={FaCreditCard} label="Starts at" value={cheapestPlan ? money(cheapestPlan.monthlyBaseFee) : "$0"} detail="monthly base fee" />
        </section>

        <section className={listingShellClass}>
          <div className={listingToolbarClass}>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-full flex-1 sm:min-w-[260px] md:max-w-md">
                <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search plans..."
                  className="input-nexus w-full px-9 py-2.5 text-sm"
                />
              </div>
              <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-1">
                <button
                  type="button"
                  onClick={() => setIncludeArchived(false)}
                  className={`rounded-md px-3 py-1.5 text-xs font-black ${!includeArchived ? "bg-white text-orange-700 shadow-sm" : "text-stone-500"}`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setIncludeArchived(true)}
                  className={`rounded-md px-3 py-1.5 text-xs font-black ${includeArchived ? "bg-white text-orange-700 shadow-sm" : "text-stone-500"}`}
                >
                  All
                </button>
              </div>
            </div>
            <Pill className="border-stone-200 bg-stone-50 text-stone-600">{filteredPlans.length} plans</Pill>
          </div>

          <div className={listingScrollClass}>
            <table className={listingTableClass("min-w-[900px]")}>
              <thead className={listingHeadClass}>
                <tr>
                  <th className={listingThClass()}>Plan</th>
                  <th className={listingThClass()}>Base fee</th>
                  <th className={listingThClass()}>Park limit</th>
                  <th className={listingThClass()}>Status</th>
                  <th className={listingThClass()}>Flags</th>
                  <th className={listingThClass("text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody className={listingBodyClass}>
                {filteredPlans.map((plan) => (
                  <tr key={plan.key} className={listingRowClass}>
                    <td className="px-4 py-3">
                      <p className="font-black text-stone-950">{plan.label}</p>
                      <p className="text-xs font-bold text-stone-500">{plan.key}</p>
                      {plan.description ? <p className="mt-1 max-w-xl text-xs font-semibold text-stone-500">{plan.description}</p> : null}
                    </td>
                    <td className="px-4 py-3 font-black text-stone-950">{money(plan.monthlyBaseFee)}/mo</td>
                    <td className="px-4 py-3 font-bold text-stone-600">
                      {plan.maxParks === null ? "Unlimited parks" : `${plan.maxParks} park${plan.maxParks === 1 ? "" : "s"}`}
                    </td>
                    <td className="px-4 py-3">
                      <Pill className={plan.status === "active" && !plan.archivedAt ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-100 text-stone-600"}>
                        {plan.archivedAt ? "archived" : plan.status}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {plan.recommended ? <Pill className="border-orange-200 bg-orange-50 text-orange-700">recommended</Pill> : null}
                        {plan.internalOnly ? <Pill className="border-blue-200 bg-blue-50 text-blue-700">internal</Pill> : null}
                        {!plan.recommended && !plan.internalOnly ? <span className="text-xs font-bold text-stone-400">-</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => openEdit(plan)} className={iconButtonClass("secondary")} aria-label={`Edit ${plan.label}`}>
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          disabled={plan.key === "starter" || Boolean(plan.archivedAt)}
                          onClick={() => setDeletePlan(plan)}
                          className={iconButtonClass("danger")}
                          aria-label={`Delete ${plan.label}`}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8">
                      <EmptyState title="No plans found" detail="Try another search or create a new SaaS billing plan." />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
          </>
        ) : (
          <ModulePricingPanel />
        )}
      </div>

      {planModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm" onClick={closeForm}>
          <form
            onSubmit={handleSavePlan}
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">{editingPlan ? "Update plan" : "New plan"}</p>
                <h3 className="mt-1 text-2xl font-black text-stone-950">{editingPlan ? `Edit ${editingPlan.label}` : "Create SaaS billing plan"}</h3>
                <p className="mt-1 text-sm font-semibold text-stone-500">Plans define base SaaS fee and how many parks an owner can run.</p>
              </div>
              <button type="button" onClick={closeForm} className={iconButtonClass("secondary")} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Plan name</span>
                <input
                  required
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Starter"
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Plan key</span>
                <input
                  required
                  disabled={Boolean(editingPlan)}
                  value={form.key}
                  onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
                  placeholder="starter"
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm disabled:bg-stone-50 disabled:text-stone-500"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Monthly base fee</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.monthlyBaseFee}
                  onChange={(event) => setForm((current) => ({ ...current, monthlyBaseFee: event.target.value }))}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Park limit</span>
                <input
                  type="number"
                  min="1"
                  value={form.maxParks}
                  onChange={(event) => setForm((current) => ({ ...current, maxParks: event.target.value }))}
                  placeholder="Blank means unlimited"
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Sort order</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Status</span>
                <SearchableSelect
                  value={form.status}
                  onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                  className="mt-1"
                  buttonClassName="min-h-11 py-2.5"
                  options={[
                    { value: "active", label: "Active" },
                    { value: "draft", label: "Draft" },
                    { value: "archived", label: "Archived" },
                  ]}
                />
              </label>
              <label className="md:col-span-2">
                <span className="text-xs font-black uppercase text-stone-500">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <input
                  type="checkbox"
                  checked={form.recommended}
                  onChange={(event) => setForm((current) => ({ ...current, recommended: event.target.checked }))}
                  className="h-4 w-4 accent-orange-600"
                />
                <span>
                  <span className="block text-sm font-black text-stone-950">Recommended plan</span>
                  <span className="text-xs font-semibold text-stone-500">Highlight this plan for operators.</span>
                </span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <input
                  type="checkbox"
                  checked={form.internalOnly}
                  onChange={(event) => setForm((current) => ({ ...current, internalOnly: event.target.checked }))}
                  className="h-4 w-4 accent-orange-600"
                />
                <span>
                  <span className="block text-sm font-black text-stone-950">Internal only</span>
                  <span className="text-xs font-semibold text-stone-500">Hide from normal customer-facing choices.</span>
                </span>
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-4">
              <button type="button" onClick={closeForm} className={buttonClass("secondary")}>
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className={buttonClass("primary")}>
                {isSaving ? "Saving..." : editingPlan ? "Update plan" : "Create plan"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletePlan)}
        tone="danger"
        eyebrow="Delete plan"
        title={deletePlan ? `Delete ${deletePlan.label}?` : ""}
        message="The plan will be archived and removed from normal plan selection. Existing parks keep their saved billing values until changed."
        details={["Starter/default plan cannot be deleted.", "Archived plans can still be shown from the All filter for audit context."]}
        confirmLabel="Delete plan"
        loading={archiveState.isLoading}
        onConfirm={handleDeletePlan}
        onClose={() => setDeletePlan(null)}
      />
    </ControlShell>
  );
}

function ModulePricingPanel() {
  const [search, setSearch] = useState("");
  const [editingModule, setEditingModule] = useState(null);
  const [form, setForm] = useState(null);
  const { data = {}, isLoading, isError, error } = useGetSaasModulesQuery({ includeInactive: true });
  const [updateModule, updateState] = useUpdateSaasModuleMutation();
  const moduleList = data.modules?.length ? data.modules : modules;
  const filteredModules = moduleList.filter((module) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [module.label, module.key, module.description].some((value) => String(value || "").toLowerCase().includes(term));
  });
  const activeModules = moduleList.filter((module) => (module.status || "active") === "active");
  const monthlyTotal = activeModules.reduce((sum, module) => sum + Number(module.monthly || 0), 0);
  const highestModule = activeModules.reduce((highest, module) => {
    if (!highest) return module;
    return Number(module.monthly || 0) > Number(highest.monthly || 0) ? module : highest;
  }, null);

  function openEdit(module) {
    setEditingModule(module);
    setForm({
      label: module.label || "",
      monthly: Number(module.monthly || 0),
      description: module.description || "",
      sortOrder: Number(module.sortOrder || 100),
      status: module.status || "active",
    });
  }

  function closeEdit() {
    if (updateState.isLoading) return;
    setEditingModule(null);
    setForm(null);
  }

  async function handleSaveModule(event) {
    event.preventDefault();
    if (!editingModule || !form) return;
    try {
      await updateModule({
        moduleKey: editingModule.key,
        ...form,
        monthly: Number(form.monthly || 0),
        sortOrder: Number(form.sortOrder || 100),
      }).unwrap();
      toast.success("Module price updated.");
      closeEdit();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update module price.");
    }
  }

  if (isLoading) return <Loader />;
  if (isError) return <ErrorMessage message={error?.data?.message || "Failed to load module pricing."} />;

  return (
    <>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard compact icon={FaLayerGroup} label="Active modules" value={activeModules.length} detail="available add-ons" />
        <StatCard compact icon={FaCreditCard} label="Monthly bundle" value={money(monthlyTotal)} detail="all active modules" />
        <StatCard compact icon={FaRocket} label="Highest price" value={highestModule?.label || "-"} detail={highestModule ? `${money(highestModule.monthly)}/mo` : "No active module"} />
        <StatCard compact icon={FaCheckCircle} label="Catalog rows" value={moduleList.length} detail="managed modules" />
      </section>

      <section className={listingShellClass}>
        <div className={listingToolbarClass}>
          <div className="relative min-w-full flex-1 sm:min-w-[260px] md:max-w-md">
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search modules..."
              className="input-nexus w-full px-9 py-2.5 text-sm"
            />
          </div>
          <Pill className="border-stone-200 bg-stone-50 text-stone-600">{filteredModules.length} modules</Pill>
        </div>

        <div className={listingScrollClass}>
          <table className={listingTableClass("min-w-[860px]")}>
            <thead className={listingHeadClass}>
              <tr>
                <th className={listingThClass()}>Module</th>
                <th className={listingThClass()}>Monthly price</th>
                <th className={listingThClass()}>Status</th>
                <th className={listingThClass()}>Sort</th>
                <th className={listingThClass("text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody className={listingBodyClass}>
              {filteredModules.map((module) => (
                <tr key={module.key} className={listingRowClass}>
                  <td className="px-4 py-3">
                    <p className="font-black text-stone-950">{module.label}</p>
                    <p className="text-xs font-bold text-stone-500">{module.key}</p>
                    {module.description ? <p className="mt-1 max-w-xl text-xs font-semibold text-stone-500">{module.description}</p> : null}
                  </td>
                  <td className="px-4 py-3 font-black text-stone-950">{money(module.monthly)}/mo</td>
                  <td className="px-4 py-3">
                    <Pill className={(module.status || "active") === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-100 text-stone-600"}>
                      {module.status || "active"}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 font-bold text-stone-600">{module.sortOrder || 100}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button type="button" onClick={() => openEdit(module)} className={iconButtonClass("secondary")} aria-label={`Edit ${module.label}`}>
                        <FaEdit />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8">
                    <EmptyState title="No modules found" detail="Try another search to find a module price." />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {editingModule && form ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm" onClick={closeEdit}>
          <form
            onSubmit={handleSaveModule}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">Module pricing</p>
                <h3 className="mt-1 text-2xl font-black text-stone-950">Edit {editingModule.label}</h3>
                <p className="mt-1 text-sm font-semibold text-stone-500">This price is used for park modules, billing totals, and generated SaaS invoices.</p>
              </div>
              <button type="button" onClick={closeEdit} className={iconButtonClass("secondary")} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Module name</span>
                <input
                  required
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Monthly price</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.monthly}
                  onChange={(event) => setForm((current) => ({ ...current, monthly: event.target.value }))}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Sort order</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label>
                <span className="text-xs font-black uppercase text-stone-500">Status</span>
                <SearchableSelect
                  value={form.status}
                  onChange={(value) => setForm((current) => ({ ...current, status: value }))}
                  className="mt-1"
                  buttonClassName="min-h-11 py-2.5"
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                />
              </label>
              <label className="md:col-span-2">
                <span className="text-xs font-black uppercase text-stone-500">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-4">
              <button type="button" onClick={closeEdit} className={buttonClass("secondary")}>
                Cancel
              </button>
              <button type="submit" disabled={updateState.isLoading} className={buttonClass("primary")}>
                {updateState.isLoading ? "Saving..." : "Update module"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Overview() {
  const { data = {}, isLoading, isError, error } = useGetSaasParksQuery({ limit: 6 });
  const summary = data.summary || {};
  const parks = data.parks || [];

  if (isLoading) return <Loader />;
  if (isError) return <ErrorMessage message={error?.data?.message || "Failed to load Movira Control"} />;

  return (
    <ControlShell
      title="Movira Control"
      actions={
        <div className="flex gap-2">
          <Link to="/movira-control/parks" className={buttonClass("secondary")}>
            Parks
          </Link>
          <Link to="/movira-control/parks/new" className={buttonClass("primary")}>
            <FaPlus /> New park
          </Link>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={FaMapMarkerAlt} label="Total parks" value={summary.total || 0} detail={`${summary.setup || 0} in setup`} />
          <StatCard icon={FaRocket} label="Live parks" value={summary.live || 0} detail="approved for operations" />
          <StatCard icon={FaCreditCard} label="Monthly SaaS" value={money(summary.monthlyRevenue || 0)} detail="base fee + modules" />
          <StatCard icon={FaLayerGroup} label="Modules" value={modules.length} detail="controlled per park" />
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-orange-700">Parks onboarding</p>
              <h2 className="mt-1 text-2xl font-black text-stone-950">Create, bill, configure, and approve every park.</h2>
              <p className="mt-1 text-sm font-semibold text-stone-500">Start from the parks list, then work through modules, billing, payments, and launch readiness.</p>
            </div>
            <Link to="/movira-control/parks/new" className={buttonClass("primary")}>
              <FaPlus /> Onboard park
            </Link>
          </div>
          {parks.length ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {parks.map((park) => (
              <Link key={park.id} to={`/movira-control/parks/${park.id}`} className="rounded-xl border border-stone-200 p-4 transition hover:border-orange-300 hover:bg-orange-50/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-stone-950">{park.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-stone-500">{park.location}</p>
                  </div>
                  <Pill className={statusClass(park.status)}>{park.status}</Pill>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm font-bold text-stone-600">
                  <span>Base {money(park.monthlyBaseFee, park.currency)}</span>
                  <span>{money(park.billing?.monthlyTotal, park.currency)}/mo</span>
                </div>
                <div className="mt-3">
                  <ProgressBar value={park.onboardingScore || 0} />
                  <p className="mt-1 text-xs font-bold text-stone-500">{park.onboardingScore || 0}% ready</p>
                </div>
              </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="No parks in control yet"
                detail="Create the first park workspace to start onboarding, billing, and launch checks."
                action={<Link to="/movira-control/parks/new" className={buttonClass("primary")}><FaPlus /> New park</Link>}
              />
            </div>
          )}
        </section>
      </div>
    </ControlShell>
  );
}

function ParksList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const { data = {}, isLoading, isError, error } = useGetSaasParksQuery({
    page,
    limit: 12,
    search,
    includeArchived: statusFilter === "archived",
    status: statusFilter,
    organizationId: organizationFilter,
  });
  const [archivePark] = useDeleteSaasParkMutation();
  const [permanentDeletePark] = usePermanentDeleteSaasParkMutation();
  const [loadDeletePreview] = useLazyGetSaasParkPermanentDeletePreviewQuery();
  const [updateLifecycle] = useUpdateSaasParkLifecycleMutation();
  const parks = data.parks || [];
  const pagination = data.pagination || {};
  const summary = data.summary || {};
  const organizations = data.catalogs?.organizations || [];

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  const archiveConfirmed = async (park) => {
    try {
      await archivePark(park.id).unwrap();
      toast.success("Park archived.");
      setStatusFilter("archived");
      setPage(1);
      closeConfirmDialog();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to archive park.");
    }
  };

  const onArchive = (park) => {
    setConfirmDialog({
      type: "control-delete",
      tone: "warning",
      eyebrow: "Delete options",
      title: `Delete options for ${park.name}`,
      message: "Choose archive for a safe reversible delete, or permanent delete when the park and its scoped data should be removed completely.",
      details: [
        "Archive removes the park from Admin lists and keeps data restorable.",
        "Permanent delete removes location-scoped data and cannot be undone.",
        "Type DELETE only if you want to use permanent delete.",
      ],
      confirmText: "DELETE",
      confirmValue: "",
      confirmLabel: "Archive park",
      park,
    });
  };

  const permanentDeleteConfirmed = async (park) => {
    try {
      await permanentDeletePark({
        id: park.id,
        confirmation: "DELETE",
        confirmLocationName: park.name,
        previewAccepted: true,
      }).unwrap();
      toast.success("Park permanently deleted.");
      closeConfirmDialog();
    } catch (err) {
      toast.error(err?.data?.message || err?.data?.error || "Failed to permanently delete park.");
    }
  };

  const onRestore = async (park) => {
    try {
      await updateLifecycle({ id: park.id, status: "setup" }).unwrap();
      toast.success("Park restored.");
      closeConfirmDialog();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to restore park.");
    }
  };

  const pauseToggleConfirmed = async (park) => {
    const nextStatus = park.status === "paused" ? "setup" : "paused";
    try {
      await updateLifecycle({ id: park.id, status: nextStatus }).unwrap();
      toast.success(nextStatus === "paused" ? "Park paused." : "Park resumed.");
      closeConfirmDialog();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update park status.");
    }
  };

  const onPauseToggle = (park) => {
    const pausing = park.status !== "paused";
    setConfirmDialog({
      type: "pause",
      tone: pausing ? "info" : "warning",
      eyebrow: pausing ? "Pause park" : "Resume park",
      title: `${pausing ? "Pause" : "Resume"} ${park.name}?`,
      message: pausing
        ? "Customer data will stay safe. The park remains visible for admins, but operations can be treated as temporarily stopped."
        : "This will move the park back into setup status so work can continue.",
      confirmLabel: pausing ? "Pause park" : "Resume park",
      park,
    });
  };

  const openRestoreDialog = (park) => {
    setConfirmDialog({
      type: "restore",
      tone: "info",
      eyebrow: "Restore park",
      title: `Restore ${park.name}?`,
      message: "The park will move back to active setup and appear in Admin locations again.",
      confirmLabel: "Restore park",
      park,
    });
  };

  const openPermanentDeleteDialog = async (park) => {
    setConfirmDialog({
      type: "permanent-preview",
      tone: "danger",
      eyebrow: "Checking delete impact",
      title: `Preparing permanent delete for ${park.name}`,
      message: "Loading the affected data preview before permanent delete.",
      details: ["Permanent delete is only available after the park is archived."],
      confirmLabel: "Loading...",
      park,
    });

    try {
      const preview = await loadDeletePreview(park.id).unwrap();
      const plan = preview?.plan || {};
      const topTables = (plan.tables || []).slice(0, 6).map((item) => `${item.tableName}: ${item.count} rows`);
      if (preview?.blocked) {
        setConfirmDialog({
          type: "permanent-delete-blocked",
          tone: "warning",
          eyebrow: "Archive required",
          title: `Archive ${park.name} first`,
          message: preview.blockerMessage || "Permanent delete is only available after the park is archived.",
          details: [
            `Affected rows after archive: ${plan.rowCount || 0}`,
            `Affected tables after archive: ${plan.tableCount || 0}`,
            ...(topTables.length ? topTables : ["No location-scoped child rows found in preview."]),
            "Archive is reversible. Permanent delete is available from the Archived tab after that.",
          ],
          confirmLabel: "Archive park first",
          park,
        });
        return;
      }
      setConfirmDialog({
        type: "permanent-delete",
        tone: "danger",
        eyebrow: "Permanent delete",
        title: `Delete ${park.name} permanently?`,
        message: "Review the impact below. This removes the park and location-scoped data permanently.",
        details: [
          `Affected rows: ${plan.rowCount || 0}`,
          `Affected tables: ${plan.tableCount || 0}`,
          ...(topTables.length ? topTables : ["No location-scoped child rows found in preview."]),
          "This action cannot be undone.",
        ],
        confirmText: "DELETE",
        confirmValue: "",
        confirmLabel: "Delete permanently",
        park,
      });
    } catch (err) {
      setConfirmDialog({
        type: "permanent-preview-failed",
        tone: "danger",
        eyebrow: "Preview failed",
        title: "Permanent delete preview failed",
        message: err?.data?.message || "Could not load delete impact. Permanent delete is blocked until the preview works.",
        confirmLabel: "Close",
        park,
      });
    }
  };

  const handleConfirmDialog = async (event) => {
    if (!confirmDialog) return;
    if (event.type === "input") {
      setConfirmDialog((current) => ({ ...current, confirmValue: event.value }));
      return;
    }
    if (confirmDialog.type === "archive" || confirmDialog.type === "control-delete") return archiveConfirmed(confirmDialog.park);
    if (confirmDialog.type === "pause") return pauseToggleConfirmed(confirmDialog.park);
    if (confirmDialog.type === "restore") return onRestore(confirmDialog.park);
    if (confirmDialog.type === "permanent-preview-failed") return closeConfirmDialog();
    if (confirmDialog.type === "permanent-delete-blocked") return archiveConfirmed(confirmDialog.park);
    if (confirmDialog.type === "permanent-delete") return permanentDeleteConfirmed(confirmDialog.park);
  };

  if (isLoading) return <Loader />;
  if (isError) return <ErrorMessage message={error?.data?.message || "Failed to load parks"} />;

  return (
    <ControlShell
      title="Parks"
      actions={
        <Link to="/movira-control/parks/new" className={buttonClass("primary", "min-h-9 px-3 py-1.5")}>
          <FaPlus /> New park
        </Link>
      }
    >
      <div className="space-y-3">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard compact icon={FaMapMarkerAlt} label="Total parks" value={summary.total || pagination.totalRecords || 0} detail={`${summary.setup || 0} in setup`} />
          <StatCard compact icon={FaRocket} label="Live parks" value={summary.live || 0} detail="approved for operations" />
          <StatCard compact icon={FaCreditCard} label="Monthly SaaS" value={money(summary.monthlyRevenue || 0)} detail="base fee + modules" />
          <StatCard compact icon={FaBuilding} label="Organizations" value={summary.organizations || 0} detail="own one or more parks" />
        </section>

        <div className={listingShellClass}>
          <div className="sticky top-0 z-30 grid gap-2 border-b border-[var(--stroke-soft)] bg-[var(--surface-panel-strong)]/95 p-3 backdrop-blur sm:grid-cols-[minmax(180px,320px)_minmax(180px,260px)_1fr_auto] sm:items-center">
            <div className="relative min-w-0">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search parks..." className="input-nexus w-full py-1.5 pl-8 pr-3 text-sm" />
            </div>
            <SearchableSelect
              value={organizationFilter}
              onChange={(value) => {
                setOrganizationFilter(value);
                setPage(1);
              }}
              placeholder="All organizations"
              searchPlaceholder="Search organizations..."
              className="min-w-0"
              options={[
                { value: "", label: "All organizations" },
                ...organizations.map((org) => ({
                  value: String(org.id || org.organizationId),
                  label: org.name,
                })),
              ]}
            />
            <p className="text-right text-sm font-bold text-stone-500 sm:whitespace-nowrap">{pagination.totalRecords || 0} parks</p>
            <div className="inline-flex w-fit justify-self-end rounded-lg border border-stone-200 bg-stone-50 p-1">
              {[
                ["active", "Active"],
                ["archived", "Archived"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-black transition ${
                    statusFilter === value ? "bg-white text-orange-700 shadow-sm" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {parks.length ? (
            <div className={listingScrollClass}>
            <table className={listingTableClass("min-w-[980px]")}>
              <thead className={listingHeadClass}>
                <tr>
                  <th className={listingThClass("py-2.5")}>Park</th>
                  <th className={listingThClass("py-2.5")}>Organization</th>
                  <th className={listingThClass("py-2.5")}>Customer</th>
                  <th className={listingThClass("py-2.5")}>Status</th>
                  <th className={listingThClass("py-2.5")}>Base fee</th>
                  <th className={listingThClass("py-2.5")}>Billing</th>
                  <th className={listingThClass("py-2.5")}>Onboarding</th>
                  <th className={listingThClass("py-2.5 text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody className={listingBodyClass}>
                {parks.map((park) => {
                  const isArchived = statusFilter === "archived" || Boolean(park.archivedAt) || park.status === "archived";
                  const displayStatus = isArchived ? "archived" : park.status;

                  return (
                    <tr key={park.id} className={listingRowClass}>
                      <td className="px-4 py-3">
                        <p className="font-black text-stone-950">{park.name}</p>
                        <p className="text-xs font-semibold text-stone-500">{park.location}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-stone-800">{park.organization?.name || "Unassigned"}</p>
                        {park.ownerUser?.email ? <p className="text-xs font-semibold text-stone-500">{park.ownerUser.email}</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-stone-700">{park.owner}</p>
                        <p className="text-xs font-semibold text-stone-500">{park.ownerUser?.name || "Customer not assigned"}</p>
                      </td>
                      <td className="px-4 py-3"><Pill className={statusClass(displayStatus)}>{displayStatus}</Pill></td>
                      <td className="px-4 py-3 font-bold text-stone-700">{money(park.monthlyBaseFee, park.currency)}/mo</td>
                      <td className="px-4 py-3 font-black text-stone-950">{money(park.billing?.monthlyTotal, park.currency)}/mo</td>
                      <td className="px-4 py-3">
                        <div className="w-28"><ProgressBar value={park.onboardingScore || 0} /></div>
                        <p className="mt-1 text-xs font-bold text-stone-500">{park.onboardingScore || 0}%</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Link to={`/movira-control/parks/${park.id}`} className={iconButtonClass("secondary", "h-8 w-8 rounded-md text-base")} title="Open"><FaEye /></Link>
                          <Link to={`/movira-control/parks/${park.id}/edit`} className={iconButtonClass("secondary", "h-8 w-8 rounded-md text-base")} title="Edit"><FaEdit /></Link>
                          {isArchived ? (
                            <>
                              <button onClick={() => openRestoreDialog(park)} className={iconButtonClass("secondary", "h-8 w-8 rounded-md text-base")} title="Restore"><FaTrashRestore /></button>
                              <button onClick={() => openPermanentDeleteDialog(park)} className={iconButtonClass("danger", "h-8 w-8 rounded-md text-base")} title="Permanent delete"><FaTrash /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => onPauseToggle(park)} className={iconButtonClass("secondary", "h-8 w-8 rounded-md text-base")} title={park.status === "paused" ? "Resume" : "Pause"}>
                                {park.status === "paused" ? <FaPlay /> : <FaPause />}
                              </button>
                              <button onClick={() => onArchive(park)} className={iconButtonClass("danger", "h-8 w-8 rounded-md text-base")} title="Archive safely"><FaTrash /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title={search ? "No matching parks" : "No parks yet"}
                detail={search ? "Try a different park name, owner, or city." : "Create a park workspace before assigning billing, modules, and go-live controls."}
                action={!search ? <Link to="/movira-control/parks/new" className={buttonClass("primary")}><FaPlus /> New park</Link> : null}
              />
            </div>
          )}
          {pagination.totalPages > 1 ? (
            <div className={listingFooterClass}>
              <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className={buttonClass("secondary", "min-h-10 px-3")}>Prev</button>
              <span className="text-sm font-bold text-stone-500">{page} / {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className={buttonClass("secondary", "min-h-10 px-3")}>Next</button>
            </div>
          ) : null}
        </div>
        <ConfirmDialog
          open={Boolean(confirmDialog)}
          tone={confirmDialog?.tone}
          eyebrow={confirmDialog?.eyebrow}
          title={confirmDialog?.title}
          message={confirmDialog?.message}
          details={confirmDialog?.details}
          confirmLabel={confirmDialog?.confirmLabel}
          confirmText={confirmDialog?.confirmText}
          confirmValue={confirmDialog?.confirmValue}
          requireConfirmTextForPrimary={confirmDialog?.type !== "control-delete"}
          extraActions={
            confirmDialog?.type === "control-delete"
              ? [
                  {
                    label: "Delete permanently",
                    tone: "danger",
                    disabled: confirmDialog.confirmValue !== "DELETE",
                    onClick: () => openPermanentDeleteDialog(confirmDialog.park),
                  },
                ]
              : []
          }
          loading={confirmDialog?.type === "permanent-preview"}
          confirmDisabled={Boolean(confirmDialog?.blocked)}
          onConfirm={handleConfirmDialog}
          onClose={closeConfirmDialog}
        />
      </div>
    </ControlShell>
  );
}

function ParkForm() {
  const { parkId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(parkId);
  const { data, isLoading } = useGetSaasParkByIdQuery(parkId, { skip: !isEdit });
  const { data: listData = {} } = useGetSaasParksQuery({ limit: 1, status: "all", includeArchived: true });
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const { data: usersData = {} } = useGetAllUsersQuery({ search: customerSearch });
  const organizations = listData.catalogs?.organizations || data?.catalogs?.organizations || [];
  const users = Array.isArray(usersData)
    ? usersData
    : Array.isArray(usersData?.data)
    ? usersData.data
    : Array.isArray(usersData?.users)
    ? usersData.users
    : [];
  const [form, setForm] = useState(defaultForm);
  const [newCustomer, setNewCustomer] = useState(defaultCustomerOwner);
  const [createdCustomer, setCreatedCustomer] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [createPark, createState] = useCreateSaasParkMutation();
  const [createCustomerOwner, createCustomerState] = useCreateSaasCustomerOwnerMutation();
  const [updatePark, updateState] = useUpdateSaasParkMutation();
  const customerUsers = createdCustomer && !users.some((user) => String(user.user_id || user.userId || user.id) === String(createdCustomer.userId || createdCustomer.id))
    ? [...users, createdCustomer]
    : users;
  const selectedCustomer = customerUsers.find((user) => String(user.user_id || user.userId || user.id) === String(form.ownerUserId));
  const selectedCustomerName = getUserName(selectedCustomer) || form.owner || "No customer selected";
  const selectedCustomerEmail = selectedCustomer?.email || form.ownerEmail || "Select or create an owner account";
  const selectedCustomerPhone = getUserPhone(selectedCustomer) || form.phone || "";
  const customerByEmail = useMemo(() => {
    const email = normalizeEmail(form.ownerEmail);
    if (!email) return null;
    return customerUsers.find((user) => normalizeEmail(user.email) === email) || null;
  }, [customerUsers, form.ownerEmail]);
  const selectedCustomerId = selectedCustomer ? String(selectedCustomer.user_id || selectedCustomer.userId || selectedCustomer.id) : "";
  const emailCustomerId = customerByEmail ? String(customerByEmail.user_id || customerByEmail.userId || customerByEmail.id) : "";
  const ownerEmailError =
    form.ownerEmail && selectedCustomer && normalizeEmail(selectedCustomer.email) !== normalizeEmail(form.ownerEmail)
      ? "Selected customer account and customer email do not match."
      : form.ownerEmail && selectedCustomerId && emailCustomerId && selectedCustomerId !== emailCustomerId
      ? "Selected customer account and customer email do not match."
      : "";
  const selectedCountryProfile = getCountryProfile(form.country);

  useEffect(() => {
    const timer = window.setTimeout(() => setCustomerSearch(customerSearchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [customerSearchInput]);

  useEffect(() => {
    if (data?.park && isEdit) {
      const park = data.park;
      setForm({
        ...defaultForm,
        organizationId: park.organizationId || park.organization?.id || "",
        organizationName: park.organization?.name || park.organizationName || "",
        name: park.name || "",
        slug: park.slug || "",
        owner: park.owner || "",
        ownerUserId: park.ownerUserId || park.ownerUser?.id || park.ownerUser?.userId || park.organization?.ownerUserId || park.organization?.ownerUser?.id || park.organization?.ownerUser?.userId || "",
        ownerEmail: park.ownerEmail || "",
        phone: park.phone || "",
        city: park.city || "",
        state: park.state || "",
        country: park.country || "Canada",
        timezone: park.timezone || "America/Toronto",
        currency: park.currency || "CAD",
        streetNumberOrBuildingName: park.streetNumberOrBuildingName || "",
        streetName: park.streetName || "",
        postalCode: park.postalCode || "",
        displayAddress: park.displayAddress || "",
        monthlyBaseFee: park.monthlyBaseFee || 0,
      });
    }
  }, [data, isEdit]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateNewCustomer = (key, value) => setNewCustomer((current) => ({ ...current, [key]: value }));
  const applyCustomerUser = (user, fallback = {}) => {
    if (!user) return;
    const userId = user.user_id || user.userId || user.id;
    setForm((current) => ({
      ...current,
      ownerUserId: String(userId),
      ownerEmail: user.email || fallback.email || current.ownerEmail,
      owner: getUserName(user) || current.owner,
      phone: getUserPhone(user) || current.phone,
    }));
  };
  const updateCountry = (value) => {
    const profile = getCountryProfile(value);
    setForm((current) => ({
      ...current,
      country: profile.value,
      timezone: profile.timezone,
      currency: profile.currency,
      phone: normalizePhoneForCountry(current.phone, profile.value),
    }));
  };

  const handleCreateCustomerOwner = async () => {
    if (!newCustomer.firstName.trim() || !newCustomer.email.trim() || !newCustomer.phone.trim()) {
      toast.error("Customer first name, email, and phone are required.");
      return;
    }
    try {
      const response = await createCustomerOwner({
        ...newCustomer,
        phone: normalizePhoneForCountry(newCustomer.phone, form.country),
        locationId: isEdit ? parkId : undefined,
        parkId: isEdit ? parkId : undefined,
        parkName: form.name,
        organizationName: form.organizationName,
        appBaseUrl: window.location.origin,
      }).unwrap();
      const user = response?.user || response?.data?.user;
      const password = response?.temporaryPassword || response?.data?.temporaryPassword || "";
      const welcomeEmail = response?.welcomeEmail || response?.data?.welcomeEmail || null;
      if (!user) {
        toast.error("Customer owner was created, but the user data was not returned.");
        return;
      }
      const userId = user.userId || user.user_id || user.id;
      const name = user.name || [newCustomer.firstName, newCustomer.lastName].filter(Boolean).join(" ");
      const phone = normalizePhoneForCountry(user.phone || newCustomer.phone, form.country);
      setCreatedCustomer(user);
      setTemporaryPassword(password);
      setForm((current) => ({
        ...current,
        ownerUserId: String(userId),
        owner: name || current.owner,
        ownerEmail: user.email || newCustomer.email,
        phone: phone || current.phone,
      }));
      setNewCustomer(defaultCustomerOwner);
      setOwnerModalOpen(false);
      if (welcomeEmail?.sent) {
        toast.success("Customer owner created, selected, and welcome email queued.");
      } else if (!isEdit && welcomeEmail?.reason === "missing_location") {
        toast.success("Customer owner created and selected. Welcome email will be sent after the park is created.");
      } else if (password) {
        toast.warning(`Customer owner created and selected, but welcome email was not sent${welcomeEmail?.reason ? `: ${welcomeEmail.reason}` : "."}`);
      } else {
        toast.success("Existing customer owner selected.");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create customer owner.");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const emailOwner = customerByEmail;
    const ownerUserId = form.ownerUserId || (emailOwner ? String(emailOwner.user_id || emailOwner.userId || emailOwner.id) : "");
    const missingMessage = requiredParkProfileFields.find(([key]) => !String(form[key] || "").trim())?.[1];
    if (missingMessage) {
      toast.error(missingMessage);
      return;
    }
    if (form.ownerEmail && !isValidEmail(form.ownerEmail)) {
      toast.error("Enter a valid customer email.");
      return;
    }
    if (ownerEmailError) {
      toast.error(ownerEmailError);
      return;
    }
    try {
      const payload = {
        ...form,
        ownerUserId,
        customerUserId: ownerUserId,
        phone: normalizePhoneForCountry(form.phone, form.country),
        requireCustomerAssignment: true,
        autoCreateCustomerOwner: !ownerUserId,
        appBaseUrl: window.location.origin,
        temporaryPassword: !isEdit ? temporaryPassword : undefined,
      };
      delete payload.monthlyBaseFee;
      const response = isEdit
        ? await updatePark({ id: parkId, ...payload }).unwrap()
        : await createPark(payload).unwrap();
      const id = response?.data?.id || response?.id || parkId;
      const welcomeEmail = response?.welcomeEmail || response?.data?.welcomeEmail || null;
      const customerOwner = response?.customerOwner || response?.data?.customerOwner || null;
      if (!isEdit && welcomeEmail && !welcomeEmail.sent) {
        toast.warning(`Park created, but welcome email was not sent${welcomeEmail.reason ? `: ${welcomeEmail.reason}` : "."}`);
      } else if (!isEdit && customerOwner?.created) {
        toast.success("Park and owner account created. Welcome email queued.");
      } else {
        toast.success(isEdit ? "Park updated." : "Park created and welcome email queued.");
      }
      navigate(`/movira-control/parks/${id}`);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save park.");
    }
  };

  if (isLoading) return <Loader />;

  return (
    <ControlShell
      title={isEdit ? "Edit park" : "New park"}
      actions={<Link to="/movira-control/parks" className={buttonClass("secondary", "w-full sm:w-auto")}><FaArrowLeft /> Parks</Link>}
    >
      <form onSubmit={submit} className="grid max-w-7xl gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 bg-gradient-to-r from-orange-50/80 to-white px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">Park profile</p>
                <h2 className="mt-1 break-words text-lg font-black text-stone-950">Workspace identity</h2>
              </div>
              <Pill className="border-orange-200 bg-white text-orange-700">{isEdit ? "Editing" : "New setup"}</Pill>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-xs font-black uppercase text-stone-500">Organization *</span>
                <div className="mt-1 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <SearchableSelect
                    value={form.organizationId}
                    onChange={(value) => {
                      const selected = organizations.find((org) => String(org.id || org.organizationId) === String(value));
                      setForm((current) => ({
                        ...current,
                        organizationId: value,
                        organizationName: selected?.name || current.organizationName,
                      }));
                    }}
                    placeholder="Create or match by organization name"
                    searchPlaceholder="Search organizations..."
                    className="w-full"
                    buttonClassName="min-h-11 py-2.5"
                    options={[
                      { value: "", label: "Create or match by organization name" },
                      ...organizations.map((org) => ({
                        value: String(org.id || org.organizationId),
                        label: org.name,
                      })),
                    ]}
                  />
                  <input
                    value={form.organizationName}
                    onChange={(event) => update("organizationName", event.target.value)}
                    placeholder="e.g. Yogesh Sports Group"
                    required
                    className="input-nexus w-full px-3 py-2.5 text-sm"
                  />
                </div>
              </label>
              {[
                ["name", "Park name", "Movira St. Catharines"],
                ["slug", "Slug", "movira-st-catharines"],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="block">
                  <span className="text-xs font-black uppercase text-stone-500">{label}{key === "name" ? " *" : ""}</span>
                  <input value={form[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} required={key === "name"} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
              ))}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 bg-gradient-to-r from-stone-50 to-white px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">Customer assignment</p>
                <h2 className="mt-1 break-words text-lg font-black text-stone-950">Assign the account that owns this park</h2>
              </div>
              <Pill className="border-emerald-200 bg-emerald-50 text-emerald-700">Auto create on save</Pill>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)]">
              <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-orange-700 shadow-sm">
                    <FaUserPlus />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-orange-700">Selected owner</p>
                    <p className="mt-1 truncate text-base font-black text-stone-950">{selectedCustomerName}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-stone-600">{selectedCustomerEmail}</p>
                    {selectedCustomerPhone ? (
                      <p className="mt-1 truncate text-sm font-semibold text-stone-500">{selectedCustomerPhone}</p>
                    ) : null}
                  </div>
                </div>
                {temporaryPassword ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
                    Temporary login password: <span className="font-black">{temporaryPassword}</span>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="text-xs font-black uppercase text-stone-500">Customer account *</span>
                  <SearchableSelect
                    value={form.ownerUserId}
                    onChange={(value) => {
                      const selected = customerUsers.find((user) => String(user.user_id || user.userId || user.id) === String(value));
                      if (selected) {
                        applyCustomerUser(selected);
                        return;
                      }
                      setForm((current) => ({ ...current, ownerUserId: value }));
                    }}
                    placeholder="Select customer account"
                    searchPlaceholder="Search customer account..."
                    emptyText={customerSearch ? "No customer matched. Fill the details below and save to create one." : "No customer owners found. Fill the details below and save to create one."}
                    onSearchChange={setCustomerSearchInput}
                    className="mt-1"
                    buttonClassName="min-h-11 py-2.5"
                    options={[
                      { value: "", label: "Select customer account" },
                      ...customerUsers.map((user) => {
                        const id = user.user_id || user.userId || user.id;
                        const name = getUserName(user);
                        const phone = getUserPhone(user);
                        const phoneDigits = String(phone || "").replace(/\D/g, "");
                        return {
                          value: String(id),
                          label: name || "Unnamed customer",
                          description: [user.email, phone].filter(Boolean).join(" | "),
                          searchText: [name, user.email, phone, phoneDigits].filter(Boolean).join(" "),
                        };
                      }),
                    ]}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Customer name *</span>
                  <input value={form.owner} onChange={(event) => update("owner", event.target.value)} placeholder="Yogesh Niranjan" required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Phone *</span>
                  <div className="mt-1 flex min-h-11 overflow-hidden rounded-lg border-2 border-[#d6c8b8] bg-white shadow-[0_2px_0_rgba(23,21,18,0.08)] transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-500/15">
                    <span className="grid min-w-14 place-items-center border-r border-stone-200 bg-stone-50 px-3 text-sm font-black text-stone-600">
                      {selectedCountryProfile.dialCode}
                    </span>
                    <input
                      value={phoneLocalValue(form.phone, form.country)}
                      onChange={(event) => update("phone", phoneLocalValue(event.target.value, form.country))}
                      onBlur={(event) => update("phone", phoneLocalValue(event.target.value, form.country))}
                      placeholder="9055550101"
                      required
                      className="unstyled-input min-h-11 w-full rounded-none border-0 bg-transparent px-3 py-2.5 text-sm font-bold text-stone-950 outline-none placeholder:text-stone-400 focus:border-0 focus:outline-none focus:ring-0"
                      style={{ border: 0, boxShadow: "none", outline: "none", WebkitAppearance: "none" }}
                    />
                  </div>
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs font-black uppercase text-stone-500">Customer email *</span>
                  <input
                    value={form.ownerEmail}
                    onChange={(event) => update("ownerEmail", event.target.value)}
                    onBlur={(event) => {
                      const matched = customerUsers.find((user) => normalizeEmail(user.email) === normalizeEmail(event.target.value));
                      applyCustomerUser(matched, { email: event.target.value });
                    }}
                    placeholder="owner@example.com"
                    required
                    className={`input-nexus mt-1 w-full px-3 py-2.5 text-sm ${ownerEmailError ? "border-red-300 bg-red-50/40" : ""}`}
                  />
                  {ownerEmailError ? (
                    <p className="mt-1 text-xs font-bold text-red-700">{ownerEmailError}</p>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-stone-500">
                      Search existing owner by name, phone, or email. If no match exists, this owner is created when the park is saved.
                    </p>
                  )}
                </label>
              </div>
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 bg-gradient-to-r from-stone-50 to-white px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">Location</p>
              <h2 className="mt-1 text-lg font-black text-stone-950">Operating region</h2>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-3">
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Country *</span>
                <SearchableSelect
                  value={form.country}
                  onChange={updateCountry}
                  placeholder="Select country"
                  searchPlaceholder="Search countries..."
                  className="mt-1"
                  buttonClassName="min-h-11 py-2.5"
                  options={countryOptions}
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Timezone *</span>
                <input value={form.timezone} readOnly required className="input-nexus mt-1 w-full bg-stone-50 px-3 py-2.5 text-sm text-stone-600" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Currency *</span>
                <input value={form.currency} readOnly required className="input-nexus mt-1 w-full bg-stone-50 px-3 py-2.5 text-sm text-stone-600" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">City *</span>
                <input value={form.city} onChange={(event) => update("city", event.target.value)} placeholder={selectedCountryProfile.cityPlaceholder} required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">State / province *</span>
                <input value={form.state} onChange={(event) => update("state", event.target.value)} placeholder={selectedCountryProfile.statePlaceholder} required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Postal / ZIP code *</span>
                <input value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} placeholder={selectedCountryProfile.postalPlaceholder} required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Building / street no. *</span>
                <input value={form.streetNumberOrBuildingName} onChange={(event) => update("streetNumberOrBuildingName", event.target.value)} placeholder="123" required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-black uppercase text-stone-500">Street / address line *</span>
                <input value={form.streetName} onChange={(event) => update("streetName", event.target.value)} placeholder="Sports Avenue" required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
              </label>
            </div>
          </section>
        </div>

        <aside className="h-fit min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm xl:sticky xl:top-4">
          <p className="text-xs font-black uppercase text-stone-500">Setup starts here</p>
          <h3 className="mt-1 text-xl font-black text-stone-950">{isEdit ? "Save profile changes" : "Create workspace"}</h3>
          <div className="mt-4 space-y-3 text-sm font-bold text-stone-600">
            <div className="flex items-center gap-2"><FaCheckCircle className="text-emerald-600" /> Park workspace</div>
            <div className="flex items-center gap-2"><FaLayerGroup className="text-orange-600" /> Module access</div>
            <div className="flex items-center gap-2"><FaFileInvoiceDollar className="text-orange-600" /> Billing preview</div>
            <div className="flex items-center gap-2"><FaCreditCard className="text-orange-600" /> Payment setup</div>
          </div>
          <div className="mt-6 space-y-2">
            <button disabled={createState.isLoading || updateState.isLoading} className={buttonClass("primary", "w-full")}>
              {isEdit ? "Update park" : "Create park"}
            </button>
            <Link to="/movira-control/parks" className={buttonClass("secondary", "w-full")}>Cancel</Link>
          </div>
        </aside>
        {ownerModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/35 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-owner-title"
              className="w-full max-w-3xl overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl"
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || createCustomerState.isLoading) return;
                event.preventDefault();
                handleCreateCustomerOwner();
              }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-stone-200 bg-orange-50/70 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">New paying customer</p>
                  <h3 id="create-owner-title" className="mt-1 text-xl font-black text-stone-950">Create a login owner account</h3>
                  <p className="mt-1 text-sm font-semibold text-stone-600">Use this when the customer does not already exist in Movira.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOwnerModalOpen(false)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-stone-200 bg-white text-stone-700 shadow-sm hover:bg-stone-50"
                  aria-label="Close create owner"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">First name *</span>
                  <input value={newCustomer.firstName} onChange={(event) => updateNewCustomer("firstName", event.target.value)} placeholder="Yogesh" required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Last name</span>
                  <input value={newCustomer.lastName} onChange={(event) => updateNewCustomer("lastName", event.target.value)} placeholder="Niranjan" className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Email *</span>
                  <input type="email" value={newCustomer.email} onChange={(event) => updateNewCustomer("email", event.target.value)} placeholder="owner@example.com" required className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Phone *</span>
                  <div className="mt-1 flex min-h-11 overflow-hidden rounded-lg border-2 border-[#d6c8b8] bg-white shadow-[0_2px_0_rgba(23,21,18,0.08)] transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-500/15">
                    <span className="grid min-w-14 place-items-center border-r border-stone-200 bg-stone-50 px-3 text-sm font-black text-stone-600">
                      {selectedCountryProfile.dialCode}
                    </span>
                    <input
                      value={phoneLocalValue(newCustomer.phone, form.country)}
                      onChange={(event) => updateNewCustomer("phone", phoneLocalValue(event.target.value, form.country))}
                      onBlur={(event) => updateNewCustomer("phone", phoneLocalValue(event.target.value, form.country))}
                      placeholder="9055550101"
                      required
                      className="unstyled-input min-h-11 w-full rounded-none border-0 bg-transparent px-3 py-2.5 text-sm font-bold text-stone-950 outline-none placeholder:text-stone-400 focus:border-0 focus:outline-none focus:ring-0"
                      style={{ border: 0, boxShadow: "none", outline: "none", WebkitAppearance: "none" }}
                    />
                  </div>
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs font-black uppercase text-stone-500">Temporary password</span>
                  <input
                    value={newCustomer.temporaryPassword}
                    onChange={(event) => updateNewCustomer("temporaryPassword", event.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                  />
                </label>
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-4">
                <button type="button" onClick={() => setOwnerModalOpen(false)} className={buttonClass("secondary")}>
                  Cancel
                </button>
                <button type="button" disabled={createCustomerState.isLoading} onClick={handleCreateCustomerOwner} className={buttonClass("primary")}>
                  <FaPlus /> {createCustomerState.isLoading ? "Creating..." : "Create owner"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </ControlShell>
  );
}

function ParkTabs({ park }) {
  const { pathname } = useLocation();
  return (
    <div className="sticky top-[72px] z-30 mb-3 flex gap-1.5 overflow-x-auto rounded-lg border border-stone-200 bg-white/95 p-1.5 shadow-sm backdrop-blur">
      {parkDetailTabs.map(({ suffix, label }) => {
        const to = `/movira-control/parks/${park.id}${suffix ? `/${suffix}` : ""}`;
        const active = pathname === to;
        const locked = getParkTabLock(park, suffix);
        return (
          <Link
            key={label}
            to={to}
            onClick={(event) => {
              if (!locked) return;
              event.preventDefault();
              toast.error(locked.message);
            }}
            title={locked?.message || label}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-black ${
              active
                ? "bg-orange-100 text-orange-700"
                : locked
                ? "cursor-not-allowed text-stone-400 hover:bg-stone-50"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

function ParkDetail() {
  const { parkId, section = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useGetSaasParkByIdQuery(parkId);
  const park = data?.park;
  const auditLogs = data?.auditLogs || [];
  const invoices = data?.invoices || [];
  const paymentEvents = data?.paymentEvents || [];
  const catalogModules = data?.catalogs?.modules?.length ? data.catalogs.modules : modules;

  useEffect(() => {
    if (!park) return;
    const lock = getParkTabLock(park, section);
    if (!lock) return;
    toast.error(lock.message);
    const previousTab = parkDetailTabs[Math.max(0, parkDetailTabs.findIndex((tab) => tab.suffix === section) - 1)];
    navigate(`/movira-control/parks/${park.id}${previousTab?.suffix ? `/${previousTab.suffix}` : ""}`, { replace: true });
  }, [navigate, park, section]);

  if (isLoading) return <Loader />;
  if (isError || !park) return <ErrorMessage message={error?.data?.message || "Park not found"} />;

  return (
    <ControlShell
      title={park.name}
      actions={
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link to="/movira-control/parks" className={buttonClass("secondary", "flex-1 sm:flex-none")}><FaArrowLeft /> Parks</Link>
          <Link to={`/movira-control/parks/${park.id}/edit`} className={buttonClass("primary", "flex-1 sm:flex-none")}><FaEdit /> Edit</Link>
        </div>
      }
    >
      <ParkTabs park={park} />
      {section !== "audit" ? (
        <div className="mb-4">
          <LaunchRail park={park} />
        </div>
      ) : null}
      {section === "modules" ? <ModulesPanel park={park} moduleCatalog={catalogModules} /> : null}
      {section === "billing" ? <BillingPanel park={park} plans={data?.catalogs?.plans || []} moduleCatalog={catalogModules} planUsage={data?.planUsage} /> : null}
      {section === "payments" ? <PaymentsPanel park={park} /> : null}
      {section === "payment-history" ? <PaymentHistoryPanel park={park} paymentEvents={paymentEvents} /> : null}
      {section === "billing-history" ? <InvoiceHistoryTable park={park} invoices={invoices} /> : null}
      {section === "onboarding" ? <OnboardingPanel park={park} /> : null}
      {section === "audit" ? <AuditPanel park={park} initialLogs={auditLogs} /> : null}
      {!section ? <OverviewPanel park={park} /> : null}
    </ControlShell>
  );
}

function OverviewPanel({ park }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-4">
          <StatCard icon={FaMapMarkerAlt} label="Status" value={park.status} detail={park.phase} />
          <StatCard icon={FaCreditCard} label="Billing" value={`${money(park.billing?.monthlyTotal, park.currency)}/mo`} detail="base fee + modules" />
          <StatCard icon={FaLayerGroup} label="Modules" value={park.modules?.length || 0} detail="enabled modules" />
          <StatCard icon={FaCheckCircle} label="Onboarding" value={`${park.onboardingScore || 0}%`} detail="launch readiness" />
        </div>
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-orange-700">Park summary</p>
              <h2 className="mt-1 text-xl font-black text-stone-950">{park.name}</h2>
            </div>
            <Pill className={statusClass(park.status)}>{park.status}</Pill>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ["Organization", park.organization?.name || "Unassigned"],
              ["Customer", park.ownerUser?.name || park.owner || "Customer not assigned"],
              ["Customer email", park.ownerUser?.email || park.ownerEmail || "-"],
              ["Region", park.location || "-"],
              ["Currency", park.currency || "-"],
              ["Payment", park.paymentStatus || "not_configured"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-black uppercase text-stone-500">{label}</p>
                <p className="mt-1 font-black text-stone-950">{value}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-orange-700">Entitlement contract</p>
              <h2 className="mt-1 text-lg font-black text-stone-950">Main app module access</h2>
            </div>
            <Pill className={park.entitlements?.blocked ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
              {park.entitlements?.blocked ? park.entitlements.blockedReason : "active"}
            </Pill>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(park.entitlements?.modules || []).map((module) => (
              <span
                key={module.key}
                className={`rounded-lg border px-3 py-2 text-xs font-black uppercase ${
                  module.enabled
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : module.configured
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-stone-200 bg-stone-50 text-stone-400"
                }`}
              >
                {module.label}
              </span>
            ))}
          </div>
          {park.entitlements?.billingRisk ? (
            <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              Billing risk is active. Module access still works, but collection policy may place this park on hold.
            </p>
          ) : null}
        </section>
      </div>
      <NextActionCard park={park} />
    </div>
  );
}

function ModulesPanel({ park, moduleCatalog = modules }) {
  const [updateModules] = useUpdateSaasParkModulesMutation();
  const selected = new Set(park.modules || []);
  const toggle = async (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    try {
      await updateModules({ id: park.id, modules: [...next] }).unwrap();
      toast.success("Modules updated.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update modules.");
    }
  };
  const enabledTotal = moduleCatalog
    .filter((module) => selected.has(module.key))
    .reduce((sum, module) => sum + Number(module.monthly || 0), 0);
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-orange-700">Module access</p>
            <h2 className="mt-1 text-xl font-black text-stone-950">Enabled products and monthly add-ons</h2>
          </div>
          <div className="rounded-xl bg-stone-50 px-4 py-3 text-right">
            <p className="text-xs font-black uppercase text-stone-500">Module total</p>
            <p className="text-xl font-black text-stone-950">{money(enabledTotal, park.currency)}/mo</p>
          </div>
        </div>
      </section>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {moduleCatalog.map((module) => (
          <button key={module.key} onClick={() => toggle(module.key)} className={`rounded-xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${selected.has(module.key) ? "border-orange-300 bg-orange-50" : "border-stone-200 bg-white hover:border-orange-200"}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-stone-950">{module.label}</h3>
              <Pill className={selected.has(module.key) ? "border-orange-200 bg-white text-orange-700" : "border-stone-200 text-stone-500"}>{selected.has(module.key) ? "Enabled" : "Off"}</Pill>
            </div>
            <p className="mt-2 min-h-10 text-sm font-semibold text-stone-500">{module.description}</p>
            <p className="mt-3 text-sm font-black text-stone-950">{money(module.monthly, park.currency)}/month</p>
          </button>
        ))}
      </div>
    </div>
  );
}

const fallbackPlanOptions = [
  { key: "starter", label: "Starter", monthlyBaseFee: 499, maxParks: 1, description: "For one park getting live with the core Movira setup." },
  { key: "pro", label: "Pro", monthlyBaseFee: 899, maxParks: 3, description: "For growing operators with multiple parks under one customer." },
  { key: "scale", label: "Scale", monthlyBaseFee: 1499, maxParks: 8, description: "For larger groups that need more parks and operational coverage." },
  { key: "enterprise", label: "Enterprise", monthlyBaseFee: 2499, maxParks: null, description: "Unlimited parks with commercial terms handled by Movira." },
  { key: "custom", label: "Custom", monthlyBaseFee: 0, maxParks: null, description: "Legacy or custom contract managed by Movira." },
];

function BillingPanel({ park, plans = [], moduleCatalog = modules, planUsage = null }) {
  const availablePlans = plans.length ? plans : fallbackPlanOptions;
  const currentPlan = availablePlans.find((plan) => plan.key === (park.planKey || "starter")) || availablePlans[0];
  const [form, setForm] = useState({
    planKey: park.planKey || currentPlan?.key || "starter",
    monthlyBaseFee: park.monthlyBaseFee || currentPlan?.monthlyBaseFee || 0,
    billingCycle: park.billingCycle || "monthly",
    billingStartDate: dateInputValue(park.billingStartDate) || todayDateInputValue(),
    discountAmount: park.discountAmount || 0,
    taxLabel: park.taxLabel || "Tax",
    taxRatePercent: park.taxRatePercent || 0,
    taxRegistrationNumber: park.taxRegistrationNumber || "",
  });
  const [updateBilling] = useUpdateSaasParkBillingMutation();
  const selectedPlan = availablePlans.find((plan) => plan.key === form.planKey) || currentPlan;
  const planOptions = availablePlans.map((plan) => ({
    value: plan.key,
    label: `${plan.label} - ${money(plan.monthlyBaseFee, park.currency)}/mo`,
    description: plan.maxParks === null ? "Unlimited parks" : `${plan.maxParks} park${plan.maxParks === 1 ? "" : "s"} included`,
  }));
  const selectPlan = (planKey) => {
    const plan = availablePlans.find((item) => item.key === planKey) || selectedPlan;
    setForm((current) => ({
      ...current,
      planKey: plan.key,
      monthlyBaseFee: plan.monthlyBaseFee,
    }));
  };
  const submit = async (event) => {
    event.preventDefault();
    try {
      await updateBilling({ id: park.id, ...form }).unwrap();
      toast.success("Billing updated.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update billing.");
    }
  };
  const selectedModules = moduleCatalog.filter((module) => (park.modules || []).includes(module.key));
  const baseAmount = Number(form.monthlyBaseFee ?? selectedPlan?.monthlyBaseFee ?? park.billing?.base ?? park.monthlyBaseFee ?? 0);
  const moduleTotal = selectedModules.reduce((sum, module) => sum + Number(module.monthly || 0), 0);
  const discount = Number(form.discountAmount ?? park.billing?.discount ?? park.discountAmount ?? 0);
  const taxRatePercent = Math.max(0, Math.min(100, Number(form.taxRatePercent || 0)));
  const subtotal = Math.max(0, baseAmount + moduleTotal - discount);
  const taxAmount = Number(((subtotal * taxRatePercent) / 100).toFixed(2));
  const monthlyTotal = Number((subtotal + taxAmount).toFixed(2));

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={submit} className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-4">
          <div>
            <p className="text-xs font-black uppercase text-orange-700">Billing setup</p>
            <h2 className="mt-1 text-xl font-black text-stone-950">Base fee and invoice controls</h2>
            <p className="mt-1 text-sm font-semibold text-stone-500">Base platform fee plus enabled module fees creates the monthly bill.</p>
          </div>
          <Pill className="border-orange-200 bg-orange-50 text-orange-700">{park.billingCycle || "monthly"}</Pill>
        </div>

        <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(220px,360px)_1fr]">
            <label>
              <span className="flex items-center justify-between gap-2 text-xs font-black uppercase text-stone-500">
                <span>Customer plan</span>
                <Link to="/movira-control/plans" className="text-orange-700 hover:text-orange-800">
                  Manage plans
                </Link>
              </span>
              <SearchableSelect
                value={form.planKey}
                onChange={selectPlan}
                className="mt-1"
                buttonClassName="min-h-11 py-2.5"
                options={planOptions}
              />
            </label>
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-orange-100 bg-white p-3">
                <p className="text-xs font-black uppercase text-stone-500">Base fee</p>
                <p className="mt-1 text-lg font-black text-stone-950">{money(selectedPlan?.monthlyBaseFee || 0, park.currency)}/mo</p>
              </div>
              <div className="rounded-lg border border-orange-100 bg-white p-3">
                <p className="text-xs font-black uppercase text-stone-500">Park limit</p>
                <p className="mt-1 text-lg font-black text-stone-950">{selectedPlan?.maxParks === null ? "Unlimited" : selectedPlan?.maxParks}</p>
              </div>
              <div className="rounded-lg border border-orange-100 bg-white p-3">
                <p className="text-xs font-black uppercase text-stone-500">Current usage</p>
                <p className="mt-1 text-lg font-black text-stone-950">
                  {planUsage?.activeParks ?? "-"}{selectedPlan?.maxParks === null ? "" : ` / ${selectedPlan?.maxParks}`}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-stone-600">{selectedPlan?.description}</p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Base platform fee</span>
            <input
              type="number"
              min="0"
              value={form.monthlyBaseFee}
              onChange={(event) => setForm({ ...form, monthlyBaseFee: event.target.value })}
              readOnly={form.planKey !== "custom"}
              className={`input-nexus mt-1 w-full px-3 py-2.5 text-sm ${form.planKey !== "custom" ? "bg-stone-50 text-stone-500" : ""}`}
            />
            {form.planKey !== "custom" ? <span className="mt-1 block text-xs font-semibold text-stone-500">Auto-calculated from selected plan.</span> : null}
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Cycle</span>
            <SearchableSelect
              value={form.billingCycle}
              onChange={(value) => setForm({ ...form, billingCycle: value })}
              className="mt-1"
              buttonClassName="min-h-11 py-2.5"
              options={billingCycleOptions}
            />
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Billing start</span>
            <input type="date" value={form.billingStartDate} onChange={(event) => setForm({ ...form, billingStartDate: event.target.value })} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Discount</span>
            <input type="number" value={form.discountAmount} onChange={(event) => setForm({ ...form, discountAmount: event.target.value })} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Tax label</span>
            <SearchableSelect
              value={form.taxLabel}
              onChange={(value) => setForm({ ...form, taxLabel: value })}
              placeholder="Select tax label"
              searchPlaceholder="Search tax label..."
              className="mt-1"
              buttonClassName="min-h-11 py-2.5"
              options={taxLabelOptions}
            />
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Tax rate %</span>
            <input type="number" min="0" max="100" step="0.001" value={form.taxRatePercent} onChange={(event) => setForm({ ...form, taxRatePercent: event.target.value })} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Tax registration</span>
            <input value={form.taxRegistrationNumber} onChange={(event) => setForm({ ...form, taxRegistrationNumber: event.target.value })} placeholder="Optional tax ID" className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
          </label>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-stone-200">
          <table className="min-w-[640px] divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-xs font-black uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              <tr>
                <td className="px-4 py-3">
                  <p className="font-black text-stone-950">Base platform fee</p>
                  <p className="text-xs font-semibold text-stone-500">Base SaaS platform fee</p>
                </td>
                <td className="px-4 py-3 font-bold text-stone-500">Base fee</td>
                <td className="px-4 py-3 text-right font-black text-stone-950">{money(baseAmount, park.currency)}</td>
              </tr>
              {selectedModules.map((module) => (
                <tr key={module.key}>
                  <td className="px-4 py-3">
                    <p className="font-black text-stone-950">{module.label}</p>
                    <p className="text-xs font-semibold text-stone-500">Enabled module</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-stone-500">Module</td>
                  <td className="px-4 py-3 text-right font-black text-stone-950">{money(module.monthly, park.currency)}</td>
                </tr>
              ))}
              {selectedModules.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-4 py-4 text-sm font-bold text-stone-500">No paid modules enabled.</td>
                </tr>
              ) : null}
              {discount > 0 ? (
                <tr>
                  <td className="px-4 py-3">
                    <p className="font-black text-stone-950">Discount</p>
                    <p className="text-xs font-semibold text-stone-500">Manual monthly adjustment</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-stone-500">Credit</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-700">-{money(discount, park.currency)}</td>
                </tr>
              ) : null}
              {taxAmount > 0 ? (
                <tr>
                  <td className="px-4 py-3">
                    <p className="font-black text-stone-950">{form.taxLabel || "Tax"}</p>
                    <p className="text-xs font-semibold text-stone-500">{taxRatePercent}% applied to subtotal</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-stone-500">Tax</td>
                  <td className="px-4 py-3 text-right font-black text-stone-950">{money(taxAmount, park.currency)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <button className={buttonClass("primary", "mt-5 w-full sm:w-auto")}>Save billing</button>
        </form>

        <aside className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs font-black uppercase text-stone-500">Monthly invoice preview</p>
        <div className="mt-4 space-y-3 text-sm font-bold">
          <div className="flex justify-between gap-3">
            <span className="text-stone-500">Base platform fee</span>
            <span className="text-stone-950">{money(baseAmount, park.currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-stone-500">Modules</span>
            <span className="text-stone-950">{money(moduleTotal, park.currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-stone-500">Discount</span>
            <span className="text-emerald-700">-{money(discount, park.currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-stone-500">{form.taxLabel || "Tax"} ({taxRatePercent}%)</span>
            <span className="text-stone-950">{money(taxAmount, park.currency)}</span>
          </div>
        </div>
        <div className="mt-5 rounded-xl bg-orange-50 p-4">
          <p className="text-xs font-black uppercase text-orange-700">Total due</p>
          <p className="mt-1 text-3xl font-black text-stone-950">{money(monthlyTotal, park.currency)}</p>
          <p className="mt-1 text-sm font-bold text-stone-500">per month</p>
        </div>
        <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm font-semibold text-stone-600">
          {selectedModules.length} module{selectedModules.length === 1 ? "" : "s"} enabled for this park.
        </div>
        </aside>
      </div>
    </div>
  );
}

function InvoiceHistoryTable({ park, invoices }) {
  const [recordPayment, { isLoading }] = useRecordSaasInvoicePaymentMutation();
  const [createPaymentLink, createLinkState] = useCreateSaasInvoicePaymentLinkMutation();
  const [refreshLifecycle, refreshLifecycleState] = useRefreshSaasInvoiceLifecycleMutation();
  const [voidInvoice, voidInvoiceState] = useVoidSaasInvoiceMutation();
  const [refundInvoice, refundInvoiceState] = useRefundSaasInvoicePaymentMutation();
  const [getInvoiceDocument, invoiceDocumentState] = useLazyGetSaasInvoiceDocumentQuery();
  const [actionConfirm, setActionConfirm] = useState(null);
  const [voidConfirm, setVoidConfirm] = useState(null);
  const [refundConfirm, setRefundConfirm] = useState(null);

  const handleRefreshLifecycle = async () => {
    try {
      const result = await refreshLifecycle({ id: park.id }).unwrap();
      const updated = Number(result?.updated || 0);
      const generated = Number(result?.generated || 0);
      const remindersSent = Number(result?.remindersSent || 0);
      const remindersFailed = Number(result?.remindersFailed || 0);
      const collectionPastDue = Number(result?.collectionPastDue || 0);
      const collectionSuspended = Number(result?.collectionSuspended || 0);
      const collectionRecovered = Number(result?.collectionRecovered || 0);
      if (generated || updated || remindersSent || remindersFailed || collectionPastDue || collectionSuspended || collectionRecovered) {
        toast.success(
          `${generated} generated, ${updated} marked overdue, ${remindersSent} reminders sent${remindersFailed ? `, ${remindersFailed} failed` : ""}, collection ${collectionPastDue} past due / ${collectionSuspended} hold / ${collectionRecovered} recovered.`
        );
      } else {
        toast.success("Invoice lifecycle is up to date.");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to refresh invoice lifecycle.");
    }
  };

  const handleRecordPayment = async (invoice) => {
    const remaining = Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0));
    try {
      await recordPayment({
        id: park.id,
        invoiceId: invoice.invoiceId,
        amount: remaining || invoice.totalAmount,
        paymentMethod: park.paymentMethod || "manual_invoice",
        provider: "manual",
      }).unwrap();
      toast.success("Invoice payment recorded.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to record invoice payment.");
    }
  };
  const handleCreatePaymentLink = async (invoice) => {
    try {
      const result = await createPaymentLink({
        id: park.id,
        invoiceId: invoice.invoiceId,
        appBaseUrl: window.location.origin,
      }).unwrap();
      if (result?.paymentLinkUrl) {
        let copied = false;
        try {
          await navigator.clipboard?.writeText(result.paymentLinkUrl);
          copied = true;
        } catch {
          copied = false;
        }
        window.open(result.paymentLinkUrl, "_blank", "noopener,noreferrer");
        toast.success(copied ? "Payment link created and copied." : "Payment link created.");
      } else {
        toast.success("Payment link request created.");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create payment link.");
    }
  };
  const handleOpenInvoiceDocument = async (invoice) => {
    try {
      const html = await getInvoiceDocument({ id: park.id, invoiceId: invoice.invoiceId }).unwrap();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to open invoice document.");
    }
  };
  const handleConfirmedInvoiceAction = async (event) => {
    if (!actionConfirm || event.type !== "confirm") return;
    const current = actionConfirm;
    if (current.type === "refresh_lifecycle") {
      await handleRefreshLifecycle();
    } else if (current.type === "open_invoice") {
      await handleOpenInvoiceDocument(current.invoice);
    } else if (current.type === "record_payment") {
      await handleRecordPayment(current.invoice);
    } else if (current.type === "payment_link") {
      await handleCreatePaymentLink(current.invoice);
    }
    setActionConfirm(null);
  };
  const actionConfirmLoading =
    actionConfirm?.type === "refresh_lifecycle"
      ? refreshLifecycleState.isLoading
      : actionConfirm?.type === "open_invoice"
        ? invoiceDocumentState.isFetching
        : actionConfirm?.type === "record_payment"
          ? isLoading
          : actionConfirm?.type === "payment_link"
            ? createLinkState.isLoading
            : false;
  const actionConfirmConfig = (() => {
    if (!actionConfirm) return null;
    const invoice = actionConfirm.invoice;
    const remaining = invoice ? Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0)) : 0;
    if (actionConfirm.type === "refresh_lifecycle") {
      return {
        tone: "warning",
        eyebrow: "Refresh lifecycle",
        title: "Refresh invoice lifecycle?",
        message: "This can generate due invoices, mark overdue invoices, send reminders, and apply collection policy for this park.",
        details: ["Use this when you intentionally want billing state to be recalculated.", "Audit and payment history will record resulting changes."],
        confirmLabel: "Refresh invoices",
      };
    }
    if (actionConfirm.type === "open_invoice") {
      return {
        tone: "info",
        eyebrow: "Open invoice",
        title: `Open ${invoice.invoiceNumber}?`,
        message: "This opens the official invoice document in a new browser tab.",
        details: [`Invoice total: ${money(invoice.totalAmount, invoice.currency || park.currency)}`, `Status: ${invoice.status}`],
        confirmLabel: "Open invoice",
      };
    }
    if (actionConfirm.type === "record_payment") {
      return {
        tone: "warning",
        eyebrow: "Record payment",
        title: `Record payment for ${invoice.invoiceNumber}?`,
        message: "This marks money as received for the SaaS invoice. Only use it after payment is actually confirmed.",
        details: [`Amount to record: ${money(remaining || invoice.totalAmount, invoice.currency || park.currency)}`, "This updates invoice balance, payment history, and audit logs."],
        confirmLabel: "Record payment",
      };
    }
    return {
      tone: "warning",
      eyebrow: "Create payment link",
      title: `Create payment link for ${invoice.invoiceNumber}?`,
      message: "This creates a customer-payable SaaS invoice link and may open/copy it for sharing.",
      details: [`Amount due: ${money(remaining, invoice.currency || park.currency)}`, "Use only when you are ready to send the owner a real collection link."],
      confirmLabel: "Create link",
    };
  })();
  const handleVoidInvoice = async (event) => {
    if (!voidConfirm) return;
    if (event.type === "input") {
      setVoidConfirm((current) => ({ ...current, confirmValue: event.value }));
      return;
    }
    try {
      await voidInvoice({
        id: park.id,
        invoiceId: voidConfirm.invoice.invoiceId,
        reason: `Voided from Movira Control by operator.`,
      }).unwrap();
      toast.success("Invoice voided.");
      setVoidConfirm(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to void invoice.");
    }
  };
  const handleRefundInvoice = async (event) => {
    if (!refundConfirm) return;
    if (event.type === "input") {
      setRefundConfirm((current) => ({ ...current, confirmValue: event.value }));
      return;
    }
    const amount = Number(refundConfirm.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Refund amount must be greater than 0.");
      return;
    }
    try {
      await refundInvoice({
        id: park.id,
        invoiceId: refundConfirm.invoice.invoiceId,
        amount,
        reason: refundConfirm.reason || `Refund for ${refundConfirm.invoice.invoiceNumber}`,
      }).unwrap();
      toast.success("Invoice refund recorded.");
      setRefundConfirm(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to refund invoice payment.");
    }
  };

  return (
    <section className={listingShellClass}>
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--stroke-soft)] bg-[var(--surface-panel-strong)]/95 px-5 py-4 backdrop-blur">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-orange-700">Billing history</p>
          <h3 className="break-words text-lg font-black text-stone-950">Generated SaaS invoices and collection status</h3>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <button
            type="button"
            disabled={refreshLifecycleState.isLoading}
            onClick={() => setActionConfirm({ type: "refresh_lifecycle" })}
            className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}
          >
            {refreshLifecycleState.isLoading ? "Refreshing..." : "Refresh invoices"}
          </button>
          <Pill className="border-stone-200 bg-stone-50 text-stone-600">{invoices.length} invoices</Pill>
        </div>
      </div>
      <div className={listingScrollClass}>
        <table className={listingTableClass("min-w-[960px]")}>
          <thead className={listingHeadClass}>
            <tr>
              <th className={listingThClass()}>Invoice</th>
              <th className={listingThClass()}>Period</th>
              <th className={listingThClass()}>Due</th>
              <th className={listingThClass()}>Status</th>
              <th className={listingThClass("text-right")}>Total</th>
              <th className={listingThClass("text-right")}>Paid</th>
              <th className={listingThClass("text-right")}>Action</th>
            </tr>
          </thead>
          <tbody className={listingBodyClass}>
            {invoices.map((invoice) => {
              const remaining = Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0));
              const terminalStatuses = ["paid", "void", "refunded"];
              const canPay = remaining > 0 && !terminalStatuses.includes(invoice.status);
              const canVoid = Number(invoice.paidAmount || 0) <= 0 && !terminalStatuses.includes(invoice.status);
              const paidAmount = Number(invoice.paidAmount || 0);
              const canRefund = paidAmount > 0 && !["void", "refunded"].includes(invoice.status);
              return (
                <tr key={invoice.invoiceId} className={listingRowClass}>
                  <td className="px-4 py-3">
                    <p className="font-black text-stone-950">{invoice.invoiceNumber}</p>
                    <p className="text-xs font-semibold text-stone-500">{invoice.billingCycle || "monthly"}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-stone-600">{dateOnly(invoice.periodStart)} - {dateOnly(invoice.periodEnd)}</td>
                  <td className="px-4 py-3 font-semibold text-stone-600">{dateOnly(invoice.dueDate)}</td>
                  <td className="px-4 py-3"><Pill className={billingStatusClass(invoice.status)}>{invoice.status}</Pill></td>
                  <td className="px-4 py-3 text-right font-black text-stone-950">{money(invoice.totalAmount, invoice.currency || park.currency)}</td>
                  <td className="px-4 py-3 text-right font-bold text-stone-600">{money(invoice.paidAmount, invoice.currency || park.currency)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={invoiceDocumentState.isFetching}
                        onClick={() => setActionConfirm({ type: "open_invoice", invoice })}
                        className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}
                      >
                        Open invoice
                      </button>
                      <button
                        type="button"
                        disabled={!canPay || isLoading}
                        onClick={() => setActionConfirm({ type: "record_payment", invoice })}
                        className={buttonClass(canPay ? "success" : "secondary", "min-h-9 px-3 py-1.5 text-xs")}
                      >
                        {canPay ? `Record ${money(remaining, invoice.currency || park.currency)}` : "Settled"}
                      </button>
                      {canPay ? (
                        <button
                          type="button"
                          disabled={createLinkState.isLoading}
                          onClick={() => setActionConfirm({ type: "payment_link", invoice })}
                          className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}
                        >
                          Payment link
                        </button>
                      ) : null}
                      {canVoid ? (
                        <button
                          type="button"
                          disabled={voidInvoiceState.isLoading}
                          onClick={() =>
                            setVoidConfirm({
                              invoice,
                              confirmValue: "",
                            })
                          }
                          className={buttonClass("danger", "min-h-9 px-3 py-1.5 text-xs")}
                        >
                          Void
                        </button>
                      ) : null}
                      {canRefund ? (
                        <button
                          type="button"
                          disabled={refundInvoiceState.isLoading}
                          onClick={() =>
                            setRefundConfirm({
                              invoice,
                              amount: paidAmount,
                              reason: "",
                              confirmValue: "",
                            })
                          }
                          className={buttonClass("danger", "min-h-9 px-3 py-1.5 text-xs")}
                        >
                          Refund
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-5 text-sm font-bold text-stone-500">No invoices generated yet. Save billing or payment setup to create the first invoice.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={Boolean(actionConfirm && actionConfirmConfig)}
        tone={actionConfirmConfig?.tone || "warning"}
        eyebrow={actionConfirmConfig?.eyebrow || "Please confirm"}
        title={actionConfirmConfig?.title || ""}
        message={actionConfirmConfig?.message || ""}
        details={actionConfirmConfig?.details || []}
        confirmLabel={actionConfirmConfig?.confirmLabel || "Confirm"}
        loading={actionConfirmLoading}
        onConfirm={handleConfirmedInvoiceAction}
        onClose={() => setActionConfirm(null)}
      />
      <ConfirmDialog
        open={Boolean(voidConfirm)}
        tone="danger"
        eyebrow="Void invoice"
        title={voidConfirm ? `Void ${voidConfirm.invoice.invoiceNumber}?` : ""}
        message="This keeps invoice history but stops the invoice from being payable. Use this only for invoices that should not be collected."
        details={[
          "Only unpaid invoices can be voided.",
          "Paid or partially paid invoices must be refunded or settled instead.",
          "Voided invoices remain visible in audit and payment history.",
        ]}
        confirmText="VOID"
        confirmValue={voidConfirm?.confirmValue}
        confirmLabel="Void invoice"
        loading={voidInvoiceState.isLoading}
        onConfirm={handleVoidInvoice}
        onClose={() => setVoidConfirm(null)}
      />
      <ConfirmDialog
        open={Boolean(refundConfirm)}
        tone="danger"
        eyebrow="Refund payment"
        title={refundConfirm ? `Refund ${refundConfirm.invoice.invoiceNumber}?` : ""}
        message="This records a refund against the captured SaaS invoice payment and reconciles the invoice balance."
        details={[
          refundConfirm ? `Paid amount: ${money(refundConfirm.invoice.paidAmount, refundConfirm.invoice.currency || park.currency)}` : "Paid amount available for refund.",
          "Partial refunds move the invoice back to partial.",
          "Full refunds move the invoice to refunded.",
        ]}
        confirmText="REFUND"
        confirmValue={refundConfirm?.confirmValue}
        confirmLabel="Refund invoice"
        loading={refundInvoiceState.isLoading}
        onConfirm={handleRefundInvoice}
        onClose={() => setRefundConfirm(null)}
      >
        {refundConfirm ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-xs font-black uppercase text-stone-500">Refund amount</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={refundConfirm.invoice.paidAmount || 0}
                value={refundConfirm.amount}
                onChange={(event) => setRefundConfirm((current) => ({ ...current, amount: event.target.value }))}
                className="input-nexus mt-1 w-full px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="text-xs font-black uppercase text-stone-500">Reason</span>
              <input
                value={refundConfirm.reason}
                onChange={(event) => setRefundConfirm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Billing adjustment"
                className="input-nexus mt-1 w-full px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}
      </ConfirmDialog>
    </section>
  );
}

function PaymentsPanel({ park }) {
  const [form, setForm] = useState({
    guestPaymentStatus: park.guestPaymentStatus || "not_configured",
  });
  const [updatePayments] = useUpdateSaasParkPaymentsMutation();
  useEffect(() => {
    setForm({ guestPaymentStatus: park.guestPaymentStatus || "not_configured" });
  }, [park.id, park.guestPaymentStatus]);

  const platformMethodLabel = optionLabel(platformBillingMethodOptions, park.paymentMethod);
  const platformStatusLabel = optionLabel(platformBillingStatusOptions, park.paymentStatus);
  const platformStatusClass = billingStatusClass(park.paymentStatus);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await updatePayments({ id: park.id, ...form }).unwrap();
      toast.success("Guest payment setting updated.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update payments.");
    }
  };
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-orange-700">Payment control</p>
            <h2 className="mt-1 break-words text-lg font-black text-stone-950">Platform billing and guest payment rails</h2>
          </div>
          <Pill className={platformStatusClass}>{platformStatusLabel}</Pill>
        </div>
        <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-[0.85fr_0.85fr_1.3fr]">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-black uppercase text-stone-500">Platform billing method</p>
            <p className="mt-1 text-base font-black capitalize text-stone-950">{platformMethodLabel}</p>
            <p className="mt-1 text-xs font-semibold text-stone-500">Auto selected from gateway and invoice setup.</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-black uppercase text-stone-500">Platform billing status</p>
            <div className="mt-1">
              <Pill className={platformStatusClass}>{platformStatusLabel}</Pill>
            </div>
            <p className="mt-2 text-xs font-semibold text-stone-500">Auto updated from invoice and collection lifecycle.</p>
          </div>
          <div className="rounded-lg border border-orange-100 bg-orange-50/40 p-3">
            <span className="text-xs font-black uppercase text-stone-500">Guest payments</span>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-start">
              <SearchableSelect
                value={form.guestPaymentStatus}
                onChange={(value) => setForm({ ...form, guestPaymentStatus: value })}
                className="min-w-0 flex-1"
                buttonClassName="min-h-10 py-2"
                options={guestPaymentStatusOptions}
              />
              <button className={buttonClass("primary", "min-h-10 px-4 py-2 sm:shrink-0")}>Save</button>
            </div>
            <span className="mt-2 block text-xs font-semibold text-stone-500">Controls checkout/POS acceptance for this park.</span>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs font-semibold text-stone-500 md:grid-cols-2">
          <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
            <span className="font-black uppercase text-stone-600">Movira charges the park:</span> system-managed from billing gateway, invoices, payment links, and lifecycle jobs.
          </p>
          <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
            <span className="font-black uppercase text-stone-600">Guests pay the park:</span> checkout, POS, refunds, and guest payment acceptance.
          </p>
        </div>
      </form>
      <ParkPaymentConsole park={park} />
    </div>
  );
}

function PaymentHistoryPanel({ park, paymentEvents }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [eventType, setEventType] = useState("all");
  const { data = {}, isFetching } = useGetSaasParkPaymentEventsQuery(
    { id: park.id, page, limit: 25, search, status, eventType },
    { skip: !park?.id }
  );
  const events = data.events || paymentEvents || [];
  const pagination = data.pagination || { totalRecords: events.length, totalPages: 1, currentPage: 1 };

  return (
    <section className={listingShellClass}>
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--stroke-soft)] bg-[var(--surface-panel-strong)]/95 px-5 py-4 backdrop-blur">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-orange-700">Payment history</p>
          <h3 className="break-words text-lg font-black text-stone-950">SaaS billing events</h3>
        </div>
        <Pill className="border-stone-200 bg-stone-50 text-stone-600">{pagination.totalRecords || events.length} events</Pill>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--stroke-soft)] bg-[var(--surface-panel)]/95 px-5 py-3">
        <div className="relative min-w-full flex-1 sm:min-w-[220px] sm:max-w-sm">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search events, provider, reference..."
            className="input-nexus w-full py-1.5 pl-8 pr-3 text-sm"
          />
        </div>
        <SearchableSelect
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          searchPlaceholder="Search status..."
          className="w-full sm:w-40"
          options={paymentHistoryStatusOptions}
        />
        <SearchableSelect
          value={eventType}
          onChange={(value) => {
            setEventType(value);
            setPage(1);
          }}
          searchPlaceholder="Search event type..."
          className="w-full sm:w-56"
          options={paymentEventTypeOptions}
        />
        {isFetching ? <span className="text-xs font-black uppercase text-stone-400">Loading...</span> : null}
      </div>
      <div className="max-h-[min(62vh,700px)] overflow-auto divide-y divide-stone-100">
        {events.map((event) => (
          <div key={event.eventId} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_160px_140px] md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-stone-950">{event.message || event.eventType}</p>
                <Pill className={billingStatusClass(event.status)}>{event.status}</Pill>
              </div>
              <p className="mt-1 text-xs font-semibold text-stone-500">
                {event.invoice?.invoiceNumber ? `Invoice ${event.invoice.invoiceNumber}` : "No invoice"} · {event.paymentMethod || "manual"} · {dateTime(event.createdAt)}
              </p>
              {event.actor ? <p className="mt-1 text-xs font-semibold text-stone-400">By {event.actor.name || event.actor.email}</p> : null}
            </div>
            <div className="text-sm font-bold text-stone-600">{event.provider || "manual"}</div>
            <div className="text-left font-black text-stone-950 md:text-right">{money(event.amount, event.currency || park.currency)}</div>
          </div>
        ))}
        {events.length === 0 ? (
          <p className="px-5 py-5 text-sm font-bold text-stone-500">No payment events yet. Payment setup changes and invoice payments will appear here.</p>
        ) : null}
      </div>
      {pagination.totalPages > 1 ? (
        <div className={listingFooterClass}>
          <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}>Prev</button>
          <span className="text-xs font-bold text-stone-500">{page} / {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}>Next</button>
        </div>
      ) : null}
    </section>
  );
}

function OnboardingPanel({ park }) {
  const [updateOnboarding] = useUpdateSaasParkOnboardingMutation();
  const [goLive, goLiveState] = useApproveSaasParkGoLiveMutation();
  const [goLiveConfirm, setGoLiveConfirm] = useState(false);
  const toggle = async (key) => {
    try {
      await updateOnboarding({ id: park.id, onboarding: { ...park.onboarding, [key]: !park.onboarding?.[key] } }).unwrap();
      toast.success("Checklist updated.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update checklist.");
    }
  };
  const approve = async (event) => {
    if (event?.type && event.type !== "confirm") return;
    try {
      await goLive({ id: park.id }).unwrap();
      toast.success("Go-live checked.");
      setGoLiveConfirm(false);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to approve go-live.");
    }
  };
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
        <div>
          <p className="text-xs font-black uppercase text-orange-700">Launch checklist</p>
          <h2 className="mt-1 text-xl font-black text-stone-950">Operational readiness</h2>
        </div>
        <div className="w-full max-w-xs">
          <ProgressBar value={park.onboardingScore || 0} />
          <p className="mt-1 text-right text-xs font-black text-stone-500">{park.onboardingScore || 0}% complete</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {setupSteps.map((step, index) => {
          const label = onboardingLabels[step.key] || step.label;
          const done = Boolean(park.onboarding?.[step.key]);
          return (
            <button key={step.key} onClick={() => toggle(step.key)} className={`flex items-center justify-between rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${done ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-white hover:border-orange-200"}`}>
              <span>
                <span className="block text-xs font-black uppercase text-stone-400">Step {index + 1}</span>
                <span className="font-black text-stone-950">{label}</span>
              </span>
              <Pill className={done ? "border-emerald-200 bg-white text-emerald-700" : "border-stone-200 text-stone-500"}>{done ? "Done" : "Open"}</Pill>
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4">
        <div>
          <p className="font-black text-stone-950">Go-live gate</p>
          <p className="text-sm font-semibold text-stone-500">Approving updates the park status based on readiness.</p>
        </div>
        <button onClick={() => setGoLiveConfirm(true)} className={buttonClass("primary")}><FaRocket /> Approve go-live</button>
      </div>
      <ConfirmDialog
        open={goLiveConfirm}
        tone="warning"
        eyebrow="Go-live approval"
        title={`Approve ${park.name} for go-live?`}
        message="This checks readiness and updates the park lifecycle. Use it only when the park is ready for real customer operations."
        details={[
          `${park.onboardingScore || 0}% readiness currently complete.`,
          "If checks are incomplete, the park may move to needs_checks instead of live.",
          "This action is recorded in the audit history.",
        ]}
        confirmLabel="Approve go-live"
        loading={goLiveState.isLoading}
        onConfirm={approve}
        onClose={() => setGoLiveConfirm(false)}
      />
    </div>
  );
}

function AuditPanel({ park, initialLogs = [] }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const { data = {}, isFetching } = useGetSaasParkAuditLogsQuery(
    { id: park.id, page, limit: 25, search, action },
    { skip: !park?.id }
  );
  const logs = useMemo(() => data.logs || initialLogs || [], [data.logs, initialLogs]);
  const pagination = data.pagination || { totalRecords: logs.length, totalPages: 1, currentPage: 1 };
  const auditSummary = useMemo(() => {
    const actors = new Set();
    logs.forEach((item) => {
      const actorKey = item.actor?.email || item.actor?.name || "System";
      actors.add(actorKey);
    });
    return {
      latest: logs[0]?.createdAt,
      actorCount: actors.size,
      visible: logs.length,
    };
  }, [logs]);
  const actionTone = (value = "") => {
    if (value.includes("failed") || value.includes("voided") || value.includes("archived")) {
      return "border-red-200 bg-red-50 text-red-700";
    }
    if (value.includes("payment") || value.includes("billing") || value.includes("invoice")) {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }
    if (value.includes("created") || value.includes("updated") || value.includes("recovered")) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    return "border-stone-200 bg-stone-50 text-stone-600";
  };

  return (
    <section className="space-y-3">
      <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <p className="section-kicker">Production audit</p>
            <h2 className="mt-1 break-words font-display text-xl font-black tracking-tight text-stone-950">
              Operator and system activity trail
            </h2>
            <p className="mt-0.5 break-words text-sm font-semibold text-stone-500">
              Review billing, onboarding, lifecycle, and payment changes for {park.name}.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-stone-500">Rows</p>
              <p className="text-lg font-black leading-none text-stone-950">{auditSummary.visible}</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-stone-500">Actors</p>
              <p className="text-lg font-black leading-none text-stone-950">{auditSummary.actorCount}</p>
            </div>
            <div className="col-span-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 sm:min-w-44">
              <p className="text-[10px] font-black uppercase tracking-wide text-stone-500">Latest</p>
              <p className="truncate text-sm font-black text-stone-950">
                {auditSummary.latest ? dateTime(auditSummary.latest) : "-"}
              </p>
            </div>
            {isFetching ? (
              <Pill className="border-orange-200 bg-orange-50 text-orange-700">Refreshing</Pill>
            ) : null}
            <Pill className="border-stone-200 bg-stone-50 text-stone-600">
              {pagination.totalRecords || logs.length} records
            </Pill>
          </div>
        </div>
      </div>

      <div className={listingShellClass}>
        <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-[var(--stroke-soft)] bg-[var(--surface-panel-strong)]/95 p-4 backdrop-blur">
          <div className="relative min-w-full flex-1 sm:min-w-[240px]">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search audit activity..."
              className="input-nexus w-full py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <SearchableSelect
            value={action}
            onChange={(value) => {
              setAction(value);
              setPage(1);
            }}
            searchPlaceholder="Search action..."
            className="w-full sm:w-64"
            buttonClassName="min-h-10 py-2"
            options={auditActionOptions}
          />
        </div>

        <div className="max-h-[min(64vh,720px)] overflow-auto divide-y divide-stone-100">
          {logs.map((item) => (
            <article key={item.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="flex min-w-0 gap-3">
                <div className="flex flex-col items-center pt-1">
                  <span className="h-3 w-3 rounded-full border-2 border-orange-200 bg-orange-600" />
                  <span className="mt-2 h-full min-h-12 w-px bg-stone-200" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill className={actionTone(item.action)}>{item.action}</Pill>
                    <span className="text-xs font-black uppercase tracking-wide text-stone-400">
                      {dateTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-black text-stone-950">{item.message || item.action}</p>
              {item.metadata && Object.keys(item.metadata).length ? (
                    <div className="mt-3 grid gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs font-semibold text-stone-600 sm:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(item.metadata).slice(0, 9).map(([key, value]) => (
                        <div key={key} className="min-w-0 rounded-md bg-white px-2.5 py-2">
                          <span className="block font-black uppercase tracking-wide text-stone-400">{key}</span>
                          <span className="mt-0.5 block break-words text-stone-700">
                            {typeof value === "object" ? JSON.stringify(value) : String(value ?? "-")}
                          </span>
                        </div>
                      ))}
                    </div>
              ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 lg:text-right">
                <p className="text-xs font-black uppercase tracking-wide text-stone-400">Actor</p>
                {item.actor ? (
                  <>
                    <p className="mt-1 truncate font-black text-stone-950">{item.actor.name || item.actor.email}</p>
                    <p className="mt-0.5 break-all text-xs font-semibold text-stone-500">{item.actor.email}</p>
                  </>
                ) : (
                  <p className="mt-1 font-black text-stone-950">System</p>
                )}
              </div>
            </article>
          ))}
          {logs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-black text-stone-950">No audit records yet.</p>
              <p className="mt-1 text-sm font-semibold text-stone-500">
                Lifecycle, billing, payment, and onboarding changes will appear here.
              </p>
            </div>
          ) : null}
        </div>

        {pagination.totalPages > 1 ? (
          <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--stroke-soft)] bg-[var(--surface-panel-strong)]/95 px-4 py-3 backdrop-blur">
            <span className="text-xs font-bold text-stone-500">
              Page {page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}>Prev</button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}>Next</button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function MoviraControl() {
  const { pathname } = useLocation();
  const { parkId } = useParams();

  if (pathname === "/movira-control/plans") return <PlansManager />;
  if (pathname === "/movira-control" || pathname === "/movira-control/parks") return <ParksList />;
  if (pathname === "/movira-control/parks/new") return <ParkForm />;
  if (pathname.endsWith("/edit") && parkId) return <ParkForm />;
  if (parkId) return <ParkDetail />;
  return <ParksList />;
}
