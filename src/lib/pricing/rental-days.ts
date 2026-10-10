const MINUTE = 60_000;
const DAY_MINUTES = 24 * 60;

// How many days a rental is charged for: every started 24 hours counts as a day, except that
// a return up to `graceMinutes` late is forgiven. Pickup 10:00, return 10:45 two days later
// with 59 minutes grace = 2 days; return at 11:15 = 3 days. Always at least 1.
export function rentalDays(start: Date, end: Date, graceMinutes: number) {
  const minutes = Math.ceil((end.getTime() - start.getTime()) / MINUTE);
  const fullDays = Math.floor(minutes / DAY_MINUTES);
  const remainder = minutes - fullDays * DAY_MINUTES;
  return Math.max(1, fullDays + (remainder > graceMinutes ? 1 : 0));
}

// The moment each charged day starts: pickup, pickup + 24 h, ... Used to find the season of
// each day.
export function rentalDayStarts(start: Date, days: number) {
  return Array.from(
    { length: days },
    (_, index) => new Date(start.getTime() + index * DAY_MINUTES * MINUTE),
  );
}
