"use client";

import { useMemo, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { basename, clockTime, humanBytes } from "@/lib/format";
import type { CaseStore } from "@/lib/store";
import type { LogEvent } from "@/lib/types";
import { useUi, type DrawerTab } from "@/lib/ui";
import { Badge, IconButton, KIND_VAR, Mono, RELATION_VAR, cx } from "./primitives";

const KEY_FIELDS: Record<string, string[]> = {
  "sysmon:1": ["Image", "CommandLine", "ParentImage", "User", "IntegrityLevel", "ProcessId", "CurrentDirectory", "Hashes"],
  "sysmon:3": ["Image", "DestinationIp", "DestinationPort", "DestinationHostname", "SourceIp", "SourcePort", "Protocol", "User"],
  "sysmon:10": ["SourceImage", "TargetImage", "GrantedAccess", "SourceUser", "TargetUser", "CallTrace"],
  "sysmon:11": ["Image", "TargetFilename", "User"],
  "sysmon:22": ["Image", "QueryName", "QueryResults", "QueryStatus", "User"],
  winsec: ["EventName", "TargetUserName", "TargetDomainName", "SubjectUserName", "LogonType", "IpAddress", "WorkstationName", "TargetServerName", "ProcessName", "Status", "SubStatus", "AuthenticationPackageName"],
  proxy: ["method", "url", "dest_ip", "dest_port", "status", "bytes_out", "bytes_in", "user", "src_ip", "category", "action", "user_agent"],
  defender: ["EventName", "ThreatName", "Severity", "Category", "Path", "ProcessName", "Action", "ActionName"],
};

function keyFields(e: LogEvent): string[] {
  const list = KEY_FIELDS[`${e.source}:${e.event_id}`] ?? KEY_FIELDS[e.source];
  if (list) return list.filter((k) => e.raw[k] !== undefined);
  return Object.keys(e.raw).filter((k) => !["id", "timestamp", "source", "host", "event_id"].includes(k));
}

/** explorer.exe → OUTLOOK.EXE → WINWORD.EXE → powershell.exe, following ProcessGuid links. */
function processChain(e: LogEvent, events: LogEvent[]): string[] {
  const guidOwner = new Map<string, LogEvent>();
  for (const x of events) if (x.source === "sysmon" && String(x.event_id) === "1" && x.raw.ProcessGuid) guidOwner.set(String(x.raw.ProcessGuid), x);
  const self = e.raw.Image ?? e.raw.SourceImage;
  if (!self) return [];
  const chain = [basename(self)];
  let guid = e.raw.ParentProcessGuid ?? guidOwner.get(String(e.raw.ProcessGuid ?? e.raw.SourceProcessGuid))?.raw.ParentProcessGuid;
  let fallback = e.raw.ParentImage ?? guidOwner.get(String(e.raw.ProcessGuid ?? e.raw.SourceProcessGuid))?.raw.ParentImage;
  for (let i = 0; i < 6; i++) {
    const parent = guid ? guidOwner.get(String(guid)) : undefined;
    if (parent) {
      chain.unshift(basename(parent.raw.Image));
      guid = parent.raw.ParentProcessGuid;
      fallback = parent.raw.ParentImage;
    } else {
      if (fallback) chain.unshift(basename(fallback));
      break;
    }
  }
  return chain.length > 1 ? chain : [];
}

function Value({ field, value }: { field: string; value: unknown }) {
  if (field === "bytes_out" || field === "bytes_in") {
    return (
      <span title={`${String(value)} bytes`} className="tnum">
        {humanBytes(value)}
      </span>
    );
  }
  return <>{String(value)}</>;
}

export function EventDrawer({ store, height }: { store: CaseStore; height: number }) {
  const c = store((s) => s.case)!;
  const ui = useUi();
  const [copied, setCopied] = useState(false);
  const e = c.events.find((x) => x.id === ui.cursorEventId);
  const chain = useMemo(() => (e ? processChain(e, c.events) : []), [e, c.events]);
  const citedBy = useMemo(
    () =>
      e
        ? c.entries.flatMap((en) => en.evidence.filter((l) => l.eventId === e.id).map((l) => ({ entry: en, link: l })))
        : [],
    [e, c.entries],
  );

  if (!ui.drawerOpen || !e) {
    return (
      <section style={{ height: 36 }} className="flex shrink-0 items-center bg-surface px-3 text-text-3">
        Select an event to inspect it. Shift-click rows to pin them to your next note.
      </section>
    );
  }

  const tabs: [DrawerTab, string][] = [
    ["summary", "Summary"],
    ["raw", "Raw"],
    ["cited", `Cited by ${citedBy.length}`],
  ];

  return (
    <section style={{ height }} className="flex shrink-0 flex-col bg-surface" aria-label="Event drawer">
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line px-3">
        <Mono className="text-royal">{e.id}</Mono>
        <span className="text-text-2">
          {e.source} {String(e.event_id)}
        </span>
        <Mono className="text-text-2" title={e.timestamp}>
          {clockTime(e.timestamp, c.timezone)}
        </Mono>
        <div role="tablist" className="ml-3 flex h-full items-stretch">
          {tabs.map(([t, label]) => (
            <button
              key={t}
              role="tab"
              aria-selected={ui.drawerTab === t}
              onClick={() => ui.set({ drawerTab: t })}
              className={cx(
                "-mb-px border-b px-2.5",
                ui.drawerTab === t ? "border-royal text-text" : "border-transparent text-text-2 hover:text-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => ui.togglePin(e.id)}
          className={cx("ml-auto text-sm", ui.pinned.includes(e.id) ? "text-royal" : "text-text-2 hover:text-text")}
        >
          {ui.pinned.includes(e.id) ? "Pinned to next note" : "Pin to next note"} <span className="kbd ml-1">p</span>
        </button>
        <IconButton label="Close drawer (Esc)" onClick={() => ui.set({ drawerOpen: false })}>
          <X size={16} strokeWidth={1.5} />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {ui.drawerTab === "summary" && (
          <div className="px-3 py-2.5">
            <p className="mono mb-2.5 text-text">{e.summary}</p>
            {chain.length > 0 && (
              <div className="mb-2.5 flex flex-wrap items-center gap-1 text-text-2">
                <span className="mr-1">Process chain</span>
                {chain.map((p, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-text-3">→</span>}
                    <span className={cx("mono rounded px-1", i === chain.length - 1 ? "bg-surface-2 text-text" : "")}>{p}</span>
                  </span>
                ))}
              </div>
            )}
            <dl className="grid grid-cols-[160px_minmax(0,1fr)] gap-x-3 gap-y-1">
              <dt className="text-text-2">Timestamp</dt>
              <dd className="mono">{e.timestamp}</dd>
              <dt className="text-text-2">Host</dt>
              <dd className="mono">{e.host}</dd>
              {keyFields(e).map((k) => (
                <div key={k} className="contents">
                  <dt className="truncate text-text-2">{k}</dt>
                  <dd className="mono break-all">
                    <Value field={k} value={e.raw[k]} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {ui.drawerTab === "raw" && (
          <div className="relative">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(e.raw, null, 2));
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="absolute right-3 top-2 inline-flex items-center gap-1 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-sm text-text-2 hover:text-text"
            >
              {copied ? <Check size={12} strokeWidth={1.5} /> : <Copy size={12} strokeWidth={1.5} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <pre className="mono whitespace-pre-wrap break-all px-3 py-2.5 text-text">{JSON.stringify(e.raw, null, 2)}</pre>
          </div>
        )}

        {ui.drawerTab === "cited" && (
          <div className="py-1">
            {citedBy.length === 0 && <p className="px-3 py-2 text-text-2">No ledger entry cites this event yet.</p>}
            {citedBy.map(({ entry, link }) => (
              <button
                key={entry.id}
                onClick={() => ui.set({ selectedEntryId: entry.id, expandedEntryId: entry.id, ledgerDrawerOpen: true })}
                onMouseEnter={() => ui.set({ hoverEntryId: entry.id })}
                onMouseLeave={() => ui.set({ hoverEntryId: null })}
                className="flex w-full items-start gap-3 px-3 py-1.5 text-left hover:bg-surface-2"
                style={{ borderLeft: `3px solid ${KIND_VAR[entry.kind]}` }}
              >
                <Mono className="w-16 shrink-0 text-text-2">{entry.id}</Mono>
                <span className="min-w-0 flex-1">{entry.text}</span>
                <Badge tint={link.relation === "supports" ? "tint-fact" : link.relation === "contradicts" ? "tint-conflict" : "tint-muted"}>
                  <span style={{ color: RELATION_VAR[link.relation] }}>{link.relation}</span>
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
