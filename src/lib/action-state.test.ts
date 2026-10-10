import assert from "node:assert/strict";
import { test } from "node:test";
import { isExclusionViolation, isForeignKeyViolation, isUniqueViolation } from "./action-state";

test("recognizes Postgres errors, also when wrapped", () => {
  assert.equal(isUniqueViolation({ code: "23505" }), true);
  assert.equal(isUniqueViolation(new Error("x", { cause: { code: "23505" } })), true);
  assert.equal(isForeignKeyViolation({ code: "23503" }), true);
  assert.equal(isExclusionViolation({ cause: { code: "23P01" } }), true);
});

test("ignores other errors", () => {
  assert.equal(isUniqueViolation(new Error("boom")), false);
  assert.equal(isUniqueViolation(null), false);
  assert.equal(isForeignKeyViolation({ code: "23505" }), false);
});
