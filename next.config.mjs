const pages = process.env.GITHUB_PAGES === "true";
const basePath = "/TraceTalk";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(pages
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
        env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_STATIC: "1" },
      }
    : {}),
  webpack(config) {
    // The sample case ships as raw JSONL and is bundled as a string.
    config.module.rules.push({ test: /\.jsonl$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
