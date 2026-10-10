import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { getSettings } from "@/lib/settings";

// The preview image shown when a link to this site is shared (WhatsApp, Facebook, X...).
export const alt = "Car rental";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const name = (await getSettings())?.businessName ?? siteConfig.name;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 96,
        background: "#030712",
        color: "#f9fafb",
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 700 }}>{name}</div>
      <div style={{ marginTop: 24, fontSize: 44, color: "#60a5fa" }}>Car rental</div>
      <div style={{ marginTop: 40, fontSize: 32, color: "#9ca3af" }}>
        Pick your dates, choose a car and book online.
      </div>
    </div>,
    size,
  );
}
