import Link from "next/link";
import { cn } from "@/lib/cn";

type LogoProps = {
  // The business name from Settings.
  name: string;
  // The uploaded logo (Settings), shown instead of the name.
  logoUrl?: string | null;
  href?: string;
  className?: string;
  onClick?: () => void;
};

// Inside the admin area it links to the admin home; on public pages to the home page.
// A long business name takes at most two smaller lines on phones instead of pushing the menu.
export function Logo({ name, logoUrl, href = "/", className, onClick }: LogoProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn("min-w-0 line-clamp-2 text-base leading-tight font-bold sm:text-lg", className)}
    >
      {logoUrl ? (
        // biome-ignore lint/performance/noImgElement: uploaded logos are served by our own /files route, so next/image adds nothing
        <img src={logoUrl} alt={name} className="h-8 w-auto max-w-44 object-contain" />
      ) : (
        name
      )}
    </Link>
  );
}
