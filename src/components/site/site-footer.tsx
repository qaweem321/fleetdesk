import Link from "next/link";
import type { BusinessSettings } from "@/lib/settings";

// Contact details and legal links at the bottom of every public page.
export function SiteFooter({ settings }: { settings: BusinessSettings }) {
  const contact = [settings.address, settings.contactPhone, settings.contactEmail].filter(Boolean);

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col gap-4 text-sm text-subtle-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-muted-foreground">{settings.businessName}</p>
          {contact.length > 0 && <p className="mt-1">{contact.join(" · ")}</p>}
        </div>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
