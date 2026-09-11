export function resolveCredential({ provider, locationId, mode, credentials }) {
  if (!provider || !mode) return null;
  const matches = credentials.filter((item) => item.provider === provider && item.mode === mode);
  const selected = matches.find((item) => item.locationId != null && Number(item.locationId) === Number(locationId))
    || matches.find((item) => item.locationId == null);
  // A disabled park override blocks payment; runtime does not borrow org keys.
  return selected && (selected.status || "active") === "active" ? selected : null;
}

export function gatewayValues(provider, mode, values) {
  return provider === "nuvei"
    ? { ...values, environment: mode === "live" ? "production" : "sandbox" }
    : values;
}
