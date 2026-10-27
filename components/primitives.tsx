"use client";

import { useEffect, useRef, useState } from "react";
import type { CaseStatus, EntryKind, FactStatus, Relation, Severity } from "@/lib/types";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export const KIND_LABEL: Record<EntryKind, string> = { fact: "Fact", hypothesis: "Hypothesis", unknown: "Unknown" };
export const KIND_VAR: Record<EntryKind, string> = { fact: "var(--fact)", hypothesis: "var(--hyp)", unknown: "var(--unknown)" };
export const RELATION_VAR: Record<Relation, string> = {
  supports: "var(--fact)",
  contradicts: "var(--conflict)",
  related: "var(--text-2)",
};
export const SEVERITY_TINT: Record<Severity, string> = {
  low: "tint-muted",
  medium: "tint-unknown",
  high: "tint-hyp",
  critical: "tint-conflict",
};
export const STATUS_TINT: Record<CaseStatus, string> = { open: "tint-royal", contained: "tint-hyp", closed: "tint-muted" };

export function Badge({ tint, children, title }: { tint: string; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex h-[18px] items-center rounded px-1.5 text-xs font-medium leading-none", tint)}>
      {children}
    </span>
  );
}

export function FactBadge({ status }: { status: FactStatus }) {
  return status === "confirmed" ? (
    <Badge tint="tint-fact" title="At least one linked event supports this">Confirmed</Badge>
  ) : (
    <Badge tint="tint-muted" title="No linked event supports this yet">Unverified</Badge>
  );
}

export function Dot({ color, size = 6 }: { color: string; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: color }} />;
}

type BtnVariant = "primary" | "default" | "ghost" | "danger";

export function Button({
  variant = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded px-3 text-base transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-text font-medium text-bg hover:bg-text/85",
        variant === "default" && "border border-line-strong bg-transparent text-text hover:bg-surface-2",
        variant === "ghost" && "text-text-2 hover:bg-surface-2 hover:text-text",
        variant === "danger" && "border border-line-strong text-conflict hover:border-conflict",
        className,
      )}
    />
  );
}

export function IconButton({ label, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-6 w-6 items-center justify-center rounded text-text-2 transition-colors duration-150 hover:bg-surface-2 hover:text-text disabled:opacity-40",
        className,
      )}
    />
  );
}

export function Mono({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span className={cx("mono", className)} title={title}>
      {children}
    </span>
  );
}

/** Minimal click-to-open menu (severity, status, kind). */
export function Menu<T extends string>({
  value,
  options,
  onChange,
  render,
  label,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  render: (v: T) => React.ReactNode;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="rounded">
        {render(value)}
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 top-7 z-30 min-w-[132px] rounded-md border border-line bg-surface-2 py-1">
          {options.map((o) => (
            <button
              key={o}
              role="option"
              aria-selected={o === value}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className={cx("flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-surface", o === value && "text-royal")}
            >
              {render(o)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Drag handle between panes. Calls onDrag with the pointer delta since the last move. */
export function ResizeHandle({ axis, onDrag, label }: { axis: "x" | "y"; onDrag: (delta: number) => void; label: string }) {
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    let last = axis === "x" ? e.clientX : e.clientY;
    const move = (ev: PointerEvent) => {
      const pos = axis === "x" ? ev.clientX : ev.clientY;
      onDrag(pos - last);
      last = pos;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      onPointerDown={start}
      className={cx(
        "group relative z-10 shrink-0 bg-line",
        axis === "x" ? "w-px cursor-col-resize" : "h-px cursor-row-resize",
      )}
    >
      <div className={cx("absolute group-hover:bg-royal/60", axis === "x" ? "-left-[2px] -right-[2px] inset-y-0" : "-top-[2px] -bottom-[2px] inset-x-0")} />
    </div>
  );
}
