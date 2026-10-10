// Dates are always written with the month name ("Oct 11, 2026"): clear in every country,
// unlike 10/11/2026 (October 11 or 10 November?). They are shown in the business's time zone
// (Settings), the same for every visitor and on every server.

const formatters = new Map<string, Intl.DateTimeFormat>();

// Building an Intl formatter is slow, so each one is made once and reused.
function formatter(timeZone: string, options: Intl.DateTimeFormatOptions) {
  const key = `${timeZone}|${JSON.stringify(options)}`;
  let found = formatters.get(key);
  if (!found) {
    found = new Intl.DateTimeFormat("en-US", { ...options, timeZone });
    formatters.set(key, found);
  }
  return found;
}

// "Oct 11, 2026"
export function formatDate(date: Date, timeZone = "UTC") {
  return formatter(timeZone, { dateStyle: "medium" }).format(date);
}

// "Oct 11, 2026, 10:30 AM"
export function formatDateTime(date: Date, timeZone = "UTC") {
  return formatter(timeZone, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

// "10:30 AM"
export function formatTime(date: Date, timeZone = "UTC") {
  return formatter(timeZone, { timeStyle: "short" }).format(date);
}

// Ends a sentence with a full stop, unless the text already ends with one (or ! or ?),
// so a name like "Acme Inc." doesn't become "Acme Inc..".
export function endSentence(text: string) {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}
