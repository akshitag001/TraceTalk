/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    // The sample case ships as raw JSONL and is bundled as a string.
    config.module.rules.push({ test: /\.jsonl$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
