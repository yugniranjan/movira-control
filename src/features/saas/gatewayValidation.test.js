import test from "node:test";
import assert from "node:assert/strict";

import {
  requiredFieldsPresent,
  validateAll,
} from "../../paymentConsole/components/gatewayValidation.js";

const nuveiSchema = {
  fields: [
    { key: "merchantId", required: true },
    { key: "merchantSiteId", required: true },
    { key: "secretKey", required: true },
    { key: "environment", type: "select", required: true, default: "sandbox" },
    { key: "terminalMid", required: false },
    {
      key: "terminalCloudUrl",
      required: false,
      validate: { pattern: "^https://" },
    },
  ],
};

test("Nuvei SaaS billing CTA ignores blank optional card-present fields", () => {
  const values = {
    merchantId: "8482843228430516648",
    merchantSiteId: "2138117",
    secretKey: "secret",
    environment: "sandbox",
    terminalMid: "",
    terminalCloudUrl: "",
  };

  assert.equal(requiredFieldsPresent(nuveiSchema, values), true);
  assert.equal(validateAll(nuveiSchema, values, { mode: "sandbox" }).ok, true);
});

test("Nuvei SaaS billing CTA still requires core online credentials", () => {
  const values = {
    merchantId: "8482843228430516648",
    merchantSiteId: "",
    secretKey: "secret",
    environment: "sandbox",
  };

  assert.equal(requiredFieldsPresent(nuveiSchema, values), false);
});

test("an optional value blocks save only when supplied with an invalid format", () => {
  const values = {
    merchantId: "8482843228430516648",
    merchantSiteId: "2138117",
    secretKey: "secret",
    environment: "sandbox",
    terminalCloudUrl: "not-a-secure-url",
  };

  assert.equal(requiredFieldsPresent(nuveiSchema, values), true);
  assert.equal(validateAll(nuveiSchema, values, { mode: "sandbox" }).ok, false);
});
