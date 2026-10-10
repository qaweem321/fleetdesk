import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

type Props = { previousHref: string | null; nextHref: string | null };

// "Previous" and "Next" links under a paged list. Renders nothing when there's one page.
export function Pager({ previousHref, nextHref }: Props) {
  if (!previousHref && !nextHref) {
    return null;
  }
  return (
    <nav aria-label="Pages" className="mt-6 flex justify-between">
      {previousHref ? (
        <Link href={previousHref} className={buttonClasses({ variant: "outline" })}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      {nextHref && (
        <Link href={nextHref} className={buttonClasses({ variant: "outline" })}>
          Next
        </Link>
      )}
    </nav>
  );
}
