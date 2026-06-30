// Provider × channel compatibility.
//
// SOURCE OF TRUTH: the backend, which derives this from the registered
// adapters' `capabilities` (services/payments/compatibility.js) and serves it
// at GET /payments/config/compatibility. The app fetches it once at load and
// calls setCompatibilityMatrix(), after which the helpers below answer from the
// live matrix. This is what stops the picker from advertising a route the
// runtime can't take (the old hand-maintained matrix drifted — it offered
// "Stripe POS" and "Razorpay" with no adapter behind them).
//
// The FALLBACK below is only used before the fetch resolves (or if it fails);
// it mirrors the current backend output so the UI degrades gracefully.

const FALLBACK = {
  online_booking: {
    stripe: { adapterKey: "stripe.online", status: "live" },
    nuvei: { adapterKey: "nuvei.online", status: "live" },
  },
  payment_link: {
    stripe: { adapterKey: "stripe.online", status: "live" },
    nuvei: { adapterKey: "nuvei.online", status: "live" },
  },
  kiosk: {
    stripe: { adapterKey: "stripe.online", status: "live" },
    nuvei: { adapterKey: "nuvei.online", status: "live" },
  },
  recurring: {
    stripe: { adapterKey: "stripe.online", status: "live" },
    nuvei: { adapterKey: "nuvei.online", status: "live" },
  },
  pos: {
    nuvei: { adapterKey: "nuvei.terminalCloud", status: "beta" },
    stripe: { adapterKey: "stripe.terminal", status: "beta" },
  },
};

let MATRIX = FALLBACK;

// Called by the app after fetching api.getCompatibility(). Ignores empty/bad
// payloads so a failed fetch leaves the fallback in place.
export function setCompatibilityMatrix(matrix) {
  if (matrix && typeof matrix === "object" && Object.keys(matrix).length) {
    MATRIX = matrix;
  }
}

export function getCompatibilityMatrix() {
  return MATRIX;
}

// Provider keys compatible with a channel, in matrix order.
export function providersForChannel(channelKey) {
  return Object.keys(MATRIX[channelKey] || {});
}

// The { adapterKey, status } entry for a (channel, provider), or null.
export function adapterFor(channelKey, providerKey) {
  return (MATRIX[channelKey] && MATRIX[channelKey][providerKey]) || null;
}

export const STATUS_TONE = {
  live: "green",
  beta: "blue",
  legacy: "amber",
  phase4: "amber",
  phase5: "neutral",
};

export const STATUS_LABEL = {
  live: "Live",
  beta: "Beta",
  legacy: "Legacy path",
  phase4: "Phase 4",
  phase5: "Phase 5",
};
