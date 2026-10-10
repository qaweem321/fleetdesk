import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fileBlobs } from "@/db/schema";
import { requireEnv } from "@/lib/env";
import { type StorageDriverName, storageDriverName } from "./driver-name";

// Where file bytes are kept. Each file remembers its driver, so files saved before a switch
// (say from "database" to "s3") can still be read.
type StorageDriver = {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
};

// In Postgres (the default): nothing to set up, works on Vercel, backed up with the database.
// The key is the file's id.
const databaseDriver: StorageDriver = {
  async put(key, data) {
    await db.insert(fileBlobs).values({ fileId: key, data });
  },
  async get(key) {
    const [row] = await db
      .select({ data: fileBlobs.data })
      .from(fileBlobs)
      .where(eq(fileBlobs.fileId, key));
    return row?.data ?? null;
  },
  async remove() {
    // The bytes are deleted with the file's row (ON DELETE CASCADE).
  },
};

// On the server's disk, e.g. a Docker volume. Not for Vercel (its disk is wiped).
function localDriver(): StorageDriver {
  const root = path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_LOCAL_DIR || "uploads");
  // Keys are made by the app (never typed by a visitor), but check anyway that a key can't
  // point outside the folder.
  const fullPath = (key: string) => {
    const resolved = path.resolve(/*turbopackIgnore: true*/ root, key);
    if (!resolved.startsWith(root + path.sep)) {
      throw new Error("Invalid storage key.");
    }
    return resolved;
  };
  return {
    async put(key, data) {
      const target = fullPath(key);
      await mkdir(/*turbopackIgnore: true*/ path.dirname(target), { recursive: true });
      await writeFile(/*turbopackIgnore: true*/ target, data);
    },
    async get(key) {
      try {
        return await readFile(/*turbopackIgnore: true*/ fullPath(key));
      } catch {
        return null;
      }
    },
    async remove(key) {
      await rm(/*turbopackIgnore: true*/ fullPath(key), { force: true });
    },
  };
}

// Any S3-compatible bucket: Cloudflare R2, AWS S3, Backblaze B2, MinIO...
function s3Driver(): StorageDriver {
  const client = new AwsClient({
    accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    region: process.env.S3_REGION || "auto",
    service: "s3",
  });
  const endpoint = requireEnv("S3_ENDPOINT").replace(/\/+$/, "");
  const objectUrl = (key: string) => `${endpoint}/${requireEnv("S3_BUCKET")}/${key}`;

  return {
    async put(key, data, contentType) {
      const response = await client.fetch(objectUrl(key), {
        method: "PUT",
        body: new Uint8Array(data),
        headers: { "Content-Type": contentType },
      });
      if (!response.ok) {
        throw new Error(`Uploading to S3 failed: ${response.status} ${await response.text()}`);
      }
    },
    async get(key) {
      const response = await client.fetch(objectUrl(key));
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Reading from S3 failed: ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    },
    async remove(key) {
      const response = await client.fetch(objectUrl(key), { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw new Error(`Deleting from S3 failed: ${response.status}`);
      }
    },
  };
}

const cache = new Map<StorageDriverName, StorageDriver>();

export function getDriver(name: StorageDriverName = storageDriverName()) {
  let driver = cache.get(name);
  if (!driver) {
    driver = name === "s3" ? s3Driver() : name === "local" ? localDriver() : databaseDriver;
    cache.set(name, driver);
  }
  return driver;
}
