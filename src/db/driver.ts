type Env = Record<string, string | undefined>;

export type DatabaseDriver = "neon" | "postgres";

// Which database driver to use. Neon's HTTP driver is fastest on serverless hosting (Vercel);
// any other Postgres (Docker, Supabase, RDS, your own server) uses a normal connection.
// DATABASE_DRIVER="neon" or "postgres" overrides the guess made from DATABASE_URL.
export function databaseDriver(env: Env = process.env): DatabaseDriver {
  const chosen = env.DATABASE_DRIVER;
  if (chosen === "neon" || chosen === "postgres") {
    return chosen;
  }
  try {
    return new URL(env.DATABASE_URL ?? "").hostname.endsWith(".neon.tech") ? "neon" : "postgres";
  } catch {
    return "postgres";
  }
}
