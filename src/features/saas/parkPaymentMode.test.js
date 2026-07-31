import test from "node:test";
import assert from "node:assert/strict";

import { parkPaymentMode } from "./parkPaymentMode.js";

test("demo/test parks are sandbox-only", () => {
  assert.equal(parkPaymentMode({ deploymentMode: "demo", status: "demo" }), "sandbox");
});

test("production and live parks are live-only", () => {
  assert.equal(parkPaymentMode({ deploymentMode: "production", status: "setup" }), "live");
  assert.equal(parkPaymentMode({ deploymentMode: "production", status: "live" }), "live");
});
