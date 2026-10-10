// What a form's server action returns to the page: a message to show next to the form.
export type ActionState = { error?: string; success?: string };

// Postgres error codes the app turns into friendly messages.
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const EXCLUSION_VIOLATION = "23P01";

// Drizzle wraps the driver's error, so the code can be on the error or on its cause.
function postgresCode(error: unknown): string | undefined {
  const withCode = (value: unknown) =>
    typeof value === "object" && value !== null && "code" in value
      ? String((value as { code: unknown }).code)
      : undefined;
  return withCode(error) ?? withCode((error as { cause?: unknown } | null)?.cause);
}

export const isUniqueViolation = (error: unknown) => postgresCode(error) === UNIQUE_VIOLATION;
export const isForeignKeyViolation = (error: unknown) =>
  postgresCode(error) === FOREIGN_KEY_VIOLATION;
export const isExclusionViolation = (error: unknown) => postgresCode(error) === EXCLUSION_VIOLATION;
