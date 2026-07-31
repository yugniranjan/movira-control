export function parkPaymentMode(park = {}) {
  return park.deploymentMode === "demo" || park.status === "demo" ? "sandbox" : "live";
}

export function parkPaymentModeLabel(park = {}) {
  return parkPaymentMode(park) === "sandbox" ? "Sandbox" : "Live";
}
