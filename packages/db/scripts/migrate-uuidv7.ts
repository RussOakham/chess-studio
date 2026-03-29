/// <reference types="node" />
// Enable pg_uuidv7 extension (optional legacy helper). Chess data lives in Convex, not Postgres.
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = postgres(databaseUrl, { prepare: false });

async function migrate() {
  try {
    console.log("Enabling pg_uuidv7 extension...");
    await sql`CREATE EXTENSION IF NOT EXISTS "pg_uuidv7"`;
    console.log("✓ Extension enabled");

    const functions = await sql`
      SELECT proname 
      FROM pg_proc 
      WHERE proname IN ('uuid_generate_v7', 'gen_uuidv7')
      ORDER BY proname
    `;
    console.log("Available UUID v7 functions:", functions);

    console.log(
      "\n✅ Extension check completed (no chess tables in Postgres — games are in Convex)."
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

void migrate();
