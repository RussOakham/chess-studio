// oxlint-disable typescript/no-unsafe-member-access
// oxlint-disable typescript/no-unsafe-assignment
import tsParser from "@typescript-eslint/parser";
import json from "@eslint/json";
import oxlint from "eslint-plugin-oxlint";
import { configs as ymlConfigs } from "eslint-plugin-yml";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  // Ignore patterns
  {
    ignores: [
      "dist/**",
      "build/**",
      ".next/**",
      ".turbo/**",
      "node_modules/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.tsbuildinfo",
      "**/package.json",
      "**/pnpm-lock.yaml",
      "**/yarn.lock",
      "**/package-lock.json",
      "apps/web/.next/**",
      "**/.next/**",
      "**/public/engine/**",
      "**/public/**/*.{js,wasm}",
      "**/convex/_generated/**",
    ],
  },

  // JSONC (comments allowed) — must use json/jsonc, not json/json
  {
    files: [".vscode/**/*.json", "apps/web/convex/tsconfig.json"],
    plugins: {
      json,
    },
    language: "json/jsonc",
    rules: {
      "json/no-duplicate-keys": "error",
    },
  },

  // Strict JSON (no comments; trailing commas are parse errors)
  {
    files: ["**/*.json"],
    ignores: [
      "**/package.json",
      "**/package-lock.json",
      "**/yarn.lock",
      "**/pnpm-lock.yaml",
      ".vscode/**/*.json",
      "apps/web/convex/tsconfig.json",
    ],
    plugins: {
      json,
    },
    language: "json/json",
    rules: {
      "json/no-duplicate-keys": "error",
    },
  },

  // YAML linting
  ...ymlConfigs["flat/recommended"],

  // eslint-plugin-oxlint to disable rules handled by Oxlint (for all files)
  // Type-aware linting is now handled by oxlint --type-aware
  ...oxlint.configs["flat/recommended"],

  // AI Elements (shadcn registry): upstream export layout; TSX needs tsParser
  {
    files: ["apps/web/components/ai-elements/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "import/exports-last": "off",
      "import/group-exports": "off",
      "react/no-array-index-key": "off",
    },
  },

  // Convex app code (last so it overrides): parse as TypeScript; allow Convex-style exports and .sort() on copies
  {
    files: ["apps/web/convex/**/*.ts"],
    ignores: ["**/convex/_generated/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "import/group-exports": "off",
      "unicorn/no-array-sort": "off",
      "jest/require-hook": "off",
      // Convex module paths allow only [a-zA-Z0-9_.]; kebab-case filenames are invalid.
      "unicorn/filename-case": "off",
      // Sequential upstream/cache access is intentional (rate limits, ordering).
      "no-await-in-loop": "off",
    },
  },
];

export default config;
