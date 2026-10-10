import assert from "node:assert/strict";
import { test } from "node:test";
import { isUuid } from "./uuid";

test("isUuid accepts UUIDs only", () => {
  assert.equal(isUuid("3f2b8c1e-9a4d-4e2f-8b1a-0c5d6e7f8a9b"), true);
  assert.equal(isUuid("3F2B8C1E-9A4D-4E2F-8B1A-0C5D6E7F8A9B"), true);
  for (const value of ["", "123", "3f2b8c1e-9a4d-4e2f-8b1a-0c5d6e7f8a9", null, 42]) {
    assert.equal(isUuid(value), false, String(value));
  }
});
