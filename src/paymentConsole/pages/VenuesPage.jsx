// All venues at a glance, with per-venue payment health resolved the same
// way the backend would resolve it (per-venue credential beats org-wide).
//
// Each card shows: status pill (Fully configured / Partial / Empty / Broken),
// routes set X/Y, distinct providers in use as icons, and an amber chip when
// any of the venue's saved routes won't resolve a credential at runtime.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertTriangle, FiChevronRight, FiMapPin, FiSearch } from "react-icons/fi";
import { api } from "../api";
import { providerByKey } from "../constants/providers";
import { Badge, Card, Input, PageShell, ProviderBadge } from "../components/ui";
import { PageShimmer } from "../../components/Shimmer";
import {
  HEALTH_LABEL,
  HEALTH_TONE,
  venueHealth,
  effectiveStatus,
} from "../lib/paymentHealth";

const STATUS_TONE = { active: "green", onboarding: "amber", paused: "neutral" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "needs", label: "Needs attention" },
  { key: "partial", label: "Partial" },
  { key: "complete", label: "Configured" },
];

export default function VenuesPage() {
  const [venues, setVenues] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [venueRoutesById, setVenueRoutesById] = useState({});
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const top = await Promise.allSettled([api.getVenues(), api.getCredentials()]);
      if (cancelled) return;
      const [venuesRes, credsRes] = top;
      const vs = venuesRes.status === "fulfilled" ? venuesRes.value : [];
      const creds = credsRes.status === "fulfilled" ? credsRes.value : [];

      const routeResults = await Promise.allSettled(
        vs.map((v) => api.getVenueRoutes(v.locationId))
      );
      if (cancelled) return;
      const byId = {};
      vs.forEach((v, i) => {
        byId[v.locationId] = routeResults[i].status === "fulfilled" ? routeResults[i].value : {};
      });

      const failures = [
        venuesRes.status === "rejected" && `venues: ${venuesRes.reason?.message || "failed"}`,
        credsRes.status === "rejected" && `credentials: ${credsRes.reason?.message || "failed"}`,
      ].filter(Boolean);
      setLoadError(failures.length ? failures.join(" · ") : null);
      setCredentials(creds);
      setVenues(vs);
      setVenueRoutesById(byId);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(() => {
    if (!venues) return [];
    return venues.map((v) => ({
      venue: v,
      health: venueHealth({
        venue: v,
        routes: venueRoutesById[v.locationId] || {},
        credentials,
      }),
    }));
  }, [venues, venueRoutesById, credentials]);

  const counts = useMemo(() => {
    const c = { all: enriched.length, needs: 0, partial: 0, complete: 0 };
    for (const e of enriched) {
      if (e.health.status === "broken" || e.health.status === "empty") c.needs++;
      if (e.health.status === "partial") c.partial++;
      if (e.health.status === "complete") c.complete++;
    }
    return c;
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter(({ venue, health }) => {
      if (q) {
        const hay = `${venue.name} ${venue.city} ${venue.country}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "all") return true;
      if (filter === "needs") return health.status === "broken" || health.status === "empty";
      if (filter === "partial") return health.status === "partial";
      if (filter === "complete") return health.status === "complete";
      return true;
    });
  }, [enriched, filter, query]);

  if (!venues) {
    return <PageShimmer />;
  }

  return (
    <PageShell
      title="Venues"
      description={`${venues.length} location${venues.length === 1 ? "" : "s"}. Open a venue to manage its gateways and routing.`}
    >
      {loadError && (
        <Card className="p-4 border-amber-300 bg-amber-50/60">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
            <div className="text-xs text-amber-800 break-words">{loadError}</div>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative min-w-full flex-1 sm:min-w-[200px] sm:max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search venues by name or city…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                  active
                    ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white"
                    : "bg-[var(--surface-panel)] border-[var(--stroke-soft)] text-[var(--text-base)] hover:border-[var(--stroke-strong)]"
                }`}
              >
                {f.label}
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    active ? "bg-white/20 text-white" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"
                  }`}
                >
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map(({ venue, health }) => (
          <Link key={venue.locationId} to={`/movira-control/payments/venues/${venue.locationId}`}>
            <Card className="p-5 h-full hover:border-[var(--brand-primary)] transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 text-[var(--brand-primary-deep)] shrink-0">
                    <FiMapPin size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--text-strong)] truncate">{venue.name}</div>
                    <div className="text-sm text-[var(--text-base)] truncate">
                      {venue.city}
                      {venue.country ? ` · ${venue.country}` : ""}
                    </div>
                  </div>
                </div>
                <FiChevronRight className="text-[var(--text-muted)] mt-1 shrink-0" />
              </div>

              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <Badge tone={STATUS_TONE[venue.status] || "neutral"}>{venue.status}</Badge>
                <Badge tone="neutral">{venue.currency}</Badge>
                {(() => {
                  // When the basic status is `empty` but venue credentials
                  // exist, escalate to "stranded" so the badge reads as
                  // actionable (amber) instead of neutral.
                  const effStatus = effectiveStatus(health);
                  return (
                    <Badge tone={HEALTH_TONE[effStatus]}>{HEALTH_LABEL[effStatus]}</Badge>
                  );
                })()}
                {health.unresolvedChannels.length > 0 && (
                  <Badge tone="red">
                    <FiAlertTriangle size={10} /> {health.unresolvedChannels.length} unresolved
                  </Badge>
                )}
                {health.hasStrandedCredentials && health.status !== "empty" && (
                  <Badge tone="amber">
                    <FiAlertTriangle size={10} /> {health.unroutedCredentials.length} unused
                    cred{health.unroutedCredentials.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-[var(--stroke-soft)]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex -space-x-1.5 shrink-0">
                    {health.providers.length === 0 ? (
                      <span className="w-8 h-8 rounded-lg bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)] text-xs">
                        —
                      </span>
                    ) : (
                      health.providers.map((p) => (
                        <span key={p} className="ring-2 ring-[var(--surface-panel)] rounded-xl">
                          <ProviderBadge provider={p} size={26} />
                        </span>
                      ))
                    )}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] truncate">
                    {health.providers.length === 0
                      ? "No providers yet"
                      : health.providers.map((p) => providerByKey[p]?.name).join(" · ")}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[var(--text-muted)] shrink-0">
                  {health.configuredCount}/{health.totalLiveChannels} live
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="p-8 text-center text-sm text-[var(--text-muted)]">
          No venues match the current filter.
        </Card>
      )}
    </PageShell>
  );
}
