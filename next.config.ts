import type { NextConfig } from "next";
import { MAX_UPLOAD_BYTES } from "./src/lib/storage/limits";

// Sent with every response. Each one turns on a browser protection.
const securityHeaders = [
  // Only load this site over HTTPS for the next 2 years.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Don't guess file types; use the type the server sends.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only the domain (not the full URL) when linking to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Photos are taken with the phone's own camera app (a file input), so the site itself
  // never needs camera, microphone or location access.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Other sites may not show this app in an <iframe> (stops clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  },
];

const nextConfig: NextConfig = {
  // A self-contained server in .next/standalone, used by the Docker image (Vercel ignores it).
  output: "standalone",
  // The "N" badge only shows during `npm run dev`. Keep it out of the sidebar.
  devIndicators: { position: "bottom-right" },
  // Don't advertise "X-Powered-By: Next.js" to attackers.
  poweredByHeader: false,
  experimental: {
    // Photos are uploaded one at a time, already made smaller in the browser. A little room
    // is added for the form's own bytes.
    serverActions: { bodySizeLimit: MAX_UPLOAD_BYTES + 64 * 1024 },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
