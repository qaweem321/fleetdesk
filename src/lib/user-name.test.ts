import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanUserName } from "./user-name";

test("trims names and turns line breaks into spaces", () => {
  assert.deepEqual(cleanUserName("  Sam   Lee "), { name: "Sam Lee" });
  assert.deepEqual(cleanUserName("Sam\r\nBcc: x@example.com"), { name: "Sam Bcc: x@example.com" });
  assert.deepEqual(cleanUserName("Sam​Lee"), { name: "Sam Lee" });
});

test("refuses empty and too long names", () => {
  assert.ok("error" in cleanUserName("   "));
  assert.ok("error" in cleanUserName(undefined));
  assert.ok("error" in cleanUserName("a".repeat(61)));
  assert.deepEqual(cleanUserName("a".repeat(60)), { name: "a".repeat(60) });
});
