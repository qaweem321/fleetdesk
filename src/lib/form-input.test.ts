import assert from "node:assert/strict";
import { test } from "node:test";
import { formReader, isChecked, optionalText, parseWholeNumber } from "./form-input";

test("reads fields as trimmed text", () => {
  const formData = new FormData();
  formData.set("name", "  Airport desk ");
  const read = formReader(formData);
  assert.equal(read("name"), "Airport desk");
  assert.equal(read("missing"), "");
});

test("stores empty optional text as null", () => {
  assert.equal(optionalText(""), null);
  assert.equal(optionalText("x"), "x");
});

test("accepts only whole numbers in range", () => {
  assert.equal(parseWholeNumber("5", 1, 9), 5);
  assert.equal(parseWholeNumber("0", 0, 9), 0);
  for (const bad of ["", "10", "-1", "1.5", "abc", " 5", "1e3"]) {
    assert.equal(parseWholeNumber(bad, 0, 9), null, bad);
  }
});

test("reads checkboxes", () => {
  const formData = new FormData();
  formData.set("active", "on");
  assert.equal(isChecked(formData, "active"), true);
  assert.equal(isChecked(formData, "hidden"), false);
});
