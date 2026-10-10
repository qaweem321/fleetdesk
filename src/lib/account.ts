import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// Reasons a user can't delete their account yet. An empty list means they can.
export async function accountDeletionBlockers(userId: string) {
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  const blockers: string[] = [];

  if (user?.role === "owner") {
    const owners = await db.$count(users, eq(users.role, "owner"));
    if (owners === 1) {
      blockers.push("You're the only owner. Make another staff member an owner first.");
    }
  }
  return blockers;
}
