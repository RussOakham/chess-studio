import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Config options here */
  // Path aliases are handled by TypeScript, Next.js reads from tsconfig.json
  // Removed turbopack.root to prevent scanning entire monorepo
  // Workspace packages are already accessible via pnpm workspaces

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Configure to handle stockfish package (Web Worker-based, client-only)
  // Mark as external for server builds to prevent SSR bundling issues
  serverExternalPackages: ["stockfish"],

  // Configure headers for WASM files to ensure correct MIME type
  async headers() {
    return [
      {
        source: "/engine/:path*.wasm",
        headers: [
          {
            key: "Content-Type",
            value: "application/wasm",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
