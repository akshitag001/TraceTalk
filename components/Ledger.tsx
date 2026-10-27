"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Trash2, X } from "lucide-react";
import { editEntry, recheck } from "@/lib/actions";
import { deleteEntry, settleContradiction, updateEntry } from "@/lib/caseOps";
import { clockTime } from "@/lib/format";
import type { CaseStore } from "@/lib/store";
import type { Case, Contradiction, EntryKind, LedgerEntry } from "@/lib/types";
import { useUi, type LedgerFilter } from "@/lib/ui";
import { Badge, Button, Dot, FactBadge, IconButton, KIND_LABEL, KIND_VAR, Mono, RELATION_VAR, cx } from "./primitives";

function openConflictEntryIds(c: Case) {
  const s = new Set<string>();
  c.contradictions.filter((x) => x.state === "open").forEach((x) => {
    s.add(x.entryId);
    if (x.againstEntryId) s.add(x.againstEntryId);
  });
  return s;
}

function EvidenceChip({ id, relation }: { id: string; relation: keyof typeof RELATION_VAR }) {
  const ui = useUi();
  return (
    <button
      onClick={(ev) => {
        ev.stopPropagation();
        ui.openEvent(id);
      }}
      title={`${relation} · open ${id}`}
      className="mono inline-flex h-[18px] items-center gap-1 rounded border border-line px-1 text-[11px] text-text-2 hover:border-text-3 hover:text-text"
    >
      <Dot color={RELATION_VAR[relation]} />
      {id}
    </button>
  );
}

