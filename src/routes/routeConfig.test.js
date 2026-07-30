import test from "node:test";
import assert from "node:assert/strict";
import { isValidParkSection, PARK_SECTIONS } from "./routeConfig.js";

test("all supported park detail sections are accepted", () => {
  assert.equal(isValidParkSection(""), true);
  for (const section of PARK_SECTIONS) assert.equal(isValidParkSection(section), true);
});

test("unknown park detail sections are rejected instead of rendering blank", () => {
  assert.equal(isValidParkSection("unknown"), false);
  assert.equal(isValidParkSection("edit"), false);
});
