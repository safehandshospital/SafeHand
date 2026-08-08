/** Calendar-style date/time formatting helpers. */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Today", "Tomorrow", or "Wed, Mar 12" (+ year if not current). */
export function formatCalendarDate(date: Date, now = new Date()): string {
  const today = startOfDay(now);
  const target = startOfDay(date);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (sameDay(target, today)) return "Today";
  if (sameDay(target, tomorrow)) return "Tomorrow";

  const weekday = WEEKDAYS[date.getDay()];
  const month = MONTHS[date.getMonth()];
  const day = date.getDate();
  const yearSuffix =
    date.getFullYear() !== now.getFullYear() ? `, ${date.getFullYear()}` : "";
  return `${weekday}, ${month} ${day}${yearSuffix}`;
}

function formatClock(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mm = minutes.toString().padStart(2, "0");
  return `${hours}:${mm} ${ampm}`;
}

/** "10:00 to 10:30 AM" when same meridiem; else "10:00 AM to 1:00 PM". */
export function formatTimeRange(startsAt: Date, endsAt: Date): string {
  const startH = startsAt.getHours();
  const endH = endsAt.getHours();
  const sameMeridiem = startH < 12 === endH < 12;

  if (sameMeridiem) {
    let hours = startH % 12;
    if (hours === 0) hours = 12;
    const startMm = startsAt.getMinutes().toString().padStart(2, "0");
    const endLabel = formatClock(endsAt);
    return `${hours}:${startMm} to ${endLabel}`;
  }

  return `${formatClock(startsAt)} to ${formatClock(endsAt)}`;
}

export function formatClockTime(date: Date): string {
  return formatClock(date);
}

export function durationMinutes(startsAt: Date, endsAt: Date): number {
  return Math.max(0, Math.round((endsAt.getTime() - startsAt.getTime()) / 60000));
}

/** Local calendar day key YYYY-MM-DD for grouping slots. */
export function dayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export { formatClock };
