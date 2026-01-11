import baseConfig from "./packages/config/eslint/index.js";

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
