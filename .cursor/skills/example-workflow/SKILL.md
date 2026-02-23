---
name: example-workflow
description: Example project skill showing SKILL.md structure. Copy this folder to create new project-specific workflows (e.g. add-convex-module, run-migrations).
---

# Example Workflow

Use this as a template for project skills in `.cursor/skills/`. Duplicate the folder, rename it, and update the frontmatter and steps.

## When to use

- When the user asks for a multi-step project-specific procedure.
- When you want the agent to follow a consistent workflow for a recurring task.

## Structure

1. **Purpose**: What this workflow achieves.
2. **Steps**: Ordered list of actions (edit files, run commands, etc.).
3. **References**: Point to `.cursor/rules/` or docs where relevant.

## Example steps

1. Confirm scope with the user.
2. Follow any relevant rules in `.cursor/rules/` (e.g. Convex, Next.js, git workflow).
3. Implement changes and run lint/format/type-check before suggesting a commit.
