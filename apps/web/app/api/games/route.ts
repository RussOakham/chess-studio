import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { and, db, desc, eq, games, or } from "@repo/db";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch active games (in_progress or waiting)
    const activeGames = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.userId, userId),
          or(eq(games.status, "in_progress"), eq(games.status, "waiting"))
        )
      )
      .orderBy(desc(games.updatedAt))
      .limit(10);

    // Fetch recent games (completed or abandoned, last 5)
    const recentGames = await db
      .select()
      .from(games)
      .where(
        and(
          eq(games.userId, userId),
          or(eq(games.status, "completed"), eq(games.status, "abandoned"))
        )
      )
      .orderBy(desc(games.updatedAt))
      .limit(5);

    return NextResponse.json({
      activeGames,
      recentGames,
    });
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
