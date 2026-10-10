import { redirect } from "next/navigation";
import { homePath, requireUser } from "@/lib/session";

// "Go to dashboard" links and logins land here: staff go to the admin area, customers to
// their bookings.
export default async function DashboardPage() {
  const user = await requireUser();
  redirect(homePath(user.role));
}
