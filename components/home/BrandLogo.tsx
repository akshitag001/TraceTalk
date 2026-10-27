import { existsSync } from "node:fs";
import path from "node:path";
import { withBase } from "@/lib/env";

/**
 * Official logo files from /public/brand, rendered as-is with <img>.
 * If a file is missing, the brand name is shown as plain text instead.
 */
const BRANDS = {
  wispr: { name: "Wispr Flow", file: "wispr-flow.svg", dark: "wispr-flow-white.svg", ratio: 819 / 131 },
  wemakedevs: { name: "WeMakeDevs", file: "wemakedevs.svg", dark: null, ratio: 1557 / 1086 },
} as const;

const has = (file: string) => existsSync(path.join(process.cwd(), "public", "brand", file));

export function BrandLogo({ brand, height }: { brand: keyof typeof BRANDS; height: number }) {
  const b = BRANDS[brand];
  if (!has(b.file)) return <span className="font-medium text-text">{b.name}</span>;
  const width = Math.round(height * b.ratio);
  const img = (file: string, className?: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={withBase(`/brand/${file}`)} alt={b.name} width={width} height={height} className={className} style={{ height, width: "auto" }} />
  );
  if (b.dark && has(b.dark)) {
    return (
      <span className="inline-flex items-center">
        {img(b.file, "only-light")}
        {img(b.dark, "only-dark")}
      </span>
    );
  }
  return <span className="inline-flex items-center">{img(b.file)}</span>;
}
