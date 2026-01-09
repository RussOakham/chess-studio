import baseConfig from "./packages/config/eslint/index.mjs";

export default [
  ...baseConfig,
  {
    ignores: [
      "dist/**",
      "build/**",
      ".next/**",
      ".turbo/**",
      "node_modules/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "packages/config/**/*.js",
    ],
  },
];
