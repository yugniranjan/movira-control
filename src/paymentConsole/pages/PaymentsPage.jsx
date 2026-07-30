// Payments hub for the superadmin.
//
// Two tabs, mapping directly to the two backend tables:
//   1. Gateways  → payment_provider_credentials   (org-wide + per-venue)
//   2. Routing   → location_payment_settings      (per-venue route rows)
//
// Org-level routing was a frontend fiction that doesn't map to the backend
// (location_payment_settings is always per-location) and has been removed.
// Defaults for new venues are something we'd build later as a separate
// template, not as live routing rows.

import { useEffect, useMemo, useState } from "react";
import {
  FiPlus,
  FiCreditCard,
  FiEdit2,
  FiGlobe,
  FiMapPin,
  FiAlertTriangle,
} from "react-icons/fi";
import { api } from "../api";
import { providerByKey } from "../constants/providers";
import { setCompatibilityMatrix } from "../constants/compatibility";
import { Card, Button, Badge, ProviderBadge, EmptyState, PageShell } from "../components/ui";
import { PageShimmer } from "../../components/Shimmer";
import RoutingMatrix from "../components/RoutingMatrix";
import AddGatewayModal from "../components/AddGatewayModal";
import EditGatewayModal from "../components/EditGatewayModal";

const TABS = [
  { key: "gateways", label: "Gateways" },
  { key: "routing", label: "Routing" },
];

const SCOPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "org", label: "Organization-wide" },
  { key: "venue", label: "Per-venue" },
];

