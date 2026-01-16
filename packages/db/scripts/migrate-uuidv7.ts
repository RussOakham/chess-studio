/// <reference types="node" />
// Script to enable pg_uuidv7 extension and update UUID defaults
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

    // According to pg_uuidv7 extension, the function is uuid_generate_v7()
    // Let's check what functions are available
    const functions = await sql`
      SELECT proname 
      FROM pg_proc 
      WHERE proname IN ('uuid_generate_v7', 'gen_uuidv7')
      ORDER BY proname
    `;
    console.log("Available UUID v7 functions:", functions);

    // Use uuid_generate_v7() which is the standard function name for pg_uuidv7
    const functionName: string =
      functions.length > 0 && functions[0]?.proname
        ? String(functions[0].proname)
        : "uuid_generate_v7";
    console.log(`Using function: ${functionName}`);

    console.log("Updating games table...");
    await sql.unsafe(
      `ALTER TABLE "games" ALTER COLUMN "id" SET DEFAULT ${functionName}()`
    );
    console.log("✓ Games table updated");

    console.log("Updating moves table...");
    await sql.unsafe(
      `ALTER TABLE "moves" ALTER COLUMN "id" SET DEFAULT ${functionName}()`
    );
    console.log("✓ Moves table updated");

    console.log("Updating game_reviews table...");
    await sql.unsafe(
      `ALTER TABLE "game_reviews" ALTER COLUMN "id" SET DEFAULT ${functionName}()`
    );
    console.log("✓ Game reviews table updated");

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

void migrate();
