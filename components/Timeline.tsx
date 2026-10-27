"use client";

import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Pin, Search, X } from "lucide-react";
import { citationIndex, filterEvents, searchText } from "@/lib/derived";
import { clockTime, shortHost, shortTimeZone } from "@/lib/format";
import type { CaseStore } from "@/lib/store";
import type { LogEvent, Relation } from "@/lib/types";
import { useUi } from "@/lib/ui";
import { Dot, RELATION_VAR, cx } from "./primitives";

export const ROW_H = 28;
const COLS = "grid grid-cols-[16px_70px_78px_62px_46px_104px_minmax(0,1fr)] items-center gap-x-2 pr-3";

export function useVisibleEvents(store: CaseStore): LogEvent[] {
  const events = store((s) => s.case!.events);
  const { filterText, hiddenSources, hiddenHosts } = useUi();
  const hay = useMemo(() => new Map(events.map((e) => [e.id, searchText(e)])), [events]);
  return useMemo(
    () => filterEvents(events, hay, filterText, hiddenSources, hiddenHosts),
    [events, hay, filterText, hiddenSources, hiddenHosts],
  );
}

export function Timeline({ store }: { store: CaseStore }) {
  const c = store((s) => s.case)!;
  const ui = useUi();
  const rows = useVisibleEvents(store);
  const parentRef = useRef<HTMLDivElement>(null);
  const cites = useMemo(() => citationIndex(c), [c]);

  // Provenance: the hovered (or selected) ledger entry lights up its events.
  const activeEntryId = ui.hoverEntryId ?? ui.selectedEntryId;
  const provenance = useMemo(() => {
    const m = new Map<string, Relation>();
    const entry = c.entries.find((e) => e.id === activeEntryId);
    entry?.evidence.forEach((l) => m.set(l.eventId, l.relation));
    return m;
  }, [c.entries, activeEntryId]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 12,
  });

  useEffect(() => {
    if (!provenance.size) return;
    const idx = rows.findIndex((r) => provenance.has(r.id));
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provenance]);

  useEffect(() => {
    if (!ui.cursorEventId) return;
    const idx = rows.findIndex((r) => r.id === ui.cursorEventId);
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.cursorEventId]);

  const flash = new Set(ui.flash.ids);
  const pinned = new Set(ui.pinned);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-surface" aria-label="Timeline">
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line px-3">
        <h2 className="font-semibold">Timeline</h2>
        <span className="mono text-text-3">
          {rows.length === c.events.length ? `${rows.length} events` : `${rows.length} of ${c.events.length}`}
        </span>
        <div className="ml-auto flex h-7 w-[340px] max-w-[50%] items-center gap-1.5 rounded border border-line bg-surface-2 px-2 focus-within:border-royal">
          <Search size={14} strokeWidth={1.5} className="text-text-3" />
          <input
            id="timeline-filter"
            value={ui.filterText}
            onChange={(e) => ui.set({ filterText: e.target.value })}
            placeholder="Filter: text, src:proxy, host:FS-FIN-01, id:EVT-0017"
            className="min-w-0 flex-1 bg-transparent outline-none focus-visible:outline-none"
            spellCheck={false}
          />
          {ui.filterText && (
            <button aria-label="Clear filter" onClick={() => ui.set({ filterText: "" })} className="text-text-3 hover:text-text">
              <X size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      <div className={cx(COLS, "h-7 shrink-0 border-b border-line text-sm text-text-2")}>
        <span />
        <span>Time <span className="text-text-3">{shortTimeZone(c.timezone)}</span></span>
        <span>ID</span>
        <span>Source</span>
        <span>Event</span>
        <span>Host</span>
        <span>Summary</span>
      </div>

      {rows.length === 0 ? (
        <div className="p-6 text-text-2">
          No events match <code className="mono rounded bg-surface-2 px-1 text-text">{ui.filterText || "the source and host filters"}</code>.{" "}
          <button
            className="text-royal hover:underline"
            onClick={() => ui.set({ filterText: "", hiddenSources: [], hiddenHosts: [] })}
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto" role="grid" aria-rowcount={rows.length}>
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((v) => {
              const e = rows[v.index];
              const rel = provenance.get(e.id);
              const cited = cites.best.get(e.id);
              const isCursor = ui.cursorEventId === e.id;
              return (
                <div
                  key={`${e.id}-${flash.has(e.id) ? ui.flash.key : 0}`}
                  role="row"
                  aria-selected={isCursor}
                  data-event-id={e.id}
                  onClick={(ev) => {
                    if (ev.shiftKey || ev.metaKey || ev.ctrlKey) ui.togglePin(e.id);
                    else ui.openEvent(e.id);
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: ROW_H,
                    transform: `translateY(${v.start}px)`,
                    borderLeft: `3px solid ${rel ? RELATION_VAR[rel] : "transparent"}`,
                  }}
                  className={cx(
                    COLS,
                    "cursor-default select-none border-b border-line/50",
                    isCursor ? "bg-surface-2" : pinned.has(e.id) ? "bg-royal/[0.07] hover:bg-surface-2" : "hover:bg-surface-2/70",
                    rel && !isCursor && "bg-surface-2/40",
                    flash.has(e.id) && "flash-row",
                  )}
                >
                  <span className="flex items-center justify-center">
                    {pinned.has(e.id) ? (
                      <Pin size={12} strokeWidth={1.5} className="text-royal" aria-label="Pinned" />
                    ) : cited ? (
                      <Dot color={RELATION_VAR[cited]} />
                    ) : null}
                  </span>
                  <span className="mono text-text-2" title={e.timestamp}>
                    {clockTime(e.timestamp, c.timezone)}
                  </span>
                  <span className={cx("mono", isCursor ? "text-royal" : "text-text-2")}>{e.id}</span>
                  <span className="text-text-2">{e.source}</span>
                  <span className="mono text-text-2">{String(e.event_id)}</span>
                  <span className="mono truncate text-text-2" title={e.host}>
                    {shortHost(e.host)}
                  </span>
                  <span className="mono truncate text-text" title={e.summary}>
                    {e.summary}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
