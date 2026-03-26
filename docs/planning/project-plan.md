# Project Plan

## Overview

This document contains the project planning, milestones, and roadmap for the chess game development.

## Project Goals

- Build a chess game application
- Integrate AI/Chess Engine for gameplay
- Provide a user-friendly interface

## Features

### MVP Features

See `docs/planning/mvp-features.md` for detailed feature breakdown.

**Core MVP Features (Phase 1)**:

- **Authentication**: User registration, login, session management
- **Chess Game vs Engine**: Play games against a chess engine (Stockfish)
- **Engine Evaluation**: Real-time position evaluation during games
- **Move Hints**: AI-powered suggestions for best moves
- **Game Review**: Post-game analysis (engine/rule-based review shipped; optional LLM summaries later)
- **Game History**: Store and review past games
- **Interactive Chess Board**: Full chess game mechanics with move validation

## Milestones

- [x] Project setup and planning
- [x] Tech stack selection
- [x] Architecture design (Convex + Next.js; see [`architecture.md`](./architecture.md))
- [x] Core game implementation (see [`game-implementation-plan.md`](../implementation/game-implementation-plan.md))
- [x] Chess engine integration (client Stockfish)
- [ ] AI implementation (optional LLM summaries; engine/rule-based review shipped)
- [x] UI/UX development (core flows)
- [ ] Testing and refinement (ongoing)

## Notes

Add project planning notes, requirements, and decisions here.
