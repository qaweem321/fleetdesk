export const roles = ["customer", "agent", "manager", "owner"] as const;
export type Role = (typeof roles)[number];

// Staff work behind the counter and in the admin area. Customers only book and see their own.
export const staffRoles = ["agent", "manager", "owner"] as const satisfies Role[];
export type StaffRole = (typeof staffRoles)[number];

const permissions = {
  "settings:update": ["owner", "manager"],
  "staff:invite": ["owner", "manager"],
  // Change someone's role or remove them from the staff.
  "staff:manage": ["owner"],
} satisfies Record<string, StaffRole[]>;

export type Permission = keyof typeof permissions;

export function can(role: Role, permission: Permission) {
  return (permissions[permission] as Role[]).includes(role);
}

export function isStaff(role: Role): role is StaffRole {
  return role !== "customer";
}

export function isStaffRole(value: string): value is StaffRole {
  return (staffRoles as readonly string[]).includes(value);
}

// Owners may invite anyone; managers only agents, so nobody can hand out more power than
// they have.
export function invitableRoles(role: Role): StaffRole[] {
  if (role === "owner") {
    return [...staffRoles];
  }
  return can(role, "staff:invite") ? ["agent"] : [];
}

export const roleLabels: Record<Role, string> = {
  customer: "Customer",
  agent: "Agent",
  manager: "Manager",
  owner: "Owner",
};
