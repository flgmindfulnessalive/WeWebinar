import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip auto-generating AGENTS.md/CLAUDE.md on every `next dev` — this
  // repo already has its own README/CLAUDE conventions.
  agentRules: false,
};

export default nextConfig;
