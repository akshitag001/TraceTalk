import { z } from "zod";

export const ParseResult = z.object({
  entries: z.array(
    z.object({
      tempId: z.string(),
      kind: z.enum(["fact", "hypothesis", "unknown"]),
      text: z.string().min(3).max(300),
      eventTime: z.string().nullable(),
      evidence: z.array(
        z.object({
          eventId: z.string(),
          relation: z.enum(["supports", "contradicts", "related"]),
          matchedFields: z.array(z.object({ field: z.string(), value: z.string() })).min(1),
        }),
      ),
      answersUnknownIds: z.array(z.string()).default([]),
    }),
  ),
  contradictions: z.array(
    z.object({
      kind: z.enum(["claim_vs_evidence", "claim_vs_claim"]),
      entryTempId: z.string(),
      againstEventId: z.string().nullable(),
      againstEntryId: z.string().nullable(),
      explanation: z.string().max(240),
    }),
  ),
});

export const SummaryResult = z.object({
  sentences: z.array(z.object({ text: z.string().min(3).max(400), citations: z.array(z.string()).min(1) })).max(5),
});
