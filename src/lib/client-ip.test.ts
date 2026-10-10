import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIp } from "./client-ip";

test("uses the address added by the nearest proxy", () => {
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" })), "1.2.3.4");
  assert.equal(clientIp(new Headers({ "x-forwarded-for": " 1.2.3.4 " })), "1.2.3.4");
});

test("falls back to x-real-ip, then unknown", () => {
  assert.equal(clientIp(new Headers({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(clientIp(new Headers()), "unknown");
});
