import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { getSettings } from "@/lib/settings";
import { fileUrl } from "@/lib/storage";

// Login, signup and password pages: the business's logo in the corner (back to the website),
// the form in the middle.
export async function AuthFrame({ children }: { children: ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="relative">
      {settings && (
        // On phones the name sits above the form; on wider screens it floats in the corner.
        // A <header> landmark, so the logo isn't content outside every landmark (axe "region").
        <header className="p-4 sm:absolute sm:left-0 sm:top-0 sm:p-6">
          <Logo
            name={settings.businessName}
            logoUrl={settings.logoFileId ? fileUrl(settings.logoFileId) : null}
          />
        </header>
      )}
      {children}
    </div>
  );
}
