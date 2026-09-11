import test from "node:test";
import assert from "node:assert/strict";
import { gatewayValues, resolveCredential } from "./paymentConfiguration.js";

const org = { provider: "stripe", mode: "sandbox", locationId: null, status: "active" };
const park = { ...org, locationId: 3 };
const resolve = (credentials) => resolveCredential({ provider: "stripe", mode: "sandbox", locationId: 3, credentials });

test("park override wins and a disabled override does not borrow organization credentials", () => {
  assert.equal(resolve([org, park]), park);
  assert.equal(resolve([org, { ...park, status: "disabled" }]), null);
  assert.equal(resolve([org]), org);
  assert.equal(resolve([{ ...org, mode: "live" }]), null);
  assert.equal(resolve([{ ...org, provider: "nuvei" }]), null);
});

test("Nuvei environment follows park mode for both connection testing and saving", () => {
  assert.deepEqual(gatewayValues("nuvei", "live", { merchantId: "123", environment: "sandbox" }), { merchantId: "123", environment: "production" });
  assert.equal(gatewayValues("nuvei", "sandbox", {}).environment, "sandbox");
  assert.deepEqual(gatewayValues("stripe", "live", { secretKey: "example" }), { secretKey: "example" });
});
