import type { Metadata } from "next";
import { AccountSettings } from "@/components/account/account-settings";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Account" };

export default async function AccountSettingsPage() {
  const user = await requireUser();
  return <AccountSettings user={user} />;
}
