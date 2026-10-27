"use client";

import { useMemo, useState } from "react";
import { FileUp, RotateCcw } from "lucide-react";
import { SAMPLE_CASE_ID } from "@/lib/caseOps";
import { clockTime, shortHost } from "@/lib/format";
import type { CaseStore } from "@/lib/store";
import type { SourceType } from "@/lib/types";
import { useUi } from "@/lib/ui";
import { Button, cx } from "./primitives";

const SOURCES: SourceType[] = ["sysmon", "winsec", "proxy", "defender"];

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="border-b border-line px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="font-semibold text-text-2">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Check({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: React.ReactNode; count: number }) {
  return (
    <label className="flex h-6 cursor-pointer items-center gap-2 rounded px-1 hover:bg-surface-2">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-[var(--royal)]" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="mono text-text-3">{count}</span>
    </label>
  );
}

export function LeftRail({ store, width }: { store: CaseStore; width: number }) {
  const c = store((s) => s.case)!;
  const resetDemo = store((s) => s.resetDemo);
  const ui = useUi();
  const [confirmReset, setConfirmReset] = useState(false);

  const sourceCounts = useMemo(() => {
    const m = new Map<string, number>();
    c.events.forEach((e) => m.set(e.source, (m.get(e.source) ?? 0) + 1));
    return m;
  }, [c.events]);
  const hosts = useMemo(() => {
    const m = new Map<string, number>();
    c.events.forEach((e) => m.set(shortHost(e.host), (m.get(shortHost(e.host)) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [c.events]);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <aside style={{ width }} className="flex shrink-0 flex-col overflow-hidden bg-surface">
      <Section title="Sources">
        {SOURCES.filter((s) => sourceCounts.has(s)).map((s) => (
          <Check
            key={s}
            label={s}
            count={sourceCounts.get(s) ?? 0}
            checked={!ui.hiddenSources.includes(s)}
            onChange={() => ui.set({ hiddenSources: toggle(ui.hiddenSources, s) })}
          />
        ))}
      </Section>
      <Section title="Hosts">
        {hosts.map(([h, n]) => (
          <Check
            key={h}
            label={<span className="mono">{h}</span>}
            count={n}
            checked={!ui.hiddenHosts.includes(h)}
            onChange={() => ui.set({ hiddenHosts: toggle(ui.hiddenHosts, h) })}
          />
        ))}
      </Section>
      <section className="flex flex-col gap-1.5 border-b border-line px-3 py-2.5">
        <Button onClick={() => ui.set({ importOpen: true })} className="justify-start">
          <FileUp size={16} strokeWidth={1.5} /> Import logs
        </Button>
        {c.id === SAMPLE_CASE_ID &&
          (confirmReset ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="danger"
                className="flex-1 justify-center"
                onClick={() => {
                  resetDemo();
                  ui.resetForCase();
                  setConfirmReset(false);
                }}
              >
                Reset
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="ghost" className="justify-start" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={16} strokeWidth={1.5} /> Reset demo case
            </Button>
          ))}
      </section>
      <div className="flex min-h-0 flex-1 flex-col">
        <h2 className="px-3 pb-1 pt-2.5 font-semibold text-text-2">Activity</h2>
        <ol className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {c.activity.map((a, i) => (
            <li key={i} className="border-l border-line py-1 pl-2.5 text-sm">
              <div className={cx("leading-snug", a.actor === "system" ? "text-text-2" : "text-text")}>{a.text}</div>
              <div className="mono text-[11px] text-text-3" title={a.at}>
                {clockTime(a.at, c.timezone)} · {a.actor}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
