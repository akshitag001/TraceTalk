import { shortHost } from "./format";
import type { Case, LogEvent, Relation, SourceType } from "./types";

const RANK: Record<Relation, number> = { contradicts: 3, supports: 2, related: 1 };

export function strongest(a: Relation | undefined, b: Relation): Relation {
  return !a || RANK[b] > RANK[a] ? b : a;
}

/** eventId → entries citing it (and the strongest relation across them). */
export function citationIndex(c: Case) {
  const by = new Map<string, { entryId: string; relation: Relation }[]>();
  const best = new Map<string, Relation>();
  for (const e of c.entries) {
    for (const l of e.evidence) {
      const list = by.get(l.eventId) ?? [];
      list.push({ entryId: e.id, relation: l.relation });
      by.set(l.eventId, list);
      best.set(l.eventId, strongest(best.get(l.eventId), l.relation));
    }
  }
  return { by, best };
}

export interface ParsedFilter {
  text: string[];
  src: string[];
  host: string[];
  id: string[];
}

export function parseFilter(q: string): ParsedFilter {
  const f: ParsedFilter = { text: [], src: [], host: [], id: [] };
  for (const tok of q.trim().split(/\s+/).filter(Boolean)) {
    const m = tok.match(/^(src|source|host|id):(.+)$/i);
    if (m) {
      const k = m[1].toLowerCase() === "source" ? "src" : (m[1].toLowerCase() as "src" | "host" | "id");
      f[k].push(m[2].toLowerCase());
    } else f.text.push(tok.toLowerCase());
  }
  return f;
}

export function searchText(e: LogEvent): string {
  return (e.summary + " " + JSON.stringify(e.raw)).toLowerCase();
}

export function filterEvents(
  events: LogEvent[],
  haystacks: Map<string, string>,
  q: string,
  hiddenSources: SourceType[],
  hiddenHosts: string[],
): LogEvent[] {
  const f = parseFilter(q);
  return events.filter((e) => {
    if (hiddenSources.includes(e.source)) return false;
    const h = shortHost(e.host);
    if (hiddenHosts.includes(h)) return false;
    if (f.src.length && !f.src.some((s) => e.source.startsWith(s))) return false;
    if (f.host.length && !f.host.some((s) => e.host.toLowerCase().startsWith(s) || h.toLowerCase() === s)) return false;
    if (f.id.length && !f.id.some((s) => e.id.toLowerCase().includes(s))) return false;
    if (f.text.length) {
      const hay = haystacks.get(e.id) ?? "";
      if (!f.text.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}
