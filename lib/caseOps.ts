import { compactEvent, ingestJsonl } from "./ingest";
import { nowIso } from "./format";
import { retrieveCandidates } from "./retrieval";
import { validateParse } from "./validate";
import type {
  Activity,
  Case,
  Contradiction,
  EntryKind,
  LedgerEntry,
  LedgerSummary,
  LogEvent,
  Note,
  ParseRequest,
  ParseResponse,
} from "./types";

export const SAMPLE_CASE_ID = "IR-2026-0147";

export function createSampleCase(jsonl: string): Case {
  const { events } = ingestJsonl(jsonl);
  return {
    id: SAMPLE_CASE_ID,
    title: "Suspicious outbound from WS-FIN-0142",
    severity: "high",
    status: "open",
    analyst: "you",
    timezone: "UTC",
    caseDate: "2026-10-14",
    events,
    notes: [],
    entries: [],
    contradictions: [],
    activity: [{ at: nowIso(), actor: "system", text: `Case opened with ${events.length} events` }],
  };
}

export function createEmptyCase(id: string, title: string, events: LogEvent[]): Case {
  const first = events[0]?.timestamp.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  return {
    id,
    title,
    severity: "medium",
    status: "open",
    analyst: "you",
    timezone: "UTC",
    caseDate: first,
    events,
    notes: [],
    entries: [],
    contradictions: [],
    activity: [{ at: nowIso(), actor: "system", text: `Case opened with ${events.length} imported events` }],
  };
}

const PREFIX: Record<EntryKind, string> = { fact: "OBS", hypothesis: "HYP", unknown: "UNK" };

