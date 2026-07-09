// Owner dashboard. Surfaces the state of payment config across all venues
// using the same resolver as the backend so what the user sees here will
// agree with what selectAdapter actually picks at request time.
//
// Stat cards on top, then a "Needs attention" panel listing venues whose
// live channels are unconfigured or whose routes don't resolve a credential.

import { createElement, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheckCircle,
  FiCreditCard,
  FiGlobe,
  FiMapPin,
  FiZap,
} from "react-icons/fi";
import { api } from "../api";
import { useAuth } from "../auth/useAuth";
import { CHANNELS, channelByKey } from "../constants/channels";
import { providerByKey } from "../constants/providers";
import { Badge, Card, PageShell, ProviderBadge, Spinner } from "../components/ui";
import {
  HEALTH_LABEL,
  HEALTH_TONE,
  LIVE_CHANNELS,
  orgHealth,
  effectiveStatus,
} from "../lib/paymentHealth";

function Stat({ icon: Icon, label, value, hint, to }) {
  const body = (
    <Card className="p-5 h-full hover:border-[var(--brand-primary)] transition-colors">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 text-[var(--brand-primary-deep)]">
          {createElement(Icon, { size: 20 })}
        </span>
        {to && <FiArrowRight className="text-[var(--text-muted)]" />}
      </div>
      <div className="mt-4 font-display text-3xl font-extrabold text-[var(--text-strong)]">{value}</div>
      <div className="text-sm text-[var(--text-base)]">{label}</div>
      {hint && <div className="text-xs text-[var(--text-muted)] mt-0.5">{hint}</div>}
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function OverviewPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const top = await Promise.allSettled([api.getVenues(), api.getCredentials()]);
      if (cancelled) return;
      const [venuesRes, credsRes] = top;
      const venues = venuesRes.status === "fulfilled" ? venuesRes.value : [];
      const credentials = credsRes.status === "fulfilled" ? credsRes.value : [];

      // Pull every venue's routes in parallel; one bad venue doesn't blank
      // the page.
      const routeResults = await Promise.allSettled(
        venues.map((v) => api.getVenueRoutes(v.locationId))
      );
      if (cancelled) return;
      const venueRoutesById = {};
      venues.forEach((v, i) => {
        venueRoutesById[v.locationId] =
          routeResults[i].status === "fulfilled" ? routeResults[i].value : {};
      });

      const failures = [
        venuesRes.status === "rejected" && `venues: ${venuesRes.reason?.message || "failed"}`,
        credsRes.status === "rejected" && `credentials: ${credsRes.reason?.message || "failed"}`,
      ].filter(Boolean);
      setLoadError(failures.length ? failures.join(" · ") : null);
      setData({ venues, credentials, venueRoutesById });
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const health = useMemo(() => {
    if (!data) return null;
    return orgHealth({
      venues: data.venues,
      venueRoutesById: data.venueRoutesById,
      credentials: data.credentials,
    });
  }, [data]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--brand-primary)]">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  const orgCredentialCount = data.credentials.filter((c) => c.locationId == null).length;
  const venueCredentialCount = data.credentials.filter((c) => c.locationId != null).length;
  const totalPossibleLiveRoutes = data.venues.length * LIVE_CHANNELS.length;
  // Venues that need a human's attention. Three reasons (in priority order):
  //   - broken: a route saved but no credential resolves at runtime
  //   - stranded creds: venue cred exists but no route references it
  //     (often signals "I added a key but forgot to wire it up")
  //   - empty: no live routes at all
  const needsAttention = health.perVenue.filter(
    (entry) =>
      entry.health.status === "broken" ||
      entry.health.status === "empty" ||
      entry.health.hasStrandedCredentials
  );
  const partial = health.perVenue.filter(
    (entry) =>
      entry.health.status === "partial" && !entry.health.hasStrandedCredentials
  );

  return (
    <PageShell
      title={`Hi ${user?.name?.split(" ")[0] || "there"}`}
      description={`Payment configuration across your ${data.venues.length} venue${data.venues.length === 1 ? "" : "s"}.`}
    >
      {loadError && (
        <Card className="p-4 border-amber-300 bg-amber-50/60">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-amber-900 text-sm">Some data didn't load</div>
              <div className="text-xs text-amber-800 mt-0.5 break-words">{loadError}</div>
            </div>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="text-xs font-semibold text-amber-900 hover:underline"
            >
              Retry
            </button>
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={FiMapPin} label="Venues" value={data.venues.length} to="/payment-console/venues" />
        <Stat
          icon={FiCreditCard}
          label="Connected gateways"
          value={data.credentials.length}
          hint={`${orgCredentialCount} org · ${venueCredentialCount} per-venue`}
          to="/payment-console/payments"
        />
        <Stat
          icon={FiZap}
          label="Live channels routed"
          value={`${health.totalLiveRoutes} / ${totalPossibleLiveRoutes}`}
          hint={`${LIVE_CHANNELS.length} channel${LIVE_CHANNELS.length === 1 ? "" : "s"} × ${data.venues.length} venue${data.venues.length === 1 ? "" : "s"}`}
          to="/payment-console/payments"
        />
        <Stat
          icon={FiAlertTriangle}
          label="Routes missing a credential"
          value={health.totalUnresolvedRoutes}
          hint={
            health.totalUnresolvedRoutes === 0
              ? "All saved routes resolve"
              : "Saved but won't dispatch at runtime"
          }
          to="/payment-console/payments"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* ── Needs attention: empty + broken venues ─────────────────────── */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-display font-bold text-[var(--text-strong)]">Needs attention</h2>
              <p className="text-xs text-[var(--text-muted)]">Live channels with no route, or routes that won't resolve.</p>
            </div>
            <Link to="/payment-console/payments" className="text-sm font-semibold text-[var(--brand-primary-deep)] hover:underline">
              Fix in routing →
            </Link>
          </div>
          {needsAttention.length === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 text-green-800">
              <FiCheckCircle />
              <span className="text-sm font-semibold">Every venue has at least one live channel routed.</span>
            </div>
          ) : (
            <ul className="space-y-2">
              {needsAttention.map((entry) => (
                <li key={entry.venue.locationId}>
                  <Link
                    to={`/payment-console/venues/${entry.venue.locationId}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--stroke-soft)] hover:border-[var(--brand-primary)] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FiMapPin className="text-[var(--brand-primary-deep)] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-strong)] truncate">
                          {entry.venue.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {entry.health.status === "broken"
                            ? `Routes don't resolve: ${entry.health.unresolvedChannels
                                .map((k) => channelByKey[k]?.label || k)
                                .join(", ")}`
                            : entry.health.hasStrandedCredentials
                            ? `${entry.health.unroutedCredentials.length} credential${
                                entry.health.unroutedCredentials.length === 1 ? "" : "s"
                              } added but not pointed at any route`
                            : "No live channels routed yet"}
                        </div>
                      </div>
                    </div>
                    {(() => {
                      const effStatus = effectiveStatus(entry.health);
                      return (
                        <Badge tone={HEALTH_TONE[effStatus]}>{HEALTH_LABEL[effStatus]}</Badge>
                      );
                    })()}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ── Partial / fine venues ──────────────────────────────────────── */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-display font-bold text-[var(--text-strong)]">Partially configured</h2>
              <p className="text-xs text-[var(--text-muted)]">Some live channels routed, others not yet.</p>
            </div>
            <span className="text-xs text-[var(--text-muted)]">{partial.length}</span>
          </div>
          {partial.length === 0 ? (
            <div className="text-sm text-[var(--text-muted)] py-6 text-center">
              No venues are mid-configuration.
            </div>
          ) : (
            <ul className="space-y-2">
              {partial.map((entry) => (
                <li key={entry.venue.locationId}>
                  <Link
                    to={`/payment-console/venues/${entry.venue.locationId}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--stroke-soft)] hover:border-[var(--brand-primary)] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FiMapPin className="text-[var(--brand-primary-deep)] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--text-strong)] truncate">
                          {entry.venue.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {entry.health.configuredCount} of {entry.health.totalLiveChannels} live channels routed
                        </div>
                      </div>
                    </div>
                    <div className="flex -space-x-1.5 shrink-0">
                      {entry.health.providers.map((p) => (
                        <span key={p} className="ring-2 ring-[var(--surface-panel)] rounded-lg">
                          <ProviderBadge provider={p} size={22} />
                        </span>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Channel coverage summary ───────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display font-bold text-[var(--text-strong)]">Channel coverage</h2>
          <Link to="/payment-console/payments" className="text-sm font-semibold text-[var(--brand-primary-deep)] hover:underline">
            Manage
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CHANNELS.map((ch) => {
            // How many venues have this channel routed, and what providers
            // are in use across the org for this channel?
            const routes = data.venues
              .map((v) => data.venueRoutesById[v.locationId]?.[ch.key])
              .filter(Boolean);
            const providersInUse = [...new Set(routes.map((r) => r.provider))];
            const live = ch.availability === "live";
            return (
              <div
                key={ch.key}
                className={`p-3 rounded-xl border ${
                  live ? "border-[var(--stroke-soft)]" : "border-dashed border-[var(--stroke-soft)] opacity-70"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-[var(--text-strong)]">{ch.label}</div>
                  {!live && <Badge tone="amber">{ch.phaseNote || ch.availability}</Badge>}
                </div>
                {live ? (
                  <>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      Routed at {routes.length} of {data.venues.length} venues
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      {providersInUse.length === 0 ? (
                        <span className="text-xs italic text-[var(--text-muted)]">— no providers yet —</span>
                      ) : (
                        <>
                          <div className="flex -space-x-1.5">
                            {providersInUse.map((p) => (
                              <span key={p} className="ring-2 ring-[var(--surface-panel)] rounded-lg">
                                <ProviderBadge provider={p} size={22} />
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">
                            {providersInUse.map((p) => providerByKey[p]?.name).join(" · ")}
                          </span>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    Locked until the matching adapter ships.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Footer link to the matrix ──────────────────────────────────── */}
      <Card className="p-4 flex items-center gap-3">
        <FiGlobe className="text-[var(--brand-primary-deep)]" />
        <div className="text-sm text-[var(--text-base)] flex-1">
          Want the whole venue × channel grid in one view?
        </div>
        <Link
          to="/payment-console/payments"
          className="text-sm font-semibold text-[var(--brand-primary-deep)] hover:underline"
        >
          Open routing matrix →
        </Link>
      </Card>
    </PageShell>
  );
}
