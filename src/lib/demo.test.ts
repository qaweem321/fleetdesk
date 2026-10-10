import assert from "node:assert/strict";
import { test } from "node:test";
import { isDemoMode } from "./demo";

test("demo mode is only on when DEMO_MODE is exactly true", () => {
  assert.equal(isDemoMode({}), false);
  assert.equal(isDemoMode({ DEMO_MODE: "false" }), false);
  assert.equal(isDemoMode({ DEMO_MODE: "yes" }), false);
  assert.equal(isDemoMode({ DEMO_MODE: "true" }), true);
});
