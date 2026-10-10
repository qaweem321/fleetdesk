import assert from "node:assert/strict";
import { test } from "node:test";
import { databaseDriver } from "./driver";

test("Neon URLs use the Neon driver, others a normal connection", () => {
  assert.equal(
    databaseDriver({ DATABASE_URL: "postgresql://u:p@ep-x-123.ap-southeast-1.aws.neon.tech/db" }),
    "neon",
  );
  assert.equal(databaseDriver({ DATABASE_URL: "postgresql://u:p@db:5432/echoboard" }), "postgres");
  assert.equal(databaseDriver({ DATABASE_URL: "not a url" }), "postgres");
});

test("DATABASE_DRIVER overrides the guess", () => {
  const neonUrl = "postgresql://u:p@ep-x.neon.tech/db";
  assert.equal(databaseDriver({ DATABASE_URL: neonUrl, DATABASE_DRIVER: "postgres" }), "postgres");
  assert.equal(
    databaseDriver({ DATABASE_URL: "postgresql://u:p@db/x", DATABASE_DRIVER: "neon" }),
    "neon",
  );
});
