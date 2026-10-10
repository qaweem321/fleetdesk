"use server";

import { redirect } from "next/navigation";
import { identityCheckAvailable, startIdentityCheck } from "@/lib/drivers/identity";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { requireSettings } from "@/lib/settings";

export async function startMyIdentityCheck() {
  const [user, settings] = await Promise.all([requireUser(), requireSettings()]);
  if (!identityCheckAvailable(settings)) {
    redirect("/account/driver");
  }
  // Each check costs the business money: a few tries per day is plenty.
  const { allowed } = await rateLimit(`identity:${user.id}`, 5, 24 * 60 * 60);
  if (!allowed) {
    redirect("/account/driver?identity=limit");
  }
  redirect(await startIdentityCheck(user.id));
}
