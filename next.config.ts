import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this folder so Next doesn't pick up a stray
  // lockfile from a parent directory.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
