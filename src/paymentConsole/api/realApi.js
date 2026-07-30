// Real backend API for the aeroSportsAdmin server. Implements the exact same
// interface the pages consume from the mock layer, so swapping is transparent.
//
// Backend contracts (all responses are `{ success, data }` unless noted):
//   POST   /api/auth/login                               → { token, user, locations }
//   GET    /api/locations/all                            → { data: [Location] }
//   GET    /api/payments/config/providers/schemas
//   GET    /api/payments/config/credentials              (returns locationId per row)
//   POST   /api/payments/config/credentials              (accepts locationId)
//   PATCH  /api/payments/config/credentials/:id
//   DELETE /api/payments/config/credentials/:id
//   POST   /api/payments/config/test-connection
//   GET    /api/payments/config/routes/location/:id         → location_payment_settings rows
//   PUT    /api/payments/config/routes/location/:id/:ch     upsert one route
//   DELETE /api/payments/config/routes/location/:id/:ch
//   POST   /api/payments/config/routes/resolve           preview which credential a route resolves
//
// Note: there's no /routes/org endpoint — backend's location_payment_settings
// is per-location by design; an "org default" is a frontend fiction we used to
// expose and have intentionally dropped.
import { http } from "./http";
import { paymentConfigPaths } from "../../features/saas/paymentConfigPaths";

const ORG_NAME = "Movira";

function mapUser(payload) {
  const u = payload.user || {};
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;
  return {
    name,
    email: u.email,
    role: u.role,
    roleId: u.role_id,
    userId: u.user_id,
    organizationId: null,
    organizationName: ORG_NAME,
  };
}

// Location row (parks) → venue card shape. The Location model has no status
// column, so default to "active".
function mapVenue(v) {
  return {
    locationId: v.locationId,
    name: v.legalBusinessName,
    city: v.townOrCity || v.stateOrProvince || "",
    country: v.country || "",
    currency: v.currency || "",
    status: v.status || "active",
  };
}

async function getVenues() {
  const j = await http.get("/locations/all?limit=50");
  const rows = j.data || j.locations || [];
  return rows.map(mapVenue);
}

export const realApi = {
  async login({ email, password }) {
    const j = await http.post("/auth/login", { email, password });
    return { token: j.token, user: mapUser(j), locations: (j.locations || []).map(mapVenue) };
  },

  getVenues,

  async getVenue(id) {
    const list = await getVenues();
    const venue = list.find((v) => String(v.locationId) === String(id));
    if (!venue) throw new Error("Venue not found.");
    return venue;
  },

  async getProviderSchemas() {
    return (await http.get("/payments/config/providers/schemas")).data;
  },

  // Provider × channel routing compatibility, derived on the backend from the
  // registered adapters' capabilities (the single source of truth).
  async getCompatibility() {
    return (await http.get("/payments/config/compatibility")).data;
  },

  async getCredentials() {
    return (await http.get("/payments/config/credentials")).data;
  },

  async getPlatformBillingGateway({ channel = "payment_link", currency = "" } = {}) {
    const qs = new URLSearchParams();
    if (channel) qs.set("channel", channel);
    if (currency) qs.set("currency", currency);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return (await http.get(`/saas/platform-billing-gateway${suffix}`)).data || {};
  },

  async upsertPlatformBillingGateway(payload) {
    return (await http.put("/saas/platform-billing-gateway", payload)).data;
  },

  async createCredential(payload) {
    // payload: { provider, label, mode, values, locationId? }
    // locationId === null → org-wide; numeric → per-venue.
    return (await http.post("/payments/config/credentials", payload)).data;
  },

  async updateCredential(credentialId, payload) {
    // Scope (locationId) is not patchable — it's part of the row's identity.
    return (await http.patch(`/payments/config/credentials/${credentialId}`, payload)).data;
  },

  async deleteCredential(credentialId) {
    return http.del(`/payments/config/credentials/${credentialId}`);
  },

  async testConnection(payload) {
    return (await http.post("/payments/config/test-connection", payload)).data;
  },

  async getCredentialAuditLog(credentialId, { limit = 100 } = {}) {
    // Super-admin only on the backend — the controller will 403 for
    // venue-managers. The UI passes the 403 message through.
    const j = await http.get(
      `/payments/config/credentials/${credentialId}/audit-log?limit=${limit}`
    );
    return j.data || [];
  },

  // ── Routes (location_payment_settings) ───────────────────────────────

  async getVenueRoutes(locationId) {
    // Expected shape: { online_booking: { provider, mode, adapterKey, priority }, ... }
    return (await http.get(paymentConfigPaths.routeList(locationId))).data || {};
  },

  async upsertVenueRoute({ locationId, channel, provider, mode, adapterKey, priority = 100 }) {
    return (
      await http.put(paymentConfigPaths.route(locationId, channel), {
        provider,
        mode,
        adapterKey,
        priority,
      })
    ).data;
  },

  async deleteVenueRoute({ locationId, channel }) {
    return http.del(paymentConfigPaths.route(locationId, channel));
  },

  async resolveRouteCredential({ provider, locationId, mode }) {
    // POST so we don't have to URL-encode three fields. Backend may also
    // expose a GET variant — both shapes are tolerated here.
    const j = await http.post(`/payments/config/routes/resolve`, {
      provider,
      locationId,
      mode,
    });
    return j.data || null;
  },

  // ── POS tree: Venue → Terminal (PosDevice) → Reader (PaymentTerminal) ──
  // The card-machine hierarchy. Readers persist in payment_terminals with a
  // Terminal binding + default. Terminals (tills) are managed via /pos/devices.
  async getPosTree(locationId) {
    const j = await http.get(paymentConfigPaths.posTree(locationId));
    return j.data || { provider: null, enrollment: null, routed: false, terminals: [] };
  },

  // Register a Reader UNDER a Terminal. Stripe → registers with the provider
  // (registrationCode = real reader, else simulated). Nuvei → providerTerminalId
  // is the typed TID.
  async addReader({ locationId, posDeviceId, label, makeDefault = true, deviceKind, registrationCode, providerTerminalId, registerId, registerAuthKey }) {
    const j = await http.post(
      paymentConfigPaths.terminalReaders(locationId, posDeviceId),
      // deviceKind "simulator" → driven by the Terminal Simulator app (no real
      // creds needed). "real" → Nuvei sends registerId + registerAuthKey
      // (encrypted server-side); Stripe sends registrationCode. providerTerminalId = TID.
      { label, makeDefault, deviceKind, registrationCode, providerTerminalId, registerId, registerAuthKey }
    );
    return j.data;
  },

  async updateReader(terminalId, { displayName, makeDefault, providerTerminalId, registerId, registerAuthKey } = {}) {
    return (await http.patch(`/payments/config/readers/${terminalId}`, { displayName, makeDefault, providerTerminalId, registerId, registerAuthKey })).data;
  },

  async removeReaderRow(terminalId) {
    return http.del(`/payments/config/readers/${terminalId}`);
  },

  // ── Terminals (tills) — PosDevice CRUD via the POS controller ──
  async createTerminal({ locationId, name }) {
    const j = await http.post(`/pos/devices`, { locationId, name });
    return j.data || j;
  },

  async regenerateTerminalPairing(posDeviceId) {
    return (await http.post(`/pos/devices/${posDeviceId}/regenerate-pairing-code`, {})).data;
  },
};
