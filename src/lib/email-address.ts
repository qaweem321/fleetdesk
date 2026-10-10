// 254 characters is the longest valid email address.
const MAX_EMAIL_LENGTH = 254;

// "name@domain.tld": no spaces, one @, and dot-separated domain parts. The parts can't
// overlap, so checking even a very long fake address stays fast (no regex backtracking).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export function isValidEmail(email: string) {
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
}

// Domains reserved for testing and examples (RFC 2606/6761), like the demo's owner@acme.test.
// Real mail never reaches them, and some services (Polar's checkout) refuse them.
const RESERVED_TLDS = ["test", "example", "invalid", "localhost"];
const RESERVED_DOMAINS = ["example.com", "example.net", "example.org"];

export function isReservedEmailDomain(email: string) {
  const domain = email.split("@").at(-1)?.toLowerCase() ?? "";
  const tld = domain.split(".").at(-1) ?? "";
  return (
    RESERVED_TLDS.includes(tld) ||
    RESERVED_DOMAINS.some((reserved) => domain === reserved || domain.endsWith(`.${reserved}`))
  );
}