function EntryDetail({ entry, store }: { entry: LedgerEntry; store: CaseStore }) {
  const c = store((s) => s.case)!;
  const update = store((s) => s.update);
  const ui = useUi();
  const note = c.notes.find((n) => n.id === entry.noteId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-2 space-y-2.5 border-t border-line pt-2" onClick={(e) => e.stopPropagation()}>
      {note && (
        <div>
          <div className="mb-0.5 text-sm text-text-2">
            Source note <Mono className="text-text-3">{note.id}</Mono> · {note.parser === "model" ? "model parser" : "offline parser"}
          </div>
          <blockquote className="border-l-2 border-line pl-2 text-text-2">&ldquo;{note.text}&rdquo;</blockquote>
        </div>
      )}

      <div>
        <div className="mb-1 text-sm text-text-2">Evidence</div>
        {entry.evidence.length === 0 && <p className="text-sm text-text-3">No linked events.</p>}
        <ul className="space-y-1.5">
          {entry.evidence.map((l) => (
            <li key={l.eventId} className="rounded border border-line bg-bg/40 px-2 py-1.5">
              <div className="flex items-center gap-2">
                <EvidenceChip id={l.eventId} relation={l.relation} />
                <span className="text-sm" style={{ color: RELATION_VAR[l.relation] }}>
                  {l.relation}
                </span>
                <IconButton
                  label={`Unlink ${l.eventId}`}
                  className="ml-auto h-5 w-5"
                  onClick={() =>
                    update((x) =>
                      updateEntry(x, entry.id, { evidence: entry.evidence.filter((y) => y.eventId !== l.eventId) }, `unlinked ${l.eventId}`),
                    )
                  }
                >
                  <X size={12} strokeWidth={1.5} />
                </IconButton>
              </div>
              <ul className="mt-1 space-y-0.5">
                {l.matchedFields.map((f, i) => (
                  <li key={i} className="mono break-all text-[11px] text-text-2">
                    {f.field} <span className="text-text-3">=</span> <span className="text-text">{f.value}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      {editing ? (
        <div className="space-y-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            autoFocus
            className="w-full resize-y rounded border border-line bg-surface-2 px-2 py-1 outline-none focus:border-royal"
          />
          <div className="flex gap-1.5">
            <Button
              variant="primary"
              disabled={draft.trim().length < 3}
              onClick={() => {
                setEditing(false);
                if (draft.trim() !== entry.text) run("recheck", () => editEntry(store, entry.id, { text: draft.trim() }));
              }}
            >
              Save and recheck
            </Button>
            <Button variant="ghost" onClick={() => { setEditing(false); setDraft(entry.text); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button onClick={() => setEditing(true)}>Edit text</Button>
          <select
            aria-label="Change kind"
            value={entry.kind}
            onChange={(e) => run("recheck", () => editEntry(store, entry.id, { kind: e.target.value as EntryKind }))}
            className="h-7 rounded border border-line bg-surface-2 px-1.5"
          >
            {(["fact", "hypothesis", "unknown"] as EntryKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <Button disabled={!!busy} onClick={() => run("recheck", () => recheck(store, [entry.id]))}>
            <RefreshCw size={busy ? 12 : 14} strokeWidth={1.5} className={busy ? "animate-spin" : ""} /> {busy ? "Checking…" : "Recheck"}
          </Button>
          {confirmDelete ? (
            <>
              <Button
                variant="danger"
                onClick={() => {
                  update((x) => deleteEntry(x, entry.id));
                  ui.set({ expandedEntryId: null, selectedEntryId: null, hoverEntryId: null });
                }}
              >
                Delete {entry.id}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
            </>
          ) : (
            <IconButton label="Delete entry" className="ml-auto h-7 w-7" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} strokeWidth={1.5} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry, store, isNew, conflicted }: { entry: LedgerEntry; store: CaseStore; isNew: boolean; conflicted: boolean }) {
  const tz = store((s) => s.case!.timezone);
  const ui = useUi();
  const expanded = ui.expandedEntryId === entry.id;
  const selected = ui.selectedEntryId === entry.id;
  const unverified = entry.kind === "fact" && entry.status === "unverified";

  return (
    <li
      data-entry={entry.id}
      tabIndex={0}
      onMouseEnter={() => ui.set({ hoverEntryId: entry.id })}
      onMouseLeave={() => ui.set({ hoverEntryId: null })}
      onFocus={() => ui.set({ selectedEntryId: entry.id })}
      onClick={() => ui.set({ selectedEntryId: entry.id, expandedEntryId: expanded ? null : entry.id })}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) ui.set({ expandedEntryId: expanded ? null : entry.id });
        if ((e.key === "j" || e.key === "ArrowDown") && e.target === e.currentTarget) {
          e.preventDefault();
          (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus();
        }
        if ((e.key === "k" || e.key === "ArrowUp") && e.target === e.currentTarget) {
          e.preventDefault();
          (e.currentTarget.previousElementSibling as HTMLElement | null)?.focus();
        }
      }}
      style={{ borderLeft: `3px ${unverified ? "dashed" : "solid"} ${KIND_VAR[entry.kind]}` }}
      className={cx(
        "cursor-default border-b border-line px-3 py-2 outline-offset-[-2px]",
        selected ? "bg-surface-2" : "hover:bg-surface-2/60",
        isNew && "entry-in",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-text-3">{expanded ? <ChevronDown size={12} strokeWidth={1.5} /> : <ChevronRight size={12} strokeWidth={1.5} />}</span>
        <Mono className="text-text-2">{entry.id}</Mono>
        {entry.eventTime && (
          <Mono className="text-text-3" title={entry.eventTime}>
            {clockTime(entry.eventTime, tz)}
          </Mono>
        )}
        <span className="ml-auto flex items-center gap-1">
          {conflicted && <Badge tint="tint-conflict">Conflict</Badge>}
          {entry.analystEdited && <Badge tint="tint-muted" title="Edited by analyst">Edited</Badge>}
          {entry.kind === "fact" && entry.status && <FactBadge status={entry.status} />}
          {entry.kind === "hypothesis" && <Badge tint="tint-hyp">Hypothesis</Badge>}
          {entry.kind === "unknown" &&
            (entry.resolvedBy ? <Badge tint="tint-muted">Answered</Badge> : <Badge tint="tint-unknown">Open</Badge>)}
        </span>
      </div>
      <p className="mt-1 pl-5 leading-snug">{entry.text}</p>
      {(entry.evidence.length > 0 || entry.resolvedBy) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-5">
          {entry.evidence.map((l) => (
            <EvidenceChip key={l.eventId} id={l.eventId} relation={l.relation} />
          ))}
          {entry.resolvedBy && (
            <span className="text-sm text-text-2">
              Answered by <Mono className="text-text">{entry.resolvedBy}</Mono>
            </span>
          )}
        </div>
      )}
      {expanded && (
        <div className="pl-5">
          <EntryDetail entry={entry} store={store} />
        </div>
      )}
    </li>
  );
}

function ContradictionItem({ x, store }: { x: Contradiction; store: CaseStore }) {
  const update = store((s) => s.update);
  const ui = useUi();
  const [mode, setMode] = useState<"resolved" | "dismissed" | null>(null);
  const [note, setNote] = useState("");
  const focus = (entryId: string) => ui.set({ selectedEntryId: entryId, expandedEntryId: entryId });

  return (
    <li className={cx("border-b border-line px-3 py-2", x.state !== "open" && "opacity-70")} style={{ borderLeft: `3px solid ${x.state === "open" ? "var(--conflict)" : "var(--line)"}` }}>
      <div className="flex items-center gap-2">
        <Mono className="text-text-2">{x.id}</Mono>
        <span className="text-sm text-text-3">{x.kind === "claim_vs_evidence" ? "Claim vs evidence" : "Claim vs claim"}</span>
        <span className="ml-auto">
          {x.state === "open" ? <Badge tint="tint-conflict">Open</Badge> : <Badge tint="tint-muted">{x.state === "resolved" ? "Resolved" : "Dismissed"}</Badge>}
        </span>
      </div>
      <p className="mt-1 leading-snug">{x.explanation}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-text-2">
        <button
          onClick={() => focus(x.entryId)}
          onMouseEnter={() => ui.set({ hoverEntryId: x.entryId })}
          onMouseLeave={() => ui.set({ hoverEntryId: null })}
          className="mono rounded border border-line px-1 text-[11px] hover:text-text"
        >
          {x.entryId}
        </button>
        <span>against</span>
        {x.againstEventId && <EvidenceChip id={x.againstEventId} relation="contradicts" />}
        {x.againstEntryId && (
          <button onClick={() => focus(x.againstEntryId!)} className="mono rounded border border-line px-1 text-[11px] hover:text-text">
            {x.againstEntryId}
          </button>
        )}
      </div>
      {x.resolutionNote && <p className="mt-1 text-sm text-text-2">Note: {x.resolutionNote}</p>}
      {x.state === "open" &&
        (mode ? (
          <form
            className="mt-1.5 flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              update((c) => settleContradiction(c, x.id, mode, note.trim()));
              setMode(null);
            }}
          >
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={mode === "resolved" ? "How was it resolved?" : "Why dismiss it?"}
              className="h-7 min-w-0 flex-1 rounded border border-line bg-surface-2 px-2 outline-none focus:border-royal"
            />
            <Button type="submit" variant="primary" disabled={!note.trim()}>
              {mode === "resolved" ? "Resolve" : "Dismiss"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode(null)}>
              Cancel
            </Button>
          </form>
        ) : (
          <div className="mt-1.5 flex gap-1.5">
            <Button onClick={() => setMode("resolved")}>Resolve</Button>
            <Button variant="ghost" onClick={() => setMode("dismissed")}>
              Dismiss
            </Button>
          </div>
        ))}
    </li>
  );
}

function Dock({ title, count, children, defaultOpen = true }: { title: string; count: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex min-h-0 flex-col border-t border-line">
      <button onClick={() => setOpen((o) => !o)} className="flex h-9 shrink-0 items-center gap-1.5 px-3 font-semibold hover:bg-surface-2/60">
        {open ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
        {title} <span className="mono font-normal text-text-3">{count}</span>
      </button>
      {open && <div className="min-h-0 overflow-y-auto">{children}</div>}
    </div>
  );
}

export function Ledger({ store }: { store: CaseStore }) {
  const c = store((s) => s.case)!;
  const ui = useUi();
  const conflicted = useMemo(() => openConflictEntryIds(c), [c]);
  const newIds = new Set(ui.lastOutcome?.entryIds ?? []);

  const counts = {
    all: c.entries.length,
    fact: c.entries.filter((e) => e.kind === "fact").length,
    hypothesis: c.entries.filter((e) => e.kind === "hypothesis").length,
    unknown: c.entries.filter((e) => e.kind === "unknown").length,
    conflict: c.entries.filter((e) => conflicted.has(e.id)).length,
  };
  const tabs: [LedgerFilter, string][] = [
    ["all", "All"],
    ["fact", "Facts"],
    ["hypothesis", "Hyp"],
    ["unknown", "Unknowns"],
    ["conflict", "Conflicts"],
  ];
  const shown = c.entries.filter((e) =>
    ui.ledgerFilter === "all" ? true : ui.ledgerFilter === "conflict" ? conflicted.has(e.id) : e.kind === ui.ledgerFilter,
  );
  const openQuestions = c.entries.filter((e) => e.kind === "unknown" && !e.resolvedBy);
  const contradictions = [...c.contradictions].sort((a, b) => Number(a.state !== "open") - Number(b.state !== "open"));
  const openCount = c.contradictions.filter((x) => x.state === "open").length;

  return (
    <section className="flex h-full min-h-0 flex-col bg-surface" aria-label="Evidence ledger">
      <div className="flex h-9 shrink-0 items-center border-b border-line px-3">
        <h2 className="font-semibold">Evidence ledger</h2>
        <span className="ml-auto text-sm text-text-3">
          <span className="kbd">e</span> to focus
        </span>
      </div>
      <div role="tablist" className="flex shrink-0 gap-1 border-b border-line px-2 py-1.5">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={ui.ledgerFilter === t}
            onClick={() => ui.set({ ledgerFilter: t })}
            className={cx(
              "inline-flex h-6 items-center gap-1 rounded px-1.5 text-sm",
              ui.ledgerFilter === t ? "bg-surface-2 text-text" : "text-text-2 hover:text-text",
            )}
          >
            {label} <span className={cx("mono text-[11px]", t === "conflict" && counts.conflict ? "text-conflict" : "text-text-3")}>{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {c.entries.length === 0 ? (
          <p className="px-3 py-4 text-text-2">No entries yet. Select events in the timeline, then describe what you see.</p>
        ) : shown.length === 0 ? (
          <p className="px-3 py-4 text-text-2">Nothing in this view.</p>
        ) : (
          <ul id="ledger-list">
            {shown.map((e) => (
              <EntryRow key={e.id} entry={e} store={store} isNew={newIds.has(e.id)} conflicted={conflicted.has(e.id)} />
            ))}
          </ul>
        )}
      </div>

      <div className="flex max-h-[48%] shrink-0 flex-col">
        <Dock title="Open questions" count={openQuestions.length}>
          {openQuestions.length === 0 ? (
            <p className="px-3 pb-2 text-sm text-text-3">No open questions.</p>
          ) : (
            <ul>
              {openQuestions.map((q) => (
                <li key={q.id}>
                  <button
                    onClick={() => ui.set({ selectedEntryId: q.id, expandedEntryId: q.id, ledgerFilter: "all" })}
                    onMouseEnter={() => ui.set({ hoverEntryId: q.id })}
                    onMouseLeave={() => ui.set({ hoverEntryId: null })}
                    className="flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-surface-2/60"
                  >
                    <Mono className="shrink-0 text-unknown">{q.id}</Mono>
                    <span className="leading-snug">{q.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Dock>
        <Dock title="Contradictions" count={openCount}>
          {contradictions.length === 0 ? (
            <p className="px-3 pb-2 text-sm text-text-3">No contradictions found.</p>
          ) : (
            <ul>
              {contradictions.map((x) => (
                <ContradictionItem key={x.id} x={x} store={store} />
              ))}
            </ul>
          )}
        </Dock>
      </div>
    </section>
  );
}
