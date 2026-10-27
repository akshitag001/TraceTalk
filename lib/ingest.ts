import { summarize } from "./summarize";
import type { LogEvent, SourceType } from "./types";

const SOURCES: SourceType[] = ["sysmon", "winsec", "proxy", "defender"];

export interface IngestResult {
  events: LogEvent[];
  skipped: { line: number; reason: string }[];
}

export function toLogEvent(obj: Record<string, unknown>): LogEvent {
  const source = obj.source as SourceType;
  const event_id = obj.event_id as number | string;
  return {
    id: String(obj.id),
    timestamp: String(obj.timestamp),
    source,
    host: String(obj.host),
    event_id,
    raw: obj,
    summary: summarize(source, event_id, obj),
  };
}

/** Parse JSONL, validating the required fields on every line. */
export function ingestJsonl(text: string, existingIds: Set<string> = new Set()): IngestResult {
  const events: LogEvent[] = [];
  const skipped: IngestResult["skipped"] = [];
  const seen = new Set(existingIds);
  const lines = text.split(/\r?\n/);

  lines.forEach((line, i) => {
    const n = i + 1;
    if (!line.trim()) return;
    let obj: unknown;
    try {
      obj = JSON.parse(line);
    } catch {
      skipped.push({ line: n, reason: "not valid JSON" });
      return;
    }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      skipped.push({ line: n, reason: "not a JSON object" });
      return;
    }
    const o = obj as Record<string, unknown>;
    const missing = ["id", "timestamp", "source", "host", "event_id"].filter(
      (k) => o[k] === undefined || o[k] === null || o[k] === "",
    );
    if (missing.length) {
      skipped.push({ line: n, reason: `missing ${missing.join(", ")}` });
      return;
    }
    if (!SOURCES.includes(o.source as SourceType)) {
      skipped.push({ line: n, reason: `unknown source "${String(o.source)}"` });
      return;
    }
    if (Number.isNaN(new Date(String(o.timestamp)).getTime())) {
      skipped.push({ line: n, reason: "timestamp is not ISO 8601" });
      return;
    }
    if (seen.has(String(o.id))) {
      skipped.push({ line: n, reason: `duplicate id ${String(o.id)}` });
      return;
    }
    seen.add(String(o.id));
    events.push(toLogEvent(o));
  });

  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
  return { events, skipped };
}

export function compactEvent(e: LogEvent) {
  return { id: e.id, timestamp: e.timestamp, source: e.source, event_id: e.event_id, raw: e.raw };
}
