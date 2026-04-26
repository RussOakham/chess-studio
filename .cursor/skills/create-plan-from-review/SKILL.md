---
name: create-plan-from-review
description: Creates a phased implementation plan from Convex Reviewer or Vercel React review findings. Use when the user has run a review and wants a plan to implement the improvements.
---

# Create Plan from Review

Turn review output (Convex Reviewer or Vercel React best-practices) into a structured implementation plan with phases and checkboxes.

## When to use

- User has run Convex Reviewer or Vercel React review and wants a phased implementation plan from the findings.
- User asks to "create a plan from this review" or "turn these findings into an implementation plan."

## Steps

1. **Use the review output** (list of improvements, findings, or recommendations).
2. **Choose plan location:**
   - **Tracked in repo (preferred for anything others should follow):** `docs/implementation/<name>.md` (e.g. `react-next-improvement-plan.md`).
   - **Personal scratch only:** Developers may keep a private `.temp.*` or notes **outside** git-tracked references. Do **not** put paths to `.temp.*` files from tracked docs or skills.
3. **Structure the plan:**
   - Overview and scope.
   - Phases with clear goals; per-phase task list with `- [ ]` checkboxes.
   - Suggested order and dependencies (optionally a short flowchart or list).
   - "Files to touch" or "References" summary table if helpful.
4. **If the user wants the plan updated as work completes:** State clearly which **tracked** checklist section is the single source of truth; after each phase, check off items and add a short Status line.
5. **Optionally:** Add a reference to the plan in the relevant rule or AGENTS.md if it is a recurring workflow.

## Plan format example

```markdown
# <Name> Implementation Plan

## Overview

Brief description and scope.

## Phase 1: <Goal>

- [ ] Task 1
- [ ] Task 2
      Status: (updated as done)

## Phase 2: <Goal>

...

## Order / Dependencies

Phase 1 → Phase 2 → ...

## Files to touch

| Area | Files |
| ---- | ----- |
```

## References

- Documentation (temp files): `@.cursor/rules/documentation.mdc`
- Implementation plans in repo: `docs/implementation/`
