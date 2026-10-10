import assert from "node:assert/strict";
import { test } from "node:test";
import { detectImageType } from "./limits";

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

test("recognizes JPEG, PNG and WebP by their first bytes", () => {
  assert.equal(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
  assert.equal(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
  assert.equal(
    detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)),
    "image/webp",
  );
});

test("refuses anything else, whatever its name says", () => {
  assert.equal(detectImageType(new TextEncoder().encode("<script>alert(1)</script>")), null);
  assert.equal(detectImageType(bytes(0x25, 0x50, 0x44, 0x46)), null); // a PDF
  assert.equal(detectImageType(new Uint8Array()), null);
  // RIFF but not WebP (a WAV sound file).
  assert.equal(
    detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45)),
    null,
  );
});
