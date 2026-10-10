import assert from "node:assert/strict";
import { test } from "node:test";
import { checkEnv } from "./env";

const valid = {
  DATABASE_URL: "postgresql://user:pass@host/db",
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
};

test("a complete development env has no problems", () => {
  assert.deepEqual(checkEnv(valid), []);
});

test("reports missing and badly formatted values", () => {
  const problems = checkEnv({ ...valid, DATABASE_URL: "", BETTER_AUTH_SECRET: "short" });
  assert.deepEqual(problems, [
    "DATABASE_URL is missing.",
    "BETTER_AUTH_SECRET must be at least 32 characters long.",
  ]);
});

test("rejects an invalid or slash-ending BETTER_AUTH_URL", () => {
  assert.equal(checkEnv({ ...valid, BETTER_AUTH_URL: "localhost:3000" }).length, 1);
  assert.equal(checkEnv({ ...valid, BETTER_AUTH_URL: "http://localhost:3000/" }).length, 1);
});

test("production also needs Resend", () => {
  assert.deepEqual(checkEnv({ ...valid, NODE_ENV: "production" }), ["RESEND_API_KEY is missing."]);
});

test("demo mode doesn't need Resend and must be true or false", () => {
  assert.deepEqual(checkEnv({ ...valid, NODE_ENV: "production", DEMO_MODE: "true" }), []);
  assert.deepEqual(checkEnv({ ...valid, DEMO_MODE: "on" }), [
    'DEMO_MODE must be "true" or "false", not "on".',
  ]);
});

test("checks the storage driver and the S3 settings it needs", () => {
  assert.deepEqual(checkEnv({ ...valid, STORAGE_DRIVER: "local" }), []);
  assert.equal(checkEnv({ ...valid, STORAGE_DRIVER: "dropbox" }).length, 1);
  assert.equal(checkEnv({ ...valid, STORAGE_DRIVER: "local", VERCEL: "1" }).length, 1);
  assert.deepEqual(
    checkEnv({ ...valid, STORAGE_DRIVER: "s3", S3_ENDPOINT: "https://r2.example" }),
    ["S3_BUCKET is missing.", "S3_ACCESS_KEY_ID is missing.", "S3_SECRET_ACCESS_KEY is missing."],
  );
});

test("checks DATABASE_DRIVER", () => {
  assert.deepEqual(checkEnv({ ...valid, DATABASE_DRIVER: "postgres" }), []);
  assert.equal(checkEnv({ ...valid, DATABASE_DRIVER: "mysql" }).length, 1);
});
