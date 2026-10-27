"use client";

import { applyParse, applyRecheck, buildParseRequest, buildRecheckRequest, updateEntry } from "./caseOps";
import { offlineResponse } from "./parseLocal";
import type { CaseStore } from "./store";
import type { LedgerEntry, ParseRequest, ParseResponse } from "./types";
import { useUi } from "./ui";

async function callParse(req: ParseRequest): Promise<ParseResponse> {
  try {
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as ParseResponse;
  } catch {
    // Server unreachable: same rules, run locally.
    return offlineResponse(req, "server unreachable");
  }
}

export async function submitNote(store: CaseStore, text: string) {
  const c = store.getState().case;
  const ui = useUi.getState();
  if (!c || !text.trim() || ui.parsing) return;
  const pinned = ui.pinned;
  ui.set({ parsing: true });
  try {
    const resp = await callParse(buildParseRequest(c, text, pinned));
    const current = store.getState().case!;
    const { next, outcome } = applyParse(current, text, pinned, resp);
    store.getState().replace(next);
    useUi.getState().set({ lastOutcome: outcome, pinned: [], ledgerFilter: "all" });
    useUi.getState().flashEvents(outcome.eventIds);
  } finally {
    useUi.getState().set({ parsing: false });
  }
}

export async function recheck(store: CaseStore, entryIds: string[]) {
  const c = store.getState().case;
  if (!c || !entryIds.length) return 0;
  const resp = await callParse(buildRecheckRequest(c, entryIds));
  const { next, added } = applyRecheck(store.getState().case!, resp, entryIds);
  store.getState().replace(next);
  const linked = next.entries.filter((e) => entryIds.includes(e.id)).flatMap((e) => e.evidence.map((l) => l.eventId));
  useUi.getState().flashEvents(linked);
  return added;
}

/** Edits change the claim, so contradiction checks run again for that entry. */
export async function editEntry(store: CaseStore, id: string, patch: Partial<Pick<LedgerEntry, "text" | "kind">>) {
  const what = patch.text !== undefined ? "text edited" : `kind changed to ${patch.kind}`;
  store.getState().update((c) => updateEntry(c, id, patch, what));
  await recheck(store, [id]);
}
