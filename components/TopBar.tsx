"use client";

import Link from "next/link";
import { Keyboard, PanelRight } from "lucide-react";
import { logActivity } from "@/lib/caseOps";
import type { CaseStore } from "@/lib/store";
import type { CaseStatus, Severity } from "@/lib/types";
import { useUi } from "@/lib/ui";
import { Badge, IconButton, Menu, Mono, SEVERITY_TINT, STATUS_TINT } from "./primitives";
import { ThemeToggle } from "./ThemeToggle";

const TIMEZONES = ["UTC", "Asia/Kolkata", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Singapore"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Two-stroke mark: a log line and the note that traces it. */
export function Mark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M3 3.5v9" stroke="var(--royal)" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M7 8h6" stroke="var(--text)" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function TopBar({ store }: { store: CaseStore }) {
  const c = store((s) => s.case)!;
  const update = store((s) => s.update);
  const ui = useUi();

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-line bg-surface px-3">
      <div className="flex items-center gap-2">
        <Mark />
        <span className="text-base font-semibold tracking-[-0.01em]">TraceTalk</span>
      </div>
      <div className="h-5 w-px bg-line" />
      <div className="flex min-w-0 items-center gap-3">
        <Mono className="text-text-2">{c.id}</Mono>
        <h1 className="truncate text-md font-semibold">{c.title}</h1>
        <Menu<Severity>
          label="Change severity"
          value={c.severity}
          options={["low", "medium", "high", "critical"]}
          onChange={(v) => update((x) => logActivity({ ...x, severity: v }, "analyst", `Severity set to ${v}`))}
          render={(v) => <Badge tint={SEVERITY_TINT[v]}>{cap(v)}</Badge>}
        />
        <Menu<CaseStatus>
          label="Change status"
          value={c.status}
          options={["open", "contained", "closed"]}
          onChange={(v) => update((x) => logActivity({ ...x, status: v }, "analyst", `Status set to ${v}`))}
          render={(v) => <Badge tint={STATUS_TINT[v]}>{cap(v)}</Badge>}
        />
      </div>

      <div className="ml-auto flex items-center gap-3 text-text-2">
        <span className="hidden xl:inline">
          Analyst: <span className="text-text">{c.analyst}</span>
        </span>
        <label className="flex items-center gap-1.5">
          <span>Spoken times</span>
          <select
            value={c.timezone}
            onChange={(e) => update((x) => logActivity({ ...x, timezone: e.target.value }, "analyst", `Spoken-time zone set to ${e.target.value}`))}
            className="h-7 w-[150px] rounded border border-line bg-surface-2 px-1.5 text-text"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
        <ThemeToggle />
        <IconButton label="Keyboard shortcuts (?)" onClick={() => ui.set({ shortcutsOpen: true })}>
          <Keyboard size={16} strokeWidth={1.5} />
        </IconButton>
        <IconButton
          label="Toggle ledger"
          className="min-[1280px]:hidden"
          onClick={() => ui.set({ ledgerDrawerOpen: !ui.ledgerDrawerOpen })}
        >
          <PanelRight size={16} strokeWidth={1.5} />
        </IconButton>
        <Link
          href={`/case/${c.id}/report`}
          className="inline-flex h-8 items-center rounded bg-text px-3 font-medium text-bg transition-colors duration-150 hover:bg-text/85"
        >
          Export report
        </Link>
      </div>
    </header>
  );
}
