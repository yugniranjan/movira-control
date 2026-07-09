// Shared logic for evaluating a venue's payment configuration health.
// Mirrors the backend's resolver (services/payments/selectAdapter.js) so the
// UI's "needs attention" indicators agree with what selectAdapter would do
// at request time.

import { CHANNELS } from "../constants/channels";

// Resolve a route to the credential the backend would pick at request time.
// Precedence: per-venue row > org-wide row. Match on (provider, mode).
export function resolveCredentialFor({ provider, locationId, mode, credentials }) {
  if (!provider || !mode || !credentials) return null;
  const scoped = credentials.find(
    (c) => c.provider === provider && Number(c.locationId) === Number(locationId) && c.mode === mode
  );
  if (scoped) return scoped;
  return (
    credentials.find((c) => c.provider === provider && c.locationId == null && c.mode === mode) || null
  );
}

// Live channels = those the PaymentService actually dispatches today
// (online_booking / payment_link / kiosk). POS and recurring are phased
// and excluded from health metrics.
export const LIVE_CHANNELS = CHANNELS.filter((c) => c.availability === "live");

// Per-venue summary: how many live channels are routed, how many resolve to
// a real credential, and the set of providers actually wired in.
//
// Two extra signals beyond the basic status, both surfacing real problems
// the user can't see from `status` alone:
//
//   unroutedCredentials  → venue-scoped credentials that no route currently
//                          points at. These are the "stranded credentials"
//                          case: user added a venue Stripe key but never
//                          wired a Routing row to it, so at request time
//                          the backend will either fall back to the org
//                          credential or error out — definitely NOT use the
//                          venue key the user thinks they configured.
//
//   modeMismatchHints    → venue creds in a different mode than any route
//                          for the same provider. E.g. cred is sandbox,
//                          route says live → at request time the credential
//                          lookup returns null and the dispatch fails.
export function venueHealth({ venue, routes, credentials }) {
  const liveChannelKeys = LIVE_CHANNELS.map((c) => c.key);
  const configured = [];
  const unresolved = []; // route exists but no credential will resolve
  const usedProviderModes = new Set(); // "<provider>:<mode>" pairs any route references

  for (const channel of liveChannelKeys) {
    const route = routes?.[channel];
    if (!route) continue;
    configured.push(channel);
    if (route.provider && route.mode) {
      usedProviderModes.add(`${route.provider}:${route.mode}`);
    }
    const cred = resolveCredentialFor({
      provider: route.provider,
      locationId: venue.locationId,
      mode: route.mode,
      credentials,
    });
    if (!cred) unresolved.push(channel);
  }

  const providersInUse = new Set();
  for (const channel of configured) {
    const route = routes?.[channel];
    if (route?.provider) providersInUse.add(route.provider);
  }

  // Stranded credentials: venue-scoped credentials with no matching route.
  // Disabled rows are excluded — they're already inert by design.
  const venueScopedCredentials = (credentials || []).filter(
    (c) => Number(c.locationId) === Number(venue.locationId) && c.status !== "disabled"
  );
  const unroutedCredentials = venueScopedCredentials.filter(
    (c) => !usedProviderModes.has(`${c.provider}:${c.mode}`)
  );

  // Mode mismatch: a route references provider P in mode M, but the venue
  // has provider P in a DIFFERENT mode — so the venue cred won't be used,
  // and unless an org-scoped cred exists in mode M the route also fails.
  // (Pure cosmetic hint — `unresolved` already catches the hard failure.)
  const modeMismatchHints = [];
  for (const pm of usedProviderModes) {
    const [provider, mode] = pm.split(":");
    const venueAltMode = venueScopedCredentials.find(
      (c) => c.provider === provider && c.mode !== mode
    );
    if (venueAltMode) {
      modeMismatchHints.push({
        provider,
        routeMode: mode,
        credentialMode: venueAltMode.mode,
      });
    }
  }

  const total = liveChannelKeys.length;
  const baseStatus =
    unresolved.length > 0
      ? "broken"
      : configured.length === 0
      ? "empty"
      : configured.length < total
      ? "partial"
      : "complete";

  return {
    status: baseStatus, // 'complete' | 'partial' | 'empty' | 'broken'
    configuredCount: configured.length,
    totalLiveChannels: total,
    configuredChannels: configured,
    unresolvedChannels: unresolved,
    providers: [...providersInUse],
    // New signals:
    unroutedCredentials,         // [{credentialId, provider, mode, label, ...}]
    hasStrandedCredentials: unroutedCredentials.length > 0,
    modeMismatchHints,           // [{provider, routeMode, credentialMode}]
  };
}

// Org-level rollup across every venue.
export function orgHealth({ venues, venueRoutesById, credentials }) {
  const perVenue = venues.map((v) => ({
    venue: v,
    health: venueHealth({
      venue: v,
      routes: venueRoutesById[v.locationId] || {},
      credentials,
    }),
  }));
  const counts = { complete: 0, partial: 0, empty: 0, broken: 0 };
  for (const { health } of perVenue) counts[health.status]++;
  const totalUnresolvedRoutes = perVenue.reduce(
    (s, { health }) => s + health.unresolvedChannels.length,
    0
  );
  const totalLiveRoutes = perVenue.reduce((s, { health }) => s + health.configuredCount, 0);
  const totalStrandedCredentials = perVenue.reduce(
    (s, { health }) => s + health.unroutedCredentials.length,
    0
  );
  const venuesWithStrandedCreds = perVenue.filter(
    ({ health }) => health.hasStrandedCredentials
  );
  return {
    perVenue,
    counts,
    totalUnresolvedRoutes,
    totalLiveRoutes,
    totalStrandedCredentials,
    venuesWithStrandedCreds,
  };
}

// effectiveStatus + effectiveTone/Label account for the "stranded credential"
// case where the basic status is `empty` (no routes) but the venue isn't
// actually a blank slate — credentials exist that aren't being used. In that
// case we lift the tone from neutral to amber so the venue shows up as needing
// attention rather than blending in with truly-empty venues.
export function effectiveStatus(health) {
  if (!health) return "empty";
  if (health.status === "empty" && health.hasStrandedCredentials) {
    return "stranded";
  }
  return health.status;
}

export const HEALTH_TONE = {
  complete: "green",
  partial: "amber",
  empty: "neutral",
  broken: "red",
  stranded: "amber",
};

export const HEALTH_LABEL = {
  complete: "Fully configured",
  partial: "Partially configured",
  empty: "Not configured",
  broken: "Needs attention",
  stranded: "Credentials not routed",
};
