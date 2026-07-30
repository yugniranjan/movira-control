const ROOT = "/payments/config";

export const paymentConfigPaths = Object.freeze({
  routeList: (locationId) => `${ROOT}/routes/location/${locationId}`,
  route: (locationId, channel) =>
    `${ROOT}/routes/location/${locationId}/${channel}`,
  posTree: (locationId) => `${ROOT}/locations/${locationId}/pos-tree`,
  terminalReaders: (locationId, posDeviceId) =>
    `${ROOT}/locations/${locationId}/terminals/${posDeviceId}/readers`,
});
