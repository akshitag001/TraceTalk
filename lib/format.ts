export function basename(path: unknown): string {
  if (typeof path !== "string" || !path) return "";
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function humanBytes(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return String(n ?? "");
  if (v < 1024) return `${v} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let x = v / 1024;
  let i = 0;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  return `${x.toFixed(1)} ${units[i]}`;
}

/** Shorten "WS-FIN-0142.corp.local" to "WS-FIN-0142". */
export function shortHost(host: string): string {
  return host.split(".")[0];
}

const timeFmtCache = new Map<string, Intl.DateTimeFormat>();

function fmt(tz: string): Intl.DateTimeFormat {
  let f = timeFmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    timeFmtCache.set(tz, f);
  }
  return f;
}

/** "14:32:07" in the given zone. */
export function clockTime(iso: string, tz = "UTC"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return fmt(tz).format(d);
}

export function shortTimeZone(tz: string): string {
  if (tz === "UTC") return "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
