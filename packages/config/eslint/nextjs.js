// @ts-nocheck
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import json from "eslint-plugin-json";
import yml from "eslint-plugin-yml";
import prettierConfig from "eslint-config-prettier";
import nextPlugin from "eslint-config-next/core-web-vitals";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

// Type overridden as any[] due to TS language server issues
/** @type {import("eslint").Linter.Config[]} */
/** @type {any[]} */
const config = [
  // JSON and YAML configs from base
  {
    files: ["**/*.json"],
    plugins: {
      json: json,
    },
    processor: json.processors[".json"],
    rules: {
      "json/duplicate-key": "error",
      "json/trailing-comma": "error",
    },
  },
  ...yml.configs["flat/recommended"],
  js.configs.recommended,
  {
    ignores: ["**/*.json", "**/*.{yml,yaml}"],
  },
  // Use recommended (non-type-checked) configs for Next.js to avoid monorepo tsconfig resolution issues
  // Type checking is handled separately by TypeScript compiler
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  unicorn.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        // No project option - avoids monorepo tsconfig resolution issues
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
      "@typescript-eslint/no-explicit-any": "warn",
      "unicorn/no-null": "off",
      "unicorn/prevent-abbreviations": "off",
      "sonarjs/prefer-read-only-props": "off",
    },
  },
  // Override nextPlugin to remove project: true
  ...nextPlugin.map((config) => {
    if (config.languageOptions?.parserOptions?.project) {
      return {
        ...config,
        languageOptions: {
          ...config.languageOptions,
          parserOptions: {
            ...config.languageOptions.parserOptions,
            project: false,
          },
        },
      };
    }
    return config;
  }),
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  prettierConfig,
];

export default config;
