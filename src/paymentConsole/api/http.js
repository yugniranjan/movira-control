// Thin fetch wrapper. Reads the JWT from the same localStorage key AuthContext
// writes, attaches it as a Bearer token, and unwraps/normalizes errors.
// All paths are relative to /api (proxied to the backend by vite.config.js).
const STORAGE_KEY = "movira.superadmin.auth";
const ADMIN_STORAGE_KEY = "authState";

function getToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw).token;
    const adminRaw = localStorage.getItem(ADMIN_STORAGE_KEY);
    return adminRaw ? JSON.parse(adminRaw).token : null;
  } catch {
    return null;
  }
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    // Carry the structured error body so callers can attach field-level
    // messages inline (the gateway modals read err.detail.invalid to map a
    // backend 400 back to the offending input). Without this, all validation
    // errors collapse into a single generic banner.
    if (data && typeof data === "object") err.detail = data.detail ?? data;
    throw err;
  }
  return data;
}

export const http = {
  get: (p) => request("GET", p),
  post: (p, b) => request("POST", p, b),
  put: (p, b) => request("PUT", p, b),
  patch: (p, b) => request("PATCH", p, b),
  del: (p) => request("DELETE", p),
};
