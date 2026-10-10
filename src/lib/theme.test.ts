import assert from "node:assert/strict";
import { test } from "node:test";
import { isTheme } from "./theme";

test("isTheme accepts only the three choices", () => {
  assert.equal(isTheme("system"), true);
  assert.equal(isTheme("light"), true);
  assert.equal(isTheme("dark"), true);
  assert.equal(isTheme("blue"), false);
  assert.equal(isTheme(null), false);
});
