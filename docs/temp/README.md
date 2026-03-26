# Developer-local files in `docs/temp/` (`.temp.md`)

This **`README.md` is the only file under `docs/temp/` that belongs in git.** It documents policy for everything else here.

## What `.temp.md` files are for

Files named like `*.temp.md` (or similar `*.temp.*` patterns) are meant to be **developer-specific** and **offline-only**:

- Personal notes and reminders
- Personal workflow or task trackers
- Short-lived spikes or experiments
- Anything you want **easy to reach for a short time**, without shaping permanent project history

They are **not** “team scratch” in the repo: they are **not committed** and **do not appear in git history** (typically ignored via `.gitignore` patterns such as `*.temp.*`).

## What does _not_ belong in tracked documentation

**Do not link to, name, or reference** any `.temp.md` path from **any git-tracked** file— including `docs/**/*.md`, `README*`, `.cursor/rules`, `CONTRIBUTING.md`, skills, etc.

Rationale: those paths are meaningless or wrong for other clones; they are not part of the shared source of truth.

## Solidifying ideas into the project

When something in a personal `.temp.md` should become real project knowledge:

1. **Copy** the substance into a **normal** tracked doc (e.g. under `docs/implementation/`, `docs/planning/`, or next to the feature), and write it **as if new**—standalone and clear for any reader.
2. **Do not** point readers at your old `.temp.md` file from tracked docs.
3. Delete or ignore the local temp file when you no longer need it.

## Where canonical docs live

Use these (and similar) for durable, shared documentation:

- Game feature status: [`docs/implementation/game-implementation-plan.md`](../implementation/game-implementation-plan.md)
- Convex + auth + env: [`docs/planning/convex-auth-data.md`](../planning/convex-auth-data.md)
- Game review / QA: [`docs/game-review-cross-cutting-qa.md`](../game-review-cross-cutting-qa.md)
