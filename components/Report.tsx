"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { HAS_API } from "@/lib/env";
import { clockTime, nowIso } from "@/lib/format";
import {
  confirmedFacts,
  extractIndicators,
  reportEventIds,
  sourceCounts,
  templateSummary,
  toMarkdown,
  type SummarySentence,
} from "@/lib/report";
import { getCaseStore, type CaseStore } from "@/lib/store";
import type { Case } from "@/lib/types";

/* The report is the one light surface: meant to be printed or sent. */
const C = {
  page: "#FFFFFF",
  text: "#0A0A0A",
  muted: "#666666",
  line: "#E8E8E8",
  code: "#FAFAFA",
  fact: "#15803D",
  hyp: "#B45309",
  unknown: "#6D28D9",
  conflict: "#DC2626",
  link: "#2445D1",
};

function Cite({ id }: { id: string }) {
  const href = id.startsWith("EVT-") ? `#evt-${id}` : `#entry-${id}`;
  return (
    <a href={href} className="mono" style={{ color: C.link, textDecoration: "none" }}>
      {id}
    </a>
  );
}

function Cites({ ids }: { ids: string[] }) {
  return (
    <span className="mono" style={{ color: C.muted }}>
      [
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ", "}
          <Cite id={id} />
        </span>
      ))}
      ]
    </span>
  );
}

function H2({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-10 text-[17px] font-semibold" style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 6 }}>
      <span style={{ color: C.muted }} className="mr-2 font-normal tnum">
        {n}.
      </span>
      {children}
    </h2>
  );
}

const th = "py-1.5 pr-3 text-left text-[12px] font-medium";
const td = "py-1.5 pr-3 align-top";

