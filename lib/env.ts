/**
 * Build-mode switches. The GitHub Pages build is static (output: "export"): there is no
 * /api/parse, so notes are parsed by the offline rules in the browser, and the site lives
 * under a base path. Normal builds (local, Vercel) leave both at their defaults.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const HAS_API = process.env.NEXT_PUBLIC_STATIC !== "1";

/** Prefix an absolute public path (images, downloads) with the base path. */
export const withBase = (p: string) => BASE_PATH + p;
