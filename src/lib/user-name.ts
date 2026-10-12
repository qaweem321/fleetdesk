export const NAME_MAX_LENGTH = 60;

// A person's name as typed on signup or the Account page, checked on the server (the browser's
// maxLength is easy to skip). Line breaks and control characters become spaces, because the name
// also appears in email subjects like "Sam invited you to join Acme".
export function cleanUserName(value: unknown): { name: string } | { error: string } {
  const name = String(value ?? "")
    .replace(/[\p{Cc}\p{Cf}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) {
    return { error: "Please enter your name." };
  }
  if (name.length > NAME_MAX_LENGTH) {
    return { error: `Please use ${NAME_MAX_LENGTH} characters or fewer for your name.` };
  }
  return { name };
}
