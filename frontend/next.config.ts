import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compile the SDK TypeScript source directly — no separate build step needed.
  transpilePackages: ["@llmobs/sdk"],
};

export default nextConfig;
