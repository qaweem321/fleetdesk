import type { Metadata } from "next";
import { AccountSettings } from "@/components/account/account-settings";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Your account" };

export default async function AdminAccountPage() {
  const user = await requireStaff();

  return (
    <div>
      <h1 className="text-2xl font-bold">Your account</h1>
      <p className="mt-1 text-muted-foreground">Your personal settings.</p>
      <AccountSettings user={user} />
    </div>
  );
}
