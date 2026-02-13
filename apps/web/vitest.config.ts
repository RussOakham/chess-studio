import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    globals: true,
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@repo/types": path.resolve(
        __dirname,
        "../../packages/types/src/index.ts"
      ),
      "@repo/types/*": path.resolve(__dirname, "../../packages/types/src/*"),
      "@repo/chess": path.resolve(
        __dirname,
        "../../packages/chess/src/index.ts"
      ),
      "@repo/chess/*": path.resolve(__dirname, "../../packages/chess/src/*"),
      "@repo/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
      "@repo/db/*": path.resolve(__dirname, "../../packages/db/src/*"),
    },
  },
});
