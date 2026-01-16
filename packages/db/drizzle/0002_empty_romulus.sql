-- Enable pg_uuidv7 extension for UUID v7 support
CREATE EXTENSION IF NOT EXISTS "pg_uuidv7";--> statement-breakpoint
ALTER TABLE "game_reviews" ALTER COLUMN "id" SET DEFAULT uuid_generate_v7();--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "id" SET DEFAULT uuid_generate_v7();--> statement-breakpoint
ALTER TABLE "moves" ALTER COLUMN "id" SET DEFAULT uuid_generate_v7();