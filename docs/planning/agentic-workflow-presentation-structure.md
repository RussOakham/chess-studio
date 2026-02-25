# Agentic Workflows: Presentation Structure

A broad structure for a work presentation on **how AI coding agents work in Cursor** and **how we’ve built a highly autonomous, high-quality development workflow** on the chess-studio project.

---

## Part 1: How Agents Work (High Level)

_Goal: Set the stage so the audience understands what’s under the hood before discussing workflow._

### 1.1 Underlying LLM Model

- **What it is:** The agent is driven by a large language model (e.g. Claude, GPT) that predicts the next token from context.
- **Why it matters:** Model choice affects reasoning, code quality, and how much context it can use; Cursor abstracts this but you can often choose model tier.
- **Takeaway:** The agent is a probabilistic completer over a context window — better context and instructions yield better outputs.

### 1.2 Agent Harness

- **What it is:** The “harness” is the Cursor layer that wraps the LLM: it decides when to call the model, which tools to expose (read file, edit, run command, search, MCP, etc.), and how to turn your request into a sequence of steps.
- **Why it matters:** The harness turns “implement feature X” into: read rules → search codebase → read files → plan → edit → run tests → respond. Without a good harness, the same model would be less reliable.
- **Takeaway:** Autonomy comes from the harness (tools + control flow), not only from the raw model.

### 1.3 System Prompts

- **What they are:** Invisible instructions Cursor (and you, via rules) inject into every request: “you are a coding assistant”, project conventions, and rule files (e.g. code quality, git workflow).
- **Why it matters:** System prompts set default behaviour (e.g. “don’t commit without permission”, “use Convex patterns”). What you put in **always-applied** rules is in every call; glob-scoped rules are added when relevant files are in context.
- **Takeaway:** Your rules _are_ part of the system prompt; design them so the agent gets the right instructions at the right time.

### 1.4 Tokenisation and Token Usage

- **Tokenisation:** Text is split into tokens (word pieces/subwords). The model reads and generates tokens, not raw characters. More tokens ≈ more context and cost.
- **Typical context budget:** Often ~200k tokens per request. That budget is shared across:
  - System prompts and rules (always-applied rules cost tokens on every turn)
  - Conversation history
  - File contents and search results the agent pulls in
  - Tool outputs (e.g. terminal, grep)
- **Takeaway:** Be mindful of always-applied rules (keep them focused); use glob-scoped rules and explicit `@` references so the right context is included without wasting budget.

### 1.5 Context Management

- **What it is:** How Cursor decides what to send the model: which files, which rules, which prior messages, and what from the current state (errors, selection, etc.).
- **Relevant mechanisms:** `@` symbols (file, folder, codebase, docs), rule globs (e.g. “when editing `convex/**` add Convex rules”), and automatic inclusion of errors/terminal output when relevant.
- **Takeaway:** You steer the agent by controlling context: good rules + deliberate `@` use + clear task descriptions reduce “wrong file” or “wrong pattern” behaviour.

### 1.6 Context Compaction

- **What it is:** When the context window is full, Cursor must shorten or drop content: summarise long conversations, drop older messages, or omit less relevant files. That’s “compaction”.
- **Why it matters:** After compaction, the agent can “forget” earlier decisions or re-read files. Long chats or huge always-applied rules increase the chance of compaction and inconsistent behaviour.
- **Takeaway:** Prefer concise rules, scoped rules, and breaking very long tasks into smaller sessions so the agent doesn’t rely on content that might be compacted away.

---

## Part 2: Our Development Workflow (Cursor in Practice)

_Goal: Show how we use rules, skills, plugins, and process so that “implement a feature” is functional, high-quality, logically separated, testable, and reviewable._

### 2.1 Design Principles

- **Functional:** Features work; we run type-check, lint, and build before commit/MR.
- **High code quality:** Automated lint (oxlint, ESLint, markdownlint), format (oxfmt), type-check (TypeScript strict), and pre-commit hooks so bad code doesn’t get in.
- **Logic separation:** Backend logic in pure helpers and thin Convex handlers; UI in components and hooks; no business logic in views.
- **Testable:** Pure functions (e.g. `applyMove`, `requireGameAccess`) and thin handlers so we can add unit tests where it matters.
- **Easily reviewable:** Conventional commits, clear MRs, and domain-specific reviews (Convex, React) so humans and tools can review effectively.

### 2.2 What We Put in the Agent’s Context

**Always-applied (every turn):**

- **Code quality** (`.cursor/rules/code-quality.mdc`): Lint, format, type-check, file naming, React/TS conventions.
- **Git workflow** (`.cursor/rules/git-workflow.mdc`): No commit/push without permission, conventional commits, branch naming, MR process, build before draft MR/push when MR open.
- **AGENTS.md:** Learned preferences and workspace facts (e.g. “run Convex reviewer and Vercel React best-practices after backend/UI work”), maintained by Continual Learning from past chats.

**Glob-scoped (when editing matching files):**

- Convex (schema, queries, mutations, auth, validators).
- Next.js (App Router, Server/Client Components, Convex data fetching).
- Architecture (Convex for game data, service layer, auth).
- Documentation, database migrations, monorepo structure, TypeScript conventions.
- **Convex + React review** (`.cursor/rules/convex-react-review.mdc`): When to run Convex reviewer and Vercel React best-practices; applies when touching `convex/**`, `components/**`, `app/**`, `lib/hooks/*`.

