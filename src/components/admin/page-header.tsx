import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: ReactNode;
  // A button or link on the right, e.g. "Add car model".
  action?: ReactNode;
  // A "← Cars" link above the title on detail pages.
  back?: { label: string; href: string };
};

// The title row at the top of every admin page.
export function PageHeader({ title, description, action, back }: Props) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="text-sm text-muted-foreground hover:text-foreground">
          ← {back.label}
        </Link>
      )}
      <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="mt-1 text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

// Shown instead of an empty list: what goes here and how to add the first one.
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

// A boxed section on a detail page.
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-5">
      {title && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
