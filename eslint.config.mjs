// @ts-nocheck
import json from "eslint-plugin-json";
import oxlint from "eslint-plugin-oxlint";
import yml from "eslint-plugin-yml";
import tseslint from "typescript-eslint";

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

  // YAML linting
  ...yml.configs["flat/recommended"],

  // eslint-plugin-oxlint to disable rules handled by Oxlint (only for JS/JSX, not TS/TSX)
  // oxlint-disable-next-line oxc/no-map-spread
  ...oxlint.configs["flat/recommended"].map((cfg) => ({
    ...cfg,
    files: ["**/*.{js,jsx}"],
  })),

  // Type-aware linting for TS/TSX files only (after oxlint to ensure rules aren't disabled)
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "**/*.config.{ts,js}",
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/package.json",
    ],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((cfg) => ({
    ...cfg,
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "**/*.config.{ts,js}",
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/package.json",
    ],
  })),
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "**/*.config.{ts,js}",
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/package.json",
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: true,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },
];

export default config;
