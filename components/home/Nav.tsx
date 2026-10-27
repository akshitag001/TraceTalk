"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Github } from "lucide-react";
import { nav, site } from "@/content/home";
import { cx } from "../primitives";
import { ThemeToggle } from "../ThemeToggle";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={cx("sticky top-0 z-30 h-16 border-b bg-bg", scrolled ? "border-line" : "border-transparent")}>
      <div className="mx-auto flex h-full max-w-[1120px] items-center gap-6 px-4 md:px-8">
        <Link href="/" className="rounded text-[16px] font-semibold tracking-[-0.01em] text-text">
          {site.name}
        </Link>
        <nav aria-label="Sections" className="ml-auto hidden items-center gap-6 md:flex">
          {nav.links.map((l) => (
            <a key={l.href} href={l.href} className="rounded text-[14px] text-text-2 transition-colors hover:text-text">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <a
            href={site.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-text-2 hover:bg-surface-2 hover:text-text"
          >
            <Github size={16} strokeWidth={1.5} />
          </a>
          <ThemeToggle />
          <Link
            href={site.sampleCaseHref}
            className="ml-2 hidden h-9 items-center rounded bg-text px-3.5 text-[14px] font-medium text-bg transition-colors hover:bg-text/85 sm:inline-flex"
          >
            {nav.cta}
          </Link>
        </div>
      </div>
    </header>
  );
}
