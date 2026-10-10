import { cn } from "@/lib/cn";

type Props = { url: string | null; alt: string; className?: string };

// A car model's main photo, or a simple drawing of a car until a photo is uploaded.
export function CarPhoto({ url, alt, className }: Props) {
  if (url) {
    return (
      // biome-ignore lint/performance/noImgElement: our own uploads, already resized in the browser
      <img src={url} alt={alt} className={cn("rounded-md bg-muted object-cover", className)} />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md bg-muted text-subtle-foreground",
        className,
      )}
    >
      <svg
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        viewBox="0 0 64 32"
        className="w-1/2 max-w-32"
        fill="currentColor"
      >
        <path d="M14 8c1-2.5 3.5-4 6-4h20c2.6 0 4.8 1.4 6 3.6L50 14h4a6 6 0 0 1 6 6v4a2 2 0 0 1-2 2h-3.2a6 6 0 0 0-11.6 0H20.8a6 6 0 0 0-11.6 0H6a2 2 0 0 1-2-2v-6a4 4 0 0 1 3-3.9zM20 8.5a2 2 0 0 0-1.9 1.4L16.5 14H30V8.5zm14 0V14h11.3l-2.6-4.4a2 2 0 0 0-1.7-1.1z" />
        <circle cx="15" cy="26" r="4" />
        <circle cx="49" cy="26" r="4" />
      </svg>
    </div>
  );
}
