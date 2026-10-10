import type { ReactNode } from "react";
import { requireSettings } from "@/lib/settings";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

// The frame around every public page: header, content, footer.
export async function PublicPage({ children }: { children: ReactNode }) {
  const settings = await requireSettings();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader settings={settings} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
    </div>
  );
}
