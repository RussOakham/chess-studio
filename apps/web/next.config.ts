import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Path aliases are handled by TypeScript, Next.js reads from tsconfig.json
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
