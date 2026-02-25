---
name: implement-from-plan
description: Implements an implementation plan phase-by-phase without editing the plan file. Use when the user attaches or references a plan (docs/implementation/*.md, docs/temp/*.temp.md, or Cursor plan) and asks to implement it.
---

# Implement from Plan

Work through an implementation plan in order, update checklists as you go, and run quality checks. Do not edit the plan file itself unless it is the designated checklist to update.

## When to use

- User attaches or references an implementation plan and asks to implement it.
- Plan lives in `docs/implementation/*.md`, `docs/temp/*.temp.md`, or a Cursor plan with phases/todos.

## Steps

1. **Do not edit the plan file** (unless the plan designates a temp doc as the "living checklist" to update).
2. **Work through phases in order.** Mark todos in progress, then done. Use existing todos if the plan already created them; do not create duplicate todos.
3. **After each phase (or logical sub-task):** If the plan says to keep a temp doc as single source of truth, update it: check off `- [ ]` items, add a short Status line (e.g. `Status: Done – validators in convex/validators.ts`).
4. **After implementation:** Run `pnpm lint:fix`, `pnpm format:fix`, `pnpm type-check`. If markdown changed, run `pnpm lint:md` or `pnpm lint:md:fix`.
5. **After Convex or React/Next.js changes:** Run Convex reviewer and consider Vercel React best-practices per `@.cursor/rules/convex-react-review.mdc`.
6. **Do not commit or push** without explicit user permission (per `@.cursor/rules/git-workflow.mdc`).

## References

- Convex/React review: `@.cursor/rules/convex-react-review.mdc`
- Git workflow: `@.cursor/rules/git-workflow.mdc`
- Code quality: `@.cursor/rules/code-quality.mdc`
