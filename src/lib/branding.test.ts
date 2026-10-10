import assert from "node:assert/strict";
import { test } from "node:test";
import { brandStyle, normalizeHexColor, readableTextColor } from "./branding";

test("colors are normalized to #rrggbb", () => {
  assert.deepEqual(normalizeHexColor(" #2563EB "), { color: "#2563eb" });
  assert.deepEqual(normalizeHexColor("25e"), { color: "#2255ee" });
  assert.deepEqual(normalizeHexColor(""), { color: null });
  for (const bad of ["red", "#12345", "#gggggg", "rgb(1,2,3)"]) {
    assert.ok("error" in normalizeHexColor(bad), bad);
  }
});

test("text on a brand color stays readable", () => {
  assert.equal(readableTextColor("#2563eb"), "#ffffff");
  assert.equal(readableTextColor("#000000"), "#ffffff");
  assert.equal(readableTextColor("#facc15"), "#111827");
  assert.equal(readableTextColor("#ffffff"), "#111827");
});

test("the brand color replaces the default button color", () => {
  assert.equal(brandStyle(null), undefined);
  assert.deepEqual(brandStyle("#facc15"), {
    "--primary": "#facc15",
    "--primary-foreground": "#111827",
  });
});
