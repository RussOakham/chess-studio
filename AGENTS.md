# Agents.md

<!-- BEGIN:nextjs-agent-rules -->

## Next.js: read bundled docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/` (workspace root after `pnpm install`). Version-matched docs are the source of truth for this repo’s installed Next.js.

<!-- END:nextjs-agent-rules -->

## Learned User Preferences

- After implementing or significantly changing Convex backend or React/Next.js UI, run Convex reviewer and consider Vercel React best-practices so these checks are a natural part of the workflow.

## Learned Workspace Facts

- When touching `convex/**` or React/Next.js feature code (components, app routes, hooks), use the **convex-reviewer** subagent for Convex files and the **Vercel React best-practices** skill for React/Next.js code; this is documented in `@.cursor/rules/convex-react-review.mdc`.

## Cursor Team Kit (plugin)

The **Cursor Team Kit** plugin provides skills, agents, and rules for CI, code review, shipping, and cleanup. Prefer these when relevant:

- **CI**: Use **fix-ci** or **loop-on-ci** when branch CI is failing; use **ci-watcher** subagent to monitor GitHub Actions for the current branch.
- **PR / review**: Use **get-pr-comments** to fetch and summarize review comments on the active PR; use **review-and-ship** for a full review-then-commit-push-PR flow; use **new-branch-and-pr** to create a branch, complete work, and open a PR.
- **Merge / tests**: Use **fix-merge-conflicts** to resolve conflicts and validate build/tests; use **run-smoke-tests** for Playwright smoke tests.
- **Quality**: Use **check-compiler-errors** to run compile/type-check and report failures; use **deslop** to remove AI-generated slop from branch diff (comments, defensive try/catch, `any` casts, nesting).
- **Summaries**: Use **what-did-i-get-done** for commit summary over a time range; use **weekly-review** for a weekly recap (bugfix / tech-debt / net-new).

Plugin rules (always applied): **no-inline-imports** (imports at top of file; dynamic import for code-split is acceptable when documented), **typescript-exhaustive-switch** (exhaustive default with `never` for unions/enums).