function counter(ids: string[], prefix: string): () => string {
  let n = ids.reduce((max, id) => {
    const m = id.match(new RegExp(`^${prefix}-(\\d+)$`));
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return () => `${prefix}-${String(++n).padStart(3, "0")}`;
}

export function statusFor(e: Pick<LedgerEntry, "kind" | "evidence">): LedgerEntry["status"] {
  if (e.kind !== "fact") return undefined;
  return e.evidence.some((l) => l.relation === "supports") ? "confirmed" : "unverified";
}

export function ledgerSummary(c: Case): LedgerSummary[] {
  return c.entries.map((e) => ({
    id: e.id,
    kind: e.kind,
    status: e.status,
    text: e.text,
    evidence: e.evidence.map((l) => l.eventId),
    resolved: e.kind === "unknown" ? !!e.resolvedBy : undefined,
  }));
}

export function buildParseRequest(c: Case, note: string, pinnedEventIds: string[]): ParseRequest {
  const compact = c.events.map(compactEvent);
  return {
    mode: "parse",
    note,
    pinnedEventIds,
    timezone: c.timezone,
    caseDate: c.caseDate,
    ledger: ledgerSummary(c),
    candidates: retrieveCandidates(note, compact, pinnedEventIds, c.caseDate, c.timezone),
  };
}

export function buildRecheckRequest(c: Case, entryIds: string[]): ParseRequest {
  const targets = c.entries.filter((e) => entryIds.includes(e.id));
  const text = targets.map((e) => e.text).join(" ");
  const pinned = [...new Set(targets.flatMap((e) => e.evidence.map((l) => l.eventId)))];
  const compact = c.events.map(compactEvent);
  return {
    mode: "recheck",
    note: text,
    pinnedEventIds: pinned,
    timezone: c.timezone,
    caseDate: c.caseDate,
    ledger: ledgerSummary(c).filter((l) => !entryIds.includes(l.id)),
    candidates: retrieveCandidates(text, compact, pinned, c.caseDate, c.timezone),
    recheck: targets.map((e) => ({ id: e.id, kind: e.kind, text: e.text })),
  };
}

function log(c: Case, actor: Activity["actor"], text: string): Activity[] {
  return [{ at: nowIso(), actor, text }, ...c.activity];
}

export interface ParseOutcome {
  noteId: string;
  entryIds: string[];
  eventIds: string[];
  contradictions: number;
  answered: string[];
  rejected: string[];
  parser: "model" | "offline";
  fallbackReason?: string;
}

/** Store a parsed note: verbatim note, entries with IDs, contradictions, answered unknowns, audit trail. */
export function applyParse(c: Case, noteText: string, pinned: string[], resp: ParseResponse): { next: Case; outcome: ParseOutcome } {
  // Re-validate against the full case: no link is stored unless its quoted value is in the event JSON.
  const { result, rejected: clientRejected } = validateParse(resp.result, c.events.map(compactEvent), ledgerSummary(c));
  const rejected = [...resp.rejected, ...clientRejected];
  const createdAt = nowIso();
  const noteId = counter(c.notes.map((n) => n.id), "NOTE")();
  const note: Note = { id: noteId, text: noteText, createdAt, pinnedEventIds: pinned, parser: resp.parser };

  const ids = c.entries.map((e) => e.id);
  const nextOf: Record<EntryKind, () => string> = {
    fact: counter(ids, PREFIX.fact),
    hypothesis: counter(ids, PREFIX.hypothesis),
    unknown: counter(ids, PREFIX.unknown),
  };
  const tempToId = new Map<string, string>();
  const newEntries: LedgerEntry[] = result.entries.map((d) => {
    const id = nextOf[d.kind]();
    tempToId.set(d.tempId, id);
    const entry: LedgerEntry = {
      id,
      kind: d.kind,
      text: d.text,
      eventTime: d.eventTime ?? undefined,
      noteId,
      evidence: d.evidence,
      createdAt,
      analystEdited: false,
    };
    entry.status = statusFor(entry);
    return entry;
  });

  const answered = new Map<string, string>();
  result.entries.forEach((d) => d.answersUnknownIds.forEach((u) => !answered.has(u) && answered.set(u, tempToId.get(d.tempId)!)));

  const nextCon = counter(c.contradictions.map((x) => x.id), "CON");
  const newCons: Contradiction[] = result.contradictions.map((x) => ({
    id: nextCon(),
    kind: x.kind,
    entryId: tempToId.get(x.entryTempId)!,
    againstEventId: x.againstEventId ?? undefined,
    againstEntryId: x.againstEntryId ?? undefined,
    explanation: x.explanation,
    state: "open",
  }));

  let activity = log(c, "analyst", `${noteId} captured (${resp.parser === "model" ? "model parser" : "offline parser"})`);
  const sys = (text: string) => (activity = [{ at: nowIso(), actor: "system", text }, ...activity]);
  if (newEntries.length) sys(`${newEntries.map((e) => e.id).join(", ")} added from ${noteId}`);
  newCons.forEach((x) => sys(`${x.id} flagged on ${x.entryId}`));
  answered.forEach((by, u) => sys(`${u} answered by ${by}`));
  rejected.forEach((r) => sys(r));

  const entries = [
    ...newEntries,
    ...c.entries.map((e) => (answered.has(e.id) ? { ...e, resolvedBy: answered.get(e.id) } : e)),
  ];

  return {
    next: { ...c, notes: [...c.notes, note], entries, contradictions: [...c.contradictions, ...newCons], activity },
    outcome: {
      noteId,
      entryIds: newEntries.map((e) => e.id),
      eventIds: [...new Set(newEntries.flatMap((e) => e.evidence.map((l) => l.eventId)))],
      contradictions: newCons.length,
      answered: [...answered.keys()],
      rejected,
      parser: resp.parser,
      fallbackReason: resp.fallbackReason,
    },
  };
}

/** Undo removes everything a note produced. */
export function undoNote(c: Case, noteId: string): Case {
  const removed = new Set(c.entries.filter((e) => e.noteId === noteId).map((e) => e.id));
  return {
    ...c,
    notes: c.notes.filter((n) => n.id !== noteId),
    entries: c.entries
      .filter((e) => !removed.has(e.id))
      .map((e) => (e.resolvedBy && removed.has(e.resolvedBy) ? { ...e, resolvedBy: undefined } : e)),
    contradictions: c.contradictions.filter((x) => !removed.has(x.entryId) && !(x.againstEntryId && removed.has(x.againstEntryId))),
    activity: log(c, "analyst", `${noteId} undone (${removed.size} entries removed)`),
  };
}

/** Merge a recheck result: refresh evidence on the target entries, add contradictions not already recorded. */
export function applyRecheck(c: Case, resp: ParseResponse, entryIds: string[]): { next: Case; added: number } {
  const { result, rejected } = validateParse(resp.result, c.events.map(compactEvent), ledgerSummary(c));
  const byTemp = new Map(result.entries.map((d) => [d.tempId, d]));
  const entries = c.entries.map((e) => {
    if (!entryIds.includes(e.id)) return e;
    const d = byTemp.get(e.id) ?? (entryIds.length === 1 ? result.entries[0] : undefined);
    if (!d) return e;
    // Keep existing links; a recheck can add links or change a relation, never silently drop one.
    const evidence = e.evidence.map((l) => d.evidence.find((n) => n.eventId === l.eventId) ?? l);
    for (const n of d.evidence) if (!evidence.some((l) => l.eventId === n.eventId)) evidence.push(n);
    const next = { ...e, evidence };
    return { ...next, status: statusFor(next) };
  });
  const nextCon = counter(c.contradictions.map((x) => x.id), "CON");
  const added: Contradiction[] = [];
  for (const x of result.contradictions) {
    const entryId = byTemp.has(x.entryTempId) ? x.entryTempId : entryIds.length === 1 ? entryIds[0] : null;
    if (!entryId) continue;
    const dup = [...c.contradictions, ...added].some(
      (y) => y.entryId === entryId && (y.againstEventId ?? null) === x.againstEventId && (y.againstEntryId ?? null) === x.againstEntryId,
    );
    if (dup) continue;
    added.push({
      id: nextCon(),
      kind: x.kind,
      entryId,
      againstEventId: x.againstEventId ?? undefined,
      againstEntryId: x.againstEntryId ?? undefined,
      explanation: x.explanation,
      state: "open",
    });
  }
  let activity = log(c, "system", `Rechecked ${entryIds.join(", ")}: ${added.length} new contradiction${added.length === 1 ? "" : "s"}`);
  rejected.forEach((r) => (activity = [{ at: nowIso(), actor: "system", text: r }, ...activity]));
  return { next: { ...c, entries, contradictions: [...c.contradictions, ...added], activity }, added: added.length };
}

export function updateEntry(c: Case, id: string, patch: Partial<Pick<LedgerEntry, "text" | "kind" | "evidence">>, what: string): Case {
  const entries = c.entries.map((e) => {
    if (e.id !== id) return e;
    const next = { ...e, ...patch, analystEdited: true };
    return { ...next, status: statusFor(next) };
  });
  return { ...c, entries, activity: log(c, "analyst", `${id} ${what}`) };
}

export function deleteEntry(c: Case, id: string): Case {
  return {
    ...c,
    entries: c.entries.filter((e) => e.id !== id).map((e) => (e.resolvedBy === id ? { ...e, resolvedBy: undefined } : e)),
    contradictions: c.contradictions.filter((x) => x.entryId !== id && x.againstEntryId !== id),
    activity: log(c, "analyst", `${id} deleted`),
  };
}

export function settleContradiction(c: Case, id: string, state: "resolved" | "dismissed", note: string): Case {
  return {
    ...c,
    contradictions: c.contradictions.map((x) => (x.id === id ? { ...x, state, resolutionNote: note } : x)),
    activity: log(c, "analyst", `${id} ${state} by analyst: ${note}`),
  };
}

export function addEvents(c: Case, events: LogEvent[]): Case {
  const merged = [...c.events, ...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
  return { ...c, events: merged, activity: log(c, "analyst", `${events.length} events imported`) };
}

export function logActivity(c: Case, actor: Activity["actor"], text: string): Case {
  return { ...c, activity: log(c, actor, text) };
}
