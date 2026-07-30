import test from "node:test";
import assert from "node:assert/strict";
import {
  expandModuleSelection,
  fallbackModuleWorkflows,
  getRemovalBlockers,
  getWorkflowState,
  modulesForCompleteWorkflow,
} from "./moduleAccessModel.js";

test("module access expands transitive dependencies", () => {
  assert.deepEqual(
    new Set(expandModuleSelection(["inventory"])),
    new Set(["inventory", "pos", "bookings"])
  );
});

test("module access blocks removal of a dependency used by selected modules", () => {
  assert.deepEqual(
    new Set(getRemovalBlockers("bookings", ["bookings", "pos", "inventory"])),
    new Set(["pos", "inventory"])
  );
});

test("workflow state separates minimum readiness from the complete flow", () => {
  const workflow = fallbackModuleWorkflows.find((item) => item.key === "online_booking");
  const ready = getWorkflowState(workflow, ["bookings", "booking_portal"]);
  assert.equal(ready.ready, true);
  assert.equal(ready.complete, false);
  assert.deepEqual(new Set(ready.missingRecommended), new Set(["waivers", "crm"]));

  const completeModules = modulesForCompleteWorkflow(workflow);
  const complete = getWorkflowState(workflow, completeModules);
  assert.equal(complete.complete, true);
});
