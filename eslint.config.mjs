// oxlint-disable typescript/no-unsafe-member-access
// oxlint-disable typescript/no-unsafe-assignment
import convexPlugin from "@convex-dev/eslint-plugin";
import json from "eslint-plugin-json";
import oxlint from "eslint-plugin-oxlint";
import yml from "eslint-plugin-yml";

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
    ],
  },

  // JSON linting (explicitly only for JSON files, not package.json)
  {
    files: ["**/*.json"],
    ignores: [
      "**/package.json",
      "**/package-lock.json",
      "**/yarn.lock",
      "**/pnpm-lock.yaml",
    ],
    plugins: {
      json: json,
    },
    processor: json.processors[".json"],
    rules: {
      "json/duplicate-key": "error",
      "json/trailing-comma": "error",
    },
  },

  // Convex: best-practice rules for convex/** (scoped so rest of repo unchanged)
  ...convexPlugin.configs.recommended,

  // YAML linting
  ...yml.configs["flat/recommended"],

  // eslint-plugin-oxlint to disable rules handled by Oxlint (for all files)
  // Type-aware linting is now handled by oxlint --type-aware
  ...oxlint.configs["flat/recommended"],
];

export default config;
