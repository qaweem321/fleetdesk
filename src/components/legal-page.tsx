import type { ReactNode } from "react";
import { PublicPage } from "@/components/site/public-page";

type LegalPageProps = { title: string; lastUpdated: string; children: ReactNode };

// Shared layout for the Terms and Privacy pages.
export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <PublicPage>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-subtle-foreground">Last updated: {lastUpdated}</p>
        <p className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
          This is a starting template, not legal advice. Have it reviewed for your business and
          country before you launch.
        </p>
        <div className="mt-8 text-muted-foreground leading-7 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1 [&_a]:text-link [&_a]:underline">
          {children}
        </div>
      </div>
    </PublicPage>
  );
}
