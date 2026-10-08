import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const parksSource = fs.readFileSync(
  path.resolve(here, "../../pages/saas/MoviraControl.jsx"),
  "utf8"
);

test("active parks expose archive instead of permanent delete", () => {
  assert.match(parksSource, /openArchiveDialog\(park\)/);
  assert.match(parksSource, /title="Archive location"/);
  assert.doesNotMatch(
    parksSource,
    /isArchived[\s\S]*?:\s*\([\s\S]*?openPermanentDeleteDialog\(park\)[\s\S]*?title="Delete permanently"/
  );
});

test("archive action uses the dedicated archive endpoint mutation", () => {
  assert.match(parksSource, /useDeleteSaasParkMutation\(\)/);
  assert.match(parksSource, /await archivePark\(park\.locationId\)\.unwrap\(\)/);
});
