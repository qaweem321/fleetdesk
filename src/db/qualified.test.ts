import assert from "node:assert/strict";
import { test } from "node:test";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { qualified } from "./qualified";
import { files, users } from "./schema";

test("qualified always includes the table name", () => {
  const query = new PgDialect().sqlToQuery(
    sql`${qualified(users.id)} = ${qualified(files.uploadedById)}`,
  );
  assert.equal(query.sql, `"users"."id" = "files"."uploaded_by_id"`);
});
