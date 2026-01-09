# Validation Checklist

## ✅ TypeScript-Go Setup

- [ ] Type-checking works with tsgo
- [ ] All packages type-check successfully

## ✅ Linting Setup

- [ ] ESLint runs without errors
- [ ] All packages lint successfully

## ✅ Database Setup

- [ ] Neon database connection works
- [ ] All tables exist (users, games, moves, game_reviews)
- [ ] Better Auth tables exist (user, session, account, verification)
- [ ] pgvector extension is enabled

## ✅ Better Auth Setup

- [ ] Auth configuration loads correctly
- [ ] Auth API routes are accessible
- [ ] Login page renders
- [ ] Register page renders
- [ ] Form validation works
- [ ] Middleware protects routes

## ✅ Doppler Integration

- [ ] Secrets are accessible via Doppler CLI
- [ ] Dev script loads secrets correctly

## ✅ Code Quality

- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] All files formatted correctly
