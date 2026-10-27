"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Report } from "@/components/Report";
import { Workbench } from "@/components/Workbench";
import { BASE_PATH } from "@/lib/env";

type Route = { kind: "workbench" | "report"; id: string } | { kind: "none" };

/**
 * On a static host (GitHub Pages) an imported case has no pre-built page, so the host serves
 * this 404 shell. It reads the URL and renders the case the address asks for. Cases live in
 * localStorage, so nothing here needs a server.
 */
export default function NotFound() {
  const [route, setRoute] = useState<Route | null>(null);

  useEffect(() => {
    const path = window.location.pathname.slice(BASE_PATH.length);
    const m = path.match(/^\/case\/([^/]+)(\/report)?\/?$/);
    setRoute(m ? { kind: m[2] ? "report" : "workbench", id: decodeURIComponent(m[1]) } : { kind: "none" });
  }, []);

  if (!route) return <div className="h-screen bg-bg" />;
  if (route.kind === "workbench") return <Workbench caseId={route.id} />;
  if (route.kind === "report") return <Report caseId={route.id} />;
  return (
    <div className="flex h-screen items-center justify-center bg-bg px-4 text-text-2">
      <p>
        That page doesn&apos;t exist.{" "}
        <Link href="/" className="text-royal hover:underline">
          Back to the homepage
        </Link>
      </p>
    </div>
  );
}
