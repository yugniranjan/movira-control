const DEFAULT_API_BASE_URL = "/api/control";
const KNOWN_FRONTEND_PORTS = new Set(["4172", "5172", "5173", "5174"]);
const KNOWN_BACKEND_PORTS = new Set(["5171"]);

function tryParseUrl(value) {
  if (!value || typeof window === "undefined") {
    return null;
  }

  try {
    return new URL(value, window.location.origin);
  } catch {
    return null;
  }
}

export function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env?.VITE_API_BASE_URL?.trim();
  const proxyTarget = import.meta.env?.VITE_API_PROXY_TARGET?.trim();

  if (typeof window === "undefined") {
    return configuredBaseUrl || DEFAULT_API_BASE_URL;
  }

  if (!configuredBaseUrl) {
    return DEFAULT_API_BASE_URL;
  }

  const parsedBaseUrl = tryParseUrl(configuredBaseUrl);
  if (!parsedBaseUrl) {
    return configuredBaseUrl;
  }

  const isSameHost = parsedBaseUrl.hostname === window.location.hostname;
  const isKnownFrontendPort = KNOWN_FRONTEND_PORTS.has(parsedBaseUrl.port);
  const isKnownBackendPort = KNOWN_BACKEND_PORTS.has(parsedBaseUrl.port);

  if (isSameHost && isKnownFrontendPort && !isKnownBackendPort) {
    const parsedProxyTarget = tryParseUrl(proxyTarget);
    if (parsedProxyTarget && parsedProxyTarget.hostname === window.location.hostname) {
      return `${parsedProxyTarget.origin}${DEFAULT_API_BASE_URL}`;
    }

    return DEFAULT_API_BASE_URL;
  }

  return configuredBaseUrl;
}

export default resolveApiBaseUrl;
