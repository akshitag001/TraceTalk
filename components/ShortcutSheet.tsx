"use client";

import { X } from "lucide-react";
import { useUi } from "@/lib/ui";
import { IconButton } from "./primitives";

const KEYS: [string[], string][] = [
  [["/"], "Focus the note input"],
  [["j"], "Next timeline row"],
  [["k"], "Previous timeline row"],
  [["Enter"], "Open the selected row in the drawer"],
  [["p"], "Pin or unpin the selected row"],
  [["Shift", "click"], "Pin a row to the next note"],
  [["e"], "Focus the evidence ledger"],
  [["f"], "Focus the timeline filter"],
  [["Esc"], "Close drawer or leave input"],
  [["?"], "Show this sheet"],
  [["Enter"], "In the note input: submit"],
  [["Shift", "Enter"], "In the note input: new line"],
];

export function ShortcutSheet() {
  const set = useUi((s) => s.set);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onMouseDown={() => set({ shortcutsOpen: false })}>
      <div
        role="dialog"
        aria-modal
        aria-label="Keyboard shortcuts"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[420px] max-w-[calc(100vw-32px)] rounded-md border border-line bg-surface"
      >
        <div className="flex h-10 items-center border-b border-line px-4">
          <h2 className="font-semibold">Keyboard shortcuts</h2>
          <IconButton label="Close" className="ml-auto" onClick={() => set({ shortcutsOpen: false })}>
            <X size={16} strokeWidth={1.5} />
          </IconButton>
        </div>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 p-4">
          {KEYS.map(([keys, what], i) => (
            <div key={i} className="contents">
              <dt className="flex items-center gap-1">
                {keys.map((k) => (
                  <span key={k} className="kbd">
                    {k}
                  </span>
                ))}
              </dt>
              <dd className="text-text-2">{what}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
