import { basename } from "./format";
import { extractTimes, inWindow, type SpokenTime } from "./time";
import type { CompactEvent, MatchedField } from "./types";

/* ------------------------------------------------------------------ */
/* Statements                                                          */
/* ------------------------------------------------------------------ */

export interface Statement {
  text: string;
  sentence: number; // index of the source sentence
  clause: number; // index within the sentence (clause splits on hedges)
  ownTime: SpokenTime | null;
  time: SpokenTime | null; // own, or inherited from earlier in the same note
}

export const HEDGE_RE =
  /\b(probably|likely|maybe|might|could|seems?|looks like|i think|we think|suspect|suggests?|possibly|perhaps|appears? to)\b/i;
export const UNKNOWN_RE =
  /\b(haven'?t|have not|hasn'?t|has not|not yet|not been)\s+(yet\s+)?(confirmed|verified|established|determined|checked)|\bnot confirmed\b|\bunclear\b|\bunknown\b|\bneed to (check|confirm|verify|find out)\b|\bnot sure\b|\bwhether\b|\bno idea\b|\bto be determined\b|\?\s*$/i;

function wordCount(s: string) {
  return s.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
}

/** Sentence split that leaves IPs, file names and times intact. */
function splitSentences(note: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < note.length; i++) {
    const c = note[i];
    buf += c;
    if (c === "\n" || ((c === "." || c === "!" || c === "?") && (i + 1 === note.length || /\s/.test(note[i + 1])))) {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/**
 * Split a sentence into clauses when one side hedges and the other doesn't
 * ("PowerShell was started by Explorer, so the user probably ran it").
 */
function splitClauses(sentence: string): string[] {
  const parts = sentence.split(/\s*(?:;|,\s*(?:so|which means|meaning|and so)?\s*)\s*/i);
  if (parts.length < 2) return [sentence];
  for (let i = 1; i < parts.length; i++) {
    const left = parts.slice(0, i).join(", ");
    const right = parts.slice(i).join(", ");
    if (wordCount(left) < 3 || wordCount(right) < 3) continue;
    const lh = HEDGE_RE.test(left) || UNKNOWN_RE.test(left);
    const rh = HEDGE_RE.test(right) || UNKNOWN_RE.test(right);
    if (lh !== rh) return [left, right];
  }
  return [sentence];
}

export function splitStatements(note: string, caseDate: string, tz: string): Statement[] {
  const out: Statement[] = [];
  let lastTime: SpokenTime | null = null;
  splitSentences(note).forEach((sentence, si) => {
    splitClauses(sentence).forEach((clause, ci) => {
      if (wordCount(clause) < 3) return;
      const times = extractTimes(clause, caseDate, tz);
      const ownTime = times[0] ?? null;
      const time = ownTime ?? lastTime;
      if (ownTime) lastTime = times[times.length - 1];
      out.push({ text: clause, sentence: si, clause: ci, ownTime, time });
    });
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Entities                                                            */
/* ------------------------------------------------------------------ */

export type Category = "net" | "dns" | "logon" | "file" | "exfil" | "cred";

export type Entity =
  | { kind: "literal"; value: string; specific: boolean; fields?: string[] }
  | { kind: "category"; cat: Category }
  | { kind: "size"; bytes: number[] } // decimal and binary readings of the spoken size
  | { kind: "source"; source: string };

/** Spoken keyword → process basename (spec 7.2). */
export const PROCESS_ALIASES: Record<string, string> = {
  powershell: "powershell.exe",
  pwsh: "pwsh.exe",
  word: "WINWORD.EXE",
  winword: "WINWORD.EXE",
  outlook: "OUTLOOK.EXE",
  rundll: "rundll32.exe",
  rundll32: "rundll32.exe",
  lsass: "lsass.exe",
  explorer: "explorer.exe",
  cmd: "cmd.exe",
  teams: "Teams.exe",
  onedrive: "OneDrive.exe",
  whoami: "whoami",
  nltest: "nltest",
};

const CATEGORY_RES: [Category, RegExp][] = [
  ["net", /\b(outbound|connected to|connection|connects?|beacon\w*|c2|callback|call(ed)? out|went out|egress|talk(ed|ing)? to)\b/i],
  ["dns", /\b(dns|resolved|resolves|resolution|lookup|looked up)\b/i],
  ["logon", /\b(log(ged)? ?on|log(ged)? ?in|logins?|logons?|authenticat\w*|failed logon)\b/i],
  ["file", /\b(dropped|wrote|written|file created|created (a )?file|saved|writes)\b/i],
  ["exfil", /\b(exfiltrat\w*|upload\w*|data (left|went out|leaving|leave)|went out|sent out|megabytes?|gigabytes?)\b/i],
  ["cred", /\b(credentials?|dump(ed|ing)?|mimikatz|password hashes)\b/i],
];

const IP_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const FILE_RE = /\b[\w-]+(?:\.[\w-]+)*\.(?:exe|dll|rar|docm|docx|xlsm|ps1|bin|zip|7z|bat|vbs|hta|lnk|js)\b/gi;
const DOMAIN_RE = /\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|in|local|co|info|biz|xyz|ru|cn)\b/gi;
const EVT_RE = /\bEVT-\d{4}\b/gi;
const SIZE_RE = /\b(\d+(?:\.\d+)?)\s*(kb|mb|gb|kilobytes?|megabytes?|gigabytes?|bytes?)\b/gi;
const PORT_RE = /\bport\s+(\d{2,5})\b|(?<=\b(?:\d{1,3}\.){3}\d{1,3}):(\d{2,5})\b/gi;

export interface EntityContext {
  users: string[];
  hosts: string[];
}

const GENERIC_USERS = new Set(["system", "local service", "network service", "-"]);

export function buildContext(events: CompactEvent[]): EntityContext {
  const users = new Set<string>();
  const hosts = new Set<string>();
  for (const e of events) {
    const r = e.raw;
    for (const k of ["TargetUserName", "SubjectUserName", "user", "User", "SourceUser", "DetectionUser"]) {
      const v = r[k];
      const u = typeof v === "string" ? v.split("\\").pop()!.toLowerCase() : "";
      if (u.length > 3 && !GENERIC_USERS.has(u)) users.add(u);
    }
    for (const k of ["host", "WorkstationName", "TargetServerName"]) {
      const v = r[k];
      if (typeof v === "string" && v.length > 3) hosts.add(v.split(".")[0].toLowerCase());
    }
  }
  return { users: [...users], hosts: [...hosts] };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractEntities(text: string, ctx: EntityContext): Entity[] {
  const out: Entity[] = [];
  const seen = new Set<string>();
  const lit = (value: string, specific: boolean, fields?: string[]) => {
    const k = value.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ kind: "literal", value, specific, fields });
  };

  for (const m of text.matchAll(IP_RE)) lit(m[0], true);
  const files = [...text.matchAll(FILE_RE)].map((m) => m[0]);
  files.forEach((f) => lit(f, !/^(powershell|cmd|rundll32|explorer|lsass)\.exe$/i.test(f)));
  for (const m of text.matchAll(DOMAIN_RE)) if (!files.some((f) => f.toLowerCase() === m[0].toLowerCase())) lit(m[0], true);
  for (const m of text.matchAll(EVT_RE)) lit(m[0].toUpperCase(), true, ["id"]);
  for (const m of text.matchAll(PORT_RE)) lit(m[1] ?? m[2], false, ["DestinationPort", "dest_port", "SourcePort"]);

  for (const [word, proc] of Object.entries(PROCESS_ALIASES)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) lit(proc, false);
  }
  for (const u of ctx.users) if (new RegExp(`\\b${escapeRe(u)}\\b`, "i").test(text)) lit(u, true);
  for (const h of ctx.hosts) if (new RegExp(`\\b${escapeRe(h)}\\b`, "i").test(text)) lit(h, true);

  if (/\bdefender\b|antivirus|quarantin/i.test(text)) out.push({ kind: "source", source: "defender" });
  if (/\bproxy\b/i.test(text)) out.push({ kind: "source", source: "proxy" });

  for (const [cat, re] of CATEGORY_RES) if (re.test(text)) out.push({ kind: "category", cat });

  for (const m of text.matchAll(SIZE_RE)) {
    const n = Number(m[1]);
    const u = m[2].toLowerCase();
    const mult = u.startsWith("k") ? 1 : u.startsWith("m") ? 2 : u.startsWith("g") ? 3 : 0;
    out.push({ kind: "size", bytes: [n * Math.pow(1000, mult), n * Math.pow(1024, mult)] });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Matching an entity against one event                               */
/* ------------------------------------------------------------------ */

const num = (v: unknown) => (typeof v === "number" ? v : Number(v));
const sysmon = (e: CompactEvent, id: number) => e.source === "sysmon" && String(e.event_id) === String(id);

/** Return a verbatim substring of raw[field] matching `needle` (case-insensitive), preserving the event's casing. */
export function quote(raw: Record<string, unknown>, field: string, needle: string): MatchedField | null {
  const v = raw[field];
  if (v === undefined || v === null || typeof v === "object") return null;
  const hay = String(v);
  const i = hay.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0 || !needle) return null;
  return { field, value: hay.slice(i, i + needle.length) };
}

function fieldsOf(e: CompactEvent, names: string[]): MatchedField[] {
  return names.flatMap((f) => {
    const v = e.raw[f];
    return v === undefined || v === null || typeof v === "object" ? [] : [{ field: f, value: String(v) }];
  });
}

export const EXFIL_BYTES = 10_000_000;

export function matchEntity(e: CompactEvent, ent: Entity): MatchedField[] {
  switch (ent.kind) {
    case "literal": {
      const keys = ent.fields ?? Object.keys(e.raw);
      const out: MatchedField[] = [];
      for (const k of keys) {
        const q = quote(e.raw, k, ent.value);
        if (q) out.push(q);
        if (out.length >= 2) break;
      }
      return out;
    }
    case "source":
      return e.source === ent.source ? fieldsOf(e, ["EventName", "ThreatName", "url"]).slice(0, 2) : [];
    case "size": {
      for (const f of ["bytes_out", "bytes_in"]) {
        const v = num(e.raw[f]);
        if (!Number.isFinite(v) || v <= 0) continue;
        if (ent.bytes.some((b) => b > 0 && Math.abs(v - b) / b <= 0.1)) return [{ field: f, value: String(e.raw[f]) }];
      }
      return [];
    }
    case "category":
      switch (ent.cat) {
        case "net":
          if (sysmon(e, 3)) return fieldsOf(e, ["DestinationIp", "DestinationPort"]);
          if (e.source === "proxy") return fieldsOf(e, ["dest_ip", "dest_port"]);
          return [];
        case "dns":
          return sysmon(e, 22) ? fieldsOf(e, ["QueryName", "QueryResults"]) : [];
        case "logon":
          return e.source === "winsec" ? fieldsOf(e, ["EventName", "TargetUserName"]) : [];
        case "file":
          return sysmon(e, 11) ? fieldsOf(e, ["TargetFilename"]) : [];
        case "exfil":
          return e.source === "proxy" && num(e.raw.bytes_out) > EXFIL_BYTES ? fieldsOf(e, ["bytes_out"]) : [];
        case "cred":
          return sysmon(e, 10) && /lsass/i.test(String(e.raw.TargetImage ?? "")) ? fieldsOf(e, ["TargetImage", "GrantedAccess"]) : [];
      }
  }
}

/** Specific entities are strong enough to link an event even outside the spoken time window. */
export function isSpecific(ent: Entity): boolean {
  return (ent.kind === "literal" && ent.specific) || ent.kind === "size" || (ent.kind === "category" && ent.cat === "exfil");
}

export function mergeFields(a: MatchedField[], b: MatchedField[]): MatchedField[] {
  const out = [...a];
  for (const f of b) if (!out.some((x) => x.field === f.field && x.value === f.value)) out.push(f);
  return out;
}

/* ------------------------------------------------------------------ */
/* Candidate retrieval (client-side, before calling the server)       */
/* ------------------------------------------------------------------ */

export const CANDIDATE_CAP = 25;

export function retrieveCandidates(
  note: string,
  events: CompactEvent[],
  pinnedIds: string[],
  caseDate: string,
  tz: string,
): CompactEvent[] {
  const ctx = buildContext(events);
  const statements = splitStatements(note, caseDate, tz);
  const windows = statements.map((s) => s.time?.wide).filter(Boolean) as [number, number][];
  const entities = statements.flatMap((s) => extractEntities(s.text, ctx));
  const pinned = new Set(pinnedIds);

  const scored = events.map((e) => {
    let score = 0;
    if (pinned.has(e.id)) score += 1000;
    const timeHit = windows.some((w) => inWindow(e.timestamp, w));
    let entityHit = 0;
    for (const ent of entities) {
      if (matchEntity(e, ent).length) entityHit = Math.max(entityHit, isSpecific(ent) ? 20 : 5);
    }
    if (timeHit && entityHit) score += 100 + entityHit;
    else if (timeHit) score += 50;
    else score += entityHit;
    // Prefer events nearest a spoken time.
    const dist = windows.length
      ? Math.min(...windows.map((w) => Math.abs(new Date(e.timestamp).getTime() - (w[0] + w[1]) / 2)))
      : 0;
    return { e, score, dist };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.dist - b.dist)
    .slice(0, CANDIDATE_CAP)
    .map((s) => s.e)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/** Basename comparison for process names ("C:\...\WINWORD.EXE" vs "winword.exe"). */
export function sameProcess(a: string, b: string): boolean {
  return basename(a).toLowerCase() === basename(b).toLowerCase();
}

export function resolveProcess(word: string): string | null {
  const w = word.toLowerCase().replace(/[^\w.]/g, "").replace(/\.+$/, "");
  if (w.endsWith(".exe")) return w;
  const alias = PROCESS_ALIASES[w] ?? PROCESS_ALIASES[w.replace(/\.exe$/, "")];
  return alias ?? null;
}
