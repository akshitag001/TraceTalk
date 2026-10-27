/** Offset of `tz` from UTC at the instant `ms`, in milliseconds. */
function tzOffset(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - ms;
}

/** Wall-clock time on `date` (YYYY-MM-DD) in `tz` → UTC epoch ms. */
export function zonedToUtc(date: string, h: number, m: number, s: number, tz: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, m, s);
  if (tz === "UTC") return guess;
  let t = guess - tzOffset(guess, tz);
  t = guess - tzOffset(t, tz);
  return t;
}

export interface SpokenTime {
  index: number; // position in text
  precision: "minute" | "second";
  center: number; // UTC ms
  /** The span the speaker most likely meant: the whole minute, or ±10s for an exact second. */
  tight: [number, number];
  /** Candidate window: ±90 seconds (spec 7.2). */
  wide: [number, number];
}

const TIME_RE = /\b([01]?\d|2[0-3])[:.]([0-5]\d)(?:[:.]([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)?(?!\d|[.:]\d)/gi;

/** Extract "14:32", "14:32:07", "2:32 pm" and resolve against case date + zone. */
export function extractTimes(text: string, caseDate: string, tz: string): SpokenTime[] {
  const out: SpokenTime[] = [];
  for (const m of text.matchAll(TIME_RE)) {
    // Skip things that look like IPs or versions ("10.20.14.42", "5.1").
    const before = text.slice(Math.max(0, (m.index ?? 0) - 1), m.index);
    if (/[\d.]/.test(before)) continue;
    if (m[0].includes(".") && !m[4]) continue;
    let h = Number(m[1]);
    const min = Number(m[2]);
    const sec = m[3] ? Number(m[3]) : 0;
    const ampm = m[4]?.toLowerCase().replace(/\./g, "");
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    const center = zonedToUtc(caseDate, h, min, sec, tz);
    const precision = m[3] ? "second" : "minute";
    const tight: [number, number] = precision === "minute" ? [center, center + 59_999] : [center - 10_000, center + 10_000];
    out.push({ index: m.index ?? 0, precision, center, tight, wide: [center - 90_000, center + 90_000] });
  }
  return out;
}

export function inWindow(iso: string, w: [number, number]): boolean {
  const t = new Date(iso).getTime();
  return t >= w[0] && t <= w[1];
}
