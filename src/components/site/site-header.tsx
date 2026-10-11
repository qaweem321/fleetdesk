import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { isStaff } from "@/lib/permissions";
import { getOptionalUser } from "@/lib/session";
import type { BusinessSettings } from "@/lib/settings";
import { fileUrl } from "@/lib/storage";

const linkClasses = "whitespace-nowrap text-sm text-muted-foreground hover:text-foreground";
// Keeps "Sign up" and "My bookings" on one line on narrow phones.
const buttonClasses = "whitespace-nowrap px-3 sm:px-4";

// The top bar of every public page. Logged-in people get a link to their own area instead of
// "Log in / Sign up".
export async function SiteHeader({ settings }: { settings: BusinessSettings }) {
  const user = await getOptionalUser();

  return (
    <header className="border-b border-border print:hidden">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Logo
          name={settings.businessName}
          logoUrl={settings.logoFileId ? fileUrl(settings.logoFileId) : null}
        />
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <Link href="/cars" className={linkClasses}>
            Cars
          </Link>
          {user ? (
            isStaff(user.role) ? (
              <ButtonLink href="/admin" className={buttonClasses}>
                Go to admin
              </ButtonLink>
            ) : (
              <ButtonLink href="/account" className={buttonClasses}>
                My bookings
              </ButtonLink>
            )
          ) : (
            <>
              <Link href="/login" className={linkClasses}>
                Log in
              </Link>
              <ButtonLink href="/signup" className={buttonClasses}>
                Sign up
              </ButtonLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
