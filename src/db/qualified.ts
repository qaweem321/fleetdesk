import { getTableName, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

// "table"."column", always. Drizzle leaves the table name out in single-table queries, which
// silently breaks correlated subqueries (an inner "id" then means the inner table's id).
// Use this for every outer column referenced inside a raw subquery.
export function qualified(column: AnyPgColumn): SQL {
  return sql.raw(`"${getTableName(column.table)}"."${column.name}"`);
}