// One compact card per gateway. Scope chip carried inline (no separate
// section) so the parent grid stays uniform regardless of scope.
//
// `isRouted` is computed by the parent and only meaningful for venue-scoped
// credentials. When false on a venue cred, we show a "Not routed" badge so
// the user sees at a glance which credentials they've added but not yet
// wired into a routing row. (See lib/paymentHealth.js — same precedence
// model as the backend's selectAdapter.loadCredentials.)
function GatewayCard({ credential, venue, isRouted, onClick }) {
  const provider = providerByKey[credential.provider];
  const fields = Object.entries(credential.masked || {});
  const isOrgWide = credential.locationId == null;
  const stranded =
    !isOrgWide && isRouted === false && credential.status !== "disabled";
  return (
    <button type="button" onClick={onClick} className="text-left w-full group">
      <Card
        className={`p-4 cursor-pointer transition-colors group-hover:border-[var(--brand-primary)] ${
          stranded ? "border-amber-300" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <ProviderBadge provider={credential.provider} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[var(--text-strong)] truncate">{credential.label}</span>
              <Badge tone={credential.mode === "live" ? "green" : "amber"}>{credential.mode}</Badge>
              {credential.status === "disabled" && <Badge tone="neutral">disabled</Badge>}
              {stranded && (
                <Badge tone="amber">
                  <FiAlertTriangle size={10} /> Not routed
                </Badge>
              )}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{provider?.name}</div>
            <div className="mt-1.5">
              {isOrgWide ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-base)]">
                  <FiGlobe size={11} /> Organization-wide
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary-deep)]">
                  <FiMapPin size={11} /> {venue ? venue.name : `Venue #${credential.locationId}`}
                </span>
              )}
            </div>
          </div>
          <FiEdit2 size={14} className="text-[var(--text-muted)] group-hover:text-[var(--brand-primary-deep)] mt-1" />
        </div>
        {fields.length > 0 && (
          <dl className="mt-3 pt-3 border-t border-[var(--stroke-soft)] grid grid-cols-1 gap-1">
            {fields.slice(0, 3).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 text-xs">
                <dt className="text-[var(--text-muted)] capitalize">{k.replace(/([A-Z])/g, " $1")}</dt>
                <dd className="font-mono text-[var(--text-base)] truncate max-w-[60%]">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </button>
  );
}

export default function PaymentsPage() {
  const [tab, setTab] = useState("gateways");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [credentials, setCredentials] = useState(null);
  const [venues, setVenues] = useState([]);
  const [venueRoutes, setVenueRoutes] = useState({}); // { locationId: { channel: route } }
  const [schemas, setSchemas] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Initial bootstrap. allSettled so one bad endpoint doesn't lock the page
  // on an infinite spinner.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled([
        api.getCredentials(),
        api.getProviderSchemas(),
        api.getVenues(),
        api.getCompatibility(),
      ]);
      if (cancelled) return;
      const [credsRes, schRes, vsRes, compatRes] = results;
      // Compatibility is non-critical (the routing picker has a built-in
      // fallback), so it isn't surfaced as a load failure.
      const names = ["credentials", "provider schemas", "venues"];
      const failures = results
        .slice(0, 3)
        .map((r, i) => (r.status === "rejected" ? `${names[i]}: ${r.reason?.message || "failed"}` : null))
        .filter(Boolean);
      if (failures.length) {
        console.error("PaymentsPage load failures:", failures);
        setLoadError(failures.join(" · "));
      } else {
        setLoadError(null);
      }
      setCredentials(credsRes.status === "fulfilled" ? credsRes.value : []);
      setSchemas(schRes.status === "fulfilled" ? schRes.value : {});
      setVenues(vsRes.status === "fulfilled" ? vsRes.value || [] : []);
      if (compatRes.status === "fulfilled") setCompatibilityMatrix(compatRes.value);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Routes are loaded eagerly (not gated on the Routing tab) because the
  // Gateways tab needs them too: per-venue credential cards show a "Not
  // routed" badge when no routing row points at the credential's
  // (provider, mode), and that comparison requires knowing every venue's
  // routes. Cost is small — one GET per venue, all in parallel.
  useEffect(() => {
    if (!venues.length) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled(
        venues.map((v) => api.getVenueRoutes(v.locationId))
      );
      if (cancelled) return;
      const next = {};
      venues.forEach((v, i) => {
        next[v.locationId] = results[i].status === "fulfilled" ? results[i].value : {};
      });
      setVenueRoutes(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [venues]);

  const venueById = useMemo(
    () => Object.fromEntries(venues.map((v) => [Number(v.locationId), v])),
    [venues]
  );

  // For each venue, the set of "<provider>:<mode>" pairs any route on that
  // venue currently references. The Gateway grid uses this to flag a
  // per-venue credential as "Not routed" when no route on its venue points
  // at the same provider+mode.
  const routedPairsByVenue = useMemo(() => {
    const out = {};
    for (const [vid, channelMap] of Object.entries(venueRoutes || {})) {
      const set = new Set();
      for (const route of Object.values(channelMap || {})) {
        if (route?.provider && route?.mode) set.add(`${route.provider}:${route.mode}`);
      }
      out[vid] = set;
    }
    return out;
  }, [venueRoutes]);

  function isCredentialRouted(c) {
    if (c.locationId == null) return null; // org creds: N/A (could be used by any venue)
    const set = routedPairsByVenue[c.locationId];
    if (!set) return null; // routes still loading
    return set.has(`${c.provider}:${c.mode}`);
  }

  // Org-wide first, then per-venue alphabetised by venue name.
  const sortedCredentials = useMemo(() => {
    const list = [...(credentials || [])];
    list.sort((a, b) => {
      const ao = a.locationId == null ? 0 : 1;
      const bo = b.locationId == null ? 0 : 1;
      if (ao !== bo) return ao - bo;
      const an = (venueById[Number(a.locationId)]?.name || "").toLowerCase();
      const bn = (venueById[Number(b.locationId)]?.name || "").toLowerCase();
      return an.localeCompare(bn);
    });
    return list;
  }, [credentials, venueById]);

  const filteredCredentials = useMemo(() => {
    if (scopeFilter === "all") return sortedCredentials;
    if (scopeFilter === "org") return sortedCredentials.filter((c) => c.locationId == null);
    return sortedCredentials.filter((c) => c.locationId != null);
  }, [sortedCredentials, scopeFilter]);

  const counts = useMemo(() => {
    const c = credentials || [];
    return {
      all: c.length,
      org: c.filter((x) => x.locationId == null).length,
      venue: c.filter((x) => x.locationId != null).length,
    };
  }, [credentials]);

  async function handleUpsertRoute({ locationId, channel, provider, mode, adapterKey }) {
    const route = await api.upsertVenueRoute({
      locationId,
      channel,
      provider,
      mode,
      adapterKey,
    });
    setVenueRoutes((prev) => ({
      ...prev,
      [locationId]: { ...(prev[locationId] || {}), [channel]: route },
    }));
  }

  async function handleDeleteRoute({ locationId, channel }) {
    await api.deleteVenueRoute({ locationId, channel });
    setVenueRoutes((prev) => {
      const next = { ...(prev[locationId] || {}) };
      delete next[channel];
      return { ...prev, [locationId]: next };
    });
  }

  if (!credentials) {
    return <PageShimmer />;
  }

  return (
    <PageShell
      title="Payments"
      description="Connect gateways once, then point each channel at the right one per venue."
      actions={
        tab === "gateways" ? (
          <Button onClick={() => setAdding(true)}>
            <FiPlus /> Add gateway
          </Button>
        ) : null
      }
    >

      {loadError && (
        <Card className="p-4 border-amber-300 bg-amber-50/60">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-amber-900 text-sm">Some payment data didn't load</div>
              <div className="text-xs text-amber-800 mt-0.5 break-words">{loadError}</div>
              <div className="text-xs text-amber-800 mt-1">
                Showing whatever did load. Likely cause: backend missing
                <code className="font-mono mx-1">/api/control/payments/config/*</code>
                routes, or auth.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      <div className="flex w-fit gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`min-h-9 rounded-lg px-4 text-sm font-black transition-colors ${
              tab === t.key
                ? "bg-orange-50 text-orange-700 shadow-sm"
                : "text-stone-600 hover:bg-stone-50 hover:text-stone-950"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "gateways" &&
        (credentials.length === 0 ? (
          <Card>
            <EmptyState icon={<FiCreditCard size={32} />} title="No gateways connected yet">
              Add Stripe, Nuvei or Razorpay to start accepting payments across your channels.
            </EmptyState>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {SCOPE_FILTERS.map((f) => {
                const active = scopeFilter === f.key;
                const count = counts[f.key];
                return (
                  <button
                    key={f.key}
                    onClick={() => setScopeFilter(f.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                      active
                        ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white"
                        : "bg-[var(--surface-panel)] border-[var(--stroke-soft)] text-[var(--text-base)] hover:border-[var(--stroke-strong)]"
                    }`}
                  >
                    {f.key === "org" && <FiGlobe size={11} />}
                    {f.key === "venue" && <FiMapPin size={11} />}
                    {f.label}
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        active ? "bg-white/20 text-white" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredCredentials.length === 0 ? (
              <Card>
                <EmptyState
                  icon={scopeFilter === "venue" ? <FiMapPin size={28} /> : <FiCreditCard size={28} />}
                  title={
                    scopeFilter === "venue"
                      ? "No venue-specific gateways yet"
                      : "No organization-wide gateways"
                  }
                >
                  {scopeFilter === "venue"
                    ? "Add one from a venue's page when that venue needs its own merchant account."
                    : "Add a gateway here to be the default for every venue."}
                </EmptyState>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCredentials.map((c) => (
                  <GatewayCard
                    key={c.credentialId}
                    credential={c}
                    venue={venueById[Number(c.locationId)]}
                    isRouted={isCredentialRouted(c)}
                    onClick={() => setEditing(c)}
                  />
                ))}
              </div>
            )}
          </>
        ))}

      {tab === "routing" && (
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
            <div>
              <h2 className="font-display font-bold text-[var(--text-strong)]">Routing</h2>
              <p className="text-sm text-[var(--text-base)] mt-0.5 max-w-2xl">
                One row per venue. Each cell is one
                <code className="font-mono mx-1">location_payment_settings</code>
                row that resolves to a credential via (provider, location, mode) at request time.
              </p>
            </div>
          </div>
          <RoutingMatrix
            venues={venues}
            credentials={credentials}
            venueRoutes={venueRoutes}
            onUpsertRoute={handleUpsertRoute}
            onDeleteRoute={handleDeleteRoute}
          />
        </Card>
      )}

      <AddGatewayModal
        open={adding}
        onClose={() => setAdding(false)}
        schemas={schemas}
        venues={venues}
        onCreated={(created) => setCredentials((list) => [...list, created])}
      />

      <EditGatewayModal
        open={!!editing}
        credential={editing}
        schema={editing ? schemas?.[editing.provider] : null}
        venues={venues}
        onClose={() => setEditing(null)}
        onUpdated={(updated) =>
          setCredentials((list) => list.map((c) => (c.credentialId === updated.credentialId ? updated : c)))
        }
        onDeleted={(id) => setCredentials((list) => list.filter((c) => c.credentialId !== id))}
      />
    </PageShell>
  );
}
