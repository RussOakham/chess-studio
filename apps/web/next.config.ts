import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Config options here */
  // Path aliases are handled by TypeScript, Next.js reads from tsconfig.json
  // Removed turbopack.root to prevent scanning entire monorepo
  // Workspace packages are already accessible via pnpm workspaces
};

export default nextConfig;
