import type { BatchItem } from "drizzle-orm/batch";
import { db, driver } from "./index";

type Database = typeof db;
type Statements = readonly [BatchItem<"pg">, ...BatchItem<"pg">[]];

// Runs several writes as one transaction: all of them happen, or none do.
// Build the statements with the `tx` you're given (not `db`), so they join the transaction.
// Returns each statement's result in order (e.g. the rows of an update with .returning()).
export async function atomic(build: (tx: Database) => Statements): Promise<readonly unknown[]> {
  if (driver === "neon") {
    // Neon over HTTP: the whole batch is one request, run as a transaction.
    return db.batch(build(db));
  }
  // A normal Postgres connection: a regular transaction, statements in order.
  return db.transaction(async (tx) => {
    const results: unknown[] = [];
    for (const statement of build(tx as unknown as Database)) {
      results.push(await statement);
    }
    return results;
  });
}
