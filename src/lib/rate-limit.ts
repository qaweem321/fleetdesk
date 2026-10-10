import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

// Allows at most `max` actions per `windowSeconds` for a key, e.g. invitation emails per
// organization. Counts live in the rate_limits table (shared with Better Auth, so our keys
// start with "app:"), which works across serverless instances. One database round trip.
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const expired = sql`${rateLimits.lastRequest} < ${windowStart}`;

  const [row] = await db
    .insert(rateLimits)
    .values({ id: randomUUID(), key: `app:${key}`, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        // A new window starts when the previous one has passed.
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        lastRequest: sql`case when ${expired} then ${now} else ${rateLimits.lastRequest} end`,
      },
    })
    .returning({ count: rateLimits.count });

  return { allowed: row.count <= max };
}
