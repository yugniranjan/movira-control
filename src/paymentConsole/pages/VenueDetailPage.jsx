// Venue-centric payment configuration. Surfaces both halves of the backend
// model for one venue:
//   - Gateways            (payment_provider_credentials for this venue + inherited org-wide)
//   - Routes per channel  (location_payment_settings rows for this venue)
//   - Card terminals      (Venue → Terminal → Reader tree, via <PosCardTree/>)

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiMapPin,
  FiInfo,
  FiPlus,
  FiEdit2,
  FiGlobe,
  FiAlertTriangle,
  FiLock,
  FiCornerDownRight,
} from "react-icons/fi";
import { api } from "../api";
import { Card, Badge, Button, ProviderBadge, PageShell } from "../components/ui";
import { PageShimmer } from "../../components/Shimmer";
import { providerByKey } from "../constants/providers";
import { setCompatibilityMatrix } from "../constants/compatibility";
import { CHANNELS, AVAILABILITY_TONE, isChannelEditable } from "../constants/channels";
import AddGatewayModal from "../components/AddGatewayModal";
import EditGatewayModal from "../components/EditGatewayModal";
import RouteEditPopover from "../components/RouteEditPopover";
import PosCardTree from "../components/PosCardTree";
import { resolveCredentialFor, venueHealth } from "../lib/paymentHealth";

const STATUS_TONE = { active: "green", onboarding: "amber", paused: "neutral" };

