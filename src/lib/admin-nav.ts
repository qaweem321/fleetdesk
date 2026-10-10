import type { NavItem } from "@/components/sidebar-nav";
import { can, type Permission, type StaffRole } from "@/lib/permissions";

type AdminNavItem = NavItem & { permission?: Permission };

// The admin sidebar. Links someone can't use are left out.
const adminNav: AdminNavItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "Cars", href: "/admin/cars" },
  { label: "Vehicles", href: "/admin/vehicles" },
  { label: "Locations", href: "/admin/locations" },
  { label: "Pricing", href: "/admin/pricing", permission: "pricing:manage" },
  { label: "Extras", href: "/admin/extras", permission: "pricing:manage" },
  { label: "Coupons", href: "/admin/coupons", permission: "pricing:manage" },
  { label: "Staff", href: "/admin/staff" },
  { label: "Settings", href: "/admin/settings", permission: "settings:update" },
];

export function adminNavFor(role: StaffRole): NavItem[] {
  return adminNav
    .filter((item) => !item.permission || can(role, item.permission))
    .map(({ label, href }) => ({ label, href }));
}
