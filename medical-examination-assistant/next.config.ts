import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["better-sqlite3"],

  // Prevents Next.js from looking for dependencies in parent directory
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
