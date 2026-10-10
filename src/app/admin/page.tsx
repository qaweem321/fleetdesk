import type { Metadata } from "next";
import { requireStaff } from "@/lib/session";
import { requireSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const [user, settings] = await Promise.all([requireStaff(), requireSettings()]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
      <p className="mt-1 text-muted-foreground">
        This is the admin area of {settings.businessName}.
      </p>
    </div>
  );
}