function ReportBody({ c }: { c: Case }) {
  const [generatedAt] = useState(nowIso);
  const fallback = useMemo(() => templateSummary(c), [c]);
  const [modelSummary, setModelSummary] = useState<SummarySentence[] | null>(null);
  const [summaryState, setSummaryState] = useState<"loading" | "model" | "template">("loading");

  useEffect(() => {
    const facts = confirmedFacts(c).map((e) => ({
      id: e.id,
      text: e.text,
      eventTime: e.eventTime,
      evidence: e.evidence.filter((l) => l.relation === "supports").map((l) => l.eventId),
    }));
    if (!facts.length || !HAS_API) {
      setSummaryState("template");
      return;
    }
    fetch("/api/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "summary", facts }) })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.sentences) && d.sentences.length) {
          setModelSummary(d.sentences);
          setSummaryState("model");
        } else setSummaryState("template");
      })
      .catch(() => setSummaryState("template"));
  }, [c]);

  const summary = modelSummary ?? fallback;
  const facts = confirmedFacts(c);
  const hyps = c.entries.filter((e) => e.kind === "hypothesis");
  const unknowns = c.entries.filter((e) => e.kind === "unknown");
  const indicators = extractIndicators(c);
  const appendix = reportEventIds(c, summary);
  const eventsById = new Map(c.events.map((e) => [e.id, e]));
  const tz = c.timezone;

  const download = () => {
    const blob = new Blob([toMarkdown(c, summary, generatedAt)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.id}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ background: C.page, color: C.text, minHeight: "100vh" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, html { background: ${C.page} !important; }
          a { color: ${C.text} !important; }
          pre { white-space: pre-wrap; break-inside: avoid; }
          h2 { break-after: avoid; }
        }
      `}</style>
      <div className="no-print sticky top-0 z-10" style={{ background: C.page, borderBottom: `1px solid ${C.line}` }}>
        <div className="mx-auto flex max-w-[760px] items-center gap-2 px-4 py-2.5 sm:px-0">
          <Link href={`/case/${c.id}`} className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: C.muted }}>
            <ArrowLeft size={16} strokeWidth={1.5} /> Back to workbench
          </Link>
          <button
            onClick={download}
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-[13px]"
            style={{ border: "1px solid #D4D4D4", background: C.page }}
          >
            <Download size={16} strokeWidth={1.5} /> Download Markdown
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-[13px] font-medium"
            style={{ background: C.text, color: C.page }}
          >
            <Printer size={16} strokeWidth={1.5} /> Print / Save as PDF
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-[760px] px-4 pb-24 pt-10 text-[15px] leading-[1.6] sm:px-0">
        <header>
          <div className="mono" style={{ color: C.muted }}>
            {c.id} · Incident report
          </div>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight">{c.title}</h1>
          <dl className="mt-4 grid grid-cols-[140px_1fr] gap-y-1 text-[13px]">
            <dt style={{ color: C.muted }}>Severity</dt>
            <dd className="capitalize">{c.severity}</dd>
            <dt style={{ color: C.muted }}>Status</dt>
            <dd className="capitalize">{c.status}</dd>
            <dt style={{ color: C.muted }}>Analyst</dt>
            <dd>{c.analyst}</dd>
            <dt style={{ color: C.muted }}>Generated</dt>
            <dd className="mono">{generatedAt}</dd>
            <dt style={{ color: C.muted }}>Evidence</dt>
            <dd>
              {c.events.length} events · {sourceCounts(c).map(([s, n]) => `${s} ${n}`).join(" · ")}
            </dd>
            <dt style={{ color: C.muted }}>Times shown in</dt>
            <dd>{tz}</dd>
          </dl>
        </header>

        <H2 n={1}>Summary</H2>
        {summaryState === "loading" && <p style={{ color: C.muted }}>Writing summary from confirmed facts…</p>}
        {summaryState !== "loading" && summary.length === 0 && <p style={{ color: C.muted }}>No confirmed facts yet. The summary is built only from confirmed facts.</p>}
        {summaryState !== "loading" && summary.length > 0 && (
          <>
            <p>
              {summary.map((s, i) => (
                <span key={i}>
                  {s.text.replace(/\s*$/, "")} <Cites ids={s.citations} />{" "}
                </span>
              ))}
            </p>
            <p className="mt-2 text-[12px]" style={{ color: C.muted }}>
              {summaryState === "model"
                ? "Drafted by the configured model from confirmed facts only. Every cited ID was checked; sentences citing unknown IDs were dropped."
                : "Built from confirmed facts in time order."}
            </p>
          </>
        )}

        <H2 n={2}>Timeline of confirmed facts</H2>
        {facts.length === 0 ? (
          <p style={{ color: C.muted }}>None yet.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.muted }}>
                <th className={th}>Time</th>
                <th className={th}>ID</th>
                <th className={th}>Statement</th>
                <th className={th}>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {facts.map((e) => (
                <tr key={e.id} id={`entry-${e.id}`} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className={`${td} mono whitespace-nowrap`} title={e.eventTime}>
                    {e.eventTime ? clockTime(e.eventTime, tz) : "—"}
                  </td>
                  <td className={`${td} mono`} style={{ color: C.fact }}>
                    {e.id}
                  </td>
                  <td className={td}>{e.text}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {e.evidence
                      .filter((l) => l.relation === "supports")
                      .map((l, i) => (
                        <span key={l.eventId}>
                          {i > 0 && <br />}
                          <Cite id={l.eventId} />
                        </span>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <H2 n={3}>Hypotheses</H2>
        {hyps.length === 0 ? (
          <p style={{ color: C.muted }}>None.</p>
        ) : (
          <ul className="space-y-2">
            {hyps.map((e) => (
              <li key={e.id} id={`entry-${e.id}`} className="pl-3" style={{ borderLeft: `3px solid ${C.hyp}` }}>
                <span className="mono mr-2" style={{ color: C.hyp }}>
                  {e.id}
                </span>
                {e.text} {e.evidence.length > 0 && <Cites ids={e.evidence.map((l) => l.eventId)} />}
              </li>
            ))}
          </ul>
        )}

        <H2 n={4}>Open questions</H2>
        {unknowns.length === 0 ? (
          <p style={{ color: C.muted }}>None.</p>
        ) : (
          <ul className="space-y-2">
            {unknowns.map((e) => (
              <li key={e.id} id={`entry-${e.id}`} className="pl-3" style={{ borderLeft: `3px solid ${C.unknown}` }}>
                <span className="mono mr-2" style={{ color: C.unknown }}>
                  {e.id}
                </span>
                {e.resolvedBy ? (
                  <>
                    <s style={{ color: C.muted }}>{e.text}</s> Answered by <Cite id={e.resolvedBy} />.
                  </>
                ) : (
                  <>{e.text} <span style={{ color: C.muted }}>Open.</span></>
                )}
              </li>
            ))}
          </ul>
        )}

        <H2 n={5}>Contradictions</H2>
        {c.contradictions.length === 0 ? (
          <p style={{ color: C.muted }}>None found.</p>
        ) : (
          <ul className="space-y-3">
            {c.contradictions.map((x) => (
              <li key={x.id} className="pl-3" style={{ borderLeft: `3px solid ${x.state === "open" ? C.conflict : C.line}` }}>
                <div>
                  <span className="mono mr-2" style={{ color: C.conflict }}>
                    {x.id}
                  </span>
                  <Cite id={x.entryId} /> vs {x.againstEventId && <Cite id={x.againstEventId} />}
                  {x.againstEntryId && <Cite id={x.againstEntryId} />}. {x.explanation}
                </div>
                <div className="text-[13px]" style={{ color: C.muted }}>
                  {x.state === "open" ? "Open." : `${x.state === "resolved" ? "Resolved" : "Dismissed"}: ${x.resolutionNote}`}
                </div>
              </li>
            ))}
          </ul>
        )}

        <H2 n={6}>Indicators</H2>
        {indicators.length === 0 ? (
          <p style={{ color: C.muted }}>No linked events yet.</p>
        ) : (
          <>
            <p className="mb-2 text-[13px]" style={{ color: C.muted }}>
              Extracted from linked events by field, not written by the parser.
            </p>
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.line}`, color: C.muted }}>
                  <th className={th}>Type</th>
                  <th className={th}>Value</th>
                  <th className={th}>Events</th>
                </tr>
              </thead>
              <tbody>
                {indicators.map((i) => (
                  <tr key={i.type + i.value} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td className={`${td} whitespace-nowrap`}>{i.type}</td>
                    <td className={`${td} mono break-all`}>{i.value}</td>
                    <td className={td}>
                      {i.events.map((id, k) => (
                        <span key={id}>
                          {k > 0 && ", "}
                          <Cite id={id} />
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <H2 n={7}>Reasoning trail</H2>
        {c.notes.length === 0 ? (
          <p style={{ color: C.muted }}>No notes captured.</p>
        ) : (
          <ol className="space-y-4">
            {c.notes.map((n) => {
              const produced = c.entries.filter((e) => e.noteId === n.id);
              return (
                <li key={n.id}>
                  <div className="text-[13px]" style={{ color: C.muted }}>
                    <span className="mono">{n.id}</span> · <span className="mono">{n.createdAt}</span> · {n.parser} parser
                    {n.pinnedEventIds.length > 0 && <> · pinned {n.pinnedEventIds.map((id, i) => <span key={id}>{i > 0 && ", "}<Cite id={id} /></span>)}</>}
                  </div>
                  <blockquote className="my-1 pl-3 italic" style={{ borderLeft: `2px solid ${C.line}` }}>
                    {n.text}
                  </blockquote>
                  <div className="text-[13px]">
                    Produced:{" "}
                    {produced.length ? produced.map((e, i) => <span key={e.id}>{i > 0 && ", "}<Cite id={e.id} /></span>) : <span style={{ color: C.muted }}>nothing kept</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <H2 n={8}>Appendix: cited events</H2>
        {appendix.map((id) => {
          const e = eventsById.get(id);
          if (!e) return null;
          return (
            <section key={id} id={`evt-${id}`} className="mb-4">
              <h3 className="mono mb-1 text-[13px] font-medium">
                {id} <span style={{ color: C.muted }}>· {e.source} {String(e.event_id)} · {e.timestamp}</span>
              </h3>
              <pre className="mono overflow-x-auto rounded p-3 text-[12px] leading-[1.5]" style={{ background: C.code, border: `1px solid ${C.line}` }}>
                {JSON.stringify(e.raw, null, 2)}
              </pre>
            </section>
          );
        })}
      </article>
    </div>
  );
}

function Gate({ store, caseId }: { store: CaseStore; caseId: string }) {
  const c = store((s) => s.case);
  if (!c) {
    return (
      <div className="p-8 text-text-2">
        Case <span className="mono">{caseId}</span> isn&apos;t in this browser.
      </div>
    );
  }
  return <ReportBody c={c} />;
}

export function Report({ caseId }: { caseId: string }) {
  const [store, setStore] = useState<CaseStore | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const s = getCaseStore(caseId);
    setStore(() => s);
    if (s.persist.hasHydrated()) setHydrated(true);
    return s.persist.onFinishHydration(() => setHydrated(true));
  }, [caseId]);
  if (!store || !hydrated) return <div style={{ background: C.page, minHeight: "100vh" }} />;
  return <Gate store={store} caseId={caseId} />;
}
