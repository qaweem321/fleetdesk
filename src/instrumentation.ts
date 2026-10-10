import { checkEnv } from "@/lib/env";

// Next.js runs this once when the server starts. Stop early with a clear message if .env is wrong.
export function register() {
  const problems = checkEnv();
  if (problems.length > 0) {
    throw new Error(
      `Your environment variables need fixing (see .env.example):\n- ${problems.join("\n- ")}`,
    );
  }
}
