import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "./routers/_app";

const trpc: ReturnType<typeof createTRPCReact<AppRouter>> =
  createTRPCReact<AppRouter>();

export { trpc };
