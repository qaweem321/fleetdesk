import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { absoluteUrl } from "@/config/site";
import { listPublicModels } from "@/lib/fleet/queries";

// Public pages for search engines, including a page per car. Built on each request (not while
// building the app), because the cars live in the database.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const models = await listPublicModels();
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/cars"), changeFrequency: "weekly", priority: 0.9 },
    ...models.map((model) => ({
      url: absoluteUrl(`/cars/${model.id}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: absoluteUrl("/signup"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.1 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.1 },
  ];
}
