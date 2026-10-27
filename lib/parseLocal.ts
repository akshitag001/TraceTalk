import { offlineParse } from "./offlineParser";
import { validateParse } from "./validate";
import type { ParseRequest, ParseResponse } from "./types";

/** Offline rule-based parse of a request; same contract as the model path. */
export function offlineResponse(req: ParseRequest, fallbackReason?: string): ParseResponse {
  let raw;
  if (req.mode === "recheck" && req.recheck?.length) {
    const entries = [];
    const contradictions = [];
    for (const r of req.recheck) {
      const one = offlineParse({ ...req, note: r.text, forcedKind: r.kind });
      for (const d of one.entries.slice(0, 1)) entries.push({ ...d, tempId: r.id, text: r.text, answersUnknownIds: [] });
      for (const x of one.contradictions) if (x.entryTempId === "t1") contradictions.push({ ...x, entryTempId: r.id });
    }
    raw = { entries, contradictions };
  } else {
    raw = offlineParse(req);
  }
  const { result, rejected } = validateParse(raw, req.candidates, req.ledger);
  return { parser: "offline", fallbackReason, result, rejected };
}
