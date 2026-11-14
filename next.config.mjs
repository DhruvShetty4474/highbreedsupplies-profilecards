import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Workers has no image optimizer; profile images are served from R2/CDN.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

// Exposes wrangler bindings (D1, later R2) to `next dev`.
initOpenNextCloudflareForDev();

export default nextConfig;
