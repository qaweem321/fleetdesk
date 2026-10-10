// Loads .env when there is one (scripts run on your computer). In Docker or on a host the
// variables are already set and there is no .env file, which is fine.
try {
  process.loadEnvFile();
} catch {
  // No .env file.
}
