import { useEffect, useMemo, useState } from "react";
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
  FaTrash,
  FaTrashRestore,
} from "react-icons/fa";
import PageLayout from "../../layouts/PageLayout";
import Loader from "../../components/Loader";
import ErrorMessage from "../../components/ErrorMessage";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  useApproveSaasParkGoLiveMutation,
  useCreateSaasParkMutation,
  useCreateSaasCustomerOwnerMutation,
  useCreateSaasInvoicePaymentLinkMutation,
  useDeleteSaasParkMutation,
  useGetSaasParkAuditLogsQuery,
  useGetSaasParkByIdQuery,
  useGetSaasParkPaymentEventsQuery,
  useGetSaasParksQuery,
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
  streetNumberOrBuildingName: "1",
  streetName: "Main Street",
  displayAddress: "",
  monthlyBaseFee: 0,
};

const defaultCustomerOwner = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  temporaryPassword: "",
};

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

function money(value, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
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

function Pill({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

function buttonClass(variant = "secondary", extra = "") {
  const base =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50";
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
    "inline-grid h-10 w-10 place-items-center rounded-lg border text-sm transition disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    secondary: "border-stone-200 bg-white text-stone-700 hover:border-orange-200 hover:bg-orange-50",
    danger: "border-red-200 bg-white text-red-700 hover:bg-red-50",
  };
  return `${base} ${variants[variant] || variants.secondary} ${extra}`;
}

function StatCard({ icon: Icon, label, value, detail, compact = false }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
      <div className={`flex items-center ${compact ? "gap-2.5" : "gap-3"}`}>
        <div className={`grid shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700 ${compact ? "h-9 w-9 text-sm" : "h-11 w-11"}`}>
          <Icon />
        </div>
        <div>
        <div className={`min-w-0 ${compact ? "flex flex-1 items-baseline gap-2" : ""}`}>
          <p className={`shrink-0 font-black leading-none text-stone-950 ${compact ? "text-xl" : "text-2xl"}`}>{value}</p>
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

function LaunchRail({ park }) {
  const score = Number(park.onboardingScore || 0);
  const completedSteps = setupSteps.filter((step) => Boolean(park.onboarding?.[step.key])).length;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)_auto] xl:items-center">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-700">
            <FaRocket />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-stone-500">
              Launch readiness
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-2xl font-black leading-none text-stone-950">{score}%</p>
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
              <span>{step.label}</span>
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

        <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-stone-200 p-3">
            <div className="inline-flex shrink-0 rounded-lg border border-stone-200 bg-stone-50 p-1">
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
            <div className="relative min-w-0 flex-1 max-w-sm">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search parks..." className="input-nexus w-full py-1.5 pl-8 pr-3 text-sm" />
            </div>
            <select
              value={organizationFilter}
              onChange={(event) => {
                setOrganizationFilter(event.target.value);
                setPage(1);
              }}
              className="input-nexus min-h-9 w-52 px-3 py-1.5 text-sm"
            >
              <option value="">All organizations</option>
              {organizations.map((org) => (
                <option key={org.id || org.organizationId} value={org.id || org.organizationId}>
                  {org.name}
                </option>
              ))}
            </select>
            <p className="ml-auto shrink-0 text-sm font-bold text-stone-500">{pagination.totalRecords || 0} parks</p>
          </div>
          {parks.length ? (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-stone-50 text-left text-xs font-black uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-2.5">Park</th>
                  <th className="px-4 py-2.5">Organization</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Base fee</th>
                  <th className="px-4 py-2.5">Billing</th>
                  <th className="px-4 py-2.5">Onboarding</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {parks.map((park) => {
                  const isArchived = statusFilter === "archived" || Boolean(park.archivedAt) || park.status === "archived";
                  const displayStatus = isArchived ? "archived" : park.status;

                  return (
                    <tr key={park.id} className="hover:bg-stone-50">
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
                        <div className="flex justify-end gap-2">
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
            <div className="flex items-center justify-end gap-2 border-t border-stone-200 p-3">
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
  const { data: usersData = {} } = useGetAllUsersQuery({ search: "" });
  const organizations = listData.catalogs?.organizations || data?.catalogs?.organizations || [];
  const users = Array.isArray(usersData?.data) ? usersData.data : Array.isArray(usersData?.users) ? usersData.users : [];
  const [form, setForm] = useState(defaultForm);
  const [newCustomer, setNewCustomer] = useState(defaultCustomerOwner);
  const [createdCustomer, setCreatedCustomer] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [createPark, createState] = useCreateSaasParkMutation();
  const [createCustomerOwner, createCustomerState] = useCreateSaasCustomerOwnerMutation();
  const [updatePark, updateState] = useUpdateSaasParkMutation();
  const customerUsers = createdCustomer && !users.some((user) => String(user.user_id || user.userId || user.id) === String(createdCustomer.userId || createdCustomer.id))
    ? [...users, createdCustomer]
    : users;

  useEffect(() => {
    if (data?.park && isEdit) {
      const park = data.park;
      setForm({
        ...defaultForm,
        organizationId: park.organizationId || park.organization?.id || "",
        organizationName: park.organization?.name || "",
        name: park.name || "",
        slug: park.slug || "",
        owner: park.owner || "",
        ownerUserId: park.ownerUserId || park.ownerUser?.id || "",
        ownerEmail: park.ownerEmail || "",
        phone: park.phone || "",
        city: park.city || "",
        state: park.state || "",
        country: park.country || "Canada",
        timezone: park.timezone || "America/Toronto",
        currency: park.currency || "CAD",
        monthlyBaseFee: park.monthlyBaseFee || 0,
      });
    }
  }, [data, isEdit]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateNewCustomer = (key, value) => setNewCustomer((current) => ({ ...current, [key]: value }));

  const handleCreateCustomerOwner = async () => {
    if (!newCustomer.firstName.trim() || !newCustomer.email.trim()) {
      toast.error("Customer first name and email are required.");
      return;
    }
    try {
      const response = await createCustomerOwner(newCustomer).unwrap();
      const user = response?.user || response?.data?.user;
      const password = response?.temporaryPassword || response?.data?.temporaryPassword || "";
      if (!user) {
        toast.error("Customer owner was created, but the user data was not returned.");
        return;
      }
      const userId = user.userId || user.user_id || user.id;
      const name = user.name || [newCustomer.firstName, newCustomer.lastName].filter(Boolean).join(" ");
      setCreatedCustomer(user);
      setTemporaryPassword(password);
      setForm((current) => ({
        ...current,
        ownerUserId: String(userId),
        owner: name || current.owner,
        ownerEmail: user.email || newCustomer.email,
        phone: newCustomer.phone || current.phone,
      }));
      setNewCustomer(defaultCustomerOwner);
      toast.success(password ? "Customer owner created and selected." : "Existing customer owner selected.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to create customer owner.");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.ownerUserId) {
      toast.error("Select the customer account that owns this park.");
      return;
    }
    try {
      const payload = {
        ...form,
        customerUserId: form.ownerUserId,
        requireCustomerAssignment: true,
      };
      const response = isEdit
        ? await updatePark({ id: parkId, ...payload }).unwrap()
        : await createPark(payload).unwrap();
      const id = response?.data?.id || response?.id || parkId;
      toast.success(isEdit ? "Park updated." : "Park created.");
      navigate(`/movira-control/parks/${id}`);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save park.");
    }
  };

  if (isLoading) return <Loader />;

  return (
    <ControlShell
      title={isEdit ? "Edit park" : "New park"}
      actions={<Link to="/movira-control/parks" className={buttonClass("secondary")}><FaArrowLeft /> Parks</Link>}
    >
      <form onSubmit={submit} className="grid max-w-6xl gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="border-b border-stone-200 pb-4">
              <p className="text-xs font-black uppercase text-orange-700">Park profile</p>
              <h2 className="mt-1 text-xl font-black text-stone-950">Workspace identity</h2>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-xs font-black uppercase text-stone-500">Organization</span>
                <div className="mt-1 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <select
                    value={form.organizationId}
                    onChange={(event) => {
                      const selected = organizations.find((org) => String(org.id || org.organizationId) === event.target.value);
                      setForm((current) => ({
                        ...current,
                        organizationId: event.target.value,
                        organizationName: selected?.name || current.organizationName,
                      }));
                    }}
                    className="input-nexus w-full px-3 py-2.5 text-sm"
                  >
                    <option value="">Create or match by organization name</option>
                    {organizations.map((org) => (
                      <option key={org.id || org.organizationId} value={org.id || org.organizationId}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={form.organizationName}
                    onChange={(event) => update("organizationName", event.target.value)}
                    placeholder="e.g. Yogesh Sports Group"
                    className="input-nexus w-full px-3 py-2.5 text-sm"
                  />
                </div>
              </label>
              {[
                ["name", "Park name", "Movira St. Catharines"],
                ["slug", "Slug", "movira-st-catharines"],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="block">
                  <span className="text-xs font-black uppercase text-stone-500">{label}</span>
                  <input value={form[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="border-b border-stone-200 pb-4">
              <p className="text-xs font-black uppercase text-orange-700">Customer assignment</p>
              <h2 className="mt-1 text-xl font-black text-stone-950">Assign the account that owns this park</h2>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                ["owner", "Customer name", "Yogesh Niranjan"],
                ["phone", "Phone", "9055550101"],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="block">
                  <span className="text-xs font-black uppercase text-stone-500">{label}</span>
                  <input value={form[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
              ))}
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Customer account *</span>
                <select
                  required
                  value={form.ownerUserId}
                  onChange={(event) => {
                    const selected = customerUsers.find((user) => String(user.user_id || user.userId || user.id) === event.target.value);
                    setForm((current) => ({
                      ...current,
                      ownerUserId: event.target.value,
                      ownerEmail: selected?.email || current.ownerEmail,
                      owner: selected ? selected.name || [selected.first_name || selected.firstName, selected.last_name || selected.lastName].filter(Boolean).join(" ") || current.owner : current.owner,
                    }));
                  }}
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                >
                  <option value="">Select customer account</option>
                  {customerUsers.map((user) => {
                    const id = user.user_id || user.userId || user.id;
                    const name = user.name || [user.first_name || user.firstName, user.last_name || user.lastName].filter(Boolean).join(" ") || user.email;
                    return (
                      <option key={id} value={id}>
                        {name} · {user.email}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Customer email</span>
                <input value={form.ownerEmail} onChange={(event) => update("ownerEmail", event.target.value)} placeholder="owner@example.com" className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
              </label>
            </div>
            <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-orange-700">New paying customer</p>
                  <h3 className="mt-1 text-base font-black text-stone-950">Create a login owner account</h3>
                  <p className="mt-1 text-sm font-semibold text-stone-600">Use this when the customer does not already exist in Movira.</p>
                </div>
                <button
                  type="button"
                  disabled={createCustomerState.isLoading}
                  onClick={handleCreateCustomerOwner}
                  className={buttonClass("secondary", "shrink-0")}
                >
                  <FaPlus /> {createCustomerState.isLoading ? "Creating..." : "Create owner"}
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">First name</span>
                  <input value={newCustomer.firstName} onChange={(event) => updateNewCustomer("firstName", event.target.value)} placeholder="Yogesh" className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Last name</span>
                  <input value={newCustomer.lastName} onChange={(event) => updateNewCustomer("lastName", event.target.value)} placeholder="Niranjan" className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Email</span>
                  <input type="email" value={newCustomer.email} onChange={(event) => updateNewCustomer("email", event.target.value)} placeholder="owner@example.com" className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase text-stone-500">Phone</span>
                  <input value={newCustomer.phone} onChange={(event) => updateNewCustomer("phone", event.target.value)} placeholder="9055550101" className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
              </div>
              <label className="mt-3 block max-w-md">
                <span className="text-xs font-black uppercase text-stone-500">Temporary password</span>
                <input
                  value={newCustomer.temporaryPassword}
                  onChange={(event) => updateNewCustomer("temporaryPassword", event.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              {temporaryPassword ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                  Temporary login password: <span className="font-black">{temporaryPassword}</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="border-b border-stone-200 pb-4">
              <p className="text-xs font-black uppercase text-orange-700">Location</p>
              <h2 className="mt-1 text-xl font-black text-stone-950">Operating region</h2>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                ["city", "City", "St. Catharines"],
                ["state", "State / province", "Ontario"],
                ["country", "Country", "Canada"],
                ["timezone", "Timezone", "America/Toronto"],
                ["currency", "Currency", "CAD"],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="block">
                  <span className="text-xs font-black uppercase text-stone-500">{label}</span>
                  <input value={form[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
                </label>
              ))}
              <label className="block">
                <span className="text-xs font-black uppercase text-stone-500">Base platform fee</span>
                <input
                  type="number"
                  min="0"
                  value={form.monthlyBaseFee}
                  onChange={(event) => update("monthlyBaseFee", event.target.value)}
                  placeholder="0"
                  className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5 shadow-sm xl:sticky xl:top-4">
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
      </form>
    </ControlShell>
  );
}

function ParkTabs({ parkId }) {
  const tabs = [
    ["", "Overview"],
    ["modules", "Modules"],
    ["billing", "Billing"],
    ["payments", "Payments"],
    ["onboarding", "Onboarding"],
    ["audit", "Audit"],
  ];
  const { pathname } = useLocation();
  return (
    <div className="sticky top-[76px] z-30 mb-3 flex flex-wrap gap-1.5 rounded-lg border border-stone-200 bg-white/95 p-1.5 shadow-sm backdrop-blur">
      {tabs.map(([suffix, label]) => {
        const to = `/movira-control/parks/${parkId}${suffix ? `/${suffix}` : ""}`;
        const active = pathname === to;
        return <Link key={label} to={to} className={`rounded-lg px-3 py-1.5 text-sm font-black ${active ? "bg-orange-100 text-orange-700" : "text-stone-600 hover:bg-stone-100"}`}>{label}</Link>;
      })}
    </div>
  );
}

function ParkDetail() {
  const { parkId, section = "" } = useParams();
  const { data, isLoading, isError, error } = useGetSaasParkByIdQuery(parkId);
  const park = data?.park;
  const auditLogs = data?.auditLogs || [];
  const invoices = data?.invoices || [];
  const paymentEvents = data?.paymentEvents || [];

  if (isLoading) return <Loader />;
  if (isError || !park) return <ErrorMessage message={error?.data?.message || "Park not found"} />;

  return (
    <ControlShell
      title={park.name}
      actions={
        <div className="flex gap-2">
          <Link to="/movira-control/parks" className={buttonClass("secondary")}><FaArrowLeft /> Parks</Link>
          <Link to={`/movira-control/parks/${park.id}/edit`} className={buttonClass("primary")}><FaEdit /> Edit</Link>
        </div>
      }
    >
      <ParkTabs parkId={park.id} />
      {section !== "audit" ? (
        <div className="mb-4">
          <LaunchRail park={park} />
        </div>
      ) : null}
      {section === "modules" ? <ModulesPanel park={park} /> : null}
      {section === "billing" ? <BillingPanel park={park} invoices={invoices} /> : null}
      {section === "payments" ? <PaymentsPanel park={park} invoices={invoices} paymentEvents={paymentEvents} /> : null}
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

function ModulesPanel({ park }) {
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
  const enabledTotal = modules
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
        {modules.map((module) => (
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

function BillingPanel({ park, invoices = [] }) {
  const [form, setForm] = useState({
    monthlyBaseFee: park.monthlyBaseFee || 0,
    billingCycle: park.billingCycle,
    billingStartDate: park.billingStartDate || "",
    discountAmount: park.discountAmount || 0,
    taxLabel: park.taxLabel || "Tax",
    taxRatePercent: park.taxRatePercent || 0,
    taxRegistrationNumber: park.taxRegistrationNumber || "",
  });
  const [updateBilling] = useUpdateSaasParkBillingMutation();
  const submit = async (event) => {
    event.preventDefault();
    try {
      await updateBilling({ id: park.id, ...form }).unwrap();
      toast.success("Billing updated.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update billing.");
    }
  };
  const selectedModules = modules.filter((module) => (park.modules || []).includes(module.key));
  const baseAmount = Number(form.monthlyBaseFee ?? park.billing?.base ?? park.monthlyBaseFee ?? 0);
  const moduleTotal = selectedModules.reduce((sum, module) => sum + Number(module.monthly || 0), 0);
  const discount = Number(form.discountAmount ?? park.billing?.discount ?? park.discountAmount ?? 0);
  const taxRatePercent = Math.max(0, Math.min(100, Number(form.taxRatePercent || 0)));
  const subtotal = Math.max(0, baseAmount + moduleTotal - discount);
  const taxAmount = Number(((subtotal * taxRatePercent) / 100).toFixed(2));
  const monthlyTotal = Number((subtotal + taxAmount).toFixed(2));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={submit} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 pb-4">
          <div>
            <p className="text-xs font-black uppercase text-orange-700">Billing setup</p>
            <h2 className="mt-1 text-xl font-black text-stone-950">Base fee and invoice controls</h2>
            <p className="mt-1 text-sm font-semibold text-stone-500">Base platform fee plus enabled module fees creates the monthly bill.</p>
          </div>
          <Pill className="border-orange-200 bg-orange-50 text-orange-700">{park.billingCycle || "monthly"}</Pill>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Base platform fee</span>
            <input
              type="number"
              min="0"
              value={form.monthlyBaseFee}
              onChange={(event) => setForm({ ...form, monthlyBaseFee: event.target.value })}
              className="input-nexus mt-1 w-full px-3 py-2.5 text-sm"
            />
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Cycle</span>
            <select value={form.billingCycle} onChange={(event) => setForm({ ...form, billingCycle: event.target.value })} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm">
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
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
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Tax label</span>
            <input value={form.taxLabel} onChange={(event) => setForm({ ...form, taxLabel: event.target.value })} placeholder="GST / HST" className="input-nexus mt-1 w-full px-3 py-2.5 text-sm" />
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

        <div className="mt-5 overflow-hidden rounded-xl border border-stone-200">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
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

        <button className={buttonClass("primary", "mt-5")}>Save billing</button>
        </form>

        <aside className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
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
      <InvoiceHistoryTable park={park} invoices={invoices} />
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
        } catch (_) {}
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
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
        <div>
          <p className="text-xs font-black uppercase text-orange-700">Invoice history</p>
          <h3 className="text-lg font-black text-stone-950">Generated SaaS invoices</h3>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={refreshLifecycleState.isLoading}
            onClick={handleRefreshLifecycle}
            className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}
          >
            {refreshLifecycleState.isLoading ? "Refreshing..." : "Refresh invoices"}
          </button>
          <Pill className="border-stone-200 bg-stone-50 text-stone-600">{invoices.length} invoices</Pill>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50 text-left text-xs font-black uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {invoices.map((invoice) => {
              const remaining = Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0));
              const terminalStatuses = ["paid", "void", "refunded"];
              const canPay = remaining > 0 && !terminalStatuses.includes(invoice.status);
              const canVoid = Number(invoice.paidAmount || 0) <= 0 && !terminalStatuses.includes(invoice.status);
              const paidAmount = Number(invoice.paidAmount || 0);
              const canRefund = paidAmount > 0 && !["void", "refunded"].includes(invoice.status);
              return (
                <tr key={invoice.invoiceId}>
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
                        onClick={() => handleOpenInvoiceDocument(invoice)}
                        className={buttonClass("secondary", "min-h-9 px-3 py-1.5 text-xs")}
                      >
                        Open invoice
                      </button>
                      <button
                        type="button"
                        disabled={!canPay || isLoading}
                        onClick={() => handleRecordPayment(invoice)}
                        className={buttonClass(canPay ? "success" : "secondary", "min-h-9 px-3 py-1.5 text-xs")}
                      >
                        {canPay ? `Record ${money(remaining, invoice.currency || park.currency)}` : "Settled"}
                      </button>
                      {canPay ? (
                        <button
                          type="button"
                          disabled={createLinkState.isLoading}
                          onClick={() => handleCreatePaymentLink(invoice)}
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

function PaymentsPanel({ park, paymentEvents = [] }) {
  const [form, setForm] = useState({
    paymentMethod: park.paymentMethod,
    paymentStatus: park.paymentStatus,
    guestPaymentStatus: park.guestPaymentStatus,
  });
  const [updatePayments] = useUpdateSaasParkPaymentsMutation();
  const submit = async (event) => {
    event.preventDefault();
    try {
      await updatePayments({ id: park.id, ...form }).unwrap();
      toast.success("Payments updated.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update payments.");
    }
  };
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div>
            <p className="text-xs font-black uppercase text-orange-700">Payment control</p>
            <h2 className="mt-1 text-xl font-black text-stone-950">Platform billing and guest payment rails</h2>
          </div>
          <Pill className={form.paymentStatus === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
            {form.paymentStatus}
          </Pill>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Platform billing method</span>
            <select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm">
              <option value="not_configured">Not configured</option>
              <option value="card_on_file">Card on file</option>
              <option value="bank_debit">Bank debit</option>
              <option value="manual_invoice">Manual invoice</option>
            </select>
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Platform billing status</span>
            <select value={form.paymentStatus} onChange={(event) => setForm({ ...form, paymentStatus: event.target.value })} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm">
              <option value="not_configured">Not configured</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="past_due">Past due</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <label>
            <span className="text-xs font-black uppercase text-stone-500">Guest payments</span>
            <select value={form.guestPaymentStatus} onChange={(event) => setForm({ ...form, guestPaymentStatus: event.target.value })} className="input-nexus mt-1 w-full px-3 py-2.5 text-sm">
              <option value="not_configured">Not configured</option>
              <option value="sandbox">Sandbox</option>
              <option value="live">Live</option>
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-black uppercase text-stone-500">Movira charges the park</p>
            <p className="mt-1 text-sm font-semibold text-stone-600">This controls SaaS subscription collection for the selected park.</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-black uppercase text-stone-500">Guests pay the park</p>
            <p className="mt-1 text-sm font-semibold text-stone-600">This controls checkout, POS, refunds, and guest payment acceptance.</p>
          </div>
        </div>
        <button className={buttonClass("primary", "mt-5")}>Save payments</button>
      </form>
      <PaymentHistoryPanel park={park} paymentEvents={paymentEvents} />
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
    <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4">
        <div>
          <p className="text-xs font-black uppercase text-orange-700">Payment history</p>
          <h3 className="text-lg font-black text-stone-950">SaaS billing events</h3>
        </div>
        <Pill className="border-stone-200 bg-stone-50 text-stone-600">{pagination.totalRecords || events.length} events</Pill>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-5 py-3">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
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
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="input-nexus min-h-9 w-36 px-3 py-1.5 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="open">Open</option>
          <option value="overdue">Overdue</option>
          <option value="past_due">Past due</option>
          <option value="suspended">Suspended</option>
          <option value="recovered">Recovered</option>
          <option value="void">Void</option>
          <option value="recorded">Recorded</option>
        </select>
        <select
          value={eventType}
          onChange={(event) => {
            setEventType(event.target.value);
            setPage(1);
          }}
          className="input-nexus min-h-9 w-48 px-3 py-1.5 text-sm"
        >
          <option value="all">All event types</option>
          <option value="invoice_generated">Invoice generated</option>
          <option value="invoice_payment_captured">Payment captured</option>
          <option value="invoice_payment_refunded">Payment refunded</option>
          <option value="invoice_payment_link_created">Payment link</option>
          <option value="invoice_marked_overdue">Marked overdue</option>
          <option value="invoice_reminder_sent">Reminder sent</option>
          <option value="invoice_reminder_failed">Reminder failed</option>
          <option value="account_marked_past_due">Account past due</option>
          <option value="account_suspended_for_non_payment">Account suspended</option>
          <option value="account_collection_recovered">Account recovered</option>
          <option value="invoice_voided">Invoice voided</option>
          <option value="payment_settings_updated">Payment settings</option>
        </select>
        {isFetching ? <span className="text-xs font-black uppercase text-stone-400">Loading...</span> : null}
      </div>
      <div className="divide-y divide-stone-100">
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
        <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-5 py-3">
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
  const [goLive] = useApproveSaasParkGoLiveMutation();
  const toggle = async (key) => {
    try {
      await updateOnboarding({ id: park.id, onboarding: { ...park.onboarding, [key]: !park.onboarding?.[key] } }).unwrap();
      toast.success("Checklist updated.");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update checklist.");
    }
  };
  const approve = async () => {
    try {
      await goLive({ id: park.id }).unwrap();
      toast.success("Go-live checked.");
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
        <button onClick={approve} className={buttonClass("primary")}><FaRocket /> Approve go-live</button>
      </div>
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
  const logs = data.logs || initialLogs || [];
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
            <h2 className="mt-1 truncate font-display text-xl font-black tracking-tight text-stone-950">
              Operator and system activity trail
            </h2>
            <p className="mt-0.5 truncate text-sm font-semibold text-stone-500">
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

      <div className="rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 p-4">
          <div className="relative min-w-[240px] flex-1">
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
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
            className="input-nexus min-h-10 w-full px-3 py-2 text-sm font-bold sm:w-64"
          >
            <option value="all">All actions</option>
            <option value="park.created">Park created</option>
            <option value="park.updated">Park updated</option>
            <option value="park.archived">Park archived</option>
            <option value="park.lifecycle_updated">Lifecycle updated</option>
            <option value="billing.updated">Billing updated</option>
            <option value="payments.updated">Payments updated</option>
            <option value="invoice.generated">Invoice generated</option>
            <option value="invoice.payment_recorded">Payment recorded</option>
            <option value="invoice.payment_link_created">Payment link created</option>
            <option value="invoice.payment_refunded">Payment refunded</option>
            <option value="invoice.marked_overdue">Marked overdue</option>
            <option value="invoice.reminder_sent">Reminder sent</option>
            <option value="invoice.reminder_failed">Reminder failed</option>
            <option value="billing.past_due">Billing past due</option>
            <option value="billing.suspended">Billing suspended</option>
            <option value="billing.collection_recovered">Billing recovered</option>
            <option value="invoice.voided">Invoice voided</option>
            <option value="onboarding.updated">Onboarding updated</option>
          </select>
        </div>

        <div className="divide-y divide-stone-100">
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 px-4 py-3">
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

  if (pathname === "/movira-control" || pathname === "/movira-control/parks") return <ParksList />;
  if (pathname === "/movira-control/parks/new") return <ParkForm />;
  if (pathname.endsWith("/edit") && parkId) return <ParkForm />;
  if (parkId) return <ParkDetail />;
  return <ParksList />;
}
