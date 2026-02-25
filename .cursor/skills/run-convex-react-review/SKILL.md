---
name: run-convex-react-review
description: Runs Convex reviewer and Vercel React best-practices on changed backend or UI code. Use after implementing or significantly changing Convex or React/Next.js code, or when the user asks for a review pass.
---

# Run Convex and React Review

Execute the Convex reviewer subagent and Vercel React best-practices skill on changed files, then fix any findings.

## When to use

- After implementing or significantly changing Convex backend (`convex/**`) or React/Next.js UI (components, app routes, hooks).
- When the user asks for a "Convex review," "React best-practices check," or "review my changes."
- The rule `convex-react-review.mdc` triggers this when touching those areas; use this skill to perform the procedure.

## Steps

1. **Convex:** Run the **convex-reviewer** subagent on changed `convex/**` files. Address findings (e.g. auth, argument/return validators, thin handlers, error handling, indexes, no `Date.now()` in queries).
2. **React/Next.js:** Use the **Vercel React best-practices** skill for changed components, app routes, or hooks. Fetch and apply relevant rules (e.g. bundle, re-render, keys, conditionals, server auth).
3. **Apply code changes** from both reviews as needed.
4. **Run** `pnpm lint:fix` and `pnpm type-check` (and `pnpm format:fix` if needed).

## References

- When to run: `@.cursor/rules/convex-react-review.mdc`
- Code quality: `@.cursor/rules/code-quality.mdc`
