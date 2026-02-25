# ESLint 10 upgrade deferred

**Date:** 2025-02-25  
**Reason:** Blocked by `@convex-dev/eslint-plugin` (and its dependency `@typescript-eslint/utils@8.49`) not supporting ESLint 10.

## Verification outcome

- Bumping `eslint` and `@eslint/js` to 10.x and running `pnpm lint` caused a runtime error:
  - `TypeError: Class extends value undefined is not a constructor or null`
  - In `@typescript-eslint/utils/dist/ts-eslint/eslint/FlatESLint.js` (used by the Convex plugin).
- `@typescript-eslint/utils@8.49` declares peer `eslint@"^8.57.0 || ^9.0.0"`, so ESLint 10 is not in the supported range.

## Next steps

- Revisit ESLint 10 after either:
  - `@convex-dev/eslint-plugin` (or its dependency chain) supports ESLint 10, or
  - The project drops or replaces the Convex ESLint plugin.

---

## Next.js / React / Tailwind patch upgrades deferred

**Date:** 2025-02-25  
**Reason:** `pnpm build` fails during prerender of `/_global-error` with `TypeError: Cannot read properties of null (reading 'useContext')` (Next.js internals). This occurs with both Next 16.1.1 and 16.1.6, so it is treated as a pre-existing build issue. Next, React, React DOM, eslint-config-next, and tailwindcss were not upgraded in this cycle to avoid coupling the dependency upgrade with a separate build fix.
