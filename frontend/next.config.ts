import type { NextConfig } from "next";

// Proxy /api/* on the frontend origin to the Express backend.
// This keeps all browser fetches same-origin, which means:
//   1. No CORS preflight, no browser-visible "unauthorized" from CORS failures.
//   2. When the frontend is exposed via a cloudflare tunnel, the browser does
//      not need to know the backend URL — it just calls the same host the page
//      was served from, and Next.js (running on the dev machine alongside the
//      backend) proxies the request to localhost:3001.
// Override the destination with BACKEND_URL if the backend isn't co-located.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Next.js blocks cross-origin requests to dev-only endpoints (including HMR)
  // by default, which is what produces the "malformed HTTP response
  // 'Unauthorized'" error when loading the dev server through a cloudflare
  // tunnel. Allow any *.trycloudflare.com host so short-lived tunnel URLs
  // don't require a config edit each run.
  allowedDevOrigins: ["*.trycloudflare.com"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
