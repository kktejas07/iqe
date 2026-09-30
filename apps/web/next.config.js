/** @type {import('next').NextConfig} */
// Where the Next server reaches FastAPI; the browser only ever talks to /backend.
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");

const nextConfig = {
  output: "standalone",
  experimental: { optimizePackageImports: ["axios"] },
  async redirects() {
    // Old misspelled route kept working for bookmarks
    return [{ source: "/pms-formates", destination: "/pms-formats", permanent: true }];
  },
  async rewrites() {
    return [
      { source: "/backend/:path*", destination: `${BACKEND_URL}/:path*` },
      // Short links printed as QR codes on reports
      { source: "/v/:code", destination: `${BACKEND_URL}/v/:code` },
    ];
  },
};

module.exports = nextConfig;
