import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";

// Tells search engines what to crawl. Private, logged-in pages are kept out.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/admin",
        "/account",
        "/setup",
        "/invite",
        "/api",
        "/reset-password",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
