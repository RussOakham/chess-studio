// @ts-nocheck
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import json from "eslint-plugin-json";
import yml from "eslint-plugin-yml";
import prettierConfig from "eslint-config-prettier";

// Type overridden as any[] due to TS language server issues
/** @type {import("eslint").Linter.Config[]} */
/** @type {any[]} */
const config = [
  {
    ignores: ["**/*.json", "**/*.{yml,yaml}"],
  },
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
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  unicorn.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
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
      "unicorn/no-null": "off",
      "unicorn/prevent-abbreviations": "off",
      "sonarjs/prefer-read-only-props": "off",
    },
  },
  prettierConfig,
];

export default config;
