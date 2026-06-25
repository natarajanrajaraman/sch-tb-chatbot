import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make sure the P3 Markdown docs (system prompt + escalation rules)
  // are deployed alongside the serverless function that reads them.
  outputFileTracingIncludes: {
    '/api/p3/chat': [
      './docs/p3-system-prompt.md',
      './docs/p3-escalation-rules.md',
    ],
  },
};

export default nextConfig;
