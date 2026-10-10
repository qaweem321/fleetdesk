type Env = Record<string, string | undefined>;

export const storageDriverNames = ["database", "local", "s3"] as const;
export type StorageDriverName = (typeof storageDriverNames)[number];

export function isStorageDriverName(value: string): value is StorageDriverName {
  return (storageDriverNames as readonly string[]).includes(value);
}

// STORAGE_DRIVER picks where new uploads go. Empty means "database": no setup needed.
export function storageDriverName(env: Env = process.env): StorageDriverName {
  const chosen = env.STORAGE_DRIVER;
  return chosen && isStorageDriverName(chosen) ? chosen : "database";
}
