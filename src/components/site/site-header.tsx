import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { isStaff } from "@/lib/permissions";
import { getOptionalUser } from "@/lib/session";
import type { BusinessSettings } from "@/lib/settings";
import { fileUrl } from "@/lib/storage";

const linkClasses = "text-sm text-muted-foreground hover:text-foreground";

// The top bar of every public page. Logged-in people get a link to their own area instead of
// "Log in / Sign up".
export async function SiteHeader({ settings }: { settings: BusinessSettings }) {
  const user = await getOptionalUser();

  return (
    <header className="border-b border-border">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Logo
          name={settings.businessName}
          logoUrl={settings.logoFileId ? fileUrl(settings.logoFileId) : null}
        />
        <div className="flex items-center gap-4">
          {user ? (
            isStaff(user.role) ? (
              <ButtonLink href="/admin">Go to admin</ButtonLink>
            ) : (
              <ButtonLink href="/account">My bookings</ButtonLink>
            )
          ) : (
            <>
              <Link href="/login" className={linkClasses}>
                Log in
              </Link>
              <ButtonLink href="/signup">Sign up</ButtonLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
