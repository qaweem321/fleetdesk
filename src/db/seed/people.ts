import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { inArray } from "drizzle-orm";
import { DEMO_PASSWORD, demoLogins } from "../../lib/demo";
import { db } from "../index";
import { accounts, users } from "../schema";

const people = [
  { ...demoLogins.owner, role: "owner" },
  { ...demoLogins.agent, role: "agent" },
  { ...demoLogins.customer, role: "customer" },
] as const;

// The sample logins, each with the demo password, so every part of the app can be tried.
export async function seedPeople() {
  await db
    .insert(users)
    .values(
      people.map((person) => ({
        id: randomUUID(),
        name: person.name,
        email: person.email,
        role: person.role,
        emailVerified: true,
      })),
    )
    .onConflictDoNothing({ target: users.email });

  const saved = await db
    .select({ id: users.id })
    .from(users)
    .where(
      inArray(
        users.email,
        people.map((person) => person.email),
      ),
    );

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await db
    .insert(accounts)
    .values(
      saved.map((user) => ({
        id: `seed-${user.id}`,
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      })),
    )
    .onConflictDoNothing({ target: accounts.id });
}
