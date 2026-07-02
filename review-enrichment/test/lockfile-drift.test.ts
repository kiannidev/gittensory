import { test } from "node:test";
import assert from "node:assert/strict";

import { extractLockfileChanges } from "../dist/analyzers/lockfile-drift.js";

test("extractLockfileChanges matches lockfile basenames case-insensitively", () => {
  const changes = extractLockfileChanges([
    {
      path: "frontend/Yarn.lock",
      patch: [
        "@@ -1,0 +1,2 @@",
        "+lodash@^4.17.21:",
        '+  version "4.17.21"',
      ].join("\n"),
    },
  ]);

  assert.deepEqual(changes, [
    {
      file: "frontend/Yarn.lock",
      line: 2,
      ecosystem: "npm",
      package: "lodash",
      from: null,
      to: "4.17.21",
    },
  ]);
});
