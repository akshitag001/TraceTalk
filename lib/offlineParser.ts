import { basename } from "./format";
import {
  EXFIL_BYTES,
  HEDGE_RE,
  UNKNOWN_RE,
  buildContext,
  extractEntities,
  isSpecific,
  matchEntity,
  mergeFields,
  quote,
  resolveProcess,
  sameProcess,
  splitStatements,
  type Statement,
} from "./retrieval";
import { inWindow } from "./time";
import type {
  CompactEvent,
  DraftContradiction,
  DraftEntry,
  EntryKind,
  EvidenceLink,
  LedgerSummary,
  ParseResultT,
} from "./types";

export function classify(text: string): EntryKind {
  if (UNKNOWN_RE.test(text)) return "unknown";
  if (HEDGE_RE.test(text)) return "hypothesis";
  return "fact";
}

const FILLER_RE = /^(so|okay|ok|um+|uh+|right|and|also|alright|well|now|confirmed|yeah|yes)\b[,.:]?\s+/i;

/** Light, meaning-preserving rewrite: drop fillers, de-first-person the common patterns. */
export function normalize(text: string, kind: EntryKind): string {
  let t = text.trim().replace(/\s+/g, " ").replace(/[.!]+$/, "");
  for (let i = 0; i < 4 && FILLER_RE.test(t); i++) t = t.replace(FILLER_RE, "");
  if (kind === "unknown") {
    t = t
      .replace(/^(we|i)\s+(haven'?t|have not)\s+(yet\s+)?(confirmed|verified|established)\s+(.*?)(\s+yet)?$/i, "Not yet confirmed: $5")
      .replace(/^(we|i)\s+(need to|should)\s+(check|confirm|verify|find out)\s+/i, "To check: ")
      .replace(/^(we're|we are|i'm|i am)\s+not sure\s+/i, "Unclear ");
  }
  if (kind === "hypothesis") {
    t = t.replace(/^(i|we)\s+(think|suspect|believe)\s+(that\s+)?/i, "Suspected: ");
  }
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t.endsWith("?") ? t : t + ".";
}

/* ------------------------------------------------------------------ */

interface LaunchClaim {
  child: string | null; // process basename, or null → use context
  parent: string;
}

const CONTEXT_RE = /\b(the process|this process|that process|it|this|that|the binary|the dll)\b/i;

export function parseLaunch(text: string): LaunchClaim | null {
  // Passive: "X was launched by Y"
  const p = text.match(/^(.*?)\b(?:was|were|got|is|being)?\s*(?:launched|started|spawned|executed|run|created|kicked off)\s+(?:by|from)\s+(?:the\s+)?([\w.\-]+)/i);
  if (p) {
    const parent = resolveProcess(p[2]);
    if (parent) {
      const childWord = p[1].trim().split(/\s+/).reverse().find((w) => resolveProcess(w));
      const child = childWord ? resolveProcess(childWord) : null;
      if (child || CONTEXT_RE.test(p[1])) return { child, parent };
    }
  }
  // Active: "Word spawned PowerShell"
  const a = text.match(/\b([\w.\-]+)\s+(?:launched|started|spawned|ran|executed|kicked off)\s+(?:the\s+)?([\w.\-]+)/i);
  if (a) {
    const parent = resolveProcess(a[1]);
    const child = resolveProcess(a[2]);
    if (parent && child) return { child, parent };
  }
  return null;
}

const NO_EXFIL_RE =
  /\b(no|nothing|zero)\s+(data\s+)?(was\s+)?(left|went out|exfiltrated|uploaded|sent|leaked)\b|\bno (data )?exfiltration\b|\bnothing (was )?(uploaded|exfiltrated|sent out)\b|\bdata (did not|didn'?t) leave\b/i;

const isSysmon1 = (e: CompactEvent) => e.source === "sysmon" && String(e.event_id) === "1";

function tightWindowHas(st: Statement, e: CompactEvent, wide = false) {
  if (!st.time) return false;
  return inWindow(e.timestamp, wide ? st.time.wide : st.time.tight);
}

function pushLink(links: EvidenceLink[], link: EvidenceLink) {
  const existing = links.find((l) => l.eventId === link.eventId);
  if (!existing) {
    links.push(link);
    return;
  }
  const rank = { contradicts: 3, supports: 2, related: 1 };
  if (rank[link.relation] > rank[existing.relation]) existing.relation = link.relation;
  existing.matchedFields = mergeFields(existing.matchedFields, link.matchedFields);
}

const IP_IN_TEXT = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

/** Process names and IPs a statement asserts, for claim-vs-claim checks (rule c). */
function processIpClaims(text: string): { proc: string; ip: string }[] {
  const ips = [...text.matchAll(IP_IN_TEXT)].map((m) => m[0]);
  if (!ips.length) return [];
  const procs = text.split(/[^\w.]+/).map(resolveProcess).filter(Boolean) as string[];
  return procs.flatMap((proc) => ips.map((ip) => ({ proc, ip })));
}

/* ------------------------------------------------------------------ */

export interface OfflineInput {
  note: string;
  candidates: CompactEvent[];
  pinnedEventIds: string[];
  ledger: LedgerSummary[];
  caseDate: string;
  timezone: string;
  /** When set, statements are not re-classified (recheck of an existing entry). */
  forcedKind?: EntryKind;
}

export function offlineParse(input: OfflineInput): ParseResultT {
  const { note, candidates, pinnedEventIds, ledger, caseDate, timezone } = input;
  const ctx = buildContext(candidates);
  const pinned = new Set(pinnedEventIds);
  const statements = input.forcedKind
    ? splitStatements(note, caseDate, timezone).slice(0, 1).map((s) => ({ ...s, text: note }))
    : splitStatements(note, caseDate, timezone);

  const entries: DraftEntry[] = [];
  const contradictions: DraftContradiction[] = [];
  let processContext: string | null = null;

  statements.forEach((st, i) => {
    const tempId = `t${i + 1}`;
    const kind = input.forcedKind ?? classify(st.text);
    const evidence: EvidenceLink[] = [];
    const entities = extractEntities(st.text, ctx);
    const launch = kind === "fact" ? parseLaunch(st.text) : null;

    if (launch) {
      // Rule (a): who launched whom, checked against sysmon 1 ParentImage.
      const child = launch.child ?? processContext;
      let pool = candidates.filter(isSysmon1);
      if (st.time) pool = pool.filter((e) => tightWindowHas(st, e, true));
      if (child) {
        let rel = pool.filter((e) => sameProcess(String(e.raw.Image ?? ""), child));
        if (!st.time) {
          const pinnedRel = rel.filter((e) => pinned.has(e.id));
          if (pinnedRel.length) rel = pinnedRel;
        }
        const sup = rel.filter((e) => sameProcess(String(e.raw.ParentImage ?? ""), launch.parent));
        if (sup.length) {
          for (const e of sup) {
            const f = [quote(e.raw, "Image", child), quote(e.raw, "ParentImage", launch.parent)].filter(Boolean);
            pushLink(evidence, { eventId: e.id, relation: "supports", matchedFields: f as EvidenceLink["matchedFields"] });
          }
        } else {
          for (const e of rel.slice(0, 2)) {
            const actual = basename(e.raw.ParentImage);
            const f = [quote(e.raw, "ParentImage", actual), quote(e.raw, "Image", child)].filter(Boolean);
            pushLink(evidence, { eventId: e.id, relation: "contradicts", matchedFields: f as EvidenceLink["matchedFields"] });
            contradictions.push({
              kind: "claim_vs_evidence",
              entryTempId: tempId,
              againstEventId: e.id,
              againstEntryId: null,
              explanation: `${e.id} ParentImage is ${actual}, not ${launch.parent}.`,
            });
          }
        }
        processContext = child;
      } else {
        const sup = pool.filter((e) => tightWindowHas(st, e) && sameProcess(String(e.raw.ParentImage ?? ""), launch.parent));
        for (const e of sup) {
          const f = quote(e.raw, "ParentImage", launch.parent);
          if (f) pushLink(evidence, { eventId: e.id, relation: "supports", matchedFields: [f] });
        }
      }
    } else {
      const link = (wide: boolean) => {
        let specificRelated = 0;
        for (const e of candidates) {
          let fields: EvidenceLink["matchedFields"] = [];
          let specific = false;
          for (const ent of entities) {
            const m = matchEntity(e, ent);
            if (m.length) {
              fields = mergeFields(fields, m);
              if (isSpecific(ent)) specific = true;
            }
          }
          if (!fields.length) continue;
          const timeOk = tightWindowHas(st, e, wide);
          if (timeOk && kind === "fact") {
            if (e.source === "sysmon" && String(e.event_id) === "10") {
              const g = quote(e.raw, "GrantedAccess", String(e.raw.GrantedAccess ?? ""));
              if (g) fields = mergeFields(fields, [g]);
            }
            pushLink(evidence, { eventId: e.id, relation: "supports", matchedFields: fields.slice(0, 3) });
          } else if (timeOk || pinned.has(e.id)) {
            pushLink(evidence, { eventId: e.id, relation: "related", matchedFields: fields.slice(0, 3) });
          } else if (specific && specificRelated < 3) {
            specificRelated++;
            pushLink(evidence, { eventId: e.id, relation: "related", matchedFields: fields.slice(0, 3) });
          }
        }
      };
      link(false);
      if (kind === "fact" && st.time && !evidence.some((l) => l.relation === "supports")) link(true);
    }

    // Rule (b): "no data left" vs a large proxy upload.
    if (kind === "fact" && NO_EXFIL_RE.test(st.text)) {
      for (const e of candidates) {
        const out = Number(e.raw.bytes_out);
        if (e.source !== "proxy" || !(out > EXFIL_BYTES)) continue;
        const existing = evidence.find((l) => l.eventId === e.id);
        if (existing) existing.relation = "contradicts";
        else pushLink(evidence, { eventId: e.id, relation: "contradicts", matchedFields: [{ field: "bytes_out", value: String(e.raw.bytes_out) }] });
        contradictions.push({
          kind: "claim_vs_evidence",
          entryTempId: tempId,
          againstEventId: e.id,
          againstEntryId: null,
          explanation: `${e.id} shows bytes_out ${String(e.raw.bytes_out)} to ${String(e.raw.dest_host ?? e.raw.dest_ip)}.`,
        });
      }
      // A "nothing happened" claim can't be supported by events that merely share keywords.
      for (const l of evidence) if (l.relation === "supports") l.relation = "related";
    }

    // Rule (c): two facts give the same process different destination IPs.
    if (kind === "fact") {
      const mine = processIpClaims(st.text);
      const priors = [
        ...ledger.filter((l) => l.kind === "fact").map((l) => ({ id: l.id, text: l.text, temp: false })),
        ...entries.filter((d) => d.kind === "fact").map((d) => ({ id: d.tempId, text: d.text, temp: true })),
      ];
      for (const c of mine) {
        for (const p of priors) {
          const clash = processIpClaims(p.text).find((x) => x.proc.toLowerCase() === c.proc.toLowerCase() && x.ip !== c.ip);
          if (clash && !p.temp) {
            contradictions.push({
              kind: "claim_vs_claim",
              entryTempId: tempId,
              againstEventId: null,
              againstEntryId: p.id,
              explanation: `${p.id} says ${c.proc} connected to ${clash.ip}; this note says ${c.ip}.`,
            });
          }
        }
      }
    }

    // Context for "the process" in the next statement.
    const firstSup = evidence.find((l) => l.relation === "supports");
    if (firstSup && !launch) {
      const ev = candidates.find((e) => e.id === firstSup.eventId);
      const img = ev?.raw.Image ?? ev?.raw.SourceImage;
      if (typeof img === "string") processContext = basename(img);
    }

    // eventTime: earliest supporting event, else the analyst's own spoken time.
    const supTimes = evidence
      .filter((l) => l.relation === "supports")
      .map((l) => candidates.find((e) => e.id === l.eventId)?.timestamp)
      .filter(Boolean)
      .sort() as string[];
    const eventTime = supTimes[0] ?? (st.ownTime ? new Date(st.ownTime.center).toISOString() : null);

    entries.push({ tempId, kind, text: normalize(st.text, kind), eventTime, evidence, answersUnknownIds: [] });
  });

  // Hypotheses split from a fact in the same sentence inherit its events as context.
  statements.forEach((st, i) => {
    const d = entries[i];
    if (d.kind === "fact") return;
    statements.forEach((other, j) => {
      if (j === i || other.sentence !== st.sentence || entries[j].kind !== "fact") return;
      for (const l of entries[j].evidence) {
        if (l.relation === "related") continue;
        pushLink(d.evidence, { eventId: l.eventId, relation: "related", matchedFields: l.matchedFields });
      }
    });
  });

  // A confirmed fact answers an open unknown that pointed at the same event.
  const openUnknowns = ledger.filter((l) => l.kind === "unknown" && !l.resolved);
  for (const d of entries) {
    if (d.kind !== "fact") continue;
    const sup = new Set(d.evidence.filter((l) => l.relation === "supports").map((l) => l.eventId));
    if (!sup.size) continue;
    d.answersUnknownIds = openUnknowns.filter((u) => u.evidence.some((id) => sup.has(id))).map((u) => u.id);
  }

  return { entries, contradictions };
}
