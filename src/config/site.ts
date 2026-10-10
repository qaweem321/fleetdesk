// The product's own name, used before setup (the setup wizard) and as a fallback. Everything
// customers see uses the business name from Settings instead.
export const siteConfig = {
  name: "Fleetdesk",
};

// Builds a full link like "https://yourapp.com/invite/abc". Server-only: it reads BETTER_AUTH_URL.
export function absoluteUrl(path: string) {
  return `${process.env.BETTER_AUTH_URL}${path}`;
}
