"use client";

import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, Mic, X } from "lucide-react";
import { submitNote } from "@/lib/actions";
import { HAS_API } from "@/lib/env";
import { undoNote } from "@/lib/caseOps";
import type { CaseStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { IconButton, cx } from "./primitives";

/* Minimal typing for the Web Speech API, which TypeScript's DOM lib omits. */
interface SpeechRec {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getSpeech(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

export function CaptureBar({ store }: { store: CaseStore }) {
  const ui = useUi();
  const update = store((s) => s.update);
  const notes = store((s) => s.case!.notes);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SpeechRec | null>(null);

  const [modelReady, setModelReady] = useState<boolean | null>(null);
  useEffect(() => setSpeechOk(!!getSpeech()), []);
  useEffect(() => {
    if (!HAS_API) {
      setModelReady(false);
      return;
    }
    fetch("/api/parse")
      .then((r) => r.json())
      .then((d) => setModelReady(!!d.model))
      .catch(() => setModelReady(false));
  }, []);

  // Grow with content, up to four lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 4 * 19 + 10)}px`;
  }, [text]);

  const submit = async () => {
    const t = text.trim();
    if (!t || ui.parsing) return;
    setText("");
    await submitNote(store, t);
  };

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getSpeech();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let add = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) add += e.results[i][0].transcript;
      if (add) setText((t) => (t ? t.replace(/\s*$/, " ") : "") + add.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const o = ui.lastOutcome;
  const noteStillExists = o && notes.some((n) => n.id === o.noteId);

  return (
    <footer className="shrink-0 border-t border-line bg-surface">
      {(ui.parsing || (o && noteStillExists)) && (
        <div className="flex h-7 items-center gap-2 border-b border-line px-3 text-sm">
          {ui.parsing ? (
            <span className="flex items-center gap-1.5 text-text-2">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-text-3 border-t-text-2" aria-hidden />
              Parsing note…
            </span>
          ) : (
            o && (
              <>
                <span className="mono text-text-3">{o.noteId}</span>
                <span className="text-text">
                  {plural(o.entryIds.length, "entry", "entries")} added
                  {o.contradictions > 0 && (
                    <>
                      {" · "}
                      <span className="text-conflict">{plural(o.contradictions, "contradiction")}</span>
                    </>
                  )}
                  {o.answered.length > 0 && ` · answered ${o.answered.join(", ")}`}
                  {o.rejected.length > 0 && <span className="text-text-2"> · {plural(o.rejected.length, "link")} rejected</span>}
                </span>
                <button
                  className="text-royal hover:underline"
                  onClick={() => {
                    update((c) => undoNote(c, o.noteId));
                    ui.set({ lastOutcome: null, expandedEntryId: null, selectedEntryId: null });
                  }}
                >
                  Undo
                </button>
                {o.parser === "offline" && o.fallbackReason && o.fallbackReason !== "no model configured" && (
                  <span className="text-hyp">Couldn&apos;t reach the model. Parsed with offline rules instead.</span>
                )}
                <button className="ml-auto text-text-3 hover:text-text" aria-label="Dismiss result" onClick={() => ui.set({ lastOutcome: null })}>
                  <X size={12} strokeWidth={1.5} />
                </button>
              </>
            )
          )}
        </div>
      )}
      <div className="flex min-h-[56px] items-center gap-3 px-3 py-2">
        <span
          aria-hidden
          className={cx("h-2 w-2 shrink-0 rounded-full", listening ? "bg-conflict" : ui.parsing ? "bg-text-2" : "bg-royal")}
        />
        <textarea
          id="capture-input"
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
            if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur();
          }}
          placeholder="Hold your Wispr Flow key and speak, or type a note"
          className="min-w-0 flex-1 resize-none bg-transparent py-1 text-base leading-[19px] outline-none focus-visible:outline-none"
          aria-label="Note"
        />
        {ui.pinned.length > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded bg-royal/[0.12] px-1.5 py-0.5 text-sm text-royal">
            {plural(ui.pinned.length, "event")} pinned
            <button aria-label="Clear pinned events" onClick={() => ui.set({ pinned: [] })} className="hover:text-text">
              <X size={12} strokeWidth={1.5} />
            </button>
          </span>
        )}
        {speechOk && (
          <IconButton label={listening ? "Stop browser dictation" : "Dictate with browser speech"} onClick={toggleMic} className={cx(listening && "text-conflict")}>
            <Mic size={16} strokeWidth={1.5} />
          </IconButton>
        )}
        {modelReady !== null && (
          <span className="hidden shrink-0 text-sm text-text-3 lg:inline" title={modelReady ? "Notes are parsed by the configured model, then validated" : "No model key configured: deterministic rules"}>
            {modelReady ? "Model parser" : "Offline parser"}
          </span>
        )}
        <IconButton label="Submit note (Enter)" onClick={submit} disabled={!text.trim() || ui.parsing}>
          <CornerDownLeft size={16} strokeWidth={1.5} />
        </IconButton>
      </div>
    </footer>
  );
}
