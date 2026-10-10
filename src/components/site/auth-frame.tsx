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
        <div className="absolute left-0 top-0 p-4 sm:p-6">
          <Logo
            name={settings.businessName}
            logoUrl={settings.logoFileId ? fileUrl(settings.logoFileId) : null}
          />
        </div>
      )}
      {children}
    </div>
  );
}
