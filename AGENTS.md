# Agents.md

## Learned User Preferences

- After implementing or significantly changing Convex backend or React/Next.js UI, run Convex reviewer and consider Vercel React best-practices so these checks are a natural part of the workflow.

## Learned Workspace Facts

- When touching `convex/**` or React/Next.js feature code (components, app routes, hooks), use the **convex-reviewer** subagent for Convex files and the **Vercel React best-practices** skill for React/Next.js code; this is documented in `@.cursor/rules/convex-react-review.mdc`.
