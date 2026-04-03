# Deployment

Chess Studio is deployed as:

- **Next.js** (`apps/web`) on **[Vercel](https://vercel.com)** — Git-connected builds and previews.
- **[Convex](https://www.convex.dev/)** on **Convex Cloud** — `npx convex deploy` (or automation) for backend functions and schema, separate from the Vercel build.

**Details and checklists:** [`vercel-deployment-plan.md`](./vercel-deployment-plan.md).

**Related:** [`architecture.md`](./architecture.md), [`ci-cd-strategy.md`](./ci-cd-strategy.md).
