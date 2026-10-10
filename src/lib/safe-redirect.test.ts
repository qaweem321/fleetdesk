import assert from "node:assert/strict";
import { test } from "node:test";
import { safeNextPath } from "./safe-redirect";

test("allows paths on this site", () => {
  assert.equal(safeNextPath("/invite/abc"), "/invite/abc");
  assert.equal(safeNextPath("/dashboard/acme?tab=1"), "/dashboard/acme?tab=1");
});

test("blocks other sites (open redirects)", () => {
  assert.equal(safeNextPath("https://evil.example"), "/dashboard");
  assert.equal(safeNextPath("//evil.example"), "/dashboard");
  assert.equal(safeNextPath("/\\evil.example"), "/dashboard");
  assert.equal(safeNextPath("javascript:alert(1)"), "/dashboard");
});

test("blocks hidden characters that browsers remove", () => {
  // Browsers drop tabs and newlines, which would turn these into "//evil.example".
  assert.equal(safeNextPath("/\t/evil.example"), "/dashboard");
  assert.equal(safeNextPath("/\n/evil.example"), "/dashboard");
  assert.equal(safeNextPath("/\r\n/evil.example"), "/dashboard");
});

test("falls back when missing", () => {
  assert.equal(safeNextPath(null), "/dashboard");
  assert.equal(safeNextPath(""), "/dashboard");
  assert.equal(safeNextPath(undefined, "/login"), "/login");
});
