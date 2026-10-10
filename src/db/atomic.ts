import type { BatchItem } from "drizzle-orm/batch";
import { db, driver } from "./index";

type Database = typeof db;
type Statements = readonly [BatchItem<"pg">, ...BatchItem<"pg">[]];

// Runs several writes as one transaction: all of them happen, or none do.
// Build the statements with the `tx` you're given (not `db`), so they join the transaction.
export async function atomic(build: (tx: Database) => Statements) {
  if (driver === "neon") {
    // Neon over HTTP: the whole batch is one request, run as a transaction.
    await db.batch(build(db));
    return;
  }
  // A normal Postgres connection: a regular transaction, statements in order.
  await db.transaction(async (tx) => {
    for (const statement of build(tx as unknown as Database)) {
      await statement;
    }
  });
}
