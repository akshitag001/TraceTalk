"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { recheck } from "@/lib/actions";
import { addEvents, createEmptyCase } from "@/lib/caseOps";
import { ingestJsonl, type IngestResult } from "@/lib/ingest";
import { addToCaseIndex, getCaseStore, type CaseStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { Button, IconButton, cx } from "./primitives";

export function ImportModal({ store }: { store: CaseStore }) {
  const c = store((s) => s.case)!;
  const ui = useUi();
  const router = useRouter();
  const [target, setTarget] = useState<"add" | "new">("add");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<(IngestResult & { file: string }) | null>(null);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const read = async (file: File) => {
    const text = await file.text();
    const existing = target === "add" ? new Set(c.events.map((e) => e.id)) : new Set<string>();
    setResult({ ...ingestJsonl(text, existing), file: file.name });
    setDone(null);
  };

  const commit = async () => {
    if (!result || !result.events.length) return;
    if (target === "add") {
      store.getState().update((x) => addEvents(x, result.events));
      setDone(`${result.events.length} events added to ${c.id}. Rechecking existing entries…`);
      // New evidence can contradict or confirm existing claims.
      const ids = store.getState().case!.entries.map((e) => e.id);
      if (ids.length) await recheck(store, ids);
      setDone(`${result.events.length} events added to ${c.id}.`);
    } else {
      const id = `CASE-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const t = title.trim() || result.file.replace(/\.jsonl$/i, "");
      getCaseStore(id).getState().replace(createEmptyCase(id, t, result.events));
      addToCaseIndex({ id, title: t });
      ui.set({ importOpen: false });
      ui.resetForCase();
      router.push(`/case/${id}`);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onMouseDown={() => ui.set({ importOpen: false })}>
      <div
        role="dialog"
        aria-modal
        aria-label="Import logs"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[520px] max-w-[calc(100vw-32px)] rounded-md border border-line bg-surface"
      >
        <div className="flex h-10 items-center border-b border-line px-4">
          <h2 className="font-semibold">Import logs</h2>
          <IconButton label="Close" className="ml-auto" onClick={() => ui.set({ importOpen: false })}>
            <X size={16} strokeWidth={1.5} />
          </IconButton>
        </div>
        <div className="space-y-3 p-4">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) read(f);
            }}
            className={cx(
              "flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed text-text-2 transition-colors",
              dragging ? "border-royal text-text" : "border-line hover:border-text-3",
            )}
          >
            <span>Drop a .jsonl file here, or click to choose</span>
            <span className="text-sm text-text-3">One JSON object per line with id, timestamp, source, host, event_id</span>
            <input type="file" accept=".jsonl,.json,.ndjson,.txt" className="sr-only" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
          </label>

          <fieldset className="flex gap-4">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={target === "add"} onChange={() => setTarget("add")} className="accent-[var(--royal)]" />
              Add to current case
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={target === "new"} onChange={() => setTarget("new")} className="accent-[var(--royal)]" />
              Start a new case
            </label>
          </fieldset>
          {target === "new" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Case title"
              className="h-7 w-full rounded border border-line bg-surface-2 px-2 outline-none focus:border-royal"
            />
          )}

          {result && (
            <div className="rounded border border-line bg-bg/50 p-2.5">
              <p>
                <span className="mono text-text-2">{result.file}</span>: {result.events.length} events imported, {result.skipped.length} skipped
              </p>
              {result.skipped.length > 0 && (
                <ul className="mono mt-1.5 max-h-32 overflow-y-auto text-[11px] text-conflict">
                  {result.skipped.map((s) => (
                    <li key={s.line}>
                      line {s.line}: {s.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {done && <p className="text-fact">{done}</p>}

          <div className="flex items-center gap-2 pt-1">
            <a href="/case_IR-2026-0147.jsonl" download className="text-royal hover:underline">
              Download sample log
            </a>
            <Button variant="ghost" className="ml-auto" onClick={() => ui.set({ importOpen: false })}>
              Close
            </Button>
            <Button variant="primary" disabled={!result?.events.length} onClick={commit}>
              {target === "add" ? "Add events" : "Create case"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
