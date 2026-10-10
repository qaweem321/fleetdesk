import assert from "node:assert/strict";
import { test } from "node:test";
import { isDemoLogin, isDemoMode } from "./demo";

test("demo mode is only on when DEMO_MODE is exactly true", () => {
  assert.equal(isDemoMode({}), false);
  assert.equal(isDemoMode({ DEMO_MODE: "false" }), false);
  assert.equal(isDemoMode({ DEMO_MODE: "yes" }), false);
  assert.equal(isDemoMode({ DEMO_MODE: "true" }), true);
});

test("the sample logins are protected only in demo mode", () => {
  assert.equal(isDemoLogin("Owner@Demo.test", { DEMO_MODE: "true" }), true);
  assert.equal(isDemoLogin("owner@demo.test", {}), false);
  assert.equal(isDemoLogin("someone@example.com", { DEMO_MODE: "true" }), false);
});
