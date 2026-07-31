import test from "node:test";
import assert from "node:assert/strict";

import { http } from "../paymentConsole/api/http.js";
import { realApi } from "../paymentConsole/api/realApi.js";

test("payment console sends X-Location-Id for every id-only park-scoped endpoint", async () => {
  const captured = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    captured.push({ url, options });
    return { ok: true, status: 200, text: async () => JSON.stringify({ success: true }) };
  };
  try {
    await realApi.updateCredential(31, { label: "Gateway" }, 14);
    await realApi.deleteCredential(31, 14);
    await realApi.getCredentialAuditLog(31, { locationId: 14 });
    await realApi.updateReader(91, { locationId: 14, makeDefault: true });
    await realApi.removeReaderRow(91, 14);
    await realApi.regenerateTerminalPairing(22, 14);

    assert.equal(captured.length, 6);
    for (const request of captured) {
      assert.equal(request.options.headers["X-Location-Id"], "14");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("global payment configuration requests do not invent a park location", async () => {
  let captured;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 200, text: async () => JSON.stringify({ success: true }) };
  };
  try {
    await http.get("/payments/config/credentials");
    assert.equal(captured.options.headers["X-Location-Id"], undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
