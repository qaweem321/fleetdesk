"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { businessSettings, users } from "@/db/schema";
import type { ActionState } from "@/lib/action-state";
import { parseBusinessInput } from "@/lib/business-input";
import { formReader } from "@/lib/form-input";
import { requireUser } from "@/lib/session";
import { settingsChanged } from "@/lib/settings";

// The first person to finish setup becomes the owner. One conditional UPDATE does the check
// and the change together, so two people submitting at the same moment can't both win.
export async function completeSetup(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseBusinessInput(formReader(formData));
  if ("error" in parsed) {
    return parsed;
  }

  const claimed = await db
    .update(users)
    .set({ role: "owner" })
    .where(
      and(
        eq(users.id, user.id),
        sql`not exists (select 1 from users as other where other.role = 'owner' and other.id <> ${user.id})`,
      ),
    )
    .returning({ id: users.id });
  if (claimed.length === 0) {
    return { error: "This site already has an owner. Ask them to invite you instead." };
  }

  await db
    .insert(businessSettings)
    .values({ id: 1, ...parsed.values })
    .onConflictDoNothing();
  settingsChanged();
  redirect("/admin");
}
