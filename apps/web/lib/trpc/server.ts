// Server-side tRPC caller for use in server components and API routes

import { createContext } from "./context";
import { appRouter } from "./routers/_app";

/**
 * Create a tRPC caller for server-side use
 * Use this in server components to call tRPC procedures
 */
export async function createCaller() {
  const ctx = await createContext();
  return appRouter.createCaller(ctx);
}
