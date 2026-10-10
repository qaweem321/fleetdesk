const CHECK_ORIGIN = "https://this-site.invalid";

// Only allow redirects to pages on this site, never to another website.
// We read the path the way a browser does (browsers drop tabs and newlines and treat "\" as
// "/"), so tricks like "/\t/evil.example" can't sneak through a simple text check.
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard") {
  if (!next?.startsWith("/")) {
    return fallback;
  }
  try {
    const url = new URL(next, CHECK_ORIGIN);
    if (url.origin !== CHECK_ORIGIN) {
      return fallback;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

export function getNextPath(fallback = "/dashboard") {
  return safeNextPath(new URLSearchParams(window.location.search).get("next"), fallback);
}
