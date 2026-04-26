# Testing strategy (canonical)

This document describes the repo’s testing approach: what to test, how to structure tests, and how to keep the suite fast and reliable.

## Testing pyramid

```text
        /   E2E   \        Few, slow, high confidence
       / Integration \      Some, medium speed
      /    Unit Tests  \    Many, fast, focused
```

- **Unit tests**: pure logic with minimal dependencies (fast feedback).
- **Integration tests**: exercise seams between modules (e.g. engine protocol parsing + adapter wiring, Convex helpers + schema contracts).
- **E2E tests**: validate critical user flows in a real browser (few, stable, high-value).

## What to cover

Prioritize:

- **Business-critical paths** (core game flow, persistence, and review output)
- **Error handling** and **edge cases**
- **Security boundaries** (auth and access checks)
- **Data integrity** (schema invariants and migrations/backfills when applicable)

De-prioritize:

- trivial getters/setters
- framework internals
- “tests of mocks”

## Constraints (non-negotiables)

### MUST

- **Test isolation**: each test is independent.
- **Fast feedback**: unit tests should be fast (target: < 1 minute locally).
- **Deterministic**: same input → same result.

### MUST NOT

- **Test dependencies**: do not let test A depend on test B.
- **Production DB**: do not run tests against production data.
- **Sleep/timeouts**: avoid time-based tests (prefer explicit signals/events and fake timers when appropriate).

## Best practices

- **AAA pattern**: Arrange → Act → Assert.
- **Test names**: “should … when …”.
- **Happy path + sad path**: cover both success and failure modes.
- **Edge cases**: boundary values, `null`/`undefined`, empty inputs, and invalid inputs.

## Repo verification commands

- `pnpm -s test`
- `pnpm -s type-check`
- `pnpm -s lint`
- `pnpm -s prep` (format + lint + type-check + tests)

## References

- Test Pyramid: [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- JavaScript testing best practices: [JavaScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
