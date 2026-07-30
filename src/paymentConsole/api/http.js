import { resolveApiBaseUrl } from "../../api/resolveApiBaseUrl";
import {
  clearAuthSession,
  readStoredToken,
  redirectToLogin,
  refreshAccessToken,
} from "../../api/authSession";

async function request(method, path, body, { retried = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = readStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${resolveApiBaseUrl()}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (res.status === 401 && !retried && !path.startsWith("/auth/")) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) return request(method, path, body, { retried: true });
    clearAuthSession();
    redirectToLogin();
  }

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.code = res.status === 403 ? "access_denied" : data?.code || data?.error;
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
