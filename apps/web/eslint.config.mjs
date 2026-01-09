import nextjsConfig from "../../packages/config/eslint/nextjs.js";

export default [
  ...nextjsConfig,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "eslint.config.mjs",
    ],
  },
];
