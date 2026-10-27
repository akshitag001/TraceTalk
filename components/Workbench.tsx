"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SAMPLE_CASE_ID } from "@/lib/caseOps";
import { getCaseStore, type CaseStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { CaptureBar } from "./CaptureBar";
import { EventDrawer } from "./EventDrawer";
import { ImportModal } from "./ImportModal";
import { Ledger } from "./Ledger";
import { LeftRail } from "./LeftRail";
import { ResizeHandle, cx } from "./primitives";
import { ShortcutSheet } from "./ShortcutSheet";
import { Timeline, useVisibleEvents } from "./Timeline";
import { TopBar } from "./TopBar";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

function useShortcuts(store: CaseStore) {
  const rows = useVisibleEvents(store);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUi.getState();
      if (e.key === "Escape") {
        if (ui.shortcutsOpen || ui.importOpen) ui.set({ shortcutsOpen: false, importOpen: false });
        else if (ui.ledgerDrawerOpen) ui.set({ ledgerDrawerOpen: false });
        else if (ui.drawerOpen) ui.set({ drawerOpen: false });
        return;
      }
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      // Keys typed inside the ledger list navigate the ledger, not the timeline.
      if ((e.target as HTMLElement | null)?.closest?.("#ledger-list") && (e.key === "j" || e.key === "k" || e.key === "Enter")) return;
      const idx = rows.findIndex((r) => r.id === ui.cursorEventId);
      switch (e.key) {
        case "/":
          e.preventDefault();
          document.getElementById("capture-input")?.focus();
          break;
        case "f":
          e.preventDefault();
          document.getElementById("timeline-filter")?.focus();
          break;
        case "j":
        case "k": {
          e.preventDefault();
          const next = e.key === "j" ? Math.min(rows.length - 1, idx + 1) : Math.max(0, idx < 0 ? 0 : idx - 1);
          if (rows[next]) ui.set({ cursorEventId: rows[next].id });
          break;
        }
        case "Enter":
          if (ui.cursorEventId) ui.set({ drawerOpen: true });
          break;
        case "p":
          if (ui.cursorEventId) ui.togglePin(ui.cursorEventId);
          break;
        case "e": {
          e.preventDefault();
          if (window.innerWidth < 1280) ui.set({ ledgerDrawerOpen: true });
          setTimeout(() => (document.querySelector("#ledger-list [data-entry]") as HTMLElement | null)?.focus(), 0);
          break;
        }
        case "?":
          ui.set({ shortcutsOpen: !ui.shortcutsOpen });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows]);
}

function Loaded({ store }: { store: CaseStore }) {
  const ui = useUi();
  useShortcuts(store);

  // "Import your logs" on the homepage links here with ?import=1.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("import") !== "1") return;
    useUi.getState().set({ importOpen: true });
    url.searchParams.delete("import");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden bg-bg text-text">
      <TopBar store={store} />
      <div className="relative flex min-h-0 flex-1">
        <LeftRail store={store} width={ui.railWidth} />
        <ResizeHandle axis="x" label="Resize left rail" onDrag={(d) => ui.set({ railWidth: clamp(useUi.getState().railWidth + d, 168, 320) })} />
        <main className="flex min-w-0 flex-1 flex-col">
          <Timeline store={store} />
          {ui.drawerOpen && (
            <ResizeHandle
              axis="y"
              label="Resize event drawer"
              onDrag={(d) => ui.set({ drawerHeight: clamp(useUi.getState().drawerHeight - d, 140, window.innerHeight - 260) })}
            />
          )}
          {!ui.drawerOpen && <div className="h-px bg-line" />}
          <EventDrawer store={store} height={ui.drawerHeight} />
        </main>
        <div className="hidden min-[1280px]:contents">
          <ResizeHandle axis="x" label="Resize ledger" onDrag={(d) => ui.set({ ledgerWidth: clamp(useUi.getState().ledgerWidth - d, 320, 560) })} />
          <div style={{ width: ui.ledgerWidth }} className="shrink-0">
            <Ledger store={store} />
          </div>
        </div>
        {/* Below 1280px the ledger becomes a toggleable drawer. */}
        <div
          className={cx(
            "absolute inset-y-0 right-0 z-20 w-[380px] max-w-full border-l border-line min-[1280px]:hidden",
            ui.ledgerDrawerOpen ? "block" : "hidden",
          )}
        >
          <Ledger store={store} />
        </div>
      </div>
      <CaptureBar store={store} />
      {ui.importOpen && <ImportModal store={store} />}
      {ui.shortcutsOpen && <ShortcutSheet />}
    </div>
  );
}

export function Workbench({ caseId }: { caseId: string }) {
  const [store, setStore] = useState<CaseStore | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = getCaseStore(caseId);
    setStore(() => s);
    if (s.persist.hasHydrated()) setHydrated(true);
    return s.persist.onFinishHydration(() => setHydrated(true));
  }, [caseId]);

  if (!store || !hydrated) return <div className="h-screen bg-bg" />;
  return <Gate store={store} caseId={caseId} />;
}

function Gate({ store, caseId }: { store: CaseStore; caseId: string }) {
  const c = store((s) => s.case);
  if (!c) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-text-2">
        <p>
          Case <span className="mono text-text">{caseId}</span> isn&apos;t in this browser.{" "}
          <Link className="text-royal hover:underline" href={`/case/${SAMPLE_CASE_ID}`}>
            Open the sample case
          </Link>
        </p>
      </div>
    );
  }
  return <Loaded store={store} />;
}
