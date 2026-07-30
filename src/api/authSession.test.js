import test from "node:test";
import assert from "node:assert/strict";

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial));
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
}

globalThis.localStorage = new MemoryStorage({
  authState: JSON.stringify({ version: 10, token: "old-token" }),
});
const events = [];
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};
globalThis.window = {
  location: { origin: "http://localhost:5172", hostname: "localhost", pathname: "/" },
  dispatchEvent: (event) => events.push(event),
};

const { readStoredToken, refreshAccessToken } = await import("./authSession.js");

test("refresh is single-flight and persists the replacement token", async () => {
  let calls = 0;
  let capturedRequest = null;
  globalThis.fetch = async (url, options) => {
    calls += 1;
    capturedRequest = { url, options };
    await Promise.resolve();
    return { ok: true, json: async () => ({ token: "new-token" }) };
  };

  const [first, second] = await Promise.all([
    refreshAccessToken(),
    refreshAccessToken(),
  ]);

  assert.equal(first, "new-token");
  assert.equal(second, "new-token");
  assert.equal(calls, 1);
  assert.equal(capturedRequest?.options?.credentials, "include");
  assert.equal(
    capturedRequest?.options?.headers?.Authorization,
    "Bearer old-token"
  );
  assert.equal(readStoredToken(), "new-token");
  assert.equal(events.at(-1)?.type, "movira:token-refreshed");
});

test("failed refresh returns null and keeps the current token", async () => {
  globalThis.fetch = async () => ({ ok: false });
  assert.equal(await refreshAccessToken(), null);
  assert.equal(readStoredToken(), "new-token");
});
