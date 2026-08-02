/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: { optimizePackageImports: ["axios"] },
};

module.exports = nextConfig;