function VenueGatewayRow({ credential, onEdit, isRouted, onAddRoute }) {
  const provider = providerByKey[credential.provider];
  const masked = credential.masked || {};
  const previewKeys = (() => {
    if (credential.provider === "nuvei") return ["merchantId", "merchantSiteId"];
    if (credential.provider === "stripe") return ["publishableKey"];
    if (credential.provider === "razorpay") return ["keyId"];
    return Object.keys(masked).slice(0, 1);
  })();
  // "Stranded" = no route currently uses this credential's (provider, mode).
  // The backend will silently fall back to an org credential (or fail with
  // NoProviderConfigured), so the venue cred sits there doing nothing.
  // Only call out when the credential is active — disabled rows already
  // signal "inactive" on their own.
  const stranded = isRouted === false && credential.status !== "disabled";
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3 min-w-0">
        <ProviderBadge provider={credential.provider} size={36} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--text-strong)]">{credential.label}</span>
            <Badge tone={credential.mode === "live" ? "green" : "amber"}>{credential.mode}</Badge>
            {credential.status === "disabled" && <Badge tone="neutral">disabled</Badge>}
            {stranded && (
              <Badge tone="amber">
                <FiAlertTriangle size={10} /> Not routed
              </Badge>
            )}
          </div>
          <div className="text-xs text-[var(--text-muted)] flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            <span>{provider?.name}</span>
            {previewKeys.map((k) =>
              masked[k] ? (
                <span key={k} className="font-mono">
                  {k}: {masked[k]}
                </span>
              ) : null
            )}
          </div>
          {stranded && (
            <div className="text-xs text-amber-700 mt-1.5">
              No routing row points at {provider?.name || credential.provider} ·{" "}
              {credential.mode}. Add a route below or the backend will keep using the
              org-wide credential (or fail) instead of this one.
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {stranded && onAddRoute && (
          <Button variant="primary" size="sm" onClick={() => onAddRoute(credential)}>
            <FiPlus size={14} /> Add route
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onEdit(credential)}>
          <FiEdit2 size={14} /> Edit
        </Button>
      </div>
    </div>
  );
}

function RouteListItem({ channel, route, venue, credentials, onEdit }) {
  const editable = isChannelEditable(channel.key);
  const cred = route
    ? resolveCredentialFor({
        provider: route.provider,
        locationId: venue.locationId,
        mode: route.mode,
        credentials,
      })
    : null;
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-[var(--surface-muted)] flex items-center justify-center shrink-0">
          {route ? (
            <ProviderBadge provider={route.provider} size={36} />
          ) : editable ? (
            <FiPlus className="text-[var(--text-muted)]" />
          ) : (
            <FiLock className="text-[var(--text-muted)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--text-strong)]">{channel.label}</span>
            {channel.availability !== "live" && (
              <Badge tone={AVAILABILITY_TONE[channel.availability]}>
                {channel.phaseNote || channel.availability}
              </Badge>
            )}
          </div>
          {route ? (
            cred ? (
              <div className="text-xs text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                <span className="font-semibold text-[var(--text-base)]">{cred.label}</span>
                <span>·</span>
                <span>{route.mode}</span>
                {Number(cred.locationId) === Number(venue.locationId) ? (
                  <Badge tone="brand">venue override</Badge>
                ) : (
                  <span className="inline-flex items-center gap-0.5">
                    <FiCornerDownRight size={10} /> inherited org credential
                  </span>
                )}
                <span className="font-mono text-[10px] opacity-60">· {route.adapterKey}</span>
              </div>
            ) : (
              <div className="text-xs text-amber-700 mt-0.5 flex items-center gap-1">
                <FiAlertTriangle size={11} /> route saved but no credential resolves for{" "}
                {route.provider}/{route.mode}
              </div>
            )
          ) : (
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {editable ? "Not configured" : channel.phaseNote || "Not yet available"}
            </div>
          )}
        </div>
      </div>
      <Button variant={route ? "outline" : "primary"} size="sm" disabled={!editable} onClick={onEdit}>
        {route ? (
          <>
            <FiEdit2 size={14} /> Edit
          </>
        ) : (
          <>
            <FiPlus size={14} /> Configure
          </>
        )}
      </Button>
    </div>
  );
}

export default function VenueDetailPage() {
  const { locationId: locationIdParam } = useParams();
  const locationId = Number(locationIdParam);
  const [venue, setVenue] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [schemas, setSchemas] = useState(null);
  const [routes, setRoutes] = useState({}); // { channel: route }
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [routeEditing, setRouteEditing] = useState(null); // channel key
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Card terminals (Venue → Terminal → Reader) are managed by <PosCardTree/>.

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled([
        api.getVenue(locationId),
        api.getCredentials(),
        api.getProviderSchemas(),
        api.getVenueRoutes(locationId),
        api.getCompatibility(),
      ]);
      if (cancelled) return;
      const [venueRes, credsRes, schRes, routesRes, compatRes] = results;
      // Compatibility is non-critical (the routing picker falls back), so it's
      // excluded from the load-failure banner.
      const names = ["venue", "credentials", "provider schemas", "routes"];
      const failures = results
        .slice(0, 4)
        .map((r, i) => (r.status === "rejected" ? `${names[i]}: ${r.reason?.message || "failed"}` : null))
        .filter(Boolean);
      setLoadError(failures.length ? failures.join(" · ") : null);
      if (venueRes.status === "fulfilled") setVenue(venueRes.value);
      setCredentials(credsRes.status === "fulfilled" ? credsRes.value : []);
      setSchemas(schRes.status === "fulfilled" ? schRes.value : {});
      setRoutes(routesRes.status === "fulfilled" ? routesRes.value : {});
      if (compatRes.status === "fulfilled") setCompatibilityMatrix(compatRes.value);
      // Card terminals now load inside <PosCardTree/> via the pos-tree endpoint.
    })();
    return () => {
      cancelled = true;
    };
  }, [locationId, reloadKey]);

  const venueGateways = useMemo(
    () => credentials.filter((c) => Number(c.locationId) === locationId),
    [credentials, locationId]
  );
  const inheritedGateways = useMemo(
    () => credentials.filter((c) => c.locationId == null),
    [credentials]
  );

  // Health summary scoped to this venue. We use this only for stranded
  // credentials and inherited-in-use detection here; the page-level status
  // badge isn't shown (this is the detail page where each channel surfaces
  // its own state).
  const health = useMemo(() => {
    if (!venue) return null;
    return venueHealth({ venue, routes, credentials });
  }, [venue, routes, credentials]);

  // Build a Set("provider:mode") of every (provider, mode) currently used by
  // at least one route on this venue. The Gateway rows use this to decide
  // whether a credential is "live" (used by a route) or "stranded".
  const routedProviderModes = useMemo(() => {
    const set = new Set();
    for (const r of Object.values(routes || {})) {
      if (r?.provider && r?.mode) set.add(`${r.provider}:${r.mode}`);
    }
    return set;
  }, [routes]);

  // Inherited (org) credentials that ARE used by at least one route on this
  // venue. Shown with a green check badge so the user can tell which org
  // gateways are actually live for this venue vs which are just available.
  const inheritedInUse = useMemo(() => {
    const set = new Set();
    for (const c of inheritedGateways) {
      if (routedProviderModes.has(`${c.provider}:${c.mode}`)) {
        set.add(c.credentialId);
      }
    }
    return set;
  }, [inheritedGateways, routedProviderModes]);

  // Scroll the "Channel routing" card into view. Bound to the "Add route"
  // button on stranded credentials so the user is one click from where they
  // need to be.
  function scrollToRouting() {
    document.getElementById("channel-routing-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function handleUpsertRoute(input) {
    const route = await api.upsertVenueRoute({ locationId, ...input });
    setRoutes((prev) => ({ ...prev, [input.channel]: route }));
  }
  async function handleClearRoute(channel) {
    await api.deleteVenueRoute({ locationId, channel });
    setRoutes((prev) => {
      const next = { ...prev };
      delete next[channel];
      return next;
    });
  }

  if (!venue) {
    if (loadError) {
      return (
        <div className="max-w-xl mx-auto py-12 space-y-4">
          <Link
            to="/movira-control/payments/venues"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-base)] hover:text-[var(--text-strong)]"
          >
            <FiArrowLeft /> All venues
          </Link>
          <Card className="p-5 border-amber-300 bg-amber-50/60">
            <div className="flex items-start gap-3">
              <FiAlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-amber-900">Couldn't load this venue</div>
                <div className="text-xs text-amber-800 mt-1 break-words">{loadError}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
                Retry
              </Button>
            </div>
          </Card>
        </div>
      );
    }
    return <PageShimmer />;
  }

  return (
    <PageShell
      title={venue.name}
      description={`${venue.city} · ${venue.country}`}
      actions={
        <Link
          to="/movira-control/payments/venues"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-black text-stone-800 shadow-sm hover:border-orange-300 hover:bg-orange-50"
        >
          <FiArrowLeft /> All venues
        </Link>
      }
    >
      {loadError && (
        <Card className="p-4 border-amber-300 bg-amber-50/60">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-amber-900 text-sm">Some data didn't load</div>
              <div className="text-xs text-amber-800 mt-0.5 break-words">{loadError}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[var(--brand-primary-deep)]">
            <FiMapPin size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="break-words font-display text-xl font-black text-[var(--text-strong)]">{venue.name}</h2>
            <p className="text-sm font-semibold text-[var(--text-base)]">
              {venue.city} · {venue.country}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge tone={STATUS_TONE[venue.status] || "neutral"}>{venue.status}</Badge>
              <Badge tone="neutral">{venue.currency}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Gateways: this venue's credentials + inherited org-wide ──────── */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="font-display font-bold text-[var(--text-strong)]">Gateways</h2>
            <p className="text-sm text-[var(--text-base)] mt-0.5">
              Merchant credentials available to this venue. Venue-specific overrides take precedence over
              org-wide rows with the same provider+mode.
            </p>
          </div>
          <Button onClick={() => setAdding(true)}>
            <FiPlus /> Add venue gateway
          </Button>
        </div>

        {venueGateways.length === 0 ? (
          <div className="rounded-xl bg-[var(--surface-muted)] p-4 flex items-start gap-2.5">
            <FiGlobe className="mt-0.5 text-[var(--brand-primary-deep)] shrink-0" />
            <div className="text-sm text-[var(--text-base)]">
              This venue uses <strong>organization-wide gateways only</strong>. Add a venue gateway above
              if this venue needs its own merchant account.
            </div>
          </div>
        ) : (
          <>
            {health?.hasStrandedCredentials && (
              <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50/60 p-3 flex items-start gap-2.5">
                <FiAlertTriangle className="mt-0.5 text-amber-600 shrink-0" size={16} />
                <div className="text-sm text-amber-900 flex-1">
                  <strong>
                    {health.unroutedCredentials.length} venue credential
                    {health.unroutedCredentials.length === 1 ? " is" : "s are"} not used by any
                    route.
                  </strong>{" "}
                  Until a routing row points at the same provider + mode, the backend will fall
                  back to the org credential (or fail).
                  <button
                    type="button"
                    onClick={scrollToRouting}
                    className="ml-2 font-semibold underline hover:no-underline"
                  >
                    Configure routes →
                  </button>
                </div>
              </div>
            )}
            <div className="divide-y divide-[var(--stroke-soft)]">
              {venueGateways.map((c) => (
                <VenueGatewayRow
                  key={c.credentialId}
                  credential={c}
                  onEdit={setEditing}
                  isRouted={routedProviderModes.has(`${c.provider}:${c.mode}`)}
                  onAddRoute={scrollToRouting}
                />
              ))}
            </div>
          </>
        )}

        {inheritedGateways.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[var(--stroke-soft)]">
            <div className="flex items-center gap-2 mb-3">
              <FiGlobe className="text-[var(--text-muted)]" size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Inherited from organization
              </span>
              <span className="text-xs text-[var(--text-muted)]">· {inheritedGateways.length} available</span>
              <Link
                to="/movira-control/payments/gateways"
                className="ml-auto text-xs font-semibold text-[var(--brand-primary-deep)] hover:underline"
              >
                Manage on Payments page →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {inheritedGateways.map((c) => {
                const p = providerByKey[c.provider];
                const inUse = inheritedInUse.has(c.credentialId);
                return (
                  <div
                    key={c.credentialId}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--surface-muted)]/60 border border-[var(--stroke-soft)]"
                  >
                    <ProviderBadge provider={c.provider} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[var(--text-strong)] truncate flex items-center gap-1.5">
                        <span className="truncate">{c.label}</span>
                        {inUse && (
                          <Badge tone="green" className="!px-1.5 !py-0 !text-[9px]">
                            in use
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {p?.name} · {c.mode}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* ── Channel routing: one row per channel for this venue ─────────── */}
      <Card id="channel-routing-section" className="p-5 scroll-mt-6">
        <div className="mb-4">
          <h2 className="font-display font-bold text-[var(--text-strong)]">Channel routing</h2>
          <p className="text-sm text-[var(--text-base)] mt-0.5">
            Each channel resolves to one
            <code className="font-mono mx-1">location_payment_settings</code>
            row for this venue. The route picks a provider+mode; the backend resolves the credential at
            request time.
          </p>
        </div>

        <div className="flex items-start gap-2 text-sm text-[var(--text-base)] bg-[var(--surface-muted)] rounded-xl p-3 mb-4">
          <FiInfo className="mt-0.5 shrink-0 text-[var(--brand-primary-deep)]" />
          <span>
            POS / card terminal now routes through Stripe Terminal — register a reader in the Terminals
            section below, then route the POS channel here. Recurring memberships route through Stripe or Nuvei online.
          </span>
        </div>

        <div className="divide-y divide-[var(--stroke-soft)]">
          {CHANNELS.map((c) => (
            <RouteListItem
              key={c.key}
              channel={c}
              route={routes[c.key]}
              venue={venue}
              credentials={credentials}
              onEdit={() => setRouteEditing(c.key)}
            />
          ))}
        </div>
      </Card>

      {/* ── Card terminals — provider-aware (Stripe readers vs Nuvei TID) ── */}
      <PosCardTree locationId={locationId} />

      <AddGatewayModal
        open={adding}
        onClose={() => setAdding(false)}
        schemas={schemas}
        venues={[venue]}
        defaultLocationId={locationId}
        onCreated={(created) => setCredentials((list) => [...list, created])}
      />

      <EditGatewayModal
        open={!!editing}
        credential={editing}
        schema={editing ? schemas?.[editing.provider] : null}
        venues={[venue]}
        onClose={() => setEditing(null)}
        onUpdated={(updated) =>
          setCredentials((list) => list.map((c) => (c.credentialId === updated.credentialId ? updated : c)))
        }
        onDeleted={(credId) => setCredentials((list) => list.filter((c) => c.credentialId !== credId))}
      />

      {routeEditing && (
        <RouteEditPopover
          open
          channel={routeEditing}
          locationId={locationId}
          currentRoute={routes[routeEditing] || null}
          credentials={credentials}
          venueLabel={venue.name}
          onSave={(input) =>
            handleUpsertRoute({
              channel: routeEditing,
              ...input,
            })
          }
          onClear={() => handleClearRoute(routeEditing)}
          onClose={() => setRouteEditing(null)}
        />
      )}
    </PageShell>
  );
}
