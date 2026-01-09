// Database client setup with Drizzle ORM and Neon DB

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create the connection pool
const connectionString = process.env.DATABASE_URL;

// Disable prefetch as it's not supported in serverless environments
const client = postgres(connectionString, { prepare: false });

// Create Drizzle client instance
export const db = drizzle(client, { schema });
