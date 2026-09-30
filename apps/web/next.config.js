/** @type {import('next').NextConfig} */
const backendTarget = (
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "");

const nextConfig = {
  output: "standalone",
  experimental: { optimizePackageImports: ["axios"] },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendTarget}/api/:path*` },
      { source: "/media/:path*", destination: `${backendTarget}/media/:path*` },
      { source: "/files/:path*", destination: `${backendTarget}/files/:path*` },
    ];
  },
};

module.exports = nextConfig;
