import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHref, firstParam, parsePage } from "./url-params";

test("firstParam takes the first of repeated values", () => {
  assert.equal(firstParam(["a", "b"]), "a");
  assert.equal(firstParam("a"), "a");
  assert.equal(firstParam(undefined), undefined);
});

test("parsePage accepts whole numbers above 1 only", () => {
  assert.equal(parsePage("3"), 3);
  for (const value of [undefined, "", "0", "-1", "abc", "1"]) {
    assert.equal(parsePage(value), 1, String(value));
  }
});

test("buildHref leaves out empty and default values", () => {
  assert.equal(buildHref("/x", { a: "1", b: "", c: null, page: 1 }, { page: 1 }), "/x?a=1");
  assert.equal(buildHref("/x", { q: "a b" }), "/x?q=a+b");
  assert.equal(buildHref("/x", {}), "/x");
});
