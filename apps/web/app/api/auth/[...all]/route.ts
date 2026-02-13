// Proxy Better Auth requests to Convex (auth runs on Convex)

import { handler } from "@/lib/auth-server";

export const { GET, POST } = handler;