**Skills (used when the task matches):**

- **Project:** Example workflow (template for project-specific procedures).
- **Plugins:** Convex (auth, schema, migrations, function-creator, etc.), Vercel React best-practices, documentation lookup, create-rule, create-skill, Continual Learning.

### 2.3 End-to-End Flow: “Implement a Feature”

1. **Request:** User describes the feature (optionally with `@` refs to plan or files).
2. **Context:** Cursor loads always-applied rules, AGENTS.md, and glob-scoped rules for the files the agent touches; skills are used when relevant (e.g. function-creator for a new Convex mutation).
3. **Plan (for larger work):** We use implementation plans (e.g. `docs/implementation/*.md`, `docs/temp/*.temp.md`) or Cursor plans with phases and todos; the agent works through phases and updates checklists.
4. **Implement:** Agent edits code, runs lint/format/type-check, and follows rules (e.g. thin handlers, validators, no commit without permission).
5. **Review:** After Convex or React/Next.js changes, we run Convex reviewer and consider Vercel React best-practices (per AGENTS.md and convex-react-review rule).
6. **Commit/MR:** User reviews; agent suggests commit message and branch; user approves commit/push; MR only when user asks, draft first, build verified before creating/pushing.

### 2.4 How We Keep Quality and Autonomy in Balance

| Lever                                      | Purpose                                                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Rules**                                  | Constrain _how_ the agent codes (quality, git, Convex, Next.js) so we don’t have to repeat it every time.                    |
| **AGENTS.md + Continual Learning**         | Persist preferences and facts across chats so “run Convex/React review” and similar become default.                          |
| **Skills**                                 | Add domain expertise on demand (Convex, Vercel, docs) without bloating the base system prompt.                               |
| **Plugins / subagents**                    | Convex Reviewer, MCP (Convex, browser, etc.) give the agent tools and checks that would be hard to encode in text alone.     |
| **Implementation plans + temp checklists** | Break big work into ordered steps and a single source of truth (e.g. `docs/temp/*.temp.md`) so the agent doesn’t lose track. |
| **Build + MR discipline**                  | `pnpm build` before draft MR and before pushing to a branch with an open MR so CI doesn’t fail on build errors.              |

### 2.5 Concrete Examples from Our Chats

- **Convex improvements:** Convex Reviewer produced a list of improvements; we turned it into a phased plan in `docs/temp/convex-improvements.temp.md`, implemented (returns validators, getMoves cap, makeMove validation, requireGameAccess + applyMove, schema cleanup), and kept the temp file updated as we went.
- **React/Next improvements:** Reviewed against Vercel React best-practices, wrote `docs/implementation/react-next-improvement-plan.md` (and temp variant), then implemented in phases (bundle, Suspense, conditionals, content-visibility, optional memo/useTransition).
- **Post-game analysis (Phase 4.3):** Plan attached as reference; agent created branch, schema, Convex API, client-side analysis, UI, and move annotations; we then ran Convex reviewer and Vercel skill, added convex-react-review rule and AGENTS.md so those checks are part of the workflow.
- **Rules alignment:** Compared local rules to Convex and Vercel best practices; updated nextjs-patterns, typescript-conventions, convex-react-review, and monorepo-structure so the agent and the codebase stay aligned.

### 2.6 Outcomes We Care About

- **Less back-and-forth:** Rules and AGENTS.md tell the agent to lint, format, type-check, and not commit without approval.
- **Right expertise at the right time:** Glob-scoped rules and skills mean Convex/Next.js patterns apply when editing those areas.
- **Traceable multi-step work:** Plans and temp checklists keep long efforts ordered and visible.
- **Consistent quality:** Pre-commit hooks + Convex/React reviews catch issues before they land.
- **Human stays in control:** No commit/push/MR without explicit permission; user reviews and approves.

---

## Part 3: Suggested Presentation Flow

1. **Intro (2–3 min):** What we mean by “agentic workflow” and why it matters for solo or small-team development.
2. **Part 1 – How agents work (10–12 min):** LLM → harness → system prompts → tokens → context management → compaction. One or two slides per topic; use a simple diagram (user request → harness → context + tools → LLM → actions).
3. **Part 2 – Our workflow (15–20 min):** Principles → what’s in context (rules, AGENTS.md, skills) → “implement a feature” flow → table of levers → 1–2 concrete examples (e.g. Convex improvements, Phase 4.3) → outcomes.
4. **Demo (optional, 5–10 min):** Short screen share: ask Cursor to do a small task (e.g. “add a return validator to this Convex query”) and point out rules and context in action.
5. **Q&A and takeaways (5 min):** Reiterate: good agentic workflow = clear context (rules + skills + plans) + quality gates (lint, type-check, build, reviews) + human control (permission for commit/push/MR).

---

## References (for speaker notes or appendix)

- **Transcripts:** [59faecf8], [7847ee97], [182206a9], [c8ab8d4b], [ab24c7be] (chess-studio agent transcripts).
- **Rules:** `.cursor/rules/*.mdc` (code-quality, git-workflow, convex-react-review, nextjs-patterns, architecture-patterns, etc.).
- **AGENTS.md:** Learned preferences and workspace facts; Continual Learning plugin.
- **Skills:** `.cursor/skills/example-workflow/SKILL.md`; Convex and Vercel plugin skills.
- **Token/context:** e.g. Developer Toolkit – Token Management, Cursor context docs (context window, `@` symbols).
