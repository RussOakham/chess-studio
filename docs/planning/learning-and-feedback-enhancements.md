# Learning and feedback enhancements

This document captures product and technical directions for improving **user-facing feedback** in chess-studio: helping players learn and improve, using **third-party integrations** (Stockfish, Lichess, AI) where appropriate.

It is a planning note, not a committed roadmap. Implementation details may change.

## Goals

- Make post-game and in-game feedback **more instructive** without sacrificing correctness.
- Prefer **engine-backed truth** (evaluations, best moves) and use **LLMs as narrators** where they add value.
- Control **cost and latency** (batching, toggles, smaller models, free tiers where viable).

## Current behavior (baseline)

### `keyMoments` in game review data

- **Source:** Generated during **client-side Stockfish game analysis** in `apps/web/lib/run-game-analysis.ts`, not from Lichess prose or a Lichess “key moments” API.
- **Mechanism:** For each half-move, the analysis compares the played move to Stockfish’s best move and classifies eval loss (`classifySuboptimalMove`). On **blunder**, **mistake**, or **inaccuracy**, a short templated string is appended (move number, SAN, “best was …”).
- **Lichess in the same pipeline:** Used for the **Opening Explorer** (masters DB)—opening names, book continuations, ECO-style metadata. That enriches **openings** and **book** annotations; it does **not** populate the `keyMoments` strings themselves.
- **Persistence:** Saved via Convex review mutations (`apps/web/convex/reviews.ts`), with a cap on how many key moments are stored (`MAX_KEY_MOMENTS`).

### Hints during play

- **Source:** A single best move from Stockfish via `getBestMove` (`apps/web/lib/hooks/use-hint.ts`).
- **UI:** Arrow on the board plus SAN; no multi-move list or natural-language explanation today.

### AI in the codebase

- **Shipped:** Optional **post-game AI summary** — Convex action `ai_game_summary.generate` calls **Vercel AI Gateway** + AI SDK (`generateText`) with a structured **data transfer object (DTO)** built from the rule-based review (`apps/web/lib/ai/`, `apps/web/convex/ai_game_summary.ts`). Requires `AI_GATEWAY_API_KEY`; **Large Language Model (LLM)** output is stored on `game_reviews.aiSummary`.
- **Not shipped yet:** Natural-language **per-position** or **MultiPV-line** commentary beyond the summary flow; those are the enhancement ideas below.

---

## Enhancement ideas

### 1. Richer commentary for `keyMoments`

**Idea:** Keep Stockfish (and existing classification) as the **source of truth**. Optionally add an **AI pass** that expands each key moment into a short teaching paragraph.

**Suggested inputs to the model (structured):** FEN before/after (or SAN chain), played move, best move from engine, eval before/after, classification (blunder / mistake / inaccuracy).

**Guardrails:** System instructions that the model must **not** invent a different “best” move than the one provided; explanations should be **consistent with** the engine output.

**Cost control:** Run AI only for stored key moments (not every ply), or only for blunders, or behind a **“Detailed explanations”** toggle.

### 2. Hints: top three moves + rationale

**Idea:** Show **three candidate moves** with short explanations of the **ideas** behind each (not three independent one-off guesses).

**Engine layer:**

- Prefer **Stockfish MultiPV** (e.g. `MultiPV = 3`) in the same worker path used today, so rankings stay consistent with the rest of the app.
- Lichess APIs are strong for **popularity and opening statistics**; they are not always a drop-in for “top three engine principal variations” in-app. For **engine-aligned top three**, multipv Stockfish is the default fit.

**Narrative layer:** Feed structured rows `{ rank, san, eval, delta from played }` into an LLM to produce **thematic** explanations, with the same grounding rules as above.

**UX:** Present as “three ideas” with expandable text; avoid dense paragraphs on small screens.

### 3. On-demand AI game or position review

| Scope                | Typical inputs                              | Role of AI                                                                                  |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Full game**        | PGN plus existing annotations / eval series | Chapter-style summary, recurring themes (opening, tactics, endgame), suggested study topics |
| **Current position** | FEN (and optional last move)                | “What is going on here?” without re-processing the whole game                               |

**Pattern:** Deterministic analysis (much of which you already have or can add) plus an LLM as **narrator** and **organizer**, not as the primary tactician.

---

## AI providers and cost posture

**Important:** Free tiers, model names, and pricing change often. Treat the following as **selection criteria**, not fixed facts.

- **Google Gemini** (AI Studio / API): Often used for experimentation with accessible free tiers; useful if you later want multimodal inputs (e.g. screenshots) with the same stack.
- **OpenAI:** Strong models; free tiers are usually limited; production often implies paid usage.
- **Anthropic (Claude):** Strong for long-form reasoning; typically paid API for app backends.
- **xAI Grok:** Verify current API availability and terms before designing around it.

**Integration options:**

- **Vercel AI Gateway** can unify routing and failover across providers if the app is deployed on Vercel and you want one integration surface (see project docs and `AGENTS.md` for OIDC / env patterns).
- A **single provider** (e.g. one small chat model) is enough for an MVP if you want minimal moving parts.

**Chess quality from LLMs:** Models do not need to be “chess-specialized” if the prompt includes **only verified facts** (FEN, SAN, engine best move, multipv lines). Smaller models often suffice when **grounding** is strict.

---

## Other product areas to strengthen learning

These align with existing surfaces (games list, live game, review) and mostly reuse **data you already compute or can add cheaply**.

1. **Review navigation:** Jump to **next blunder**, filter by severity, optional deep link to external analysis (e.g. Lichess analysis) where policy and UX allow.
2. **Mistake drills / spaced repetition:** Queue positions where the user erred; replay “find the best move” from that FEN against the engine.
3. **Opening narrative:** You already derive **Lichess opening names** in analysis—surface “left book at move X” vs master statistics where explorer data exists.
4. **Time pressure:** If clock data per move exists or is added, correlate **blunders with time trouble** for higher-signal feedback.
5. **Progress dashboard:** Trends in accuracy, blunder rate, book vs non-book losses—aggregates from review and game metadata.
6. **Post-blunder training:** One-click “practice this position” from a review row.

---

## References in repo

| Topic                       | Location                              |
| --------------------------- | ------------------------------------- |
| Key moments generation      | `apps/web/lib/run-game-analysis.ts`   |
| Review persistence and caps | `apps/web/convex/reviews.ts`          |
| Hint behavior               | `apps/web/lib/hooks/use-hint.ts`      |
| Lichess explorer usage      | `apps/web/convex/lichess_explorer.ts` |

---

## Open questions

- **Privacy / retention:** How long to store AI-generated text; whether to regenerate on demand vs cache.
- **Rate limits:** Per-user quotas for AI features on free vs paid tiers.
- **Offline / no-AI mode:** Clear degradation when API keys are absent or limits are hit.
