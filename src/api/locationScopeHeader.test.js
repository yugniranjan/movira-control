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
    await realApi.updateReader(91, { locationId: 14, posDeviceId: 22 });
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

test("reader inventory creates unassigned readers and preflights the exact draft", async () => {
  const captured = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    captured.push({ url, options });
    return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: { ok: true } }) };
  };
  try {
    const draft = { label: "Lobby", serialNumber: "SN-17", providerTerminalId: "TID-17", registerId: "REG-17" };
    await realApi.addReader({ locationId: 14, ...draft });
    await realApi.testReaderConnection({ locationId: 14, terminalId: 91, ...draft });
    await realApi.addReader({ locationId: 14, posDeviceId: 22, ...draft });
    assert.ok(captured[0].url.endsWith("/payments/config/locations/14/readers"));
    assert.deepEqual(JSON.parse(captured[0].options.body), draft);
    assert.ok(captured[1].url.endsWith("/payments/config/locations/14/readers/test"));
    assert.equal(captured[1].options.headers["X-Location-Id"], "14");
    assert.deepEqual(JSON.parse(captured[1].options.body), { terminalId: 91, ...draft });
    assert.equal(JSON.parse(captured[1].options.body).registerAuthKey, undefined);
    assert.ok(captured[2].url.endsWith("/payments/config/locations/14/terminals/22/readers"));
    assert.deepEqual(JSON.parse(captured[2].options.body), draft);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("saved reader check uses park scope and server-stored credentials", async () => {
  let captured;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 200, text: async () => JSON.stringify({ success: true,
      data: { ok: true, code: "session_accepted", connectivity: "unknown", checkedAt: "2026-10-09T00:00:00Z" } }) };
  };
  try {
    const result = await realApi.testReaderConnection({ locationId: 3, terminalId: 105 });
    assert.ok(captured.url.endsWith("/payments/config/locations/3/readers/test"));
    assert.equal(captured.options.headers["X-Location-Id"], "3");
    assert.deepEqual(JSON.parse(captured.options.body), { terminalId: 105 });
    assert.equal(result.connectivity, "unknown");
    assert.equal(result.checkedAt, "2026-10-09T00:00:00Z");
  } finally { globalThis.fetch = originalFetch; }
});

test("pending payment check uses the scoped recovery endpoint without starting or cancelling", async () => {
  let captured;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, transactionId: 1884, status: "pending" }) };
  };
  try {
    const result = await realApi.checkReaderPayment({ locationId: 3, transactionId: 1884 });
    assert.ok(captured.url.endsWith("/payments/terminal/1884/status"));
    assert.equal(captured.options.method, "GET");
    assert.equal(captured.options.headers["X-Location-Id"], "3");
    assert.equal(captured.options.body, undefined);
    assert.equal(result.status, "pending");
  } finally { globalThis.fetch = originalFetch; }
});
