import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FreshOnBack } from "@/components/fresh-on-back";
import { ThemeSync } from "@/components/theme";
import { siteConfig } from "@/config/site";
import { brandStyle } from "@/lib/branding";
import { getSettings } from "@/lib/settings";
import { themeScript } from "@/lib/theme";
import "./globals.css";

// Page titles use the business name from Settings ("Cars · City Car Rentals").
export async function generateMetadata(): Promise<Metadata> {
  const name = (await getSettings())?.businessName ?? siteConfig.name;
  return {
    title: { default: `${name}: car rental`, template: `%s · ${name}` },
    description: `Rent a car from ${name}. See prices, pick your dates and book online.`,
    // Turns relative image paths (like the generated preview image) into full URLs.
    metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
    openGraph: { type: "website", siteName: name },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings = await getSettings();

  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own constant script; it sets the theme before paint to avoid a flash */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={brandStyle(settings?.brandColor ?? null)}>
        <ThemeSync />
        <FreshOnBack />
        {children}
      </body>
    </html>
  );
}
