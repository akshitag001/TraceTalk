import { clockTime, nowIso } from "./format";
import type { Case, LedgerEntry, LogEvent } from "./types";

export interface SummarySentence {
  text: string;
  citations: string[];
}

const byTime = (a: LedgerEntry, b: LedgerEntry) => (a.eventTime ?? a.createdAt).localeCompare(b.eventTime ?? b.createdAt);

export function confirmedFacts(c: Case): LedgerEntry[] {
  return c.entries.filter((e) => e.kind === "fact" && e.status === "confirmed").sort(byTime);
}

function supportIds(e: LedgerEntry) {
  return e.evidence.filter((l) => l.relation === "supports").map((l) => l.eventId);
}

/** Offline summary: confirmed facts in time order, each with its citations. */
export function templateSummary(c: Case): SummarySentence[] {
  return confirmedFacts(c).map((e) => {
    const t = e.text.replace(/[.\s]+$/, "");
    const when = e.eventTime ? ` (${clockTime(e.eventTime, c.timezone)} ${c.timezone})` : "";
    return { text: `${t}${when}.`, citations: [e.id, ...supportIds(e)] };
  });
}

/* ------------------------------------------------------------------ */
/* Indicators: deterministic extraction from linked events             */
/* ------------------------------------------------------------------ */

export interface Indicator {
  type: "IP" | "Domain" | "File path" | "Hash";
  value: string;
  events: string[];
}

const PRIVATE_IP = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/;

export function linkedEventIds(c: Case): string[] {
  const s = new Set<string>();
  c.entries.forEach((e) => e.evidence.forEach((l) => s.add(l.eventId)));
  c.contradictions.forEach((x) => x.againstEventId && s.add(x.againstEventId));
  return [...s].sort();
}

export function extractIndicators(c: Case): Indicator[] {
  const map = new Map<string, Indicator>();
  const add = (type: Indicator["type"], value: string, ev: string) => {
    const v = value.trim();
    if (!v || v === "-") return;
    const k = `${type}:${v.toLowerCase()}`;
    const cur = map.get(k) ?? { type, value: v, events: [] };
    if (!cur.events.includes(ev)) cur.events.push(ev);
    map.set(k, cur);
  };
  const ids = new Set(linkedEventIds(c));
  for (const e of c.events) {
    if (!ids.has(e.id)) continue;
    const r = e.raw;
    const str = (k: string) => (typeof r[k] === "string" ? (r[k] as string) : r[k] !== undefined ? String(r[k]) : "");
    for (const k of ["DestinationIp", "dest_ip"]) if (str(k) && !PRIVATE_IP.test(str(k))) add("IP", str(k), e.id);
    for (const ip of str("QueryResults").split(";")) {
      const v = ip.replace(/^::ffff:/, "");
      if (v && !PRIVATE_IP.test(v)) add("IP", v, e.id);
    }
    for (const k of ["DestinationHostname", "dest_host", "QueryName"]) if (str(k)) add("Domain", str(k), e.id);
    for (const k of ["Image", "TargetFilename", "Path"]) if (str(k)) add("File path", str(k).replace(/^file:_/, ""), e.id);
    for (const part of str("Hashes").split(",")) if (part.includes("=")) add("Hash", part, e.id);
  }
  const order = { IP: 0, Domain: 1, "File path": 2, Hash: 3 };
  return [...map.values()].sort((a, b) => order[a.type] - order[b.type] || a.value.localeCompare(b.value));
}

/* ------------------------------------------------------------------ */
/* Markdown export                                                     */
/* ------------------------------------------------------------------ */

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function reportEventIds(c: Case, summary: SummarySentence[]): string[] {
  const s = new Set(linkedEventIds(c));
  summary.forEach((x) => x.citations.filter((id) => id.startsWith("EVT-")).forEach((id) => s.add(id)));
  return [...s].sort();
}

