import test from "node:test";
import assert from "node:assert/strict";
import { paymentConfigPaths } from "./paymentConfigPaths.js";

test("payment configuration paths match the backend location contract", () => {
  assert.equal(
    paymentConfigPaths.routeList(4),
    "/payments/config/routes/location/4"
  );
  assert.equal(
    paymentConfigPaths.route(4, "online_booking"),
    "/payments/config/routes/location/4/online_booking"
  );
  assert.equal(
    paymentConfigPaths.posTree(4),
    "/payments/config/locations/4/pos-tree"
  );
  assert.equal(
    paymentConfigPaths.terminalReaders(4, 9),
    "/payments/config/locations/4/terminals/9/readers"
  );
});
