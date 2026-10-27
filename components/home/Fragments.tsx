import { Check, Pin, X } from "lucide-react";
import { hero, integrity } from "@/content/home";

/*
 * Static HTML renderings of the product, styled like the workbench.
 * Not screenshots, not interactive.
 */

const KIND_BAR = { fact: "var(--fact)", hypothesis: "var(--hyp)", unknown: "var(--unknown)", conflict: "var(--conflict)" };

function Chip({ id, note, tone = "var(--fact)" }: { id: string; note?: string; tone?: string }) {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-line-strong bg-bg px-1.5 font-mono text-[11px] text-text-2">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
      {id}
      {note && <span className="font-sans text-text-3">· {note}</span>}
    </span>
  );
}

function Tag({ children, tint }: { children: React.ReactNode; tint: string }) {
  return <span className={`inline-flex h-5 items-center rounded-sm px-1.5 text-[11px] font-medium ${tint}`}>{children}</span>;
}

export function HeroVisual() {
  const v = hero.visual;
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface text-[13px] leading-[1.5]">
      <div className="flex h-9 items-center gap-3 border-b border-line px-4">
        <span aria-hidden className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-line-strong" />
          <span className="h-2 w-2 rounded-full bg-line-strong" />
          <span className="h-2 w-2 rounded-full bg-line-strong" />
        </span>
        <span className="font-mono text-[12px] text-text-2">{v.caseId}</span>
      </div>
      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="border-b border-line p-5 md:border-b-0 md:border-r md:p-6">
          <div className="mb-3 text-[12px] text-text-2">{v.saidLabel}</div>
          <p className="text-[15px] leading-[1.6] text-text">
            &ldquo;
            {v.dictation.map((d, i) => (
              <span key={i} className={d.filler ? "text-text-3" : undefined}>
                {d.text}
              </span>
            ))}
            &rdquo;
          </p>
        </div>
        <div className="p-5 md:p-6">
          <div className="mb-3 text-[12px] text-text-2">{v.recordedLabel}</div>
          <ul className="space-y-2">
            {v.rows.map((r, i) => (
              <li
                key={r.id}
                className="hero-row rounded-sm border border-line bg-bg py-2.5 pl-3 pr-3"
                style={{ borderLeft: `3px solid ${KIND_BAR[r.kind]}`, animationDelay: `${i * 150}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-text-2">{r.id}</span>
                  <span className="ml-auto">
                    <Tag tint={r.kind === "fact" ? "tint-fact" : "tint-unknown"}>{r.badge}</Tag>
                  </span>
                </div>
                <p className="mt-1 text-text">{r.text}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.chips.map((c) => (
                    <Chip key={c.id} id={c.id} note={"note" in c ? c.note : undefined} tone={r.kind === "fact" ? "var(--fact)" : "var(--text-3)"} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const frame = "rounded-md border border-line bg-surface p-3 text-[13px] leading-[1.5]";

/** Step 1: a decluttered timeline row. */
function TimelineFragment() {
  return (
    <div className={frame}>
      <div className="rounded-sm border border-line bg-bg">
        <div className="flex items-start gap-3 px-3 py-2">
          <span className="pt-px font-mono text-[12px] text-text-2">14:31:48</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="font-mono text-[12px]">powershell.exe</span>
              <span className="text-text-2">started by</span>
              <span className="font-mono text-[12px]">WINWORD.EXE</span>
              <span className="rounded-sm border border-line-strong px-1.5 text-[11px] text-text-2">Encoded command</span>
            </div>
            <div className="mt-0.5 text-[12px] text-text-2">
              <span className="font-mono">EVT-0009</span> · sysmon 1 · WS-FIN-0142
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-line px-3 py-2 text-text-2">
          <span className="font-mono text-[12px]">14:32:07</span>
          <span className="truncate">
            <span className="font-mono text-[12px] text-text">POST …/api/v1/health</span> ×24 · every ~60s
          </span>
        </div>
      </div>
    </div>
  );
}

/** Step 2: a dictation in the composer. */
function ComposerFragment() {
  return (
    <div className={frame}>
      <div className="rounded-md border border-royal bg-bg p-3">
        <div className="mb-2 flex gap-1">
          <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-line-strong px-1.5 font-mono text-[11px] text-text-2">
            <Pin size={10} strokeWidth={1.5} /> EVT-0033
          </span>
        </div>
        <p className="text-[14px] text-text">Looks like they dumped credentials, rundll32 touched lsass at 14:41.</p>
        <div className="mt-2 flex items-center gap-1 text-[12px] text-text-3">
          <span className="kbd">Ctrl</span>
          <span className="kbd">Win</span>
          <span className="ml-1">held while speaking</span>
        </div>
      </div>
    </div>
  );
}

/** Step 3: a contradiction card. */
function ContradictionFragment() {
  return (
    <div className={frame}>
      <div className="rounded-sm border border-line bg-bg px-3 py-2.5" style={{ borderLeft: "3px solid var(--conflict)" }}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] text-text-2">CON-001</span>
          <span className="text-[12px] text-text-3">Claim vs evidence</span>
          <span className="ml-auto">
            <Tag tint="tint-conflict">Open</Tag>
          </span>
        </div>
        <p className="mt-1 text-text">
          <span className="font-mono text-[12px]">EVT-0009</span> ParentImage is <span className="font-mono text-[12px]">WINWORD.EXE</span>, not{" "}
          <span className="font-mono text-[12px]">explorer.exe</span>.
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-text-2">
          <Chip id="OBS-003" tone="var(--fact)" /> against <Chip id="EVT-0009" tone="var(--conflict)" />
        </div>
      </div>
    </div>
  );
}

/** Step 4: a report line with citations. */
function ReportFragment() {
  return (
    <div className={frame}>
      <div className="rounded-sm border border-line bg-bg px-4 py-3 text-[14px] leading-[1.6]">
        <p>
          Rundll32 opened lsass.exe with access 0x1010 at 14:41:55.{" "}
          <span className="font-mono text-[12px] text-text-2">
            [<span className="text-royal">OBS-005</span>, <span className="text-royal">EVT-0033</span>]
          </span>
        </p>
        <p className="mt-1.5">
          About 46 MB was uploaded to telemetry.edge-syncsvc.net at 14:52:13.{" "}
          <span className="font-mono text-[12px] text-text-2">
            [<span className="text-royal">OBS-006</span>, <span className="text-royal">EVT-0048</span>]
          </span>
        </p>
      </div>
    </div>
  );
}

export const STEP_FRAGMENTS = [TimelineFragment, ComposerFragment, ContradictionFragment, ReportFragment];

export function IntegrityExample() {
  const rows = [
    { ...integrity.accepted, ok: true },
    { ...integrity.rejected, ok: false },
  ];
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface text-[13px]">
      {rows.map((r) => (
        <div key={r.eventId} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            style={{ color: r.ok ? "var(--fact)" : "var(--conflict)", background: `color-mix(in srgb, ${r.ok ? "var(--fact)" : "var(--conflict)"} 12%, transparent)` }}
          >
            {r.ok ? <Check size={12} strokeWidth={2} aria-label="Accepted" /> : <X size={12} strokeWidth={2} aria-label="Rejected" />}
          </span>
          <span className="min-w-0 flex-1 break-words">
            <span className="font-mono text-[12px] text-text">{r.eventId}</span>
            <span className="text-text-3"> · </span>
            <span className="font-mono text-[12px] text-text-2">{r.field}</span>
            <span className="text-text-3"> = </span>
            <span className={`font-mono text-[12px] ${r.ok ? "text-text" : "text-text-2 line-through decoration-text-3"}`}>{r.value}</span>
          </span>
          <span className={`shrink-0 text-[12px] ${r.ok ? "text-fact" : "text-conflict"}`}>{r.note}</span>
        </div>
      ))}
    </div>
  );
}