export function sourceCounts(c: Case): [string, number][] {
  const m = new Map<string, number>();
  c.events.forEach((e) => m.set(e.source, (m.get(e.source) ?? 0) + 1));
  return [...m.entries()];
}

export function toMarkdown(c: Case, summary: SummarySentence[], generatedAt = nowIso()): string {
  const tz = c.timezone;
  const t = (iso?: string) => (iso ? `${clockTime(iso, tz)}` : "—");
  const facts = confirmedFacts(c);
  const hyps = c.entries.filter((e) => e.kind === "hypothesis").sort(byTime);
  const open = c.entries.filter((e) => e.kind === "unknown" && !e.resolvedBy);
  const answered = c.entries.filter((e) => e.kind === "unknown" && e.resolvedBy);
  const events = new Map(c.events.map((e) => [e.id, e] as [string, LogEvent]));
  const L: string[] = [];

  L.push(`# ${c.id}: ${c.title}`, "");
  L.push(`- Severity: ${c.severity}`, `- Status: ${c.status}`, `- Analyst: ${c.analyst}`, `- Generated: ${generatedAt}`, `- Times shown in: ${tz}`);
  L.push(`- Evidence: ${c.events.length} events (${sourceCounts(c).map(([s, n]) => `${s} ${n}`).join(", ")})`, "");

  L.push("## Summary", "");
  if (!summary.length) L.push("_No confirmed facts yet._");
  summary.forEach((s) => L.push(`${s.text} [${s.citations.join(", ")}]`));
  L.push("");

  L.push("## Timeline of confirmed facts", "", "| Time | ID | Statement | Evidence |", "|---|---|---|---|");
  facts.forEach((e) => L.push(`| ${t(e.eventTime)} | ${e.id} | ${esc(e.text)} | ${supportIds(e).join(", ")} |`));
  L.push("");

  L.push("## Hypotheses", "");
  if (!hyps.length) L.push("_None._");
  hyps.forEach((e) => L.push(`- **${e.id}** ${e.text}${e.evidence.length ? ` (related: ${e.evidence.map((l) => l.eventId).join(", ")})` : ""}`));
  L.push("");

  L.push("## Open questions", "");
  if (!open.length) L.push("_None._");
  open.forEach((e) => L.push(`- **${e.id}** ${e.text}`));
  answered.forEach((e) => L.push(`- ~~${e.id} ${e.text}~~ answered by ${e.resolvedBy}`));
  L.push("");

  L.push("## Contradictions", "");
  if (!c.contradictions.length) L.push("_None found._");
  c.contradictions.forEach((x) => {
    const against = x.againstEventId ?? x.againstEntryId ?? "";
    const state = x.state === "open" ? "Open" : `${x.state === "resolved" ? "Resolved" : "Dismissed"}: ${x.resolutionNote ?? ""}`;
    L.push(`- **${x.id}** ${x.entryId} vs ${against}. ${x.explanation} — ${state}`);
  });
  L.push("");

  const ind = extractIndicators(c);
  L.push("## Indicators", "", "| Type | Value | Events |", "|---|---|---|");
  ind.forEach((i) => L.push(`| ${i.type} | \`${esc(i.value)}\` | ${i.events.join(", ")} |`));
  L.push("");

  L.push("## Appendix A: Reasoning trail", "");
  c.notes.forEach((n) => {
    const produced = c.entries.filter((e) => e.noteId === n.id).map((e) => e.id);
    L.push(`**${n.id}** · ${n.createdAt} · ${n.parser} parser`, "", `> ${n.text}`, "", `Produced: ${produced.join(", ") || "nothing (removed)"}`, "");
  });

  L.push("## Appendix B: Cited events", "");
  reportEventIds(c, summary).forEach((id) => {
    const e = events.get(id);
    if (!e) return;
    L.push(`### ${id}`, "", "```json", JSON.stringify(e.raw, null, 2), "```", "");
  });
  return L.join("\n");
}
