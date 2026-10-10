// Converts between UTC (how times are stored) and the wall-clock time at the business
// ("2026-10-11T10:00", as typed into <input type="datetime-local">). No library needed:
// Intl knows every zone's daylight saving rules.

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const partFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let found = partFormatters.get(timeZone);
  if (!found) {
    found = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    partFormatters.set(timeZone, found);
  }
  return found;
}

function wallClock(date: Date, timeZone: string) {
  const parts: Record<string, string> = {};
  for (const part of partsFormatter(timeZone).formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return parts;
}

// Minutes the zone is ahead of UTC at that moment (Karachi: +300, New York in summer: -240).
function offsetMinutes(date: Date, timeZone: string) {
  const p = wallClock(date, timeZone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return Math.round((asUtc - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000);
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

// "2026-10-11T10:00" at the business -> the UTC moment. Null if the text isn't a valid time.
export function fromLocalInput(value: string, timeZone: string): Date | null {
  const match = LOCAL_PATTERN.exec(value);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute] = match.map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(asUtc);
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23) {
    return null;
  }
  // Guess with the offset at that moment, then correct once in case daylight saving
  // starts or ends between the guess and the answer.
  let result = asUtc - offsetMinutes(check, timeZone) * 60_000;
  result = asUtc - offsetMinutes(new Date(result), timeZone) * 60_000;
  return new Date(result);
}

// The UTC moment -> "2026-10-11T10:00" at the business, for a datetime-local input.
export function toLocalInput(date: Date, timeZone: string) {
  const p = wallClock(date, timeZone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// "2026-10-11": the calendar date at the business at that moment.
export function localDateKey(date: Date, timeZone: string) {
  return toLocalInput(date, timeZone).slice(0, 10);
}
