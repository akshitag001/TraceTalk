import type { CompactEvent, EvidenceLink, LedgerSummary, ParseResultT } from "./types";

/** A quoted value must appear verbatim (case-insensitive substring) in raw[field]. */
export function valueInEvent(raw: Record<string, unknown>, field: string, value: string): boolean {
  if (!value) return false;
  const v = raw[field];
  if (v === undefined || v === null || typeof v === "object") return false;
  return String(v).toLowerCase().includes(value.toLowerCase());
}

/**
 * The integrity guarantee (spec 7.2 step 3). Applied to model output on the
 * server, and again on the client to everything before it is stored.
 */
export function validateParse(
  result: ParseResultT,
  candidates: CompactEvent[],
  ledger: LedgerSummary[],
): { result: ParseResultT; rejected: string[] } {
  const byId = new Map(candidates.map((e) => [e.id, e]));
  const ledgerIds = new Set(ledger.map((l) => l.id));
  const openUnknowns = new Set(ledger.filter((l) => l.kind === "unknown" && !l.resolved).map((l) => l.id));
  const rejected: string[] = [];

  const entries = result.entries.map((d) => {
    const evidence: EvidenceLink[] = [];
    for (const link of d.evidence) {
      const ev = byId.get(link.eventId);
      if (!ev) {
        rejected.push(`1 evidence link rejected: ${link.eventId} was not among the candidate events`);
        continue;
      }
      const fields = link.matchedFields.filter((f) => valueInEvent(ev.raw, f.field, f.value));
      if (fields.length < link.matchedFields.length && fields.length === 0) {
        rejected.push(`1 evidence link rejected: value not found in ${link.eventId}`);
        continue;
      }
      if (fields.length < link.matchedFields.length) {
        rejected.push(`${link.matchedFields.length - fields.length} quoted field(s) dropped: value not found in ${link.eventId}`);
      }
      const dup = evidence.find((l) => l.eventId === link.eventId);
      if (dup) continue;
      evidence.push({ eventId: link.eventId, relation: link.relation, matchedFields: fields });
    }
    const confirmed = d.kind === "fact" && evidence.some((l) => l.relation === "supports");
    // An unverified claim never answers an unknown.
    const answersUnknownIds = confirmed ? d.answersUnknownIds.filter((id) => openUnknowns.has(id)) : [];
    return { ...d, evidence, answersUnknownIds };
  });

  const tempIds = new Set(entries.map((e) => e.tempId));
  const contradictions = result.contradictions.filter((c) => {
    if (!tempIds.has(c.entryTempId)) return false;
    if (c.kind === "claim_vs_evidence") return !!c.againstEventId && byId.has(c.againstEventId);
    return !!c.againstEntryId && ledgerIds.has(c.againstEntryId);
  });
  if (contradictions.length < result.contradictions.length) {
    rejected.push(`${result.contradictions.length - contradictions.length} contradiction(s) dropped: no valid entry or event to cite`);
  }

  return { result: { entries, contradictions }, rejected };
}
