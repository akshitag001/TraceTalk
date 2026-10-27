/* Runs the Section 10 demo script through the offline parser and prints the ledger. */
import { readFileSync } from "node:fs";
import { applyParse, buildParseRequest, createSampleCase, settleContradiction } from "../lib/caseOps";
import { offlineResponse } from "../lib/parseLocal";
import { valueInEvent } from "../lib/validate";

let c = createSampleCase(readFileSync("data/case_IR-2026-0147.jsonl", "utf8"));
console.log("events:", c.events.length, "proxy:", c.events.filter((e) => e.source === "proxy").length);

const lines: [string, string[]][] = [
  ["At 14:32 the host made an unusual outbound connection. The process was launched by PowerShell. We haven't confirmed data exfiltration yet.", []],
  ["PowerShell was started by Explorer, so the user probably ran it by hand.", ["EVT-0009"]],
  ["No data left the host.", []],
  ["Looks like they dumped credentials, rundll32 touched lsass at 14:41.", []],
  ["Confirmed. About 46 megabytes went out to the C2 at 14:52, right after they built cache.rar.", []],
];

let failures = 0;
for (const [text, pinned] of lines) {
  const req = buildParseRequest(c, text, pinned);
  const { next, outcome } = applyParse(c, text, pinned, offlineResponse(req));
  c = next;
  console.log(`\n> ${text}  [${req.candidates.length} candidates]`);
  for (const id of outcome.entryIds) {
    const e = c.entries.find((x) => x.id === id)!;
    console.log(`  ${e.id} ${e.kind}${e.status ? "/" + e.status : ""} t=${e.eventTime ?? "-"} "${e.text}"`);
    for (const l of e.evidence) console.log(`      ${l.relation.padEnd(11)} ${l.eventId}  ${l.matchedFields.map((f) => `${f.field}=${f.value}`).join(", ")}`);
  }
  for (const x of c.contradictions.filter((x) => outcome.entryIds.includes(x.entryId))) console.log(`  ${x.id} ${x.kind}: ${x.explanation}`);
  if (outcome.answered.length) console.log(`  answered: ${outcome.answered.join(", ")}`);
}

// Integrity: every stored quote must be in the event JSON.
for (const e of c.entries) for (const l of e.evidence) for (const f of l.matchedFields) {
  const ev = c.events.find((x) => x.id === l.eventId)!;
  if (!valueInEvent(ev.raw, f.field, f.value)) { failures++; console.log("BAD QUOTE", e.id, l.eventId, f); }
}
const expect = (ok: boolean, msg: string) => { if (!ok) { failures++; console.log("FAIL:", msg); } };
const byText = (re: RegExp) => c.entries.find((e) => re.test(e.text));
const sup = (re: RegExp, evt: string) => !!byText(re)?.evidence.some((l) => l.eventId === evt && l.relation === "supports");
expect(sup(/outbound/i, "EVT-0017") && sup(/outbound/i, "EVT-0018"), "line1 outbound supports 17,18");
expect(sup(/launched by powershell/i, "EVT-0015"), "line1 launched-by supports 15");
expect(byText(/exfiltration/i)?.kind === "unknown", "line1 unknown");
expect(byText(/explorer/i)?.status === "unverified", "line2 unverified");
expect(byText(/by hand/i)?.kind === "hypothesis", "line2 hypothesis");
expect(c.contradictions.some((x) => x.againstEventId === "EVT-0009"), "line2 contradiction EVT-0009");
expect(c.contradictions.some((x) => x.againstEventId === "EVT-0048"), "line3 contradiction EVT-0048");
expect(sup(/lsass/i, "EVT-0033"), "line4 fact EVT-0033");
expect(byText(/credentials/i)?.kind === "hypothesis", "line4 hypothesis");
expect(sup(/46 megabytes/i, "EVT-0048"), "line5 supports EVT-0048");
expect(!!byText(/exfiltration/i)?.resolvedBy, "line1 unknown answered by line5");
c = settleContradiction(c, c.contradictions[0].id, "resolved", "ok");
console.log(failures ? `\n${failures} failure(s)` : "\nALL DEMO CHECKS PASS");
process.exit(failures ? 1 : 0);
