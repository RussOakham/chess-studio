import { getSession } from "@/lib/auth-server";

export async function createContext() {
  const session = await getSession();
  return {
    session,
    userId: session?.user.id,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
