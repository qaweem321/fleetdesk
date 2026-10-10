// Invitations for staff accounts (agents, managers, owners). Customers sign up on their own.
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { userRoleEnum, users } from "./auth";

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Stored in lowercase, one pending invitation per address.
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull(),
  token: text("token").notNull().unique(),
  invitedById: text("invited_by_id").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
