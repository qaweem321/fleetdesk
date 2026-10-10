// The visitor's IP address, for rate limits. Each proxy in front of the app adds the address it
// saw to the end of x-forwarded-for, so the last entry is the one the nearest proxy (Vercel,
// Caddy, Nginx) vouches for; earlier entries can be faked by the visitor. x-real-ip is the
// fallback. Run the app behind a proxy: exposed directly, every header can be faked.
export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
