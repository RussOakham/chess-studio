# ESLint 10 upgrade (resolved)

**Previously deferred (2026-02-25):** `@typescript-eslint/utils@8.49` did not declare peer support for ESLint 10, which caused runtime errors with the Convex ESLint plugin.

**Resolved (2026-04-03):** Upgraded to ESLint 10 with `@typescript-eslint/*@8.58`, which declares `eslint@"^8.57.0 || ^9.0.0 || ^10.0.0"`, aligned with `@convex-dev/eslint-plugin`’s `~8.58` dependency range. Root `pnpm.overrides` pin the same `@typescript-eslint/*` and `typescript-eslint` versions so nothing resolves an older 8.52 tree. `eslint-plugin-json@4.0.1` still calls removed `context.getFilename()`; a small **pnpm patch** (`patches/eslint-plugin-json@4.0.1.patch`) uses `context.filename` with an ESLint 9 fallback.

---

## Next.js / React / Tailwind patch upgrades deferred

**Date:** 2026-02-25  
**Reason:** `pnpm build` fails during prerender of `/_global-error` with `TypeError: Cannot read properties of null (reading 'useContext')` (Next.js internals). This occurs with both Next 16.1.1 and 16.1.6, so it is treated as a pre-existing build issue. Next, React, React DOM, eslint-config-next, and tailwindcss were not upgraded in this cycle to avoid coupling the dependency upgrade with a separate build fix.
