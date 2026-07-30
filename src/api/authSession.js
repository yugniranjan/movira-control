import Cookies from "js-cookie";
import { resolveApiBaseUrl } from "./resolveApiBaseUrl.js";

const AUTH_STORAGE_KEY = "authState";
let refreshPromise = null;

export function readStoredToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw)?.token || null : null;
  } catch {
    return null;
  }
}

export function persistRefreshedToken(token) {
  if (!token) return;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    const auth = raw ? JSON.parse(raw) : {};
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ ...auth, token }));
  } catch {
    // Redux still receives the event even when browser storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent("movira:token-refreshed", { detail: { token } }));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem("movira.superadmin.auth");
  Cookies.remove("locationId");
  Cookies.remove("state");
  localStorage.setItem("logout", Date.now());
  window.dispatchEvent(new CustomEvent("movira:auth-cleared"));
}

export function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${resolveApiBaseUrl()}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data?.token) return null;
      persistRefreshedToken(data.token);
      return data.token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
