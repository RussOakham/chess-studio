CREATE TYPE "public"."game_color" AS ENUM('white', 'black', 'random');--> statement-breakpoint
CREATE TYPE "public"."game_difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
ALTER TABLE "game_reviews" ALTER COLUMN "id" SET DEFAULT uuid_generate_v7();--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "id" SET DEFAULT uuid_generate_v7();--> statement-breakpoint
ALTER TABLE "moves" ALTER COLUMN "id" SET DEFAULT uuid_generate_v7();--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "difficulty" "game_difficulty" DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "color" "game_color" DEFAULT 'random' NOT NULL;